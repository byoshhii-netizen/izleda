// ===== TeaTok - APP.JS =====
const app = document.getElementById('app');
let currentUser = null;
let currentPath = '';

// ===== ROUTER =====
function router() {
  const path = window.location.pathname;
  currentPath = path;
  if (path.startsWith('/resim/')) renderPostDetail(path.split('/resim/')[1]);
  else if (path.startsWith('/hesap/')) renderProfile(path.split('/hesap/')[1]);
  else if (path.startsWith('/gizli/')) renderPrivatePost(path.split('/gizli/')[1]);
  else if (path === '/yukle') renderUpload();
  else if (path === '/giris') renderLogin();
  else if (path === '/kayit') renderRegister();
  else if (path === '/profil') renderMyProfile();
  else renderHome();
}

function navigate(path) {
  window.history.pushState({}, '', path);
  router();
  window.scrollTo(0, 0);
}

window.addEventListener('popstate', router);

// ===== API =====
async function api(method, url, data, isFormData = false) {
  const opts = { method, credentials: 'include' };
  if (data) {
    if (isFormData) { opts.body = data; }
    else { opts.headers = { 'Content-Type': 'application/json' }; opts.body = JSON.stringify(data); }
  }
  const r = await fetch(url, opts);
  const json = await r.json();
  if (!r.ok) throw new Error(json.error || 'Hata');
  return json;
}

// ===== INIT =====
let siteSettings = {};

async function init() {
  try {
    [currentUser, siteSettings] = await Promise.all([
      api('GET', '/api/me').catch(() => null),
      api('GET', '/api/settings').catch(() => ({}))
    ]);
    applyTheme(siteSettings);
    // Splash logosunu da güncelle
    const splashLogo = document.querySelector('.splash-logo');
    if (splashLogo) splashLogo.textContent = siteSettings.site_name || 'TeaTok';
  } catch (e) { currentUser = null; siteSettings = {}; }
  hideSplash();
  router();
}

function hideSplash() {
  const splash = document.querySelector('.splash');
  if (splash) { splash.classList.add('hidden'); setTimeout(() => splash.remove(), 500); }
}

// ===== TOAST =====
function toast(msg, type = 'info') {
  let tc = document.querySelector('.toast-container');
  if (!tc) { tc = document.createElement('div'); tc.className = 'toast-container'; document.body.appendChild(tc); }
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i> ${msg}`;
  tc.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(16px)'; t.style.transition = '0.3s ease'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ===== THEME =====
function applyTheme(settings) {
  if (!settings) return;
  const root = document.documentElement;
  if (settings.accent_color) root.style.setProperty('--accent', settings.accent_color);
  if (settings.accent_color2) root.style.setProperty('--accent2', settings.accent_color2);
  if (settings.accent_color3) root.style.setProperty('--accent3', settings.accent_color3);
}

// ===== NAVBAR =====
function renderNavbar(siteName) {
  const name = siteName || 'TeaTok';
  return `
    <nav class="navbar">
      <a class="nav-logo" onclick="navigate('/')">${esc(name)}</a>
      <div class="nav-search">
        <i class="fa-solid fa-magnifying-glass search-icon"></i>
        <input type="text" placeholder="Başlık ara..." id="navSearchInput" autocomplete="off" />
        <div class="nav-search-dropdown" id="navSearchDrop"></div>
      </div>
      <div class="nav-spacer"></div>
      <div class="nav-actions">
        ${currentUser ? `
          <button class="btn btn-primary btn-sm" onclick="navigate('/yukle')"><i class="fa-solid fa-arrow-up-from-bracket"></i> <span class="hide-mobile">Yükle</span></button>
          <div class="dropdown" id="userDropdown">
            ${currentUser.avatar
              ? `<img src="${currentUser.avatar}" class="nav-avatar" onclick="toggleDropdown('userDropdown')" />`
              : `<div class="nav-avatar-placeholder" onclick="toggleDropdown('userDropdown')">${currentUser.nickname[0].toUpperCase()}</div>`}
            <div class="dropdown-menu" id="userDropdownMenu">
              <div class="dropdown-item" onclick="navigate('/profil')"><i class="fa-solid fa-user"></i> Profilim</div>
              <div class="dropdown-item" onclick="navigate('/hesap/${currentUser.nickname}')"><i class="fa-solid fa-images"></i> Fotoğraflarım</div>
              ${currentUser.is_admin ? `<div class="dropdown-item" onclick="window.location.href='/admin.html'"><i class="fa-solid fa-shield-halved"></i> Admin Panel</div>` : ''}
              <div class="dropdown-divider"></div>
              <div class="dropdown-item" onclick="logout()"><i class="fa-solid fa-right-from-bracket"></i> Çıkış Yap</div>
            </div>
          </div>
        ` : `
          <button class="btn btn-ghost btn-sm" onclick="navigate('/giris')"><i class="fa-solid fa-right-to-bracket"></i> Giriş</button>
          <button class="btn btn-primary btn-sm" onclick="navigate('/kayit')"><i class="fa-solid fa-user-plus"></i> Kayıt</button>
        `}
      </div>
    </nav>
  `;
}

function toggleDropdown(id) {
  const menu = document.getElementById(id + 'Menu');
  if (menu) menu.classList.toggle('show');
}

document.addEventListener('click', e => {
  document.querySelectorAll('.dropdown-menu.show').forEach(m => {
    if (!m.closest('.dropdown').contains(e.target)) m.classList.remove('show');
  });
  const drop = document.getElementById('navSearchDrop');
  if (drop && !drop.closest('.nav-search')?.contains(e.target)) drop.classList.remove('show');
});

function bindNavSearch() {
  const inp = document.getElementById('navSearchInput');
  const drop = document.getElementById('navSearchDrop');
  if (!inp || !drop) return;
  let timer;
  inp.addEventListener('input', () => {
    clearTimeout(timer);
    const q = inp.value.trim();
    if (!q) { drop.classList.remove('show'); return; }
    timer = setTimeout(async () => {
      try {
        const data = await api('GET', `/api/search?q=${encodeURIComponent(q)}`);
        let html = '';
        if (data.posts.length) {
          html += `<div class="search-section-title"><i class="fa-solid fa-images"></i> Fotoğraflar</div>`;
          data.posts.forEach(p => {
            const thumb = p.image_url
              ? `<img src="${p.image_url}" style="width:44px;height:44px;border-radius:8px;object-fit:cover;flex-shrink:0" />`
              : p.post_type === 'text'
                ? `<div style="width:44px;height:44px;border-radius:8px;background:${p.text_bg||'#1a1a24'};display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="fa-solid fa-align-left" style="color:${p.text_color||'#f1f0f5'};font-size:1rem"></i></div>`
                : `<div style="width:44px;height:44px;border-radius:8px;background:var(--bg4);display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="fa-solid fa-image" style="color:var(--text3)"></i></div>`;
            html += `<div class="search-item" onclick="navigate('/resim/${p.id}');document.getElementById('navSearchDrop').classList.remove('show');document.getElementById('navSearchInput').value=''">
              ${thumb}
              <div class="search-item-info"><div class="search-item-name">${esc(p.title)}</div><div class="search-item-sub"><i class="fa-solid fa-heart" style="color:var(--pink)"></i> ${p.likes_count} &bull; @${esc(p.nickname)}</div></div>
            </div>`;
          });
        }
        if (data.users.length) {
          html += `<div class="search-section-title"><i class="fa-solid fa-users"></i> Kullanıcılar</div>`;
          data.users.forEach(u => {
            html += `<div class="search-item" onclick="navigate('/hesap/${u.nickname}');document.getElementById('navSearchDrop').classList.remove('show');document.getElementById('navSearchInput').value=''">
              ${u.avatar ? `<img src="${u.avatar}" />` : `<div class="nav-avatar-placeholder" style="width:36px;height:36px;font-size:0.75rem">${u.nickname[0].toUpperCase()}</div>`}
              <div class="search-item-info"><div class="search-item-name">@${esc(u.nickname)}</div></div>
            </div>`;
          });
        }
        if (!html) html = `<div style="padding:16px;text-align:center;color:var(--text3);font-size:0.875rem"><i class="fa-solid fa-face-sad-tear"></i> Sonuç bulunamadı</div>`;
        drop.innerHTML = html;
        drop.classList.add('show');
      } catch (e) {}
    }, 300);
  });
}

// ===== HOME =====
let homeState = { page: 1, loading: false, hasMore: true, category: null, posts: [] };

async function renderHome() {
  homeState = { page: 1, loading: false, hasMore: true, category: null, posts: [] };
  const [cats, stats, popular, settings] = await Promise.all([
    api('GET', '/api/categories'),
    api('GET', '/api/stats').catch(() => ({ posts: 0, users: 0, likes: 0 })),
    api('GET', '/api/posts/popular').catch(() => []),
    api('GET', '/api/settings').catch(() => ({}))
  ]);

  const siteName = settings.site_name || 'TeaTok';
  applyTheme(settings);

  app.innerHTML = renderNavbar(siteName) + `
    <div class="main">
      <div class="hero container">
        <div class="hero-title">${esc(siteName)}</div>
        <div class="hero-sub">Fotoğraflarını yükle, dünyayla paylaş, güzellikleri keşfet.</div>
        <div class="hero-stats">
          <div class="hero-stat"><div class="hero-stat-num">${stats.posts}</div><div class="hero-stat-label"><i class="fa-solid fa-images"></i> Fotoğraf</div></div>
          <div class="hero-stat"><div class="hero-stat-num">${stats.users}</div><div class="hero-stat-label"><i class="fa-solid fa-users"></i> Üye</div></div>
          <div class="hero-stat"><div class="hero-stat-num">${stats.likes}</div><div class="hero-stat-label"><i class="fa-solid fa-heart"></i> Beğeni</div></div>
        </div>
      </div>

      ${popular.length ? `
        <div class="grid-section container">
          <div class="section-header">
            <div class="section-title"><i class="fa-solid fa-fire" style="color:var(--pink)"></i> <span>Popüler</span></div>
          </div>
          <div class="popular-grid">
            ${popular.map(p => renderPopularCard(p)).join('')}
          </div>
        </div>
      ` : ''}

      <div class="cat-bar">
        <div class="cat-chip active" onclick="filterCat(null, this)"><i class="fa-solid fa-border-all"></i> Tümü</div>
        ${cats.map(c => `<div class="cat-chip" data-cat="${c.id}" onclick="filterCat(${c.id}, this)"><i class="fa-solid ${c.fa_icon}" style="color:${c.color}"></i> ${esc(c.name)}</div>`).join('')}
      </div>

      <div class="grid-section container">
        <div class="section-header">
          <div class="section-title">Son <span>Fotoğraflar</span></div>
        </div>
        <div class="posts-grid" id="postsGrid"></div>
        <div class="load-more-area" id="loadMoreArea"></div>
      </div>

      <footer class="footer">
        <div class="footer-logo">${siteSettings.site_name || 'TeaTok'}</div>
        <div class="footer-credit">Created by <span>Oshi</span> - CMS Team &bull; Tüm haklar saklıdır.</div>
      </footer>
    </div>
  `;

  bindNavSearch();
  loadMorePosts();
  bindInfiniteScroll();
}

function renderPopularCard(p) {
  const img = p.images && p.images.length ? p.images[0].image_url : '';
  return `<div class="popular-card" onclick="navigate('/resim/${p.id}')">
    ${img ? `<img src="${img}" loading="lazy" />` : ''}
    <div class="popular-card-overlay">
      <div class="popular-card-title">${esc(p.title)}</div>
      <div class="popular-card-likes"><i class="fa-solid fa-heart"></i> ${p.likes_count}</div>
    </div>
  </div>`;
}

async function filterCat(catId, el) {
  homeState.category = catId;
  homeState.page = 1;
  homeState.hasMore = true;
  homeState.posts = [];
  document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  const grid = document.getElementById('postsGrid');
  if (grid) grid.innerHTML = '<div class="spinner"></div>';
  const lm = document.getElementById('loadMoreArea');
  if (lm) lm.innerHTML = '';
  await loadMorePosts();
  bindInfiniteScroll();
}

async function loadMorePosts() {
  if (homeState.loading || !homeState.hasMore) return;
  homeState.loading = true;
  const lm = document.getElementById('loadMoreArea');
  if (lm && homeState.page > 1) lm.innerHTML = '<div class="spinner"></div>';
  try {
    let url = `/api/posts?page=${homeState.page}&limit=12`;
    if (homeState.category) url += `&category=${homeState.category}`;
    const data = await api('GET', url);
    const grid = document.getElementById('postsGrid');
    if (!grid) return;
    if (homeState.page === 1) grid.innerHTML = '';
    if (!data.posts.length && homeState.page === 1) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-images"></i><h3>Hiç fotoğraf yok</h3><p>İlk fotoğrafı yüklemek ister misin?</p>${currentUser ? `<button class="btn btn-primary" onclick="navigate('/yukle')" style="margin-top:16px"><i class="fa-solid fa-plus"></i> Yükle</button>` : ''}</div>`;
    } else {
      data.posts.forEach(p => {
        const el = document.createElement('div');
        el.innerHTML = renderPostCard(p);
        grid.appendChild(el.firstElementChild);
      });
    }
    homeState.posts.push(...data.posts);
    homeState.page++;
    homeState.hasMore = data.posts.length === 12;
    if (lm) lm.innerHTML = homeState.hasMore ? '' : `<div style="color:var(--text3);font-size:0.8rem;padding:20px"><i class="fa-solid fa-check-double"></i> Tüm fotoğraflar yüklendi</div>`;
  } catch (e) {
    if (lm) lm.innerHTML = '';
  }
  homeState.loading = false;
}

function bindInfiniteScroll() {
  const observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) loadMorePosts();
  }, { rootMargin: '200px' });
  const sentinel = document.getElementById('loadMoreArea');
  if (sentinel) observer.observe(sentinel);
}

function renderPostCard(p) {
  const hasMulti = p.images && p.images.length > 1;
  let mediaHtml = '';

  if (!p.images || !p.images.length) {
    mediaHtml = `<div class="post-card-media" style="background:var(--bg3);display:flex;align-items:center;justify-content:center"><i class="fa-solid fa-image" style="font-size:2rem;color:var(--text3)"></i></div>`;
  } else if (p.images.length === 1) {
    mediaHtml = `<div class="post-card-media"><img src="${p.images[0].image_url}" loading="lazy" alt="${esc(p.title)}" /></div>`;
  } else {
    const count = p.images.length;
    const colClass = count === 2 ? 'count-2' : count === 3 ? 'count-3' : 'count-multi';
    const show = Math.min(count, 4);
    let imgs = p.images.slice(0, show).map((img, i) => {
      if (i === 3 && count > 4) return `<div class="collage-img"><img src="${img.image_url}" loading="lazy" /><div class="collage-more">+${count - 3}</div></div>`;
      return `<div class="collage-img"><img src="${img.image_url}" loading="lazy" /></div>`;
    }).join('');
    mediaHtml = `<div class="post-card-collage ${colClass}">${imgs}</div>`;
  }

  const catBadge = p.category ? `<div class="badge-cat" style="background:${p.category.color}22;color:${p.category.color};border:1px solid ${p.category.color}44"><i class="fa-solid ${p.category.fa_icon}"></i> ${esc(p.category.name)}</div>` : '';
  const privateBadge = p.is_private ? `<div class="badge badge-private"><i class="fa-solid fa-lock"></i></div>` : '';
  const multiBadge = hasMulti ? `<div class="multi-badge"><i class="fa-regular fa-images"></i> ${p.images.length}</div>` : '';
  const avatarHtml = p.avatar
    ? `<img src="${p.avatar}" class="user-avatar-sm" />`
    : `<div class="user-avatar-sm">${p.nickname[0].toUpperCase()}</div>`;

  const route = p.is_private ? `/gizli/${p.secret_id}` : `/resim/${p.id}`;

  return `<div class="post-card" onclick="navigate('${route}')">
    ${mediaHtml}
    <div class="post-card-badge">${privateBadge}${catBadge}</div>
    ${multiBadge}
    <div class="post-card-body">
      <div class="post-card-title">${esc(p.title)}</div>
      <div class="post-card-footer">
        <div class="post-card-user" onclick="event.stopPropagation();navigate('/hesap/${p.nickname}')">
          ${avatarHtml}<span>@${esc(p.nickname)}</span>
        </div>
        <div class="post-card-actions">
          <button class="action-btn ${p.liked_by_me ? 'liked' : ''}" onclick="event.stopPropagation();toggleLikeCard('${p.id}',this)">
            <i class="fa-${p.liked_by_me ? 'solid' : 'regular'} fa-heart"></i> <span>${p.likes_count}</span>
          </button>
          <span class="action-btn"><i class="fa-regular fa-comment"></i> ${p.comments_count}</span>
        </div>
      </div>
    </div>
  </div>`;
}

async function toggleLikeCard(id, btn) {
  if (!currentUser) { navigate('/giris'); return; }
  try {
    const data = await api('POST', `/api/posts/${id}/like`);
    btn.classList.toggle('liked', data.liked);
    btn.querySelector('i').className = `fa-${data.liked ? 'solid' : 'regular'} fa-heart`;
    btn.querySelector('span').textContent = data.likes_count;
  } catch (e) { toast(e.message, 'error'); }
}

// ===== POST DETAIL =====
async function renderPostDetail(id) {
  app.innerHTML = renderNavbar(siteSettings.site_name) + `<div class="main"><div class="spinner"></div></div>`;
  bindNavSearch();
  try {
    const post = await api('GET', `/api/resim/${id}`);
    renderPostDetailContent(post);
  } catch (e) {
    app.innerHTML = renderNavbar(siteSettings.site_name) + `<div class="main"><div class="empty-state" style="padding-top:80px"><i class="fa-solid fa-triangle-exclamation"></i><h3>Gönderi bulunamadı</h3><p>${e.message}</p><button class="btn btn-primary" onclick="navigate('/')" style="margin-top:16px"><i class="fa-solid fa-house"></i> Ana Sayfa</button></div></div>`;
    bindNavSearch();
  }
}

async function renderPrivatePost(secretId) {
  if (!currentUser) { navigate('/giris'); return; }
  app.innerHTML = renderNavbar(siteSettings.site_name) + `<div class="main"><div class="spinner"></div></div>`;
  bindNavSearch();
  try {
    const post = await api('GET', `/api/gizli/${secretId}`);
    renderPostDetailContent(post, true);
  } catch (e) {
    app.innerHTML = renderNavbar(siteSettings.site_name) + `<div class="main"><div class="empty-state" style="padding-top:80px"><i class="fa-solid fa-lock"></i><h3>Erişim Engellendi</h3><p>${e.message}</p><button class="btn btn-primary" onclick="navigate('/')" style="margin-top:16px"><i class="fa-solid fa-house"></i> Ana Sayfa</button></div></div>`;
    bindNavSearch();
  }
}

let galleryIdx = 0;

function renderPostDetailContent(post, isPrivate = false) {
  galleryIdx = 0;
  const imgs = post.images || [];
  const isOwner = currentUser && currentUser.id === post.user_id;
  const shareUrl = isPrivate ? window.location.href : `${window.location.origin}/resim/${post.id}`;

  const galleryHtml = imgs.length ? `
    <div class="post-detail-gallery">
      <div class="gallery-main" id="galleryMain">
        <img id="galleryImg" src="${imgs[0].image_url}" alt="${esc(post.title)}" />
        ${imgs.length > 1 ? `
          <button class="gallery-nav gallery-nav-prev" onclick="changeGallery(-1)"><i class="fa-solid fa-chevron-left"></i></button>
          <button class="gallery-nav gallery-nav-next" onclick="changeGallery(1)"><i class="fa-solid fa-chevron-right"></i></button>
          <div class="gallery-counter" id="galleryCounter">1 / ${imgs.length}</div>
        ` : ''}
      </div>
      ${imgs.length > 1 ? `
        <div class="gallery-thumbs">
          ${imgs.map((img, i) => `<img src="${img.image_url}" class="gallery-thumb ${i === 0 ? 'active' : ''}" onclick="setGallery(${i})" loading="lazy" />`).join('')}
        </div>
      ` : ''}
    </div>
  ` : '';

  const catHtml = post.category ? `<span class="post-cat-tag" style="background:${post.category.color}22;color:${post.category.color};border:1px solid ${post.category.color}44"><i class="fa-solid ${post.category.fa_icon}"></i> ${esc(post.category.name)}</span>` : '';
  const avatarHtml = post.avatar
    ? `<img src="${post.avatar}" class="post-user-avatar" />`
    : `<div class="post-user-avatar" style="background:linear-gradient(135deg,var(--accent),var(--pink));display:flex;align-items:center;justify-content:center;font-weight:800;font-family:var(--font-brand)">${post.nickname[0].toUpperCase()}</div>`;

  app.innerHTML = renderNavbar(siteSettings.site_name) + `
    <div class="main">
      <div class="post-detail">
        <button class="post-detail-back" onclick="navigate('/')"><i class="fa-solid fa-arrow-left"></i> Geri Dön</button>
        ${galleryHtml}
        <div class="post-detail-info">
          <div class="post-detail-header">
            <div class="post-detail-title">${esc(post.title)}</div>
            <div class="post-detail-actions">
              <button class="like-btn-lg ${post.liked_by_me ? 'liked' : ''}" id="likeBtn" onclick="toggleLikeDetail('${post.id}')">
                <i class="fa-${post.liked_by_me ? 'solid' : 'regular'} fa-heart"></i>
                <span id="likeCount">${post.likes_count}</span>
              </button>
              <button class="share-btn" onclick="copyLink('${shareUrl}')">
                <i class="fa-solid fa-link"></i> Linki Kopyala
              </button>
              ${isOwner ? `<button class="btn btn-danger btn-sm" onclick="deletePost('${post.id}')"><i class="fa-solid fa-trash"></i></button>` : ''}
            </div>
          </div>
          <div class="post-detail-meta">
            <a class="post-user-link" onclick="navigate('/hesap/${post.nickname}')">
              ${avatarHtml}
              <span class="post-username">@${esc(post.nickname)}</span>
            </a>
            <span class="post-detail-date"><i class="fa-regular fa-clock"></i> ${getTimeAgo(post.created_at)}</span>
            ${catHtml}
            ${post.is_private ? `<span class="badge badge-private"><i class="fa-solid fa-lock"></i> Gizli</span>` : ''}
            ${imgs.length > 1 ? `<span style="color:var(--text3);font-size:0.82rem"><i class="fa-regular fa-images"></i> ${imgs.length} fotoğraf</span>` : ''}
          </div>
          ${post.description ? `<div class="post-description">${esc(post.description)}</div>` : ''}
        </div>
        <div class="comments-section" id="commentsSection">
          <div class="comments-title"><i class="fa-regular fa-comments"></i> Yorumlar</div>
          ${currentUser ? `
            <div class="comment-form">
              <textarea id="commentInput" placeholder="Yorum yaz..." rows="2"></textarea>
              <button class="btn btn-primary btn-sm" onclick="submitComment('${post.id}')"><i class="fa-solid fa-paper-plane"></i></button>
            </div>
          ` : `<div style="margin-bottom:16px;color:var(--text3);font-size:0.875rem"><i class="fa-solid fa-info-circle"></i> Yorum yapmak için <a onclick="navigate('/giris')" style="color:var(--accent3);cursor:pointer">giriş yap</a></div>`}
          <div id="commentsList"><div class="spinner" style="margin:20px auto;width:24px;height:24px;border-width:2px"></div></div>
        </div>
      </div>
      <footer class="footer">
        <div class="footer-logo">${siteSettings.site_name || 'TeaTok'}</div>
        <div class="footer-credit">Created by <span>Oshi</span> - CMS Team</div>
      </footer>
    </div>
  `;

  bindNavSearch();
  window._galleryImgs = imgs;
  loadComments(post.id);
}

function changeGallery(dir) {
  const imgs = window._galleryImgs;
  if (!imgs) return;
  galleryIdx = (galleryIdx + dir + imgs.length) % imgs.length;
  setGallery(galleryIdx);
}

function setGallery(idx) {
  const imgs = window._galleryImgs;
  if (!imgs) return;
  galleryIdx = idx;
  document.getElementById('galleryImg').src = imgs[idx].image_url;
  const counter = document.getElementById('galleryCounter');
  if (counter) counter.textContent = `${idx + 1} / ${imgs.length}`;
  document.querySelectorAll('.gallery-thumb').forEach((t, i) => t.classList.toggle('active', i === idx));
}

async function toggleLikeDetail(id) {
  if (!currentUser) { navigate('/giris'); return; }
  try {
    const data = await api('POST', `/api/posts/${id}/like`);
    const btn = document.getElementById('likeBtn');
    const cnt = document.getElementById('likeCount');
    btn.classList.toggle('liked', data.liked);
    btn.querySelector('i').className = `fa-${data.liked ? 'solid' : 'regular'} fa-heart`;
    cnt.textContent = data.likes_count;
  } catch (e) { toast(e.message, 'error'); }
}

function copyLink(url) {
  navigator.clipboard.writeText(url).then(() => toast('Link kopyalandı', 'success')).catch(() => {
    const inp = document.createElement('input');
    inp.value = url; document.body.appendChild(inp); inp.select(); document.execCommand('copy'); inp.remove();
    toast('Link kopyalandı', 'success');
  });
}

async function deletePost(id) {
  if (!confirm('Bu gönderiyi silmek istediğinden emin misin?')) return;
  try {
    await api('DELETE', `/api/posts/${id}`);
    toast('Gönderi silindi', 'success');
    navigate('/');
  } catch (e) { toast(e.message, 'error'); }
}

async function loadComments(postId) {
  try {
    const comments = await api('GET', `/api/posts/${postId}/comments`);
    const list = document.getElementById('commentsList');
    if (!list) return;
    if (!comments.length) {
      list.innerHTML = `<div class="no-comments"><i class="fa-regular fa-comment"></i>Henüz yorum yok. İlk yorumu sen yap!</div>`;
      return;
    }
    list.innerHTML = comments.map(c => renderComment(c, postId)).join('');
  } catch (e) {}
}

function renderComment(c, postId) {
  const avatarHtml = c.avatar ? `<img src="${c.avatar}" class="comment-avatar" />` : `<div class="comment-avatar">${c.nickname[0].toUpperCase()}</div>`;
  const isOwn = currentUser && currentUser.id === c.user_id;
  return `<div class="comment-item" id="comment-${c.id}">
    ${avatarHtml}
    <div class="comment-body">
      <div class="comment-header">
        <span class="comment-user" onclick="navigate('/hesap/${c.nickname}')">@${esc(c.nickname)}</span>
        <span class="comment-time">${getTimeAgo(c.created_at)}</span>
        ${isOwn ? `
          <button class="comment-action-btn" onclick="editComment('${c.id}','${postId}')" title="Düzenle"><i class="fa-solid fa-pen"></i></button>
          <button class="comment-action-btn danger" onclick="deleteComment('${c.id}','${postId}')" title="Sil"><i class="fa-solid fa-trash"></i></button>
        ` : ''}
      </div>
      <div class="comment-text" id="comment-text-${c.id}">${esc(c.content)}</div>
      <div class="comment-edit-form" id="comment-edit-${c.id}" style="display:none;margin-top:8px">
        <textarea class="form-textarea" id="comment-edit-input-${c.id}" style="min-height:60px;font-size:0.875rem">${esc(c.content)}</textarea>
        <div style="display:flex;gap:6px;margin-top:6px">
          <button class="btn btn-primary btn-sm" onclick="saveCommentEdit('${c.id}','${postId}')"><i class="fa-solid fa-check"></i> Kaydet</button>
          <button class="btn btn-ghost btn-sm" onclick="cancelCommentEdit('${c.id}')"><i class="fa-solid fa-xmark"></i> İptal</button>
        </div>
      </div>
    </div>
  </div>`;
}

function editComment(cid, postId) {
  document.getElementById(`comment-text-${cid}`).style.display = 'none';
  document.getElementById(`comment-edit-${cid}`).style.display = 'block';
  const inp = document.getElementById(`comment-edit-input-${cid}`);
  if (inp) { inp.focus(); inp.selectionStart = inp.value.length; }
}

function cancelCommentEdit(cid) {
  document.getElementById(`comment-text-${cid}`).style.display = 'block';
  document.getElementById(`comment-edit-${cid}`).style.display = 'none';
}

async function saveCommentEdit(cid, postId) {
  const inp = document.getElementById(`comment-edit-input-${cid}`);
  if (!inp || !inp.value.trim()) return;
  try {
    const updated = await api('PUT', `/api/comments/${cid}`, { content: inp.value.trim() });
    document.getElementById(`comment-text-${cid}`).textContent = updated.content;
    cancelCommentEdit(cid);
    toast('Yorum güncellendi', 'success');
  } catch (e) { toast(e.message, 'error'); }
}

async function submitComment(postId) {
  const inp = document.getElementById('commentInput');
  if (!inp || !inp.value.trim()) return;
  try {
    const comment = await api('POST', `/api/posts/${postId}/comments`, { content: inp.value.trim() });
    inp.value = '';
    const list = document.getElementById('commentsList');
    const noC = list.querySelector('.no-comments');
    if (noC) noC.remove();
    list.insertAdjacentHTML('beforeend', renderComment(comment, postId));
    list.lastElementChild.scrollIntoView({ behavior: 'smooth' });
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteComment(cid, postId) {
  try {
    await api('DELETE', `/api/comments/${cid}`);
    await loadComments(postId);
  } catch (e) { toast(e.message, 'error'); }
}

// ===== PROFILE PAGE =====
async function renderProfile(nickname) {
  app.innerHTML = renderNavbar(siteSettings.site_name) + `<div class="main"><div class="spinner"></div></div>`;
  bindNavSearch();
  try {
    const data = await api('GET', `/api/hesap/${nickname}`);
    renderProfileContent(data);
  } catch (e) {
    app.innerHTML = renderNavbar(siteSettings.site_name) + `<div class="main"><div class="empty-state" style="padding-top:80px"><i class="fa-solid fa-user-slash"></i><h3>Kullanıcı bulunamadı</h3><button class="btn btn-primary" onclick="navigate('/')" style="margin-top:16px"><i class="fa-solid fa-house"></i> Ana Sayfa</button></div></div>`;
    bindNavSearch();
  }
}

function renderProfileContent(data) {
  const { user, posts, totalLikes, totalPosts, isOwner } = data;
  const avatarHtml = user.avatar
    ? `<img src="${user.avatar}" class="profile-avatar" />`
    : `<div class="profile-avatar-placeholder">${user.nickname[0].toUpperCase()}</div>`;

  const allPosts = posts.filter(p => !p.is_private);
  const privatePosts = posts.filter(p => p.is_private);

  app.innerHTML = renderNavbar(siteSettings.site_name) + `
    <div class="main">
      <div class="profile-page">
        <div class="profile-header">
          <div class="profile-avatar-wrap">${avatarHtml}</div>
          <div class="profile-info">
            <div class="profile-nickname">@${esc(user.nickname)}</div>
            ${user.bio ? `<div class="profile-bio">${esc(user.bio)}</div>` : ''}
            <div class="profile-stats">
              <div class="profile-stat"><div class="profile-stat-num">${totalPosts}</div><div class="profile-stat-label"><i class="fa-solid fa-images"></i> Fotoğraf</div></div>
              <div class="profile-stat"><div class="profile-stat-num">${totalLikes}</div><div class="profile-stat-label"><i class="fa-solid fa-heart"></i> Beğeni</div></div>
              ${isOwner ? `<div class="profile-stat"><div class="profile-stat-num">${privatePosts.length}</div><div class="profile-stat-label"><i class="fa-solid fa-lock"></i> Gizli</div></div>` : ''}
            </div>
          </div>
          <div class="profile-actions">
            ${isOwner ? `<button class="btn btn-primary" onclick="navigate('/yukle')"><i class="fa-solid fa-arrow-up-from-bracket"></i> Yükle</button><button class="btn btn-ghost" onclick="navigate('/profil')"><i class="fa-solid fa-pen"></i> Düzenle</button>` : ''}
          </div>
        </div>

        ${isOwner ? `
          <div class="profile-tabs">
            <div class="profile-tab active" id="tabPublic" onclick="switchTab('public')"><i class="fa-solid fa-images"></i> Fotoğraflar</div>
            <div class="profile-tab" id="tabPrivate" onclick="switchTab('private')"><i class="fa-solid fa-lock"></i> Gizli (${privatePosts.length})</div>
          </div>
        ` : ''}

        <div id="profilePostsGrid" class="posts-grid">
          ${allPosts.length ? allPosts.map(p => renderPostCard(p)).join('') : `<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-images"></i><h3>Henüz fotoğraf yok</h3></div>`}
        </div>
      </div>
      <footer class="footer">
        <div class="footer-logo">${siteSettings.site_name || 'TeaTok'}</div>
        <div class="footer-credit">Created by <span>Oshi</span> - CMS Team</div>
      </footer>
    </div>
  `;
  bindNavSearch();
  window._profileData = data;
}

function switchTab(tab) {
  const data = window._profileData;
  if (!data) return;
  document.getElementById('tabPublic')?.classList.toggle('active', tab === 'public');
  document.getElementById('tabPrivate')?.classList.toggle('active', tab === 'private');
  const grid = document.getElementById('profilePostsGrid');
  const posts = tab === 'private' ? data.posts.filter(p => p.is_private) : data.posts.filter(p => !p.is_private);
  grid.innerHTML = posts.length ? posts.map(p => renderPostCard(p)).join('') : `<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-images"></i><h3>Henüz fotoğraf yok</h3></div>`;
}

// ===== MY PROFILE EDIT =====
async function renderMyProfile() {
  if (!currentUser) { navigate('/giris'); return; }
  app.innerHTML = renderNavbar(siteSettings.site_name) + `
    <div class="main">
      <div class="upload-page">
        <div class="upload-card">
          <div class="upload-title">Profil Ayarları</div>
          <div class="upload-subtitle"><i class="fa-solid fa-user-pen"></i> Bilgilerini güncelle</div>
          <div id="profileEditMsg"></div>
          <div class="form-group">
            <label class="form-label"><i class="fa-solid fa-image"></i> Profil Fotoğrafı</label>
            <input type="file" id="avatarInput" accept="image/*" class="form-input" style="padding:8px" />
          </div>
          <div class="form-group">
            <label class="form-label"><i class="fa-solid fa-align-left"></i> Bio</label>
            <textarea class="form-textarea" id="bioInput" placeholder="Kendinizi tanıtın...">${esc(currentUser.bio || '')}</textarea>
          </div>
          <button class="btn btn-primary" style="width:100%" onclick="saveProfile()">
            <i class="fa-solid fa-floppy-disk"></i> Kaydet
          </button>
        </div>
      </div>
      <footer class="footer">
        <div class="footer-logo">${siteSettings.site_name || 'TeaTok'}</div>
        <div class="footer-credit">Created by <span>Oshi</span> - CMS Team</div>
      </footer>
    </div>
  `;
  bindNavSearch();
}

async function saveProfile() {
  const bio = document.getElementById('bioInput')?.value || '';
  const avatarInput = document.getElementById('avatarInput');
  const msgEl = document.getElementById('profileEditMsg');
  const fd = new FormData();
  fd.append('bio', bio);
  if (avatarInput?.files[0]) fd.append('avatar', avatarInput.files[0]);
  try {
    const user = await api('PUT', '/api/profile', fd, true);
    currentUser = user;
    msgEl.innerHTML = `<div class="success-msg"><i class="fa-solid fa-check"></i> Profil güncellendi</div>`;
    setTimeout(() => navigate('/hesap/' + user.nickname), 1000);
  } catch (e) {
    msgEl.innerHTML = `<div class="error-msg"><i class="fa-solid fa-xmark"></i> ${e.message}</div>`;
  }
}

// ===== UPLOAD =====
async function renderUpload() {
  if (!currentUser) { navigate('/giris'); return; }
  const cats = await api('GET', '/api/categories').catch(() => []);
  let selectedFiles = [];
  let isPrivate = false;

  app.innerHTML = renderNavbar(siteSettings.site_name) + `
    <div class="main">
      <div class="upload-page">
        <div class="upload-card">
          <div class="upload-title">Fotoğraf Yükle</div>
          <div class="upload-subtitle">Tek veya çoklu fotoğraf yükleyebilirsin (maks 10)</div>
          <div id="uploadMsg"></div>
          <div class="dropzone" id="dropzone">
            <input type="file" id="fileInput" accept="image/*" multiple />
            <div class="dropzone-icon"><i class="fa-solid fa-cloud-arrow-up"></i></div>
            <div class="dropzone-text">Fotoğrafları buraya sürükle veya tıkla</div>
            <div class="dropzone-sub">JPG, PNG, GIF, WebP - Maks 20MB / dosya</div>
          </div>
          <div class="preview-grid" id="previewGrid"></div>
          <div class="form-group">
            <label class="form-label"><i class="fa-solid fa-heading"></i> Başlık *</label>
            <input type="text" class="form-input" id="titleInput" placeholder="Fotoğrafına bir başlık ver..." maxlength="100" />
          </div>
          <div class="form-group">
            <label class="form-label"><i class="fa-solid fa-align-left"></i> Açıklama</label>
            <textarea class="form-textarea" id="descInput" placeholder="Fotoğrafın hakkında bir şeyler yaz..."></textarea>
          </div>
          <div class="form-group">
            <label class="form-label"><i class="fa-solid fa-tag"></i> Kategori</label>
            <select class="form-select" id="catSelect">
              <option value="">-- Kategori Seç --</option>
              ${cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <div class="privacy-toggle" id="privacyToggle" onclick="togglePrivacy()">
              <div class="privacy-toggle-info">
                <div class="privacy-toggle-icon" id="privacyIcon"><i class="fa-solid fa-globe"></i></div>
                <div>
                  <div class="privacy-toggle-text" id="privacyText">Herkese Açık</div>
                  <div class="privacy-toggle-sub" id="privacySub">Herkes görebilir</div>
                </div>
              </div>
              <div class="toggle-switch" id="privacySwitch"></div>
            </div>
          </div>
          <button class="btn btn-primary" style="width:100%;padding:14px" id="submitBtn" onclick="submitPost()">
            <i class="fa-solid fa-arrow-up-from-bracket"></i> Yükle
          </button>
        </div>
      </div>
      <footer class="footer">
        <div class="footer-logo">${siteSettings.site_name || 'TeaTok'}</div>
        <div class="footer-credit">Created by <span>Oshi</span> - CMS Team</div>
      </footer>
    </div>
  `;
  bindNavSearch();

  const fileInput = document.getElementById('fileInput');
  const dropzone = document.getElementById('dropzone');
  const previewGrid = document.getElementById('previewGrid');

  fileInput.addEventListener('change', () => handleFiles(Array.from(fileInput.files)));
  dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    handleFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')));
  });

  function handleFiles(files) {
    files.forEach(f => {
      if (selectedFiles.length >= 10) { toast('Maks 10 fotoğraf seçebilirsin', 'error'); return; }
      if (selectedFiles.find(x => x.name === f.name && x.size === f.size)) return;
      selectedFiles.push(f);
      const reader = new FileReader();
      reader.onload = ev => {
        const div = document.createElement('div');
        div.className = 'preview-item';
        const idx = selectedFiles.length - 1;
        div.dataset.idx = idx;
        div.innerHTML = `<img src="${ev.target.result}" /><button class="preview-remove" onclick="removePreview(this.closest('.preview-item'))"><i class="fa-solid fa-xmark"></i></button>`;
        previewGrid.appendChild(div);
      };
      reader.readAsDataURL(f);
    });
  }

  window.removePreview = (el) => {
    const items = Array.from(previewGrid.querySelectorAll('.preview-item'));
    const idx = items.indexOf(el);
    if (idx !== -1) selectedFiles.splice(idx, 1);
    el.remove();
  };

  window.togglePrivacy = () => {
    isPrivate = !isPrivate;
    document.getElementById('privacySwitch').classList.toggle('on', isPrivate);
    document.getElementById('privacyText').textContent = isPrivate ? 'Sadece Ben' : 'Herkese Açık';
    document.getElementById('privacySub').textContent = isPrivate ? 'Sadece sen görebilirsin - URL gizli olacak' : 'Herkes görebilir';
    document.getElementById('privacyIcon').className = `privacy-toggle-icon${isPrivate ? ' private' : ''}`;
    document.getElementById('privacyIcon').innerHTML = `<i class="fa-solid ${isPrivate ? 'fa-lock' : 'fa-globe'}"></i>`;
  };

  window.submitPost = async () => {
    const title = document.getElementById('titleInput')?.value.trim();
    const desc = document.getElementById('descInput')?.value.trim();
    const catId = document.getElementById('catSelect')?.value;
    const msgEl = document.getElementById('uploadMsg');
    const btn = document.getElementById('submitBtn');

    if (!title) { msgEl.innerHTML = `<div class="error-msg"><i class="fa-solid fa-xmark"></i> Başlık gerekli</div>`; return; }
    if (!selectedFiles.length) { msgEl.innerHTML = `<div class="error-msg"><i class="fa-solid fa-xmark"></i> En az bir fotoğraf seç</div>`; return; }

    const fd = new FormData();
    fd.append('title', title);
    fd.append('description', desc || '');
    if (catId) fd.append('category_id', catId);
    fd.append('is_private', isPrivate ? 'true' : 'false');
    selectedFiles.forEach(f => fd.append('images', f));

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Yükleniyor...';
    msgEl.innerHTML = '';

    try {
      const post = await api('POST', '/api/posts', fd, true);
      toast('Fotoğraf yüklendi!', 'success');
      if (post.is_private) navigate(`/gizli/${post.secret_id}`);
      else navigate(`/resim/${post.id}`);
    } catch (e) {
      msgEl.innerHTML = `<div class="error-msg"><i class="fa-solid fa-xmark"></i> ${e.message}</div>`;
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-arrow-up-from-bracket"></i> Yükle';
    }
  };
}

// ===== AUTH =====
function renderLogin() {
  app.innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-logo">TeaTok</div>
        <div class="auth-tagline">Fotoğraflarını paylaşmanın en güzel yolu</div>
        <div class="auth-title"><i class="fa-solid fa-right-to-bracket"></i> Giriş Yap</div>
        <div id="loginMsg"></div>
        <div class="form-group">
          <label class="form-label"><i class="fa-solid fa-at"></i> Kullanıcı Adı</label>
          <input type="text" class="form-input" id="loginNick" placeholder="kullaniciadi" autocomplete="username" />
        </div>
        <div class="form-group">
          <label class="form-label"><i class="fa-solid fa-lock"></i> Şifre</label>
          <input type="password" class="form-input" id="loginPass" placeholder="••••••••" autocomplete="current-password" onkeydown="if(event.key==='Enter')doLogin()" />
        </div>
        <button class="btn btn-primary" style="width:100%;padding:13px;margin-top:4px" onclick="doLogin()">
          <i class="fa-solid fa-right-to-bracket"></i> Giriş Yap
        </button>
        <div class="auth-footer">Hesabın yok mu? <a onclick="navigate('/kayit')">Kayıt Ol</a></div>
        <div class="auth-credit">Created by <strong>Oshi</strong> - CMS Team</div>
      </div>
    </div>
  `;
}

async function doLogin() {
  const nickname = document.getElementById('loginNick')?.value.trim();
  const password = document.getElementById('loginPass')?.value;
  const msgEl = document.getElementById('loginMsg');
  if (!nickname || !password) { msgEl.innerHTML = `<div class="error-msg"><i class="fa-solid fa-xmark"></i> Tüm alanları doldur</div>`; return; }
  try {
    const data = await api('POST', '/api/login', { nickname, password });
    currentUser = data.user;
    toast('Hoşgeldin, @' + data.user.nickname, 'success');
    navigate('/');
  } catch (e) {
    document.getElementById('loginMsg').innerHTML = `<div class="error-msg"><i class="fa-solid fa-xmark"></i> ${e.message}</div>`;
  }
}

function renderRegister() {
  app.innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-logo">TeaTok</div>
        <div class="auth-tagline">Hemen katıl, fotoğraflarını paylaş</div>
        <div class="auth-title"><i class="fa-solid fa-user-plus"></i> Kayıt Ol</div>
        <div id="regMsg"></div>
        <div class="form-group">
          <label class="form-label"><i class="fa-solid fa-at"></i> Kullanıcı Adı (Nickname)</label>
          <input type="text" class="form-input" id="regNick" placeholder="ornekkullanici" autocomplete="username" />
          <div style="font-size:0.75rem;color:var(--text3);margin-top:4px"><i class="fa-solid fa-circle-info"></i> Harf, rakam, _ ve . kullanabilirsin</div>
        </div>
        <div class="form-group">
          <label class="form-label"><i class="fa-solid fa-lock"></i> Şifre</label>
          <input type="password" class="form-input" id="regPass" placeholder="••••••••" autocomplete="new-password" onkeydown="if(event.key==='Enter')doRegister()" />
        </div>
        <button class="btn btn-primary" style="width:100%;padding:13px;margin-top:4px" onclick="doRegister()">
          <i class="fa-solid fa-user-plus"></i> Kayıt Ol
        </button>
        <div class="auth-footer">Zaten hesabın var mı? <a onclick="navigate('/giris')">Giriş Yap</a></div>
        <div class="auth-credit">Created by <strong>Oshi</strong> - CMS Team</div>
      </div>
    </div>
  `;
}

async function doRegister() {
  const nickname = document.getElementById('regNick')?.value.trim();
  const password = document.getElementById('regPass')?.value;
  const msgEl = document.getElementById('regMsg');
  if (!nickname || !password) { msgEl.innerHTML = `<div class="error-msg"><i class="fa-solid fa-xmark"></i> Tüm alanları doldur</div>`; return; }
  try {
    const data = await api('POST', '/api/register', { nickname, password });
    currentUser = data.user;
    toast('Hoşgeldin, @' + data.user.nickname, 'success');
    navigate('/');
  } catch (e) {
    document.getElementById('regMsg').innerHTML = `<div class="error-msg"><i class="fa-solid fa-xmark"></i> ${e.message}</div>`;
  }
}

async function logout() {
  await api('POST', '/api/logout');
  currentUser = null;
  navigate('/');
}

// ===== UTILS =====
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getTimeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'az önce';
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} saat önce`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} gün önce`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} ay önce`;
  return `${Math.floor(mo / 12)} yıl önce`;
}

// ===== START =====
init();


