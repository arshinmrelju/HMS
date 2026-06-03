const ALLOWED_PAGES = {
  '/admin/dashboard': ['Admin'],
  '/admin/patients': ['Admin'],
  '/admin/appointments': ['Admin'],
  '/admin/doctors': ['Admin'],
  '/admin/pharmacy': ['Admin'],
  '/admin/lab': ['Admin'],
  '/admin/reports': ['Admin'],
  '/admin/administration': ['Admin'],
  '/admin/settings': ['Admin'],
  '/admin/csv-export': ['Admin'],
  '/admin/import-patients': ['Admin'],
  '/admin/import-inventory': ['Admin'],
  '/doctor/dashboard': ['Doctor'],
  '/doctor/patients': ['Doctor'],
  '/doctor/appointments': ['Doctor'],
  '/doctor/doctors': ['Doctor'],
  '/doctor/settings': ['Doctor'],
  '/staff/dashboard': ['Staff'],
  '/staff/patients': ['Staff'],
  '/staff/appointments': ['Staff'],
  '/staff/csv-export': ['Staff'],
  '/staff/settings': ['Staff'],
  '/pharmacist/dashboard': ['Pharmacist'],
  '/pharmacist/pharmacy': ['Pharmacist'],
  '/pharmacist/import-inventory': ['Pharmacist'],
  '/pharmacist/csv-export': ['Pharmacist'],
  '/pharmacist/settings': ['Pharmacist'],
  '/labtech/dashboard': ['Lab Tech'],
  '/labtech/lab': ['Lab Tech'],
  '/labtech/settings': ['Lab Tech']
};

const ROLE_LOGIN_PAGES = {
  Admin: '/login-admin',
  Doctor: '/login-doctor',
  Staff: '/login-staff',
  Pharmacist: '/login-pharmacist',
  'Lab Tech': '/login-labtech'
};

function getCurrentRoute() {
  const path = window.location.pathname.replace(/\.html$/, '');
  return path;
}

function requireRole(allowedRoles) {
  return new Promise((resolve) => {
    const check = (authResolved) => {
      // SECURITY: if auth didn't resolve successfully (timeout or explicit false), redirect to login.
      if (!authResolved) {
        window.location.href = '/';
        return;
      }
      const user = window.HMS ? window.HMS.getUser() : null;
      if (!user) {
        window.location.href = '/';
        return;
      }
      if (!allowedRoles.includes(user.role)) {
        const redirect = user.role ? (ROLE_LOGIN_PAGES[user.role] || '/') : '/';
        window.location.href = redirect;
        return;
      }
      resolve(user);
    };

    const waitForAuth = () => {
      window._authReady.then(check);
    };

    if (window._authReady) {
      waitForAuth();
    } else {
      // Poll until firebase-init.js has set window._authReady.
      const poll = setInterval(() => {
        if (window._authReady !== undefined) {
          clearInterval(poll);
          clearTimeout(giveUp);
          waitForAuth();
        }
      }, 50);
      // SECURITY: if firebase-init.js never loads within 5s, redirect to login — do NOT pass through.
      const giveUp = setTimeout(() => {
        clearInterval(poll);
        console.warn('[HMS Security] Auth system did not initialize in time. Redirecting to login.');
        window.location.href = '/';
      }, 5000);
    }
  });
}

function getRoleLoginUrl(role) {
  return ROLE_LOGIN_PAGES[role] || '/';
}
