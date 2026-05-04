/* =========================================
   ADMINISTRATION.JS – Personnel Management
   ========================================= */

'use strict';

// Auth guard
HMS.requireAuth();
const currentUser = HMS.getUser();

// Mock Data / Initial Personnel
const INITIAL_STAFF = [
  { id: 'STF001', name: 'Dr. Sarah Mitchell', role: 'Doctor', dept: 'General Surgery', spec: 'Chief Surgeon', status: 'Active', username: 'sarah.m' },
  { id: 'STF002', name: 'Dr. Rajan Kapoor', role: 'Doctor', dept: 'Cardiology', spec: 'Cardiologist', status: 'Active', username: 'rajan.k' },
  { id: 'STF003', name: 'Nurse Priya Sharma', role: 'Nurse', dept: 'Emergency', spec: 'ER Nurse', status: 'Active', username: 'priya.s' },
  { id: 'STF004', name: 'Arshin Ahmad', role: 'Pharmacist', dept: 'Pharmacy', spec: 'Head Pharmacist', status: 'Active', username: 'arshin' },
  { id: 'STF005', name: 'David Smith', role: 'Admin', dept: 'Administration', spec: 'System Admin', status: 'Active', username: 'david.s' },
];

let staffList = JSON.parse(localStorage.getItem('hms_staff_list')) || INITIAL_STAFF;

function saveStaff() {
  localStorage.setItem('hms_staff_list', JSON.stringify(staffList));
}

/* --- Rendering --- */
function renderStaffTable(data = staffList) {
  const tbody = document.getElementById('staffTableBody');
  if (!tbody) return;

  tbody.innerHTML = data.map(staff => `
    <tr>
      <td><code>${staff.id}</code></td>
      <td>
        <div class="staff-info-cell">
          <div class="staff-avatar">${staff.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
          <div class="staff-name-wrap">
            <strong>${staff.name}</strong>
            <span class="badge-role role-${staff.role.toLowerCase()}">${staff.role}</span>
          </div>
        </div>
      </td>
      <td>${staff.dept}</td>
      <td>${staff.spec || '--'}</td>
      <td><span class="badge-status ${staff.status.toLowerCase() === 'active' ? 'confirmed' : 'pending'}">${staff.status}</span></td>
      <td>
        <div style="display: flex; gap: 8px;">
          <button class="btn-icon" onclick="editStaff('${staff.id}')" title="Edit"><span class="material-icons-round">edit</span></button>
          <button class="btn-icon text-red" onclick="deleteStaff('${staff.id}')" title="Revoke Access"><span class="material-icons-round">block</span></button>
        </div>
      </td>
    </tr>
  `).join('');
}

/* --- CRUD Operations --- */
function addStaff(e) {
  e.preventDefault();
  
  const newStaff = {
    id: `STF${String(staffList.length + 1).padStart(3, '0')}`,
    name: document.getElementById('staffName').value,
    role: document.getElementById('staffRole').value,
    dept: document.getElementById('staffDept').value,
    spec: document.getElementById('staffSpec').value,
    status: 'Active',
    username: document.getElementById('staffUsername').value,
  };

  staffList.push(newStaff);
  saveStaff();
  renderStaffTable();
  
  // Close Drawer
  document.getElementById('addStaffModal').classList.remove('active');
  document.getElementById('addStaffOverlay').classList.remove('active');
  document.body.style.overflow = '';
  
  toast('New staff account created successfully', 'success');
  e.target.reset();
}

function deleteStaff(id) {
  if (confirm(`Are you sure you want to revoke access for ${id}?`)) {
    staffList = staffList.filter(s => s.id !== id);
    saveStaff();
    renderStaffTable();
    toast('Access revoked for the selected staff member', 'warning');
  }
}

function editStaff(id) {
  const staff = staffList.find(s => s.id === id);
  if (!staff) {
    console.error(`Staff with ID ${id} not found.`);
    return;
  }

  // Populate Modal
  document.getElementById('editStaffId').value = staff.id;
  document.getElementById('editStaffName').value = staff.name || '';
  document.getElementById('editStaffRole').value = staff.role || '';
  document.getElementById('editStaffDept').value = staff.dept || '';
  document.getElementById('editStaffSpec').value = staff.spec || '';
  document.getElementById('editStaffStatus').value = staff.status || 'Active';
  document.getElementById('editStaffPhone').value = staff.phone || '';
  document.getElementById('editStaffUsername').value = staff.username || '';

  toggleEditSpecializationField();

  // Show Modal
  document.getElementById('editStaffModal').classList.add('active');
  document.getElementById('editStaffOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function updateStaff(e) {
  e.preventDefault();
  
  const id = document.getElementById('editStaffId').value;
  const index = staffList.findIndex(s => s.id === id);
  
  if (index !== -1) {
    staffList[index] = {
      ...staffList[index],
      name: document.getElementById('editStaffName').value,
      role: document.getElementById('editStaffRole').value,
      dept: document.getElementById('editStaffDept').value,
      spec: document.getElementById('editStaffSpec').value,
      status: document.getElementById('editStaffStatus').value,
      phone: document.getElementById('editStaffPhone').value,
      username: document.getElementById('editStaffUsername').value,
    };

    saveStaff();
    renderStaffTable();
    
    // Close Modal
    document.getElementById('editStaffModal').classList.remove('active');
    document.getElementById('editStaffOverlay').classList.remove('active');
    document.body.style.overflow = '';
    
    toast('Staff information updated successfully', 'success');
  }
}

/* --- Filters --- */
function filterStaffTable() {
  const query = document.getElementById('staffSearch').value.toLowerCase();
  const role = document.getElementById('roleFilter').value;
  const status = document.getElementById('statusFilter').value;

  const filtered = staffList.filter(s => {
    const matchesQuery = s.name.toLowerCase().includes(query) || s.id.toLowerCase().includes(query) || s.username.toLowerCase().includes(query);
    const matchesRole = role === 'all' || s.role === role;
    const matchesStatus = status === 'all' || s.status === status;
    return matchesQuery && matchesRole && matchesStatus;
  });

  renderStaffTable(filtered);
}

/* --- UI Helpers --- */
function toggleSpecializationField() {
  const role = document.getElementById('staffRole').value;
  const specGroup = document.getElementById('specializationGroup');
  if (role === 'Doctor' || role === 'Nurse') {
    specGroup.style.display = 'block';
  } else {
    specGroup.style.display = 'none';
  }
}

function toggleEditSpecializationField() {
  const role = document.getElementById('editStaffRole').value;
  const specGroup = document.getElementById('editSpecializationGroup');
  if (role === 'Doctor' || role === 'Nurse') {
    specGroup.style.display = 'block';
  } else {
    specGroup.style.display = 'none';
  }
}

/* --- Initialization --- */
document.addEventListener('DOMContentLoaded', () => {
  renderStaffTable();
  
  const addForm = document.getElementById('addStaffForm');
  if (addForm) addForm.addEventListener('submit', addStaff);

  const editForm = document.getElementById('editStaffForm');
  if (editForm) editForm.addEventListener('submit', updateStaff);

  // Set initial spec field visibility
  toggleSpecializationField();
});
