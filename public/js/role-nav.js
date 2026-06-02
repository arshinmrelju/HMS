const ROLE_NAV = {
  Admin: [
    { href: 'dashboard.html', icon: 'dashboard', label: 'Dashboard', id: 'nav-dashboard' },
    { href: 'patients.html', icon: 'groups', label: 'Patients', id: 'nav-patients' },
    { href: 'appointments.html', icon: 'event', label: 'Appointments', id: 'nav-appointments' },
    { href: 'doctors.html', icon: 'medical_services', label: 'Doctors', id: 'nav-doctors' },
    { href: 'pharmacy.html', icon: 'medication', label: 'Pharmacy', id: 'nav-pharmacy' },
    { href: 'lab.html', icon: 'biotech', label: 'Lab', id: 'nav-lab' },
    { href: 'reports.html', icon: 'analytics', label: 'Reports', id: 'nav-reports' },
    { href: 'administration.html', icon: 'admin_panel_settings', label: 'Administration', id: 'nav-admin' },
    { href: 'csv-export.html', icon: 'file_download', label: 'CSV Export', id: 'nav-csv-export' },
    { href: 'import-patients.html', icon: 'upload_file', label: 'Import Patients', id: 'nav-import-patients' },
    { href: 'import-inventory.html', icon: 'inventory_2', label: 'Import Inventory', id: 'nav-import-inventory' },
    { divider: true },
    { href: 'settings.html', icon: 'settings', label: 'Settings', id: 'nav-settings' }
  ],
  Doctor: [
    { href: 'dashboard.html', icon: 'dashboard', label: 'Dashboard', id: 'nav-dashboard' },
    { href: 'patients.html', icon: 'groups', label: 'My Patients', id: 'nav-patients' },
    { href: 'appointments.html', icon: 'event', label: 'Appointments', id: 'nav-appointments' },
    { href: 'doctors.html', icon: 'medical_services', label: 'Workspace', id: 'nav-doctors' },
    { divider: true },
    { href: 'settings.html', icon: 'settings', label: 'Settings', id: 'nav-settings' }
  ],
  Staff: [
    { href: 'dashboard.html', icon: 'dashboard', label: 'Dashboard', id: 'nav-dashboard' },
    { href: 'patients.html', icon: 'groups', label: 'Patients', id: 'nav-patients' },
    { href: 'appointments.html', icon: 'event', label: 'Appointments', id: 'nav-appointments' },
    { href: 'csv-export.html', icon: 'file_download', label: 'CSV Export', id: 'nav-csv-export' },
    { divider: true },
    { href: 'settings.html', icon: 'settings', label: 'Settings', id: 'nav-settings' }
  ],
  Pharmacist: [
    { href: 'dashboard.html', icon: 'dashboard', label: 'Dashboard', id: 'nav-dashboard' },
    { href: 'pharmacy.html', icon: 'medication', label: 'Pharmacy', id: 'nav-pharmacy' },
    { href: 'import-inventory.html', icon: 'inventory_2', label: 'Import Inventory', id: 'nav-import-inventory' },
    { href: 'csv-export.html', icon: 'file_download', label: 'CSV Export', id: 'nav-csv-export' },
    { divider: true },
    { href: 'settings.html', icon: 'settings', label: 'Settings', id: 'nav-settings' }
  ],
  'Lab Tech': [
    { href: 'dashboard.html', icon: 'dashboard', label: 'Dashboard', id: 'nav-dashboard' },
    { href: 'lab.html', icon: 'biotech', label: 'Lab', id: 'nav-lab' },
    { divider: true },
    { href: 'settings.html', icon: 'settings', label: 'Settings', id: 'nav-settings' }
  ]
};

const PORTAL_NAMES = {
  Admin: 'Admin Portal',
  Doctor: 'Doctor Portal',
  Staff: 'Reception Portal',
  Pharmacist: 'Pharmacy Portal',
  'Lab Tech': 'Lab Portal'
};

const PORTAL_ICONS = {
  Admin: 'admin_panel_settings',
  Doctor: 'medical_services',
  Staff: 'support_agent',
  Pharmacist: 'medication',
  'Lab Tech': 'biotech'
};

function renderSidebarNav(role, activePath) {
  const navEl = document.getElementById('sidebarNav');
  if (!navEl) return;
  const items = ROLE_NAV[role] || ROLE_NAV.Staff;
  navEl.innerHTML = items.map(item => {
    if (item.divider) return '<div class="nav-divider"></div>';
    const isActive = activePath && (item.href === activePath || activePath.endsWith(item.href));
    return `<a href="${item.href}" class="nav-item${isActive ? ' active' : ''}" id="${item.id}"><span class="material-icons-round">${item.icon}</span><span class="nav-label">${item.label}</span></a>`;
  }).join('');
}

function getPortalPrefix(role) {
  const map = { Admin: 'admin', Doctor: 'doctor', Staff: 'staff', Pharmacist: 'pharmacist', 'Lab Tech': 'labtech' };
  return map[role] || 'staff';
}
