/* =========================================
   APP.JS – Shared utility & auth logic
   ========================================= */

'use strict';

/* --- Auth / Session --- */
const HMS = {
  getUser() { return JSON.parse(localStorage.getItem('hms_user') || 'null'); },
  setUser(user) { localStorage.setItem('hms_user', JSON.stringify(user)); },
  logout() { localStorage.removeItem('hms_user'); location.href = 'index.html'; },
  requireAuth() {
    const user = this.getUser();
    if (!user) { location.href = 'index.html'; return null; }
    return user;
  }
};

/* --- Toast Notification --- */
function toast(message, type = 'info', icon = null) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    document.body.appendChild(container);
  }
  const icons = { success: 'check_circle', error: 'error', warning: 'warning', info: 'info' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span class="material-icons-round">${icon || icons[type]}</span><span>${message}</span>`;
  container.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(50px)'; t.style.transition = 'all .3s'; setTimeout(() => t.remove(), 300); }, 3000);
}

/* --- Modal Helpers --- */
function openModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.add('active'); document.body.style.overflow = 'hidden'; }
}
function closeModal(event, id) {
  if (event && event.target !== event.currentTarget) return;
  const m = document.getElementById(id);
  if (m) { m.classList.remove('active'); document.body.style.overflow = ''; }
}

/* --- Sidebar (Mobile) --- */
function initSidebar() {
  const toggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (!toggle) return;
  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
  });
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  });
}

/* --- Notification Panel --- */
function initNotifications() {
  const btn = document.getElementById('notifBtn');
  const panel = document.getElementById('notifPanel');
  if (!btn || !panel) return;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.hidden = !panel.hidden;
  });
  document.addEventListener('click', (e) => {
    if (panel && !panel.hidden && !panel.contains(e.target) && e.target !== btn) {
      panel.hidden = true;
    }
  });
  const clearBtn = document.getElementById('clearNotif');
  if (clearBtn) clearBtn.addEventListener('click', () => {
    panel.querySelector('.notif-list').innerHTML = '<p style="padding:12px;font-size:.82rem;color:var(--on-surface-var);text-align:center">No new notifications</p>';
    const badge = document.getElementById('notifBadge');
    if (badge) badge.style.display = 'none';
  });
}

/* --- User Info in Sidebar & Topbar --- */
function initUserDisplay() {
  const user = HMS.getUser();
  if (!user) return;
  const nameEl = document.getElementById('sidebarUserName');
  const roleEl = document.getElementById('sidebarUserRole');
  const avatarEl = document.getElementById('userAvatar');
  const topbarAvatarEl = document.getElementById('topbarAvatar');
  const initials = (user.name || 'User').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  if (nameEl) nameEl.textContent = user.name || 'User';
  if (roleEl) roleEl.textContent = user.title ? `${user.title} · ${user.role}` : user.role;
  if (avatarEl) avatarEl.textContent = initials;
  if (topbarAvatarEl) topbarAvatarEl.textContent = initials;

  // Role-based visibility
  const role = user.role;
  const adminNavLink = document.getElementById('nav-admin');
  if (adminNavLink && role === 'Admin') {
    adminNavLink.style.display = 'flex';
  }

  if (role === 'Doctor') {
    const itemsToHide = ['nav-patients', 'nav-appointments', 'nav-pharmacy', 'nav-lab'];
    itemsToHide.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    
    // Also hide the "New Appointment" button in dashboard header if present
    const headerActionBtn = document.getElementById('headerActionBtn');
    if (headerActionBtn) headerActionBtn.style.display = 'none';
  }

  if (role === 'Pharmacist') {
    const itemsToHide = ['nav-dashboard', 'nav-patients', 'nav-appointments', 'nav-doctors', 'nav-lab', 'nav-admin', 'nav-settings'];
    itemsToHide.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    
    // Redirect Pharmacist to pharmacy.html if they land on dashboard
    if (window.location.pathname.endsWith('dashboard.html') || window.location.pathname.endsWith('/')) {
      window.location.href = 'pharmacy.html';
    }
  }
}

/* --- Logout --- */
function initLogout() {
  const btn = document.getElementById('logoutBtn');
  if (btn) btn.addEventListener('click', () => {
    if (confirm('Are you sure you want to log out?')) HMS.logout();
  });
}

/* --- Date Display --- */
function initDateDisplay() {
  const el = document.getElementById('todayDate');
  if (!el) return;
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  el.textContent = new Date().toLocaleDateString('en-IN', opts);
}

/* --- Greeting --- */
function initGreeting() {
  const el = document.getElementById('dashboardGreeting');
  if (!el) return;
  const h = new Date().getHours();
  const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const user = HMS.getUser();
  el.textContent = `${g}, ${user ? user.name.split(' ')[0] : 'Doctor'}! Here's your workspace overview.`;
}

/* --- Tab Switching (shared) --- */
function switchTab(btn, tabId) {
  // Deactivate all tabs
  btn.closest('.tab-bar').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  // Hide all tab contents
  const prefix = tabId.split('-')[0];
  document.querySelectorAll('.tab-content').forEach(c => { c.hidden = true; });
  const target = document.getElementById(`tab-${tabId}`);
  if (target) target.hidden = false;
}

/* --- Counter Animation --- */
function animateCounters() {
  document.querySelectorAll('.counter').forEach(el => {
    const target = parseInt(el.dataset.target, 10);
    const duration = 1200;
    const start = performance.now();
    function update(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target).toLocaleString();
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  });
}

/* --- Initialize on DOM Ready --- */
document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  initNotifications();
  initUserDisplay();
  initLogout();
  initDateDisplay();
  initGreeting();
  animateCounters();
});
