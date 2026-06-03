'use strict';

HMS.requireAuth();

(async function checkAdmin() {
  const u = HMS.getUser();
  if (u && u.role !== 'Admin') {
    toast('Admin access required.', 'error');
    setTimeout(() => window.location.href = 'dashboard.html', 1000);
    return;
  }
  if (!u && window._authReady) {
    await window._authReady;
    const user = HMS.getUser();
    if (!user || user.role !== 'Admin') {
      toast('Admin access required.', 'error');
      setTimeout(() => window.location.href = 'dashboard.html', 1000);
    }
  }
})();

let staffList = [];
let scheduleMap = {};
let currentHOS = null;

function esc(val) {
  return typeof val === 'string' ? val.replace(/[&<>"']/g, function(m) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
  }) : (val == null ? '' : String(val));
}

function sanitize(val) {
  if (typeof val !== 'string') return val;
  return val.replace(/<[^>]*>/g, '').trim();
}

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0,0,0,0);
  return date;
}

function getSunday(d) {
  const mon = getMonday(d);
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  sun.setHours(23,59,59,999);
  return sun;
}

function formatDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWeekRange() {
  const now = new Date();
  const mon = getMonday(now);
  const sun = getSunday(now);
  return {
    start: formatDate(mon),
    end: formatDate(sun),
    startLabel: mon.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    endLabel: sun.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  };
}

// ===== DATA OPERATIONS =====

async function loadStaff() {
  try {
    const result = await window.API.getStaff();
    staffList = result.data || [];
    const el = document.getElementById('staffCount');
    if (el) el.textContent = String(staffList.length);
  } catch (e) {
    staffList = [];
  }
}

async function loadSchedules() {
  try {
    const result = await window.API.getSchedules();
    scheduleMap = {};
    (result.data || []).forEach(item => { scheduleMap[item.staffId || item.id] = item; });
  } catch (e) {
    console.error('Failed to load schedules:', e);
    scheduleMap = {};
  }
}

async function loadCurrentHeadOfStaff() {
  try {
    const result = await window.API.getHeadOfStaff();
    currentHOS = result.data || null;
    if (currentHOS) {
      const week = getWeekRange();
      if (currentHOS.weekEnd < week.start) {
        currentHOS = null;
      }
    }
  } catch (e) {
    console.error('Failed to load head of staff:', e);
    currentHOS = null;
  }
}

async function ensureStaffId() {
  return `STF${String(staffList.length + 1).padStart(3, '0')}`;
}

async function createStaffInFirestore(staffId, data) {
  await window.API.createStaff({
    ...data,
    id: staffId,
    status: data.status || 'Active'
  });
}

async function updateStaffInFirestore(staffId, data) {
  await window.API.updateStaff(staffId, data);
}

async function deleteStaffFromFirestore(staffId) {
  await window.API.deleteStaff(staffId);
}

async function saveSchedule(staffId, data) {
  await window.API.saveSchedule(data);
}

async function deleteSchedule(staffId) {
}

async function assignHeadOfStaff(staffId, staffName, adminName) {
  const week = getWeekRange();
  await window.API.assignHeadOfStaff(staffId);
  currentHOS = { staffId, staffName, weekStart: week.start, weekEnd: week.end };
}

// ===== RENDER FUNCTIONS =====

function renderStaffTable(data) {
  const tbody = document.getElementById('staffTableBody');
  if (!tbody) return;
  const list = data || staffList;
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--on-surface-var)">No staff members found.</td></tr>';
    document.getElementById('staffCount').textContent = '0';
    return;
  }
  tbody.innerHTML = list.map(s => {
    const initials = (s.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2);
    const hasEmail = s.email ? `<span class="staff-email-sub">${esc(s.email)}</span>` : '';
    const hasSchedule = scheduleMap[s.id];
    const scheduleBadge = hasSchedule
      ? `<span class="badge-role role-staff" style="font-size:0.65rem;margin-left:6px;" title="${esc(hasSchedule.shiftStart||'')}-${esc(hasSchedule.shiftEnd||'')}">Scheduled</span>`
      : '';
    return `<tr>
      <td><code>${esc(s.id)}</code></td>
      <td>
        <div class="staff-info-cell">
          <div class="staff-avatar">${esc(initials)}</div>
          <div class="staff-name-wrap">
            <strong>${esc(s.name)} ${scheduleBadge}</strong>
            <span class="badge-role role-${esc((s.role||'').toLowerCase())}">${esc(s.role)}</span>${hasEmail}
          </div>
        </div>
      </td>
      <td>${esc(s.dept)}</td>
      <td>${esc(s.spec || '--')}</td>
      <td><span class="badge-status ${s.status === 'Active' ? 'confirmed' : 'pending'}">${esc(s.status)}</span></td>
      <td>
        <div style="display:flex;gap:6px;">
          <button class="btn-icon" onclick="editStaff('${esc(s.id)}')" title="Edit"><span class="material-icons-round">edit</span></button>
          <button class="btn-icon" onclick="openScheduleDrawer('${esc(s.id)}')" title="Schedule"><span class="material-icons-round">schedule</span></button>
          <button class="btn-icon text-red" onclick="deleteStaff('${esc(s.id)}')" title="Revoke Access"><span class="material-icons-round">block</span></button>
        </div>
      </td>
    </tr>`;
  }).join('');
  document.getElementById('staffCount').textContent = list.length;
}

function renderScheduleTable() {
  const tbody = document.getElementById('scheduleTableBody');
  if (!tbody) return;
  const rows = staffList.filter(s => scheduleMap[s.id]).map(s => {
    const sch = scheduleMap[s.id];
    const days = (sch.workingDays || []).map(d => `<span class="day-chip">${d.slice(0,3)}</span>`).join('');
    return `<tr>
      <td><code>${esc(s.id)}</code></td>
      <td><strong>${esc(s.name)}</strong><br><span class="badge-role role-${esc((s.role||'').toLowerCase())}">${esc(s.role)}</span></td>
      <td>${esc(s.dept)}</td>
      <td>${esc(sch.shiftStart || '--')} - ${esc(sch.shiftEnd || '--')}</td>
      <td>${days}</td>
      <td>
        <button class="btn-icon" onclick="openScheduleDrawer('${esc(s.id)}')" title="Edit"><span class="material-icons-round">edit</span></button>
        <button class="btn-icon text-red" onclick="clearSchedule('${esc(s.id)}')" title="Clear"><span class="material-icons-round">delete</span></button>
      </td>
    </tr>`;
  }).join('');
  tbody.innerHTML = rows.length > 0 ? rows : '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--on-surface-var)">No schedules configured yet.</td></tr>';
}

function renderHeadOfStaffSection() {
  const container = document.getElementById('hosCurrentDisplay');
  if (!container) return;
  const week = getWeekRange();
  if (currentHOS) {
    const hosStaff = staffList.find(s => s.id === currentHOS.staffId);
    const initials = hosStaff ? (hosStaff.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2) : 'HS';
    container.innerHTML = `
      <div class="hos-card glass-card">
        <div class="hos-avatar-wrap">
          <div class="hos-avatar">${esc(initials)}</div>
          <div class="hos-crown"><span class="material-icons-round">workspace_premium</span></div>
        </div>
        <div class="hos-info">
          <h3>${esc(currentHOS.staffName)}</h3>
          <p class="hos-role">${hosStaff ? esc(hosStaff.role) + ' &middot; ' + esc(hosStaff.dept) : 'Staff'}</p>
          <p class="hos-week"><span class="material-icons-round">date_range</span> ${esc(currentHOS.weekLabel || week.startLabel + ' - ' + week.endLabel)}</p>
          <p class="hos-assigned">Assigned by ${esc(currentHOS.assignedBy || 'Admin')}</p>
        </div>
        <div class="hos-badge-current">Current Week</div>
      </div>
      <div class="hos-actions">
        <button class="btn-secondary" onclick="rotateHeadOfStaff()"><span class="material-icons-round">swap_horiz</span> Rotate to Next</button>
        <button class="btn-secondary" onclick="showAssignHeadOfStaff()"><span class="material-icons-round">person_add</span> Assign Manually</button>
      </div>`;
  } else {
    container.innerHTML = `
      <div class="hos-empty glass-card">
        <span class="material-icons-round" style="font-size:48px;color:var(--on-surface-var);opacity:0.3;">workspace_premium</span>
        <h3>No Head of Staff Assigned</h3>
        <p>Assign a staff member as Head of Staff for this week (${esc(week.startLabel)} - ${esc(week.endLabel)}). Doctors cannot be assigned.</p>
        <button class="btn-primary" onclick="showAssignHeadOfStaff()"><span class="material-icons-round">person_add</span> Assign Head of Staff</button>
      </div>`;
  }
}

// ===== STAFF CRUD =====

function validateStaffInput(data) {
  const errors = [];
  if (!data.name || data.name.trim().length < 2) errors.push('Full name required (min 2 chars)');
  if (!data.role) errors.push('Role is required');
  if (!data.dept) errors.push('Department is required');
  if (!data.email || data.email.trim().length < 3) errors.push('Email is required');
  if (!data.email.includes('@')) errors.push('Enter a valid email address');
  return errors;
}

async function addStaff(e) {
  e.preventDefault();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating...';

  const raw = {
    name: sanitize(document.getElementById('staffName').value),
    role: document.getElementById('staffRole').value,
    dept: sanitize(document.getElementById('staffDept').value),
    spec: sanitize(document.getElementById('staffSpec').value),
    email: sanitize(document.getElementById('staffEmail').value),
    phone: sanitize(document.getElementById('staffPhone').value),
  };
  const password = document.getElementById('staffPass').value || 'Welcome@123';

  const errors = validateStaffInput(raw);
  if (errors.length > 0) {
    toast(errors.join('. '), 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Staff Account';
    return;
  }

  try {
    await window.API.createStaff({ ...raw, password });
    await loadStaff();
    await loadSchedules();
    renderStaffTable();
    renderScheduleTable();
    populateStaffSelects();
    closeModal(null, 'addStaffOverlay');
    document.getElementById('addStaffModal').classList.remove('active');
    document.body.style.overflow = '';
    toast(`Staff ${raw.name} created successfully`, 'success');
    e.target.reset();
  } catch (err) {
    toast('Failed to create staff: ' + err.message, 'error');
  }
  submitBtn.disabled = false;
  submitBtn.textContent = 'Create Staff Account';
}

async function deleteStaff(id) {
  if (!confirm(`Are you sure you want to revoke access for ${id}?`)) return;
  try {
    await deleteStaffFromFirestore(id);
    await deleteSchedule(id);
    await loadStaff();
    await loadSchedules();
    renderStaffTable();
    renderScheduleTable();
    populateStaffSelects();
    toast('Access revoked for the selected staff member', 'warning');
  } catch (err) {
    toast('Failed to delete staff: ' + err.message, 'error');
  }
}

function editStaff(id) {
  const staff = staffList.find(s => s.id === id);
  if (!staff) { toast('Staff not found', 'error'); return; }
  document.getElementById('editStaffId').value = staff.id;
  document.getElementById('editStaffName').value = staff.name || '';
  document.getElementById('editStaffRole').value = staff.role || '';
  document.getElementById('editStaffDept').value = staff.dept || '';
  document.getElementById('editStaffSpec').value = staff.spec || '';
  document.getElementById('editStaffStatus').value = staff.status || 'Active';
  document.getElementById('editStaffPhone').value = staff.phone || '';
  document.getElementById('editStaffEmail').value = staff.email || '';
  toggleEditSpecializationField();
  document.getElementById('editStaffModal').classList.add('active');
  document.getElementById('editStaffOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

async function updateStaff(e) {
  e.preventDefault();
  const id = document.getElementById('editStaffId').value;
  const data = {
    name: sanitize(document.getElementById('editStaffName').value),
    role: document.getElementById('editStaffRole').value,
    dept: sanitize(document.getElementById('editStaffDept').value),
    spec: sanitize(document.getElementById('editStaffSpec').value),
    status: document.getElementById('editStaffStatus').value,
    phone: sanitize(document.getElementById('editStaffPhone').value),
    email: sanitize(document.getElementById('editStaffEmail').value),
  };
  try {
    await updateStaffInFirestore(id, data);
    await loadStaff();
    renderStaffTable();
    renderScheduleTable();
    populateStaffSelects();
    document.getElementById('editStaffModal').classList.remove('active');
    document.getElementById('editStaffOverlay').classList.remove('active');
    document.body.style.overflow = '';
    toast('Staff information updated successfully', 'success');
  } catch (err) {
    toast('Failed to update staff: ' + err.message, 'error');
  }
}

function filterStaffTable() {
  const query = (document.getElementById('staffSearch')?.value || '').toLowerCase();
  const role = document.getElementById('roleFilter')?.value;
  const status = document.getElementById('statusFilter')?.value;
  const filtered = staffList.filter(s => {
    const matchesQuery = s.name.toLowerCase().includes(query) || s.id.toLowerCase().includes(query) || (s.email || '').toLowerCase().includes(query);
    const matchesRole = role === 'all' || s.role === role;
    const matchesStatus = status === 'all' || s.status === status;
    return matchesQuery && matchesRole && matchesStatus;
  });
  renderStaffTable(filtered);
}

function toggleSpecializationField() {
  const role = document.getElementById('staffRole').value;
  document.getElementById('specializationGroup').style.display = (role === 'Doctor') ? 'block' : 'none';
}

function toggleEditSpecializationField() {
  const role = document.getElementById('editStaffRole').value;
  document.getElementById('editSpecializationGroup').style.display = (role === 'Doctor') ? 'block' : 'none';
}

// ===== SCHEDULE MANAGEMENT =====

function openScheduleDrawer(staffId) {
  const staff = staffList.find(s => s.id === staffId);
  if (!staff) { toast('Staff not found', 'error'); return; }
  const sch = scheduleMap[staffId];
  document.getElementById('schedStaffId').value = staffId;
  document.getElementById('schedStaffName').textContent = `${staff.name} (${staff.id})`;
  document.getElementById('schedShiftStart').value = sch ? (sch.shiftStart || '09:00') : '09:00';
  document.getElementById('schedShiftEnd').value = sch ? (sch.shiftEnd || '17:00') : '17:00';
  const workDays = sch ? (sch.workingDays || ['Monday','Tuesday','Wednesday','Thursday','Friday']) : ['Monday','Tuesday','Wednesday','Thursday','Friday'];
  document.querySelectorAll('.day-chip-select').forEach(chip => {
    chip.classList.toggle('active', workDays.includes(chip.dataset.day));
  });
  document.getElementById('scheduleModal').classList.add('active');
  document.getElementById('scheduleOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function toggleDayChip(el) {
  el.classList.toggle('active');
}

async function saveScheduleForm(e) {
  e.preventDefault();
  const staffId = document.getElementById('schedStaffId').value;
  const shiftStart = document.getElementById('schedShiftStart').value;
  const shiftEnd = document.getElementById('schedShiftEnd').value;
  const workingDays = Array.from(document.querySelectorAll('.day-chip-select.active')).map(el => el.dataset.day);
  const staff = staffList.find(s => s.id === staffId);
  if (!staff) { toast('Staff not found', 'error'); return; }
  if (!shiftStart || !shiftEnd) { toast('Please set shift start and end times', 'error'); return; }
  if (workingDays.length === 0) { toast('Please select at least one working day', 'error'); return; }
  try {
    await saveSchedule(staffId, {
      staffId,
      staffName: staff.name,
      staffRole: staff.role,
      dept: staff.dept,
      shiftStart,
      shiftEnd,
      workingDays
    });
    await loadSchedules();
    renderStaffTable();
    renderScheduleTable();
    document.getElementById('scheduleModal').classList.remove('active');
    document.getElementById('scheduleOverlay').classList.remove('active');
    document.body.style.overflow = '';
    toast(`Schedule saved for ${staff.name}`, 'success');
  } catch (err) {
    toast('Failed to save schedule: ' + err.message, 'error');
  }
}

async function clearSchedule(staffId) {
  if (!confirm(`Clear schedule for ${staffId}?`)) return;
  try {
    await deleteSchedule(staffId);
    await loadSchedules();
    renderStaffTable();
    renderScheduleTable();
    toast('Schedule cleared', 'info');
  } catch (err) {
    toast('Failed to clear schedule: ' + err.message, 'error');
  }
}

function filterScheduleTable() {
  const query = (document.getElementById('scheduleSearch')?.value || '').toLowerCase();
  const dept = document.getElementById('scheduleDeptFilter')?.value;
  const rows = document.querySelectorAll('#scheduleTableBody tr');
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    const rowDept = row.children[2]?.textContent || '';
    const matchQuery = !query || text.includes(query);
    const matchDept = !dept || dept === 'all' || rowDept.trim() === dept;
    row.style.display = matchQuery && matchDept ? '' : 'none';
  });
}

// ===== HEAD OF STAFF =====

function closeHosOverlay(event) {
  if (event.target !== event.currentTarget) return;
  document.getElementById('hosModal').classList.remove('active');
  document.getElementById('hosOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

function closeHosModal() {
  document.getElementById('hosModal').classList.remove('active');
  document.getElementById('hosOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

function showAssignHeadOfStaff() {
  const eligible = staffList.filter(s => s.role !== 'Doctor' && s.status === 'Active');
  if (eligible.length === 0) {
    toast('No eligible staff (non-doctor, active) to assign as Head of Staff', 'warning');
    return;
  }
  const overlay = document.getElementById('hosOverlay');
  const modal = document.getElementById('hosModal');
  const select = document.getElementById('hosStaffSelect');
  select.innerHTML = eligible.map(s => `<option value="${esc(s.id)}">${esc(s.name)} (${esc(s.role)} - ${esc(s.dept)})</option>`).join('');
  modal.classList.add('active');
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

async function assignHeadOfStaffSubmit(e) {
  e.preventDefault();
  const staffId = document.getElementById('hosStaffSelect').value;
  const staff = staffList.find(s => s.id === staffId);
  if (!staff) { toast('Staff not found', 'error'); return; }
  const adminName = HMS.getUser()?.name || 'Admin';
  try {
    await assignHeadOfStaff(staffId, staff.name, adminName);
    await loadCurrentHeadOfStaff();
    renderHeadOfStaffSection();
    closeHosModal();
    toast(`${staff.name} is now Head of Staff for this week`, 'success');
  } catch (err) {
    toast('Failed to assign: ' + err.message, 'error');
  }
}

async function rotateHeadOfStaff() {
  const eligible = staffList.filter(s => s.role !== 'Doctor' && s.status === 'Active');
  const nonScheduled = eligible.filter(s => !currentHOS || s.id !== currentHOS.staffId);
  if (nonScheduled.length === 0) {
    toast('No other eligible staff members to rotate to', 'warning');
    return;
  }
  const nextIdx = Math.floor(Math.random() * nonScheduled.length);
  const next = nonScheduled[nextIdx];
  const adminName = HMS.getUser()?.name || 'Admin';
  try {
    await assignHeadOfStaff(next.id, next.name, adminName);
    await loadCurrentHeadOfStaff();
    renderHeadOfStaffSection();
    toast(`Rotated: ${next.name} is now Head of Staff for this week`, 'success');
  } catch (err) {
    toast('Failed to rotate: ' + err.message, 'error');
  }
}

async function loadHOSHistory() {
  const container = document.getElementById('hosHistoryList');
  if (!container) return;
  container.innerHTML = '<p class="text-muted" style="text-align:center;padding:20px;">History not available.</p>';
}

// ===== AUDIT LOGS =====

async function loadAuditLogs() {
  const container = document.getElementById('logsList');
  if (!container) return;
  try {
    const result = await window.API.getAuditLogs({ limit: 50 });
    const items = result.data || [];
    if (items.length === 0) {
      container.innerHTML = '<li class="log-item" style="justify-content:center;padding:24px;color:var(--on-surface-var)">No audit logs yet.</li>';
      return;
    }
    container.innerHTML = items.map(data => {
      const ts = data.timestamp ? new Date(data.timestamp) : new Date();
      const timeStr = ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      const action = (data.action || 'EVENT').toUpperCase();
      let badgeClass = 'info';
      if (action.includes('LOGIN') || action.includes('LOGOUT')) badgeClass = 'info';
      else if (action.includes('CREATE') || action.includes('UPDATE')) badgeClass = 'success';
      else if (action.includes('DELETE') || action.includes('DENIED') || action.includes('FAILED')) badgeClass = 'warning';
      const userName = data.userEmail ? data.userEmail.split('@')[0] : (data.userId || 'System');
      const desc = buildLogDescription(action, data, userName);
      return `<li class="log-item">
        <span class="log-time">${esc(timeStr)}</span>
        <span class="log-badge ${badgeClass}">${esc(action)}</span>
        <p>${desc}</p>
      </li>`;
    }).join('');
  } catch (e) {
    container.innerHTML = '<li class="log-item" style="justify-content:center;padding:24px;color:var(--on-surface-var)">Failed to load logs.</li>';
  }
}

function buildLogDescription(action, data, userName) {
  const resource = data.resourceType || '';
  const details = typeof data.details === 'string' ? JSON.parse(data.details) : (data.details || {});
  switch (action) {
    case 'LOGIN': return `<strong>${esc(userName)}</strong> logged into the system`;
    case 'LOGOUT': return `<strong>${esc(userName)}</strong> logged out`;
    case 'PATIENT_VIEW': return `<strong>${esc(userName)}</strong> viewed patient ${esc(details.patientName || data.resourceId || '')}`;
    case 'PATIENT_CREATE': return `<strong>${esc(userName)}</strong> created patient ${esc(details.patientName || data.resourceId || '')}`;
    case 'PATIENT_UPDATE': return `<strong>${esc(userName)}</strong> updated patient ${esc(details.patientName || data.resourceId || '')}`;
    case 'PATIENT_DELETE': return `<strong>${esc(userName)}</strong> deleted patient ${esc(details.patientName || data.resourceId || '')}`;
    case 'PRESCRIPTION_CREATE': return `<strong>${esc(userName)}</strong> created prescription for ${esc(details.patientName || '')}`;
    case 'TRANSACTION_CREATE': return `<strong>${esc(userName)}</strong> recorded transaction ${esc(details.amount || '')}`;
    case 'INVOICE_CREATE': return `<strong>${esc(userName)}</strong> created invoice ${esc(details.amount || '')}`;
    case 'ACCESS_DENIED': return `Access denied for <strong>${esc(details.userId || userName)}</strong> (${esc(details.role || '')}) to ${esc(resource)}`;
    default: return `<strong>${esc(userName)}</strong> ${esc(action)} on ${esc(resource)} ${esc(data.resourceId || '')}`;
  }
}

// ===== HELPERS =====

function populateStaffSelects() {
  const select = document.getElementById('hosStaffSelect');
  if (select) {
    const eligible = staffList.filter(s => s.role !== 'Doctor' && s.status === 'Active');
    select.innerHTML = eligible.map(s => `<option value="${esc(s.id)}">${esc(s.name)} (${esc(s.role)} - ${esc(s.dept)})</option>`).join('');
  }
}

// ===== INITIALIZATION =====

(async function setup() {
  if (window._authReady) await window._authReady;
  if (!window._currentFirebaseUser) {
    await new Promise(resolve => {
      const check = setInterval(() => {
        if (window._currentFirebaseUser) { clearInterval(check); resolve(); }
      }, 50);
      setTimeout(() => { clearInterval(check); resolve(); }, 5000);
    });
  }
  await init();
  const addForm = document.getElementById('addStaffForm');
  if (addForm) addForm.addEventListener('submit', addStaff);
  const editForm = document.getElementById('editStaffForm');
  if (editForm) editForm.addEventListener('submit', updateStaff);
  const schedForm = document.getElementById('scheduleForm');
  if (schedForm) schedForm.addEventListener('submit', saveScheduleForm);
  const hosForm = document.getElementById('hosForm');
  if (hosForm) hosForm.addEventListener('submit', assignHeadOfStaffSubmit);
  toggleSpecializationField();
})();

async function init() {
  await loadStaff();
  await loadSchedules();
  await loadCurrentHeadOfStaff();
  renderStaffTable();
  renderScheduleTable();
  renderHeadOfStaffSection();
  populateStaffSelects();
  loadAuditLogs();
}
