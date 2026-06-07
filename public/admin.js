// ===== TeaTok - ADMIN.JS =====
const adminApp = document.getElementById('adminApp');
let adminUser = null;

const FA_ICONS = [
  'fa-tag','fa-tree','fa-city','fa-palette','fa-utensils','fa-plane',
  'fa-paw','fa-microchip','fa-camera','fa-mountain','fa-water','fa-sun',
  'fa-moon','fa-star','fa-heart','fa-fire','fa-bolt','fa-leaf',
  'fa-snowflake','fa-cloud','fa-rainbow','fa-fish','fa-horse','fa-cat',
  'fa-dog','fa-crow','fa-dragon','fa-feather','fa-seedling','fa-flower',
  'fa-music','fa-film','fa-book','fa-gamepad','fa-football','fa-basketball',
  'fa-volleyball','fa-bicycle','fa-car','fa-train','fa-ship','fa-rocket',
  'fa-globe','fa-map','fa-compass','fa-home','fa-building','fa-store',
  'fa-dumbbell','fa-person-running','fa-person-swimming','fa-person-hiking',
  'fa-shirt','fa-hat-wizard','fa-glasses','fa-gem','fa-crown','fa-trophy',
  'fa-medal','fa-flag','fa-landmark','fa-church','fa-mosque','fa-synagogue',
  'fa-university','fa-hospital','fa-school','fa-shop','fa-warehouse',
  'fa-laptop','fa-mobile','fa-tablet','fa-desktop','fa-keyboard',
  'fa-robot','fa-brain','fa-eye','fa-hand','fa-ear','fa-nose',
  'fa-pizza-slice','fa-hamburger','fa-hot-dog','fa-ice-cream','fa-cookie',
  'fa-cake','fa-candy-cane','fa-carrot','fa-apple-whole','fa-lemon',
  'fa-mug-hot','fa-wine-glass','fa-beer','fa-cocktail','fa-bottle-water'
];

async function adminApi(method, url, data, isFormData = false) {
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

function adminToast(msg, type = 'info') {
  let tc = document.querySelector('.toast-container');
  if (!tc) { tc = document.createElement('div'); tc.className = 'toast-container'; document.body.appendChild(tc); }
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i> ${msg}`;
  tc.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = '0.3s'; setTimeout(() => t.remove(), 300); }, 3000);
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getTimeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'az once';
  if (m < 60) return `${m} dk`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} saat`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} gun`;
  return `${Math.floor(d / 30)} ay`;
}

async function adminInit() {
  try {
    adminUser = await adminApi('GET', '/api/me');
    if (!adminUser.is_admin) {
      document.body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0a0f;font-family:Syne,sans-serif;text-align:center;color:#f1f0f5">
        <div>
          <div style="font-size:3rem;color:#ef4444;margin-bottom:16px"><i class="fa-solid fa-ban"></i></div>
          <div style="font-size:1.5rem;font-weight:800;margin-bottom:8px">Erisim Engellendi</div>
          <div style="color:#a09ab8;margin-bottom:20px">Admin yetkisine sahip degilsiniz.</div>
          <a href="/" style="background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;padding:10px 24px;border-radius:10px;text-decoration:none;font-weight:600">Ana Sayfaya Don</a>
        </div>
      </div>`;
      return;
    }
  } catch (e) {
    document.body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0a0f;font-family:Syne,sans-serif;text-align:center;color:#f1f0f5">
      <div>
        <div style="font-size:1.5rem;font-weight:800;margin-bottom:16px">Giris Yapmaniz Gerekiyor</div>
        <a href="/giris" style="background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;padding:10px 24px;border-radius:10px;text-decoration:none;font-weight:600">Giris Yap</a>
      </div>
    </div>`;
    return;
  }

  hideSplash();
  renderAdminShell();
  loadAdminPage('Dashboard');
}

function hideSplash() {
  const s = document.querySelector('.splash');
  if (s) { s.style.opacity = '0'; s.style.transition = '0.4s'; setTimeout(() => s.remove(), 400); }
}

function renderAdminShell() {
  adminApp.innerHTML = `
    <nav class="navbar">
      <a class="nav-logo" href="/">TeaTok</a>
      <div style="flex:1"></div>
      <div style="display:flex;align-items:center;gap:10px">
        <span style="color:var(--text3);font-size:0.82rem"><i class="fa-solid fa-shield-halved" style="color:var(--accent)"></i> Admin Panel</span>
        <a href="/" class="btn btn-ghost btn-sm"><i class="fa-solid fa-house"></i></a>
      </div>
    </nav>
    <div class="admin-wrap">
      <aside class="admin-sidebar">
        <div class="admin-sidebar-logo"><i class="fa-solid fa-shield-halved"></i> Yönetim</div>
        <div class="admin-nav-item active" id="nav-Dashboard" onclick="loadAdminPage('Dashboard')"><i class="fa-solid fa-gauge"></i> Dashboard</div>
        <div class="admin-nav-item" id="nav-posts" onclick="loadAdminPage('posts')"><i class="fa-solid fa-images"></i> Fotoğraflar</div>
        <div class="admin-nav-item" id="nav-users" onclick="loadAdminPage('users')"><i class="fa-solid fa-users"></i> Kullanıcılar</div>
        <div class="admin-nav-item" id="nav-categories" onclick="loadAdminPage('categories')"><i class="fa-solid fa-tags"></i> Kategoriler</div>
        <div class="admin-nav-item" id="nav-settings" onclick="loadAdminPage('settings')"><i class="fa-solid fa-sliders"></i> Site Ayarları</div>
      </aside>
      <main class="admin-content" id="adminContent">
        <div class="spinner"></div>
      </main>
    </div>
  `;
}

function setActiveNav(page) {
  document.querySelectorAll('.admin-nav-item').forEach(el => el.classList.remove('active'));
  const el = document.getElementById(`nav-${page}`);
  if (el) el.classList.add('active');
}

async function loadAdminPage(page) {
  setActiveNav(page);
  const content = document.getElementById('adminContent');
  content.innerHTML = '<div class="spinner"></div>';
  if (page === 'Dashboard') await renderDashboard(content);
  else if (page === 'posts') await renderPostsPage(content);
  else if (page === 'users') await renderUsersPage(content);
  else if (page === 'categories') await renderCategoriesPage(content);
}

// ===== Dashboard =====
async function renderDashboard(content) {
  try {
    const stats = await adminApi('GET', '/api/admin/stats');
    content.innerHTML = `
      <div class="admin-page active">
        <div class="admin-page-title"><i class="fa-solid fa-gauge" style="color:var(--accent)"></i> Dashboard</div>
        <div class="stat-cards">
          <div class="stat-card">
            <div class="stat-card-icon" style="color:var(--accent)"><i class="fa-solid fa-images"></i></div>
            <div class="stat-card-num" style="color:var(--accent)">${stats.posts}</div>
            <div class="stat-card-label">Toplam Fotoğraf</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="color:var(--pink)"><i class="fa-solid fa-heart"></i></div>
            <div class="stat-card-num" style="color:var(--pink)">${stats.likes}</div>
            <div class="stat-card-label">Toplam Beğeni</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="color:var(--blue)"><i class="fa-solid fa-users"></i></div>
            <div class="stat-card-num" style="color:var(--blue)">${stats.users}</div>
            <div class="stat-card-label">Toplam Üye</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="color:var(--yellow)"><i class="fa-regular fa-comments"></i></div>
            <div class="stat-card-num" style="color:var(--yellow)">${stats.comments}</div>
            <div class="stat-card-label">Toplam Yorum</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="color:var(--red)"><i class="fa-solid fa-lock"></i></div>
            <div class="stat-card-num" style="color:var(--red)">${stats.private_posts}</div>
            <div class="stat-card-label">Gizli Fotoğraf</div>
          </div>
        </div>
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px">
          <div style="font-family:var(--font-brand);font-size:1.1rem;font-weight:700;margin-bottom:12px"><i class="fa-solid fa-info-circle" style="color:var(--accent)"></i> Hızlı Erişim</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn btn-primary btn-sm" onclick="loadAdminPage('posts')"><i class="fa-solid fa-images"></i> Fotoğraflari Yonet</button>
            <button class="btn btn-ghost btn-sm" onclick="loadAdminPage('users')"><i class="fa-solid fa-users"></i> Kullanıcılari Yonet</button>
            <button class="btn btn-ghost btn-sm" onclick="loadAdminPage('categories')"><i class="fa-solid fa-tags"></i> Kategorileri Yönet</button>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    content.innerHTML = `<div class="error-msg"><i class="fa-solid fa-xmark"></i> ${e.message}</div>`;
  }
}

// ===== POSTS PAGE =====
async function renderPostsPage(content) {
  try {
    const data = await adminApi('GET', '/api/posts?limit=50&page=1');
    const posts = data.posts || [];
    content.innerHTML = `
      <div class="admin-page active">
        <div class="admin-page-title"><i class="fa-solid fa-images" style="color:var(--accent)"></i> Fotoğraflar</div>
        <div class="admin-table-wrap">
          <div class="admin-table-header">
            <div class="admin-table-title"><i class="fa-solid fa-list"></i> Tum Fotoğraflar (${data.total || posts.length})</div>
            <input type="text" class="admin-search" placeholder="Başlık ara..." oninput="adminFilterPosts(this.value)" />
          </div>
          <div style="overflow-x:auto">
            <table id="postsTable">
              <thead>
                <tr>
                  <th>Gorsel</th>
                  <th>Baslik</th>
                  <th>Yükleyen</th>
                  <th>Kategori</th>
                  <th>Beğeni</th>
                  <th>Durum</th>
                  <th>Tarih</th>
                  <th>şlem</th>
                </tr>
              </thead>
              <tbody id="postsTableBody">
                ${posts.map(p => renderPostRow(p)).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    window._adminPosts = posts;
  } catch (e) {
    content.innerHTML = `<div class="error-msg"><i class="fa-solid fa-xmark"></i> ${e.message}</div>`;
  }
}

function renderPostRow(p) {
  const img = p.images && p.images.length ? p.images[0].image_url : null;
  const catHtml = p.category ? `<span style="display:inline-flex;align-items:center;gap:5px;background:${p.category.color}22;color:${p.category.color};padding:2px 8px;border-radius:99px;font-size:0.72rem"><i class="fa-solid ${p.category.fa_icon}"></i>${esc(p.category.name)}</span>` : '<span style="color:var(--text3);font-size:0.78rem">-</span>';
  return `<tr id="postrow-${p.id}">
    <td>${img ? `<img src="${img}" class="post-thumb" />` : `<div class="post-thumb-placeholder"><i class="fa-solid fa-image"></i></div>`}</td>
    <td style="max-width:220px">
      <div style="font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.title)}</div>
      ${p.images && p.images.length > 1 ? `<div style="font-size:0.72rem;color:var(--text3);margin-top:2px"><i class="fa-regular fa-images"></i> ${p.images.length} fotograf</div>` : ''}
    </td>
    <td><a href="/hesap/${esc(p.nickname)}" target="_blank" style="color:var(--accent3);text-decoration:none">@${esc(p.nickname)}</a></td>
    <td>${catHtml}</td>
    <td><i class="fa-solid fa-heart" style="color:var(--pink)"></i> ${p.likes_count}</td>
    <td><span class="status-badge ${p.is_private ? 'status-private' : 'status-public'}">${p.is_private ? '<i class="fa-solid fa-lock"></i> Gizli' : '<i class="fa-solid fa-globe"></i> Acik'}</span></td>
    <td style="color:var(--text3);font-size:0.78rem">${getTimeAgo(p.created_at)}</td>
    <td>
      <div class="td-actions">
        <a href="${p.is_private ? '/gizli/' + p.secret_id : '/resim/' + p.id}" target="_blank" class="action-icon-btn" title="Görüntüle"><i class="fa-solid fa-eye"></i></a>
        <button class="action-icon-btn danger" onclick="adminDeletePost('${p.id}')" title="Sil"><i class="fa-solid fa-trash"></i></button>
      </div>
    </td>
  </tr>`;
}

function adminFilterPosts(q) {
  const posts = window._adminPosts || [];
  const filtered = q ? posts.filter(p => p.title.toLowerCase().includes(q.toLowerCase()) || p.nickname.toLowerCase().includes(q.toLowerCase())) : posts;
  const tbody = document.getElementById('postsTableBody');
  if (tbody) tbody.innerHTML = filtered.map(p => renderPostRow(p)).join('');
}

async function adminDeletePost(id) {
  if (!confirm('Bu Fotoğrafı silmek istediginden emin misin?')) return;
  try {
    await adminApi('DELETE', `/api/admin/posts/${id}`);
    const row = document.getElementById(`postrow-${id}`);
    if (row) row.remove();
    adminToast('Fotoğraf silindi', 'success');
  } catch (e) {
    adminToast(e.message, 'error');
  }
}

// ===== USERS PAGE =====
async function renderUsersPage(content) {
  try {
    const users = await adminApi('GET', '/api/admin/users');
    content.innerHTML = `
      <div class="admin-page active">
        <div class="admin-page-title"><i class="fa-solid fa-users" style="color:var(--accent)"></i> Kullanıcılar</div>
        <div class="admin-table-wrap">
          <div class="admin-table-header">
            <div class="admin-table-title"><i class="fa-solid fa-list"></i> Tüm Üyeler (${users.length})</div>
            <input type="text" class="admin-search" placeholder="Kullanıcı ara..." oninput="adminFilterUsers(this.value)" />
          </div>
          <div style="overflow-x:auto">
            <table id="usersTable">
              <thead>
                <tr>
                  <th>Avatar</th>
                  <th>Kullanıcı Adı</th>
                  <th>Bio</th>
                  <th>Rol</th>
                  <th>Kayıt Tarihi</th>
                  <th>şlem</th>
                </tr>
              </thead>
              <tbody id="usersTableBody">
                ${users.map(u => renderUserRow(u)).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    window._adminUsers = users;
  } catch (e) {
    content.innerHTML = `<div class="error-msg"><i class="fa-solid fa-xmark"></i> ${e.message}</div>`;
  }
}

function renderUserRow(u) {
  const avatarHtml = u.avatar
    ? `<img src="${u.avatar}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid var(--accent)" />`
    : `<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--pink));display:flex;align-items:center;justify-content:center;font-weight:700;font-family:var(--font-brand);color:#fff">${u.nickname[0].toUpperCase()}</div>`;
  const isMe = adminUser && adminUser.id === u.id;
  return `<tr id="userrow-${u.id}">
    <td>${avatarHtml}</td>
    <td>
      <a href="/hesap/${esc(u.nickname)}" target="_blank" style="color:var(--accent3);text-decoration:none;font-weight:500">@${esc(u.nickname)}</a>
      ${isMe ? `<span style="font-size:0.7rem;color:var(--text3);margin-left:6px">(sen)</span>` : ''}
    </td>
    <td style="color:var(--text3);font-size:0.8rem;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(u.bio) || '-'}</td>
    <td>
      <span class="status-badge ${u.is_admin ? 'status-hidden' : 'status-active'}">
        ${u.is_admin ? '<i class="fa-solid fa-shield-halved"></i> Admin' : '<i class="fa-solid fa-user"></i> Uye'}
      </span>
    </td>
    <td style="color:var(--text3);font-size:0.78rem">${getTimeAgo(u.created_at)}</td>
    <td>
      <div class="td-actions">
        ${!isMe ? `<button class="action-icon-btn ${u.is_admin ? 'warn' : 'success'}" onclick="toggleUserAdmin('${u.id}', ${u.is_admin ? 0 : 1})" title="${u.is_admin ? 'Admin yetkisini kaldır' : 'Admin yap'}">
          <i class="fa-solid ${u.is_admin ? 'fa-user-slash' : 'fa-user-shield'}"></i>
        </button>` : ''}
      </div>
    </td>
  </tr>`;
}

function adminFilterUsers(q) {
  const users = window._adminUsers || [];
  const filtered = q ? users.filter(u => u.nickname.toLowerCase().includes(q.toLowerCase())) : users;
  const tbody = document.getElementById('usersTableBody');
  if (tbody) tbody.innerHTML = filtered.map(u => renderUserRow(u)).join('');
}

async function toggleUserAdmin(userId, makeAdmin) {
  try {
    await adminApi('PUT', `/api/admin/users/${userId}/toggle-admin`);
    const users = window._adminUsers || [];
    const user = users.find(u => u.id === userId);
    if (user) user.is_admin = makeAdmin;
    adminToast(makeAdmin ? 'Kullanıcı admin yapıldı' : 'Admin yetkisi kaldırıldı', 'success');
    const row = document.getElementById(`userrow-${userId}`);
    if (row && user) row.outerHTML = renderUserRow(user);
  } catch (e) {
    adminToast(e.message, 'error');
  }
}

// ===== CATEGORIES PAGE =====
let catEditId = null;
let selectedIconName = 'fa-tag';
let selectedColor = '#6366f1';

async function renderCategoriesPage(content) {
  try {
    const cats = await adminApi('GET', '/api/categories');
    content.innerHTML = `
      <div class="admin-page active">
        <div class="admin-page-title"><i class="fa-solid fa-tags" style="color:var(--accent)"></i> Kategoriler</div>
        <div class="cat-form">
          <div style="font-weight:600;font-size:0.95rem;margin-bottom:14px;display:flex;align-items:center;gap:8px" id="catFormTitle">
            <i class="fa-solid fa-plus" style="color:var(--accent)"></i> Yeni Kategori
          </div>
          <div id="catFormMsg"></div>
          <div class="cat-form-grid">
            <div>
              <div class="form-label" style="font-size:0.8rem;margin-bottom:6px"><i class="fa-solid fa-heading" style="color:var(--accent)"></i> Kategori Adı</div>
              <input type="text" class="form-input" id="catName" placeholder="ornek: Doga" />
            </div>
            <div>
              <div class="form-label" style="font-size:0.8rem;margin-bottom:6px"><i class="fa-solid fa-icons" style="color:var(--accent)"></i> kon Seç</div>
              <div class="icon-picker-wrap">
                <button class="form-input" style="text-align:left;cursor:pointer;display:flex;align-items:center;gap:8px" onclick="toggleIconPicker()">
                  <i class="fa-solid ${selectedIconName}" id="selectedIconPreview"></i>
                  <span id="selectedIconName" style="font-size:0.82rem;color:var(--text2)">${selectedIconName}</span>
                  <i class="fa-solid fa-chevron-down" style="margin-left:auto;font-size:0.75rem;color:var(--text3)"></i>
                </button>
                <div class="icon-picker-dropdown" id="iconPickerDrop">
                  ${FA_ICONS.map(ic => `<div class="icon-option" title="${ic}" onclick="selectIcon('${ic}')"><i class="fa-solid ${ic}"></i></div>`).join('')}
                </div>
              </div>
            </div>
            <div>
              <div class="form-label" style="font-size:0.8rem;margin-bottom:6px"><i class="fa-solid fa-droplet" style="color:var(--accent)"></i> Renk</div>
              <div style="display:flex;align-items:center;gap:8px">
                <input type="color" id="catColor" value="${selectedColor}" onchange="selectedColor=this.value" style="width:44px;height:40px;border-radius:8px;border:1px solid var(--border);background:none;cursor:pointer;padding:2px" />
                <input type="text" class="form-input" id="catColorText" placeholder="#6366f1" value="${selectedColor}" oninput="syncColorInput(this.value)" style="flex:1" />
              </div>
            </div>
            <div>
              <button class="btn btn-primary" onclick="saveCat()" style="width:100%;height:44px;margin-top:22px" id="catSaveBtn">
                <i class="fa-solid fa-plus"></i> Ekle
              </button>
            </div>
          </div>
          <div style="margin-top:10px">
            <div class="form-label" style="font-size:0.8rem;margin-bottom:6px"><i class="fa-solid fa-sort" style="color:var(--accent)"></i> Siralama</div>
            <input type="number" class="form-input" id="catOrder" placeholder="0" value="0" style="max-width:120px" />
          </div>
          <button class="btn btn-ghost btn-sm" id="catCancelBtn" onclick="cancelCatEdit()" style="margin-top:10px;display:none">
            <i class="fa-solid fa-xmark"></i> Iptal
          </button>
        </div>

        <div class="admin-table-wrap">
          <div class="admin-table-header">
            <div class="admin-table-title"><i class="fa-solid fa-list"></i> Mevcut Kategoriler (${cats.length})</div>
          </div>
          <div id="catList">
            ${cats.map(c => renderCatRow(c)).join('')}
          </div>
        </div>
      </div>
    `;
    window._adminCats = cats;
    document.addEventListener('click', e => {
      const picker = document.getElementById('iconPickerDrop');
      const wrap = picker?.closest('.icon-picker-wrap');
      if (picker && wrap && !wrap.contains(e.target)) picker.classList.remove('show');
    });
  } catch (e) {
    content.innerHTML = `<div class="error-msg"><i class="fa-solid fa-xmark"></i> ${e.message}</div>`;
  }
}

function renderCatRow(c) {
  return `<div class="cat-row" id="catrow-${c.id}">
    <div class="cat-icon-preview" style="background:${c.color}22;color:${c.color}"><i class="fa-solid ${c.fa_icon}"></i></div>
    <div style="flex:1">
      <div style="font-weight:600;font-size:0.9rem">${esc(c.name)}</div>
      <div style="font-size:0.75rem;color:var(--text3)">${c.fa_icon} &bull; ${c.color}</div>
    </div>
    <div style="display:flex;align-items:center;gap:6px">
      <button class="action-icon-btn" onclick="editCat(${c.id})" title="Duzenle"><i class="fa-solid fa-pen"></i></button>
      <button class="action-icon-btn danger" onclick="deleteCat(${c.id})" title="Sil"><i class="fa-solid fa-trash"></i></button>
    </div>
  </div>`;
}

function toggleIconPicker() {
  document.getElementById('iconPickerDrop')?.classList.toggle('show');
}

function selectIcon(icon) {
  selectedIconName = icon;
  const prev = document.getElementById('selectedIconPreview');
  const name = document.getElementById('selectedIconName');
  if (prev) prev.className = `fa-solid ${icon}`;
  if (name) name.textContent = icon;
  document.getElementById('iconPickerDrop')?.classList.remove('show');
}

function syncColorInput(val) {
  selectedColor = val;
  const colorPicker = document.getElementById('catColor');
  if (colorPicker && /^#[0-9A-Fa-f]{6}$/.test(val)) colorPicker.value = val;
}

async function saveCat() {
  const name = document.getElementById('catName')?.value.trim();
  const color = document.getElementById('catColorText')?.value.trim() || selectedColor;
  const sort_order = parseInt(document.getElementById('catOrder')?.value) || 0;
  const msgEl = document.getElementById('catFormMsg');
  if (!name) { msgEl.innerHTML = `<div class="error-msg"><i class="fa-solid fa-xmark"></i> Kategori Adı gerekli</div>`; return; }
  try {
    if (catEditId) {
      const cat = await adminApi('PUT', `/api/admin/categories/${catEditId}`, { name, fa_icon: selectedIconName, color, sort_order });
      adminToast('Kategori güncellendi', 'success');
      const row = document.getElementById(`catrow-${catEditId}`);
      if (row) row.outerHTML = renderCatRow(cat);
      const idx = (window._adminCats || []).findIndex(c => c.id === catEditId);
      if (idx !== -1) window._adminCats[idx] = cat;
    } else {
      const cat = await adminApi('POST', '/api/admin/categories', { name, fa_icon: selectedIconName, color, sort_order });
      adminToast('Kategori eklendi', 'success');
      const list = document.getElementById('catList');
      if (list) list.insertAdjacentHTML('beforeend', renderCatRow(cat));
      if (!window._adminCats) window._adminCats = [];
      window._adminCats.push(cat);
    }
    cancelCatEdit();
    msgEl.innerHTML = '';
  } catch (e) {
    msgEl.innerHTML = `<div class="error-msg"><i class="fa-solid fa-xmark"></i> ${e.message}</div>`;
  }
}

function editCat(id) {
  const cat = (window._adminCats || []).find(c => c.id === id);
  if (!cat) return;
  catEditId = id;
  selectedIconName = cat.fa_icon;
  selectedColor = cat.color;
  const nameEl = document.getElementById('catName');
  const colorEl = document.getElementById('catColor');
  const colorTxt = document.getElementById('catColorText');
  const orderEl = document.getElementById('catOrder');
  if (nameEl) nameEl.value = cat.name;
  if (colorEl) colorEl.value = cat.color;
  if (colorTxt) colorTxt.value = cat.color;
  if (orderEl) orderEl.value = cat.sort_order;
  const prev = document.getElementById('selectedIconPreview');
  const name = document.getElementById('selectedIconName');
  if (prev) prev.className = `fa-solid ${cat.fa_icon}`;
  if (name) name.textContent = cat.fa_icon;
  const title = document.getElementById('catFormTitle');
  if (title) title.innerHTML = `<i class="fa-solid fa-pen" style="color:var(--accent)"></i> Kategoriyi Düzenle`;
  const saveBtn = document.getElementById('catSaveBtn');
  if (saveBtn) saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Kaydet';
  const cancelBtn = document.getElementById('catCancelBtn');
  if (cancelBtn) cancelBtn.style.display = 'inline-flex';
  document.getElementById('catName')?.focus();
}

function cancelCatEdit() {
  catEditId = null;
  selectedIconName = 'fa-tag';
  selectedColor = '#6366f1';
  const nameEl = document.getElementById('catName');
  if (nameEl) nameEl.value = '';
  const title = document.getElementById('catFormTitle');
  if (title) title.innerHTML = `<i class="fa-solid fa-plus" style="color:var(--accent)"></i> Yeni Kategori`;
  const saveBtn = document.getElementById('catSaveBtn');
  if (saveBtn) saveBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Ekle';
  const cancelBtn = document.getElementById('catCancelBtn');
  if (cancelBtn) cancelBtn.style.display = 'none';
  const prev = document.getElementById('selectedIconPreview');
  const name = document.getElementById('selectedIconName');
  if (prev) prev.className = 'fa-solid fa-tag';
  if (name) name.textContent = 'fa-tag';
}

async function deleteCat(id) {
  if (!confirm('Bu kategoriyi silmek istediginden emin misin? Bu kategorideki Fotoğraflar kategorisiz kalacak.')) return;
  try {
    await adminApi('DELETE', `/api/admin/categories/${id}`);
    const row = document.getElementById(`catrow-${id}`);
    if (row) row.remove();
    adminToast('Kategori silindi', 'success');
  } catch (e) {
    adminToast(e.message, 'error');
  }
}

// ===== INIT =====
adminInit();




