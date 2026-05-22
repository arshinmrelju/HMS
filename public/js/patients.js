/* =========================================
   PATIENTS.JS – Patient registry data & logic
   ========================================= */

'use strict';

HMS.requireAuth();

/* --- Patient Data Store --- */
const PATIENTS_DB = [
  {id:'WM-001',fname:'Sarah',lname:'Mitchell',contact:'+91 9876543210',email:'sarah.m@email.com',dept:'Cardiology',lastVisit:'2026-05-01',status:'stable',type:'admitted',blood:'A+',age:34},
  {id:'WM-002',fname:'Rajan',lname:'Kapoor',contact:'+91 9123456780',email:'rajan.k@email.com',dept:'Orthopedics',lastVisit:'2026-04-29',status:'recovering',type:'outpatient',blood:'B+',age:52},
  {id:'WM-003',fname:'Arthur',lname:'Pendragon',contact:'+1 555-019-9283',email:'arthur@email.com',dept:'Neurology',lastVisit:'2026-04-28',status:'critical',type:'admitted',blood:'O-',age:61},
  {id:'WM-004',fname:'Jordan',lname:'Xiao',contact:'+91 9177443882',email:'jordan.x@email.com',dept:'Pediatrics',lastVisit:'2026-04-30',status:'stable',type:'outpatient',blood:'AB+',age:8},
  {id:'WM-005',fname:'Mary',lname:'Gates',contact:'+91 9988776655',email:'mary.g@email.com',dept:'Oncology',lastVisit:'2026-05-02',status:'recovering',type:'admitted',blood:'B-',age:47},
  {id:'WM-006',fname:'Alex',lname:'Johnson',contact:'+91 9667788990',email:'alex.j@email.com',dept:'General Surgery',lastVisit:'2026-05-03',status:'stable',type:'admitted',blood:'A-',age:29},
  {id:'WM-007',fname:'Priya',lname:'Nair',contact:'+91 9345678901',email:'priya.n@email.com',dept:'Cardiology',lastVisit:'2026-04-27',status:'stable',type:'outpatient',blood:'O+',age:38},
  {id:'WM-008',fname:'Mohammed',lname:'Hassan',contact:'+91 9012345678',email:'m.hassan@email.com',dept:'Neurology',lastVisit:'2026-04-26',status:'critical',type:'admitted',blood:'AB-',age:73},
  {id:'WM-009',fname:'Li',lname:'Wei',contact:'+91 9876001234',email:'li.wei@email.com',dept:'Pediatrics',lastVisit:'2026-04-25',status:'stable',type:'outpatient',blood:'B+',age:12},
  {id:'WM-010',fname:'Ananya',lname:'Sharma',contact:'+91 9765432109',email:'ananya.s@email.com',dept:'General Surgery',lastVisit:'2026-05-01',status:'recovering',type:'admitted',blood:'A+',age:24},
  {id:'WM-011',fname:'Carlos',lname:'Mendez',contact:'+91 9654321098',email:'carlos.m@email.com',dept:'Orthopedics',lastVisit:'2026-04-30',status:'stable',type:'outpatient',blood:'O+',age:45},
  {id:'WM-012',fname:'Fatima',lname:'Al-Sayed',contact:'+91 9543210987',email:'fatima.a@email.com',dept:'Oncology',lastVisit:'2026-04-28',status:'critical',type:'admitted',blood:'B-',age:58},
];

let allPatients = [...PATIENTS_DB];
let filteredPatients = [...allPatients];
let currentPage = 1;
const ROWS_PER_PAGE = 10;
let activeFilter = 'all';
let sortCol = null, sortDir = 1;

/* --- Render Table --- */
function renderTable() {
  const tbody = document.getElementById('patientTableBody');
  if (!tbody) return;

  const start = (currentPage - 1) * ROWS_PER_PAGE;
  const pageItems = filteredPatients.slice(start, start + ROWS_PER_PAGE);

  if (pageItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--on-surface-var)"><span class="material-icons-round" style="display:block;font-size:40px;margin-bottom:8px;color:var(--outline-var)">search_off</span>No patients found</td></tr>`;
    return;
  }

  tbody.innerHTML = pageItems.map(p => `
    <tr>
      <td><input type="checkbox" /></td>
      <td><code style="font-size:.78rem;background:var(--surface-mid);padding:2px 6px;border-radius:4px;color:var(--primary-light)">${p.id}</code></td>
      <td>
        <div class="patient-cell">
          <div class="mini-avatar">${p.fname[0]}${p.lname[0]}</div>
          <div>
            <div style="font-weight:700">${p.fname} ${p.lname}</div>
            <div style="font-size:.72rem;color:var(--on-surface-var)">${p.age} yrs · ${p.blood}</div>
          </div>
        </div>
      </td>
      <td style="font-size:.82rem">${p.contact}</td>
      <td style="font-size:.82rem">${p.dept}</td>
      <td style="font-size:.82rem">${formatDate(p.lastVisit)}</td>
      <td><span class="badge-status ${p.status}">${cap(p.status)}</span></td>
      <td>
        <button class="icon-btn" title="View" onclick="viewPatient('${p.id}')"><span class="material-icons-round">visibility</span></button>
        <button class="icon-btn" title="Edit" onclick="editPatient('${p.id}')"><span class="material-icons-round">edit</span></button>
        <button class="icon-btn danger" title="Delete" onclick="deletePatient('${p.id}')"><span class="material-icons-round">delete</span></button>
      </td>
    </tr>
  `).join('');

  updatePagination();
}

function formatDate(d) { return new Date(d).toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'}); }
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/* --- Filter --- */
function applyFilters() {
  const search = (document.getElementById('patientSearch')?.value || '').toLowerCase();
  const dept = document.getElementById('deptFilter')?.value || '';
  const status = document.getElementById('statusFilter')?.value || '';

  filteredPatients = allPatients.filter(p => {
    const name = `${p.fname} ${p.lname} ${p.id}`.toLowerCase();
    if (search && !name.includes(search)) return false;
    if (dept && p.dept !== dept) return false;
    if (status && p.status !== status) return false;
    if (activeFilter !== 'all' && p.type !== activeFilter && p.status !== activeFilter) return false;
    return true;
  });

  if (sortCol) {
    filteredPatients.sort((a, b) => {
      const va = a[sortCol] || '';
      const vb = b[sortCol] || '';
      return va.toString().localeCompare(vb.toString()) * sortDir;
    });
  }

  currentPage = 1;
  document.getElementById('patientCount').textContent = filteredPatients.length;
  renderTable();
}

function filterPatients() { applyFilters(); }

function setFilter(btn, filter) {
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  activeFilter = filter;
  applyFilters();
}

function sortTable(col) {
  if (sortCol === col) sortDir *= -1;
  else { sortCol = col; sortDir = 1; }
  applyFilters();
}

function toggleSelectAll(cb) {
  document.querySelectorAll('#patientTableBody input[type="checkbox"]').forEach(c => c.checked = cb.checked);
}

/* --- Pagination --- */
function updatePagination() {
  const total = filteredPatients.length;
  const pages = Math.max(1, Math.ceil(total / ROWS_PER_PAGE));
  const start = (currentPage - 1) * ROWS_PER_PAGE + 1;
  const end = Math.min(currentPage * ROWS_PER_PAGE, total);

  document.getElementById('paginationInfo').textContent = `Showing ${total ? start : 0}–${end} of ${total}`;
  document.getElementById('prevPage').disabled = currentPage <= 1;
  document.getElementById('nextPage').disabled = currentPage >= pages;

  const nums = document.getElementById('pageNumbers');
  nums.innerHTML = '';
  for (let i = 1; i <= Math.min(pages, 5); i++) {
    const btn = document.createElement('button');
    btn.className = 'page-num' + (i === currentPage ? ' active' : '');
    btn.textContent = i;
    btn.onclick = () => { currentPage = i; renderTable(); };
    nums.appendChild(btn);
  }
}

function changePage(dir) {
  const pages = Math.ceil(filteredPatients.length / ROWS_PER_PAGE);
  currentPage = Math.max(1, Math.min(pages, currentPage + dir));
  renderTable();
}

/* --- View Patient --- */
function viewPatient(id) {
  const p = allPatients.find(pt => pt.id === id);
  if (!p) return;
  document.getElementById('viewPatientTitle').textContent = `${p.fname} ${p.lname}`;
  document.getElementById('viewPatientBody').innerHTML = `
    <div style="padding:0 28px 28px">
      <div style="display:flex;gap:20px;align-items:flex-start;margin-bottom:24px">
        <div class="mini-avatar" style="width:64px;height:64px;font-size:1.3rem;background:linear-gradient(135deg,var(--primary-light),#2DD4BF);color:#fff">${p.fname[0]}${p.lname[0]}</div>
        <div>
          <h3 style="font-family:var(--font-head);font-size:1.3rem;font-weight:800">${p.fname} ${p.lname}</h3>
          <p style="color:var(--on-surface-var);font-size:.85rem">${p.id} · ${p.dept}</p>
          <span class="badge-status ${p.status}" style="margin-top:8px">${cap(p.status)}</span>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="form-group"><label>Age</label><div style="padding:10px 14px;background:var(--surface-low);border-radius:var(--radius-md)">${p.age} years</div></div>
        <div class="form-group"><label>Blood Group</label><div style="padding:10px 14px;background:var(--surface-low);border-radius:var(--radius-md)">${p.blood}</div></div>
        <div class="form-group"><label>Contact</label><div style="padding:10px 14px;background:var(--surface-low);border-radius:var(--radius-md)">${p.contact}</div></div>
        <div class="form-group"><label>Email</label><div style="padding:10px 14px;background:var(--surface-low);border-radius:var(--radius-md)">${p.email}</div></div>
        <div class="form-group"><label>Admission Type</label><div style="padding:10px 14px;background:var(--surface-low);border-radius:var(--radius-md)">${cap(p.type)}</div></div>
        <div class="form-group"><label>Last Visit</label><div style="padding:10px 14px;background:var(--surface-low);border-radius:var(--radius-md)">${formatDate(p.lastVisit)}</div></div>
      </div>
      <div style="margin-top:16px;display:flex;gap:10px;justify-content:flex-end">
        <button class="btn-secondary" onclick="closeModal(null,'viewPatientModal')">Close</button>
        <button class="btn-primary" onclick="closeModal(null,'viewPatientModal');toast('Editing ${p.fname}...','info','edit')">Edit Patient</button>
      </div>
    </div>
  `;
  openModal('viewPatientModal');
}

function editPatient(id) { toast(`Edit mode for ${id}`, 'info', 'edit'); }
function deletePatient(id) {
  if (!confirm('Remove this patient from the registry?')) return;
  allPatients = allPatients.filter(p => p.id !== id);
  filteredPatients = filteredPatients.filter(p => p.id !== id);
  renderTable();
  toast('Patient record removed', 'warning', 'delete');
}

/* --- Add Patient --- */
function submitAddPatient(e) {
  e.preventDefault();
  const newP = {
    id: `WM-${String(allPatients.length + 1).padStart(3,'0')}`,
    fname: document.getElementById('pFirstName').value,
    lname: document.getElementById('pLastName').value,
    contact: document.getElementById('pContact').value,
    email: document.getElementById('pEmail').value,
    dept: document.getElementById('pDept').value,
    type: document.getElementById('pType').value.toLowerCase(),
    blood: document.getElementById('pBlood').value || 'Unknown',
    lastVisit: new Date().toISOString().slice(0,10),
    status: 'stable',
    age: Math.floor((new Date() - new Date(document.getElementById('pDob').value)) / (365.25*24*3600*1000)),
  };
  allPatients.unshift(newP);
  applyFilters();
  closeModal(null, 'addPatientModal');
  document.getElementById('addPatientForm').reset();
  toast(`Patient ${newP.fname} ${newP.lname} registered!`, 'success');
}

/* --- Init --- */
document.addEventListener('DOMContentLoaded', () => {
  renderTable();
});
