'use strict';

HMS.requireAuth();
const currentUser = HMS.getUser();

if (currentUser && currentUser.role !== 'Admin') {
  toast('Admin access required.', 'error');
  setTimeout(() => window.location.href = 'dashboard.html', 1000);
}

const db = window.firebaseDb;
const fs = window.firebaseFS;

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

// ===== FIRESTORE OPERATIONS =====

async function loadStaff() {
  try {
    const snap = await fs.getDocs(fs.query(fs.collection(db, 'staff'), fs.orderBy('createdAt', 'desc')));
    staffList = [];
    snap.forEach(d => staffList.push({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('Failed to load staff:', e);
    staffList = [];
  }
}

async function loadSchedules() {
  try {
    const snap = await fs.getDocs(fs.collection(db, 'staff_schedules'));
    scheduleMap = {};
    snap.forEach(d => { scheduleMap[d.id] = { id: d.id, ...d.data() }; });
  } catch (e) {
    console.error('Failed to load schedules:', e);
    scheduleMap = {};
  }
}

async function loadCurrentHeadOfStaff() {
  try {
    const docSnap = await fs.getDoc(fs.doc(db, 'head_of_staff', 'current'));
    currentHOS = docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
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
  const snap = await fs.getDocs(fs.collection(db, 'staff'));
  return `STF${String(snap.size + 1).padStart(3, '0')}`;
}

async function createStaffInFirestore(staffId, data) {
  await fs.setDoc(fs.doc(db, 'staff', staffId), {
    ...data,
    status: data.status || 'Active',
    createdAt: fs.serverTimestamp(),
    updatedAt: fs.serverTimestamp()
  });
}

async function updateStaffInFirestore(staffId, data) {
  await fs.updateDoc(fs.doc(db, 'staff', staffId), {
    ...data,
    updatedAt: fs.serverTimestamp()
  });
}

async function deleteStaffFromFirestore(staffId) {
  await fs.deleteDoc(fs.doc(db, 'staff', staffId));
}

async function saveSchedule(staffId, data) {
  await fs.setDoc(fs.doc(db, 'staff_schedules', staffId), {
    ...data,
    updatedAt: fs.serverTimestamp()
  }, { merge: true });
}

async function deleteSchedule(staffId) {
  try {
    await fs.deleteDoc(fs.doc(db, 'staff_schedules', staffId));
  } catch (e) { /* ignore */ }
}

async function assignHeadOfStaff(staffId, staffName, adminName) {
  const week = getWeekRange();
  const historyRef = fs.doc(fs.collection(db, 'head_of_staff_history'));
  await fs.setDoc(fs.doc(db, 'head_of_staff', 'current'), {
    staffId,
    staffName,
    weekStart: week.start,
    weekEnd: week.end,
    weekLabel: `${week.startLabel} - ${week.endLabel}`,
    assignedBy: adminName,
    assignedAt: fs.serverTimestamp()
  });
  await fs.setDoc(historyRef, {
    staffId,
    staffName,
    weekStart: week.start,
    weekEnd: week.end,
    weekLabel: `${week.startLabel} - ${week.endLabel}`,
    assignedBy: adminName,
    assignedAt: fs.serverTimestamp()
  });
  currentHOS = { staffId, staffName, weekStart: week.start, weekEnd: week.end };
}

// ===== RENDER FUNCTIONS =====

function renderStaffTable(data) {
  const tbody = document.getElementById('staffTableBody');
  if (!tbody) return;
  const list = data || staffList;
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
      <td><span class="shift-time">${esc(sch.shiftStart || '--')} - ${esc(sch.shiftEnd || '--')}</span></td>
      <td><div class="days-wrap">${days || '<span class="text-muted">Not set</span>'}</div></td>
      <td>
        <div style="display:flex;gap:6px;">
          <button class="btn-icon" onclick="openScheduleDrawer('${esc(s.id)}')" title="Edit Schedule"><span class="material-icons-round">edit</span></button>
          <button class="btn-icon text-red" onclick="clearSchedule('${esc(s.id)}')" title="Clear Schedule"><span class="material-icons-round">delete</span></button>
        </div>
      </td>
    </tr>`;
  }).join('') || '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--on-surface-var);">No schedules assigned yet. Go to Staff Management tab to add schedules.</td></tr>';
  tbody.innerHTML = rows;
  document.getElementById('scheduleCount').textContent = staffList.filter(s => scheduleMap[s.id]).length;
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
    const staffId = await ensureStaffId();
    await createStaffInFirestore(staffId, raw);
    try {
      const cred = await window.createFirebaseUser(raw.email, password);
      await updateStaffInFirestore(staffId, { uid: cred.user.uid });
      await fs.setDoc(fs.doc(db, 'users', cred.user.uid), {
        name: raw.name,
        role: raw.role,
        title: raw.spec || raw.role,
        email: raw.email,
        createdAt: fs.serverTimestamp(),
        updatedAt: fs.serverTimestamp()
      });
    } catch (authErr) {
      console.warn('Auth creation failed (email may already exist):', authErr);
      toast('Staff record created but Firebase Auth user creation failed: ' + authErr.message, 'warning');
    }
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
  document.getElementById('specializationGroup').style.display = (role === 'Doctor' || role === 'Nurse') ? 'block' : 'none';
}

function toggleEditSpecializationField() {
  const role = document.getElementById('editStaffRole').value;
  document.getElementById('editSpecializationGroup').style.display = (role === 'Doctor' || role === 'Nurse') ? 'block' : 'none';
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
  const adminName = currentUser ? currentUser.name : 'Admin';
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
  const adminName = currentUser ? currentUser.name : 'Admin';
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
  try {
    const snap = await fs.getDocs(fs.query(fs.collection(db, 'head_of_staff_history'), fs.orderBy('assignedAt', 'desc'), fs.limit(10)));
    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    if (items.length === 0) {
      container.innerHTML = '<p class="text-muted" style="text-align:center;padding:20px;">No rotation history yet.</p>';
      return;
    }
    container.innerHTML = items.map(item => `
      <div class="hos-history-item">
        <div class="hos-history-avatar">${esc((item.staffName||'U').split(' ').map(n=>n[0]).join('').slice(0,2))}</div>
        <div class="hos-history-info">
          <strong>${esc(item.staffName)}</strong>
          <span class="hos-history-week">${esc(item.weekLabel || item.weekStart + ' - ' + item.weekEnd)}</span>
        </div>
        <span class="hos-history-by">by ${esc(item.assignedBy || 'Admin')}</span>
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = '<p class="text-muted" style="text-align:center;padding:20px;">Failed to load history.</p>';
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

// ===== EVENT LISTENERS =====

document.addEventListener('DOMContentLoaded', async () => {
  await init();
  loadHOSHistory();
  const addForm = document.getElementById('addStaffForm');
  if (addForm) addForm.addEventListener('submit', addStaff);
  const editForm = document.getElementById('editStaffForm');
  if (editForm) editForm.addEventListener('submit', updateStaff);
  const schedForm = document.getElementById('scheduleForm');
  if (schedForm) schedForm.addEventListener('submit', saveScheduleForm);
  const hosForm = document.getElementById('hosForm');
  if (hosForm) hosForm.addEventListener('submit', assignHeadOfStaffSubmit);
  toggleSpecializationField();
});

async function init() {
  await loadStaff();
  await loadSchedules();
  await loadCurrentHeadOfStaff();
  renderStaffTable();
  renderScheduleTable();
  renderHeadOfStaffSection();
  populateStaffSelects();
}
