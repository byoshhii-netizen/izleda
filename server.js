require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const { nanoid } = require('nanoid');

// Migration'ı başlangıçta çalıştır
try { require('./migrate'); } catch(e) { console.log('migrate skip:', e.message); }

const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'anamanamcayimbenim';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: './data' }),
  secret: process.env.SESSION_SECRET || 'yukleda_secret_2024',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 30 * 24 * 60 * 60 * 1000 }
}));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Sadece gorsel yukleyebilirsiniz'));
  }
});

// ==================== MIDDLEWARE ====================

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Giris gerekli' });
  const user = db.prepare('SELECT is_banned FROM users WHERE id = ?').get(req.session.userId);
  if (user && user.is_banned) return res.status(403).json({ error: 'BANNED' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.userId) return res.status(403).json({ error: 'Giris gerekli' });
  const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.session.userId);
  if (!user || !user.is_admin) return res.status(403).json({ error: 'Admin yetkisi gerekli' });
  next();
}

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'bilinmiyor';
}

// ==================== SPA ROUTES ====================

const spaRoutes = ['/resim/:id', '/hesap/:nickname', '/gizli/:secretId', '/yukle', '/giris', '/kayit', '/profil', '/'];
spaRoutes.forEach(r => app.get(r, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html'))));

// Admin panel ayri HTML
app.get('/adminpanel', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// ==================== AUTH ====================

app.post('/api/register', async (req, res) => {
  try {
    const { nickname, password } = req.body;
    if (!nickname || !password) return res.status(400).json({ error: 'Tum alanlar gerekli' });
    if (nickname.length < 3) return res.status(400).json({ error: 'Kullanici adi en az 3 karakter olmali' });
    if (password.length < 4) return res.status(400).json({ error: 'Sifre en az 4 karakter olmali' });
    if (!/^[a-zA-Z0-9_.]+$/.test(nickname)) return res.status(400).json({ error: 'Gecersiz karakter. Harf, rakam, _ ve . kullanabilirsin' });
    const existing = db.prepare('SELECT id FROM users WHERE nickname = ?').get(nickname);
    if (existing) return res.status(400).json({ error: 'Bu kullanici adi zaten alinmis' });
    const hash = await bcrypt.hash(password, 10);
    const id = nanoid();
    db.prepare('INSERT INTO users (id, nickname, password_hash) VALUES (?, ?, ?)').run(id, nickname, hash);
    req.session.userId = id;
    req.session.nickname = nickname;
    const user = db.prepare('SELECT id, nickname, avatar, bio, is_banned, created_at FROM users WHERE id = ?').get(id);
    res.json({ success: true, user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Sunucu hatasi' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { nickname, password } = req.body;
    if (!nickname || !password) return res.status(400).json({ error: 'Kullanici adi ve sifre gerekli' });
    const user = db.prepare('SELECT * FROM users WHERE nickname = ?').get(nickname);
    if (!user) return res.status(400).json({ error: 'Kullanici bulunamadi' });
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(400).json({ error: 'Hatali sifre' });
    if (user.is_banned) {
      req.session.userId = user.id;
      req.session.nickname = user.nickname;
      const { password_hash, ...safeUser } = user;
      return res.json({ success: true, user: safeUser, banned: true, ban_note: user.ban_note });
    }
    req.session.userId = user.id;
    req.session.nickname = user.nickname;
    const { password_hash, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Sunucu hatasi' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/me', (req, res) => {
  if (!req.session.userId) return res.json(null);
  const user = db.prepare('SELECT id, nickname, avatar, bio, is_admin, created_at FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.json(null);
  res.json(user);
});

app.put('/api/profile', requireAuth, upload.single('avatar'), async (req, res) => {
  try {
    const { bio } = req.body;
    if (req.file) {
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: 'yukleda/avatars',
        transformation: [{ width: 300, height: 300, crop: 'fill' }]
      });
      db.prepare('UPDATE users SET avatar = ?, bio = ? WHERE id = ?').run(result.secure_url, bio || '', req.session.userId);
    } else {
      db.prepare('UPDATE users SET bio = ? WHERE id = ?').run(bio || '', req.session.userId);
    }
    const user = db.prepare('SELECT id, nickname, avatar, bio, is_banned, created_at FROM users WHERE id = ?').get(req.session.userId);
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: 'Guncelleme hatasi' });
  }
});

// ==================== ADMIN AUTH ====================

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    req.session.adminLoggedIn = true;
    return res.json({ success: true });
  }
  res.status(403).json({ error: 'Yanlis sifre' });
});

app.post('/api/admin/logout', (req, res) => {
  req.session.adminLoggedIn = false;
  res.json({ success: true });
});

app.get('/api/admin/check', (req, res) => {
  res.json({ loggedIn: !!req.session.adminLoggedIn });
});

app.post('/api/admin/change-password', requireAdmin, async (req, res) => {
  const { current, newPassword } = req.body;
  if (current !== ADMIN_PASSWORD) return res.status(403).json({ error: 'Mevcut sifre yanlis' });
  // .env dosyasini guncelle
  const envPath = path.join(__dirname, '.env');
  try {
    let envContent = require('fs').readFileSync(envPath, 'utf8');
    envContent = envContent.replace(/ADMIN_PASSWORD=.*/, `ADMIN_PASSWORD=${newPassword}`);
    require('fs').writeFileSync(envPath, envContent);
    res.json({ success: true, message: 'Sifre degistirildi. Sunucuyu yeniden baslatmaniz gerekebilir.' });
  } catch (e) {
    res.status(500).json({ error: 'Sifre degistirilemedi' });
  }
});

// ==================== CATEGORIES ====================

app.get('/api/categories', (req, res) => {
  const cats = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC, id ASC').all();
  res.json(cats);
});

app.post('/api/admin/categories', requireAdmin, (req, res) => {
  const { name, fa_icon, color, sort_order } = req.body;
  if (!name || !fa_icon) return res.status(400).json({ error: 'Ad ve ikon gerekli' });
  const result = db.prepare('INSERT INTO categories (name, fa_icon, color, sort_order) VALUES (?, ?, ?, ?)').run(name, fa_icon || 'fa-tag', color || '#6366f1', sort_order || 0);
  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
  res.json(cat);
});

app.put('/api/admin/categories/:id', requireAdmin, (req, res) => {
  const { name, fa_icon, color, sort_order } = req.body;
  db.prepare('UPDATE categories SET name = ?, fa_icon = ?, color = ?, sort_order = ? WHERE id = ?').run(name, fa_icon, color, sort_order || 0, req.params.id);
  res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id));
});

app.delete('/api/admin/categories/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ==================== POSTS ====================

function enrichPost(post, userId) {
  const images = db.prepare('SELECT * FROM post_images WHERE post_id = ? ORDER BY sort_order ASC').all(post.id);
  const category = post.category_id ? db.prepare('SELECT * FROM categories WHERE id = ?').get(post.category_id) : null;
  const liked_by_me = userId ? (db.prepare('SELECT id FROM likes WHERE post_id = ? AND user_id = ?').get(post.id, userId) ? 1 : 0) : 0;
  const comments_count = db.prepare('SELECT COUNT(*) as c FROM comments WHERE post_id = ?').get(post.id).c;
  return { ...post, images, category, liked_by_me, comments_count };
}

app.get('/api/posts', (req, res) => {
  const { page = 1, limit = 12, search, category } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const userId = req.session.userId || null;

  let where = 'WHERE p.is_private = 0 AND p.is_hidden = 0';
  const params = [];
  if (search && search.trim()) { where += ' AND p.title LIKE ?'; params.push(`%${search.trim()}%`); }
  if (category) { where += ' AND p.category_id = ?'; params.push(parseInt(category)); }

  const total = db.prepare(`SELECT COUNT(*) as c FROM posts p ${where}`).get(...params).c;
  const posts = db.prepare(`
    SELECT p.*, u.nickname, u.avatar FROM posts p JOIN users u ON u.id = p.user_id
    ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  res.json({ posts: posts.map(p => enrichPost(p, userId)), total, page: parseInt(page) });
});

app.get('/api/posts/popular', (req, res) => {
  const userId = req.session.userId || null;
  const posts = db.prepare(`
    SELECT p.*, u.nickname, u.avatar FROM posts p JOIN users u ON u.id = p.user_id
    WHERE p.is_private = 0 AND p.is_hidden = 0
    ORDER BY p.likes_count DESC, p.created_at DESC LIMIT 6
  `).all();
  res.json(posts.map(p => enrichPost(p, userId)));
});

app.get('/api/resim/:id', (req, res) => {
  const userId = req.session.userId || null;
  const post = db.prepare(`
    SELECT p.*, u.nickname, u.avatar FROM posts p JOIN users u ON u.id = p.user_id
    WHERE p.id = ? AND p.is_private = 0 AND p.is_hidden = 0
  `).get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Gonderi bulunamadi' });
  res.json(enrichPost(post, userId));
});

app.get('/api/gizli/:secretId', requireAuth, (req, res) => {
  const post = db.prepare(`
    SELECT p.*, u.nickname, u.avatar FROM posts p JOIN users u ON u.id = p.user_id
    WHERE p.secret_id = ? AND p.is_private = 1
  `).get(req.params.secretId);
  if (!post) return res.status(404).json({ error: 'Bulunamadi' });
  if (post.user_id !== req.session.userId) return res.status(403).json({ error: 'Bu gizli gonderi size ait degil' });
  res.json(enrichPost(post, req.session.userId));
});

app.post('/api/posts', requireAuth, upload.array('images', 10), async (req, res) => {
  try {
    const { title, description, category_id, is_private, post_type, text_content, text_bg, text_color } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Baslik gerekli' });

    const postId = nanoid();
    const secretId = nanoid(32);
    const privateFlag = is_private === 'true' || is_private === '1' ? 1 : 0;
    const type = post_type === 'text' ? 'text' : 'photo';

    if (type === 'text') {
      if (!text_content || !text_content.trim()) return res.status(400).json({ error: 'Metin icerigi gerekli' });
      db.prepare('INSERT INTO posts (id, secret_id, user_id, title, description, category_id, is_private, post_type, text_content, text_bg, text_color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(postId, secretId, req.session.userId, title.trim(), description || '', category_id || null, privateFlag, 'text', text_content.trim(), text_bg || '#1a1a24', text_color || '#f1f0f5');
    } else {
      if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'En az bir gorsel gerekli' });
      db.prepare('INSERT INTO posts (id, secret_id, user_id, title, description, category_id, is_private, post_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(postId, secretId, req.session.userId, title.trim(), description || '', category_id || null, privateFlag, 'photo');

      const uploadPromises = req.files.map((file, idx) => {
        const b64 = Buffer.from(file.buffer).toString('base64');
        const dataURI = `data:${file.mimetype};base64,${b64}`;
        return cloudinary.uploader.upload(dataURI, {
          folder: 'yukleda/posts',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }]
        }).then(result => ({ url: result.secure_url, public_id: result.public_id, idx }));
      });
      const uploaded = await Promise.all(uploadPromises);
      const insertImg = db.prepare('INSERT INTO post_images (post_id, image_url, image_public_id, sort_order) VALUES (?, ?, ?, ?)');
      uploaded.forEach(u => insertImg.run(postId, u.url, u.public_id, u.idx));
    }

    const post = db.prepare('SELECT p.*, u.nickname, u.avatar FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = ?').get(postId);
    res.json(enrichPost(post, req.session.userId));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Yukleme hatasi: ' + e.message });
  }
});

app.delete('/api/posts/:id', requireAuth, async (req, res) => {
  try {
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
    if (!post) return res.status(404).json({ error: 'Gonderi bulunamadi' });
    if (post.user_id !== req.session.userId) return res.status(403).json({ error: 'Yetki yok' });
    const images = db.prepare('SELECT image_public_id FROM post_images WHERE post_id = ?').all(req.params.id);
    await Promise.all(images.map(img => img.image_public_id ? cloudinary.uploader.destroy(img.image_public_id).catch(() => {}) : Promise.resolve()));
    db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Silme hatasi' });
  }
});

// ==================== LIKES ====================

app.post('/api/posts/:id/like', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
    if (!post) return res.status(404).json({ error: 'Bulunamadi' });
    if (post.is_private && post.user_id !== userId) return res.status(403).json({ error: 'Erisim yok' });

    const existing = db.prepare('SELECT id FROM likes WHERE post_id = ? AND user_id = ?').get(id, userId);
    if (existing) {
      db.prepare('DELETE FROM likes WHERE post_id = ? AND user_id = ?').run(id, userId);
      db.prepare('UPDATE posts SET likes_count = MAX(0, likes_count - 1) WHERE id = ?').run(id);
      return res.json({ liked: false, likes_count: db.prepare('SELECT likes_count FROM posts WHERE id = ?').get(id).likes_count });
    }
    db.prepare('INSERT INTO likes (post_id, user_id) VALUES (?, ?)').run(id, userId);
    db.prepare('UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?').run(id);
    res.json({ liked: true, likes_count: db.prepare('SELECT likes_count FROM posts WHERE id = ?').get(id).likes_count });
  } catch (e) {
    res.status(500).json({ error: 'Hata' });
  }
});

// ==================== COMMENTS ====================

app.get('/api/posts/:id/comments', (req, res) => {
  const post = db.prepare('SELECT is_private, user_id FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Bulunamadi' });
  if (post.is_private && post.user_id !== req.session.userId) return res.status(403).json({ error: 'Erisim yok' });
  const comments = db.prepare(`
    SELECT c.*, u.nickname, u.avatar FROM comments c JOIN users u ON u.id = c.user_id
    WHERE c.post_id = ? ORDER BY c.created_at ASC
  `).all(req.params.id);
  res.json(comments);
});

app.post('/api/posts/:id/comments', requireAuth, (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: 'Yorum gerekli' });
  const post = db.prepare('SELECT is_private, user_id FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Bulunamadi' });
  if (post.is_private && post.user_id !== req.session.userId) return res.status(403).json({ error: 'Erisim yok' });
  const cid = nanoid();
  db.prepare('INSERT INTO comments (id, post_id, user_id, content) VALUES (?, ?, ?, ?)').run(cid, req.params.id, req.session.userId, content.trim());
  const comment = db.prepare('SELECT c.*, u.nickname, u.avatar FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?').get(cid);
  res.json(comment);
});

app.delete('/api/comments/:id', requireAuth, (req, res) => {
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!comment) return res.status(404).json({ error: 'Yorum bulunamadi' });
  const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.session.userId);
  if (comment.user_id !== req.session.userId && !user?.is_admin) return res.status(403).json({ error: 'Yetki yok' });
  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.put('/api/comments/:id', requireAuth, (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: 'Yorum boş olamaz' });
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!comment) return res.status(404).json({ error: 'Yorum bulunamadi' });
  if (comment.user_id !== req.session.userId) return res.status(403).json({ error: 'Sadece kendi yorumunu düzenleyebilirsin' });
  db.prepare('UPDATE comments SET content = ? WHERE id = ?').run(content.trim(), req.params.id);
  const updated = db.prepare('SELECT c.*, u.nickname, u.avatar FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?').get(req.params.id);
  res.json(updated);
});

// ==================== USER PROFILE ====================

app.get('/api/hesap/:nickname', (req, res) => {
  const user = db.prepare('SELECT id, nickname, avatar, bio, is_banned, created_at FROM users WHERE nickname = ?').get(req.params.nickname);
  if (!user) return res.status(404).json({ error: 'Kullanici bulunamadi' });

  const isOwner = req.session.userId === user.id;
  const posts = db.prepare(`
    SELECT p.*, u.nickname, u.avatar FROM posts p JOIN users u ON u.id = p.user_id
    WHERE p.user_id = ? ${isOwner ? '' : 'AND p.is_private = 0 AND p.is_hidden = 0'}
    ORDER BY p.created_at DESC
  `).all(user.id);

  const totalLikes = db.prepare('SELECT COALESCE(SUM(likes_count), 0) as total FROM posts WHERE user_id = ? AND is_private = 0').get(user.id);
  const totalPosts = db.prepare('SELECT COUNT(*) as c FROM posts WHERE user_id = ? AND is_private = 0').get(user.id);

  res.json({
    user,
    posts: posts.map(p => enrichPost(p, req.session.userId || null)),
    totalLikes: totalLikes.total,
    totalPosts: totalPosts.c,
    isOwner
  });
});

app.get('/api/my/private-posts', requireAuth, (req, res) => {
  const posts = db.prepare(`
    SELECT p.*, u.nickname, u.avatar FROM posts p JOIN users u ON u.id = p.user_id
    WHERE p.user_id = ? AND p.is_private = 1
    ORDER BY p.created_at DESC
  `).all(req.session.userId);
  res.json(posts.map(p => enrichPost(p, req.session.userId)));
});

// ==================== SEARCH ====================

app.get('/api/search', (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 1) return res.json({ posts: [], users: [] });
  const term = `%${q.trim()}%`;
  const posts = db.prepare(`
    SELECT p.id, p.title, p.likes_count, p.post_type, p.text_bg, p.text_color, u.nickname,
      (SELECT image_url FROM post_images WHERE post_id = p.id ORDER BY sort_order ASC LIMIT 1) as image_url
    FROM posts p JOIN users u ON u.id = p.user_id
    WHERE p.title LIKE ? AND p.is_private = 0 AND p.is_hidden = 0
    ORDER BY p.likes_count DESC LIMIT 10
  `).all(term);
  const users = db.prepare('SELECT id, nickname, avatar FROM users WHERE nickname LIKE ? LIMIT 5').all(term);
  res.json({ posts, users });
});

// ==================== STATS ====================

app.get('/api/stats', (req, res) => {
  res.json({
    posts: db.prepare('SELECT COUNT(*) as c FROM posts WHERE is_private = 0 AND is_hidden = 0').get().c,
    users: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
    likes: db.prepare('SELECT COUNT(*) as c FROM likes').get().c
  });
});

// ==================== SITE SETTINGS ====================

app.get('/api/settings', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM site_settings').all();
    const settings = {};
    rows.forEach(r => settings[r.key] = r.value);
    res.json(settings);
  } catch(e) { res.json({}); }
});

app.put('/api/admin/settings', requireAdmin, (req, res) => {
  const allowed = [
    'accent_color', 'accent_color2', 'accent_color3', 'site_name',
    'oshi_bio', 'oshi_instagram', 'oshi_twitter', 'oshi_linkedin', 'oshi_website', 'oshi_github',
    'team_bio', 'team_instagram', 'team_twitter', 'team_linkedin', 'team_website', 'team_github'
  ];
  const ups = db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)');
  const update = db.transaction((data) => {
    Object.entries(data).forEach(([k, v]) => {
      if (allowed.includes(k)) ups.run(k, String(v));
    });
  });
  update(req.body);
  res.json({ success: true });
});

// ==================== ADMIN PANEL API ====================

app.get('/api/admin/stats', requireAdmin, (req, res) => {
  res.json({
    total_posts: db.prepare('SELECT COUNT(*) as c FROM posts').get().c,
    public_posts: db.prepare('SELECT COUNT(*) as c FROM posts WHERE is_private = 0 AND is_hidden = 0').get().c,
    private_posts: db.prepare('SELECT COUNT(*) as c FROM posts WHERE is_private = 1').get().c,
    hidden_posts: db.prepare('SELECT COUNT(*) as c FROM posts WHERE is_hidden = 1').get().c,
    total_users: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
    banned_users: db.prepare('SELECT COUNT(*) as c FROM users WHERE is_banned = 1').get().c,
    total_likes: db.prepare('SELECT COUNT(*) as c FROM likes').get().c,
    total_comments: db.prepare('SELECT COUNT(*) as c FROM comments').get().c
  });
});

app.get('/api/admin/posts', requireAdmin, (req, res) => {
  const { search, filter, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = 'WHERE 1=1';
  const params = [];
  if (search) { where += ' AND p.title LIKE ?'; params.push(`%${search}%`); }
  if (filter === 'private') { where += ' AND p.is_private = 1'; }
  else if (filter === 'public') { where += ' AND p.is_private = 0 AND p.is_hidden = 0'; }
  else if (filter === 'hidden') { where += ' AND p.is_hidden = 1'; }

  const total = db.prepare(`SELECT COUNT(*) as c FROM posts p ${where}`).get(...params).c;
  const posts = db.prepare(`
    SELECT p.*, u.nickname FROM posts p JOIN users u ON u.id = p.user_id
    ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  res.json({ posts: posts.map(p => enrichPost(p, null)), total, page: parseInt(page) });
});

app.put('/api/admin/posts/:id/toggle-hidden', requireAdmin, (req, res) => {
  const post = db.prepare('SELECT is_hidden FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Bulunamadi' });
  db.prepare('UPDATE posts SET is_hidden = ? WHERE id = ?').run(post.is_hidden ? 0 : 1, req.params.id);
  res.json({ success: true, is_hidden: !post.is_hidden });
});

app.delete('/api/admin/posts/:id', requireAdmin, async (req, res) => {
  try {
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
    if (!post) return res.status(404).json({ error: 'Bulunamadi' });
    const images = db.prepare('SELECT image_public_id FROM post_images WHERE post_id = ?').all(req.params.id);
    await Promise.all(images.map(img => img.image_public_id ? cloudinary.uploader.destroy(img.image_public_id).catch(() => {}) : Promise.resolve()));
    db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Silme hatasi' });
  }
});

app.delete('/api/admin/posts/bulk', requireAdmin, async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'ID listesi gerekli' });
  for (const id of ids) {
    const images = db.prepare('SELECT image_public_id FROM post_images WHERE post_id = ?').all(id);
    await Promise.all(images.map(img => img.image_public_id ? cloudinary.uploader.destroy(img.image_public_id).catch(() => {}) : Promise.resolve()));
    db.prepare('DELETE FROM posts WHERE id = ?').run(id);
  }
  res.json({ success: true, deleted: ids.length });
});

app.get('/api/admin/users', requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, nickname, avatar, bio, is_banned, ban_note, created_at FROM users ORDER BY created_at DESC').all();
  res.json(users);
});

app.get('/api/admin/users/:id', requireAdmin, (req, res) => {
  const user = db.prepare('SELECT id, nickname, avatar, bio, is_banned, ban_note, created_at FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Kullanici bulunamadi' });
  const posts = db.prepare('SELECT p.*, u.nickname FROM posts p JOIN users u ON u.id = p.user_id WHERE p.user_id = ? ORDER BY p.created_at DESC').all(req.params.id);
  const totalLikes = db.prepare('SELECT COALESCE(SUM(likes_count), 0) as total FROM posts WHERE user_id = ?').get(req.params.id);
  res.json({ user, posts: posts.map(p => enrichPost(p, null)), totalLikes: totalLikes.total });
});

app.put('/api/admin/users/:id/ban', requireAdmin, (req, res) => {
  const { ban_note } = req.body;
  const user = db.prepare('SELECT is_banned FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Kullanici bulunamadi' });
  const newBanned = user.is_banned ? 0 : 1;
  db.prepare('UPDATE users SET is_banned = ?, ban_note = ? WHERE id = ?').run(newBanned, newBanned ? (ban_note || null) : null, req.params.id);
  res.json({ success: true, is_banned: !!newBanned });
});

// Kullanici IP simule (gercek IP kaydi icin middleware gerekir ama session bazli)
app.get('/api/admin/users/:id/ip', requireAdmin, (req, res) => {
  // Gercek uygulamada IP kaydi tutulur, simdilik placeholder
  res.json({ ip: 'IP kaydi icin login middleware gerekli' });
});

app.listen(PORT, () => {
  console.log(`Yukleda sunucusu http://localhost:${PORT} adresinde calisiyor`);
});
