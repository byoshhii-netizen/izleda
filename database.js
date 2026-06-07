const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'yukleda.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      nickname TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar TEXT DEFAULT NULL,
      bio TEXT DEFAULT '',
      is_banned INTEGER DEFAULT 0,
      ban_note TEXT DEFAULT NULL,
      created_at INTEGER DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      fa_icon TEXT NOT NULL DEFAULT 'fa-tag',
      color TEXT NOT NULL DEFAULT '#6366f1',
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      secret_id TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      category_id INTEGER DEFAULT NULL,
      is_private INTEGER DEFAULT 0,
      is_hidden INTEGER DEFAULT 0,
      likes_count INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s','now') * 1000),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS post_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id TEXT NOT NULL,
      image_url TEXT NOT NULL,
      image_public_id TEXT DEFAULT NULL,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s','now') * 1000),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(post_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s','now') * 1000),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
    CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
    CREATE INDEX IF NOT EXISTS idx_posts_secret_id ON posts(secret_id);
    CREATE INDEX IF NOT EXISTS idx_posts_title ON posts(title);
    CREATE INDEX IF NOT EXISTS idx_post_images_post_id ON post_images(post_id);
    CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
    CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
  `);

  const catCount = db.prepare('SELECT COUNT(*) as c FROM categories').get().c;
  if (catCount === 0) {
    const defaults = [
      { name: 'Doğa', fa_icon: 'fa-tree', color: '#22c55e', sort_order: 1 },
      { name: 'Şehir', fa_icon: 'fa-city', color: '#3b82f6', sort_order: 2 },
      { name: 'Sanat', fa_icon: 'fa-palette', color: '#a855f7', sort_order: 3 },
      { name: 'Yiyecek', fa_icon: 'fa-utensils', color: '#f59e0b', sort_order: 4 },
      { name: 'Spor', fa_icon: 'fa-dumbbell', color: '#ef4444', sort_order: 5 },
      { name: 'Seyahat', fa_icon: 'fa-plane', color: '#06b6d4', sort_order: 6 },
      { name: 'Hayvanlar', fa_icon: 'fa-paw', color: '#f97316', sort_order: 7 },
      { name: 'Teknoloji', fa_icon: 'fa-microchip', color: '#64748b', sort_order: 8 }
    ];
    const ins = db.prepare('INSERT INTO categories (name, fa_icon, color, sort_order) VALUES (?, ?, ?, ?)');
    defaults.forEach(c => ins.run(c.name, c.fa_icon, c.color, c.sort_order));
  }

  console.log('YukleDa veritabani hazir');
}

initDatabase();
module.exports = db;
