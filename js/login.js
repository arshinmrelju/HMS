/* =========================================
   LOGIN.JS – Authentication logic
   ========================================= */

'use strict';

const DEMO_USERS = {
  admin: {
    email: 'admin@wellness.com',
    password: 'admin123',
    name: 'Dr. Sarah Mitchell',
    title: 'Chief Surgeon',
    role: 'Admin',
    redirect: 'dashboard.html'
  },
  doctor: {
    email: 'doctor@wellness.com',
    password: 'doctor123',
    name: 'Dr. Julian Vance',
    title: 'Cardiologist',
    role: 'Doctor',
    redirect: 'dashboard.html'
  },
  staff: {
    email: 'staff@wellness.com',
    password: 'staff123',
    name: 'Nurse Priya Kapoor',
    title: 'Head Nurse',
    role: 'Staff',
    redirect: 'dashboard.html'
  }
};

let selectedRole = 'admin';

/* --- Role Toggle --- */
document.querySelectorAll('.role-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedRole = btn.dataset.role;
    // Pre-fill email hint
    const emailInput = document.getElementById('email');
    if (emailInput) emailInput.placeholder = `${selectedRole}@wellness.com`;
  });
});

/* --- Password Toggle --- */
const pwInput = document.getElementById('password');
const pwIcon = document.getElementById('pwIcon');
document.getElementById('togglePw')?.addEventListener('click', () => {
  const isText = pwInput.type === 'text';
  pwInput.type = isText ? 'password' : 'text';
  pwIcon.textContent = isText ? 'visibility' : 'visibility_off';
});

/* --- Login Form --- */
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const btn = document.getElementById('loginBtn');
  const errorMsg = document.getElementById('errorMsg');

  // Animate button
  btn.classList.add('loading');
  errorMsg.classList.remove('visible');

  // Simulate network delay
  await new Promise(r => setTimeout(r, 900));

  // Check credentials
  let matchedUser = null;
  for (const [, user] of Object.entries(DEMO_USERS)) {
    if (user.email === email && user.password === password) {
      matchedUser = user;
      break;
    }
  }

  // Also accept by role if matching
  if (!matchedUser) {
    const roleUser = DEMO_USERS[selectedRole];
    if (roleUser && roleUser.password === password) {
      matchedUser = roleUser;
    }
  }

  btn.classList.remove('loading');

  if (matchedUser) {
    localStorage.setItem('hms_user', JSON.stringify(matchedUser));
    // Success animation
    btn.innerHTML = '<span class="material-icons-round">check_circle</span><span class="btn-text">Authenticated!</span>';
    btn.style.background = '#10B981';
    setTimeout(() => {
      location.href = matchedUser.redirect;
    }, 700);
  } else {
    errorMsg.innerHTML = '<span class="material-icons-round">error</span> Invalid credentials. Try the demo buttons below.';
    errorMsg.classList.add('visible');
    // Shake animation
    const form = document.getElementById('loginForm');
    form.style.animation = 'none';
    void form.offsetWidth;
    form.style.animation = 'shake 0.4s ease';
  }
});

/* --- Quick Demo Login --- */
function quickLogin(role) {
  const user = DEMO_USERS[role];
  if (!user) return;
  document.getElementById('email').value = user.email;
  document.getElementById('password').value = user.password;
  // Trigger the correct role button
  document.querySelectorAll('.role-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.role === role);
  });
  selectedRole = role;
  // Auto-submit after a brief delay
  setTimeout(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')), 300);
}

/* --- Shake keyframe --- */
const style = document.createElement('style');
style.textContent = `@keyframes shake {
  0%,100%{transform:translateX(0)}
  20%,60%{transform:translateX(-8px)}
  40%,80%{transform:translateX(8px)}
}`;
document.head.appendChild(style);

/* --- Redirect if already logged in --- */
const existing = localStorage.getItem('hms_user');
if (existing) {
  try {
    const u = JSON.parse(existing);
    if (u && u.redirect) location.href = u.redirect;
  } catch(_) {}
}
