/* =========================================
   DOCTOR WORKSPACE JS
   ========================================= */
'use strict';
HMS.requireAuth();

// Mock Data: Today's Appointments for logged-in doctor
const TODAY_APPOINTMENTS = [
  { id: 'APT-101', time: '09:00 AM', patient: 'Alex Johnson', reason: 'Post-op checkup', status: 'completed' },
  { id: 'APT-102', time: '09:45 AM', patient: 'Maria Garcia', reason: 'Abdominal pain consulting', status: 'waiting' },
  { id: 'APT-103', time: '10:30 AM', patient: 'James Smith', reason: 'Routine follow-up', status: 'upcoming' },
  { id: 'APT-104', time: '11:15 AM', patient: 'Linda Brown', reason: 'Surgical consultation', status: 'upcoming' },
  { id: 'APT-105', time: '02:00 PM', patient: 'Robert Davis', reason: 'Hernia evaluation', status: 'upcoming' },
];

/* =========================================
   LIVE INVENTORY BRIDGE
   Reads real-time stock from pharmacy.js via localStorage.
   Falls back to a seed list if pharmacy page hasn't been visited yet.
   ========================================= */
const FALLBACK_STOCK = [
  { name: 'Amoxicillin 500mg',  cat: 'antibiotics', stock: 240, price: 12.50, expiry: '2026-12-01', status: 'in-stock', safetyStock: 50, reorderPoint: 95, reorderQty: 150 },
  { name: 'Paracetamol 650mg',  cat: 'analgesics',  stock: 18,  price: 3.20,  expiry: '2026-08-15', status: 'low',      safetyStock: 30, reorderPoint: 60, reorderQty: 200 },
  { name: 'Atorvastatin 10mg',  cat: 'cardiac',     stock: 150, price: 28.00, expiry: '2027-03-10', status: 'in-stock', safetyStock: 25, reorderPoint: 50, reorderQty: 100 },
  { name: 'Vitamin D3 60K',     cat: 'vitamins',    stock: 0,   price: 95.00, expiry: '2026-06-20', status: 'out',      safetyStock: 10, reorderPoint: 25, reorderQty: 50  },
  { name: 'Ciprofloxacin 500mg',cat: 'antibiotics', stock: 88,  price: 18.00, expiry: '2026-11-30', status: 'in-stock', safetyStock: 40, reorderPoint: 80, reorderQty: 120 },
  { name: 'Ibuprofen 400mg',    cat: 'analgesics',  stock: 320, price: 6.50,  expiry: '2027-01-15', status: 'in-stock', safetyStock: 50, reorderPoint: 100, reorderQty: 200 },
  { name: 'Metformin 500mg',    cat: 'cardiac',     stock: 12,  price: 7.00,  expiry: '2026-07-01', status: 'low',      safetyStock: 20, reorderPoint: 40, reorderQty: 100 },
  { name: 'Vitamin B12',        cat: 'vitamins',    stock: 75,  price: 42.00, expiry: '2027-02-28', status: 'in-stock', safetyStock: 15, reorderPoint: 35, reorderQty: 80  },
];

function getLiveInventory() {
  try {
    const raw = localStorage.getItem('hms_inventory');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch(e) { /* parse error – fall back */ }
  return FALLBACK_STOCK;
}

function getMedicineSearchInventory() {
  const byName = new Map();
  [...FALLBACK_STOCK, ...getLiveInventory()].forEach(m => {
    const name = medicineName(m);
    if (name) byName.set(name.toLowerCase(), m);
  });
  return [...byName.values()];
}

// Pre-seed localStorage if empty so live autocomplete works immediately on first load
(function seedIfEmpty() {
  try {
    if (!localStorage.getItem('hms_inventory')) {
      localStorage.setItem('hms_inventory', JSON.stringify(FALLBACK_STOCK));
    }
  } catch(e) { /* silent storage quota error */ }
})();

// Normalise status for display (pharmacy uses 'out'/'low'/'in-stock')
function stockStatus(m) {
  if (m.status === 'out'  || m.stock === 0)                  return 'out-stock';
  if (m.status === 'low'  || (m.reorderPoint && m.stock <= m.reorderPoint)) return 'low-stock';
  return 'in-stock';
}

function medicineName(m) {
  return String(m.name || m.medName || m.medicineName || m.itemName || m.product || '').trim();
}

function medicineCategory(m) {
  return String(m.cat || m.category || m.type || '').trim();
}

function medicineMatches(m, query) {
  const name = medicineName(m).toLowerCase();
  const category = medicineCategory(m).toLowerCase();
  return name.includes(query) || category.includes(query);
}


function initWorkspace() {
  const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', dateOptions);

  populateMedicineDatalist();
  renderAppointments();
  renderPharmacyStock(getLiveInventory());
  showStockAlertBanner();
}

function populateMedicineDatalist() {
  const datalist = document.getElementById('medicineInventoryList');
  if (!datalist) return;
  datalist.innerHTML = getMedicineSearchInventory()
    .map(m => `<option value="${medicineName(m)}"></option>`)
    .join('');
}

/* ---- Low / Out-of-Stock Banner on Doctor Workspace ---- */
function showStockAlertBanner() {
  const inventory = getLiveInventory();
  const outItems = inventory.filter(m => m.status === 'out' || m.stock === 0);
  const lowItems = inventory.filter(m => m.status === 'low' || (m.reorderPoint && m.stock > 0 && m.stock <= m.reorderPoint));

  const banner = document.getElementById('stockAlertBanner');
  if (!banner) return;

  if (outItems.length === 0 && lowItems.length === 0) {
    banner.hidden = true;
    return;
  }

  banner.hidden = false;
  const outNames = outItems.map(m => `<strong>${m.name}</strong>`).join(', ');
  const lowNames = lowItems.map(m => `<strong>${m.name}</strong>`).join(', ');

  let html = `<span class="material-icons-round" style="font-size:18px;flex-shrink:0">warning</span><div style="flex:1;font-size:.82rem;line-height:1.5">`;
  if (outItems.length) html += `<span style="color:var(--accent-red);font-weight:700">${outItems.length} OUT OF STOCK:</span> ${outNames}. `;
  if (lowItems.length) html += `<span style="color:var(--accent-amber);font-weight:700">${lowItems.length} LOW STOCK:</span> ${lowNames}.`;
  html += `</div><a href="pharmacy.html" style="font-size:.78rem;font-weight:700;color:var(--primary-light);white-space:nowrap;text-decoration:none">View Pharmacy →</a>`;

  banner.innerHTML = html;
}

// --- Appointments ---
function renderAppointments() {
  const list = document.getElementById('appointmentList');
  document.getElementById('appointmentCount').textContent = `${TODAY_APPOINTMENTS.length} Total`;
  
  if (TODAY_APPOINTMENTS.length === 0) {
    list.innerHTML = `<div style="text-align:center;padding:32px;color:var(--on-surface-var)"><span class="material-icons-round" style="font-size:32px;margin-bottom:8px">event_busy</span><p>No appointments today</p></div>`;
    return;
  }

  list.innerHTML = TODAY_APPOINTMENTS.map(apt => {
    let actionBtn = '';
    if (apt.status === 'completed') {
      actionBtn = `<span class="badge-status available">Completed</span>`;
    } else if (apt.status === 'waiting') {
      actionBtn = `<button class="btn-primary btn-sm" onclick="startConsultation('${apt.patient}')">Start Consult</button>`;
    } else {
      actionBtn = `<span class="badge-status busy">Upcoming</span>`;
    }

    return `
      <div class="apt-item">
        <div class="apt-time">${apt.time}</div>
        <div class="apt-details">
          <div class="apt-patient">${apt.patient}</div>
          <div class="apt-reason">${apt.reason}</div>
        </div>
        <div class="apt-actions">
          ${actionBtn}
        </div>
      </div>
    `;
  }).join('');
}

// --- Pharmacy Lookup ---
function renderPharmacyStock(stockList) {
  const list = document.getElementById('medResultsList');
  if (!list) return;

  if (!stockList.length) {
    list.innerHTML = `<div style="text-align:center;padding:24px;color:var(--on-surface-var)">No medicines found.</div>`;
    return;
  }

  // Sort: out-of-stock items float to top with a warning
  const sorted = [...stockList].sort((a, b) => {
    const rank = m => (m.status === 'out' || m.stock === 0) ? 0 : (m.status === 'low') ? 1 : 2;
    return rank(a) - rank(b);
  });

  list.innerHTML = sorted.map(m => {
    const ss = stockStatus(m);
    const qty = m.qty !== undefined ? m.qty : m.stock;
    const cat = m.category || m.cat || '';
    const stockLabel = ss === 'out-stock' ? 'Out of Stock' : ss === 'low-stock' ? 'Low Stock' : 'In Stock';
    return `
      <div class="med-item ${ss === 'out-stock' ? 'med-item-out' : ''}">
        <div class="med-info">
          <span class="med-name">${m.name}</span>
          <span class="med-category" style="text-transform:capitalize">${cat}</span>
        </div>
        <div class="stock-badge ${ss}">${stockLabel} (${qty})</div>
      </div>
    `;
  }).join('');
}

function searchMedicine() {
  const query = document.getElementById('medSearch').value.toLowerCase();
  const inventory = getLiveInventory();
  const filtered = inventory.filter(m =>
    medicineMatches(m, query)
  );
  renderPharmacyStock(filtered);
}

// --- Consultation Mode ---
let activeConsultationPatient = null;

function startConsultation(patientName) {
  activeConsultationPatient = patientName;
  document.getElementById('cPatientName').textContent = patientName;
  
  // Create an avatar initials
  const initials = patientName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  document.getElementById('cPatientAvatar').textContent = initials;
  document.getElementById('cPatientMeta').textContent = 'In Progress...';

  // Toggle UI
  document.getElementById('defaultWorkspace').style.display = 'none';
  document.getElementById('pageTitle').textContent = 'Active Consultation';
  document.getElementById('headerActions').style.display = 'none';
  document.getElementById('consultationWorkspace').style.display = 'block';
}

function startAdhocConsultation() {
  const name = prompt("Enter Patient Name:");
  if(name) {
    startConsultation(name);
  }
}

function endConsultation() {
  activeConsultationPatient = null;
  document.getElementById('consultationWorkspace').style.display = 'none';
  document.getElementById('defaultWorkspace').style.display = 'block';
  document.getElementById('pageTitle').textContent = 'My Workspace';
  document.getElementById('headerActions').style.display = 'flex';
  resetConsultationForm();
}

function submitConsultation() {
  const diagnosis = document.getElementById('cDiagnosis').value;
  if (!diagnosis) {
    toast('Please enter a diagnosis.', 'error');
    return;
  }

  // Collect Meds
  const meds = [];
  document.querySelectorAll('#cMedicationEntries .c-med-row').forEach(row => {
    const name = row.querySelector('input.med-name').value.trim();
    const morn = row.querySelector('.med-morn').checked ? '1' : '0';
    const aft = row.querySelector('.med-aft').checked ? '1' : '0';
    const night = row.querySelector('.med-night').checked ? '1' : '0';
    const dose = `${morn}-${aft}-${night}`;
    const days = row.querySelector('.med-days').value;
    if (name) meds.push({ name, dose, days });
  });

  // Collect Labs
  const labs = [];
  document.querySelectorAll('#cLabEntries .c-lab-row').forEach(row => {
    const name = row.querySelector('.lab-name').value;
    if (name) labs.push(name);
  });

  // Update appointment status to completed if it matches
  if (activeConsultationPatient) {
    const apt = TODAY_APPOINTMENTS.find(a => a.patient === activeConsultationPatient && a.status === 'waiting');
    if (apt) {
      apt.status = 'completed';
      renderAppointments();
    }
  }

  toast(`Consultation completed for ${activeConsultationPatient}.`, 'success');
  endConsultation();
}

function resetConsultationForm() {
  document.getElementById('cComplaint').value = '';
  document.getElementById('cDiagnosis').value = '';
  document.getElementById('cNotes').value = '';
  
  document.getElementById('cMedicationEntries').innerHTML = createMedicationRowHTML();
  
  document.getElementById('cLabEntries').innerHTML = `
    <div class="c-lab-row consult-entry">
      <div style="display: flex; gap: 8px; width: 100%; align-items: center;">
        <input type="text" placeholder="e.g. CBC Panel" class="lab-name consult-input" style="flex: 1; font-weight: 600;" />
        <button type="button" class="btn-icon text-red" onclick="removeLabRow(this)" style="background: rgba(239, 68, 68, 0.1);"><span class="material-icons-round">delete_outline</span></button>
      </div>
    </div>
  `;
}

// --- Dynamic Rows ---
function addMedRow() {
  const container = document.getElementById('cMedicationEntries');
  const row = document.createElement('div');
  row.className = 'c-med-row consult-entry';
  row.innerHTML = createMedicationRowInnerHTML();
  container.appendChild(row);
}

function createMedicationRowHTML() {
  return `<div class="c-med-row consult-entry">${createMedicationRowInnerHTML()}</div>`;
}

function createMedicationRowInnerHTML() {
  return `
    <div class="med-input-wrap">
      <span class="material-icons-round search-icon">search</span>
      <input type="text" placeholder="Search pharmacy inventory..." class="med-name consult-input" list="medicineInventoryList" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" style="font-weight: 600; width: 100%;" />
    </div>
    <div class="med-match-status" aria-live="polite"></div>
    <div style="display: flex; gap: 8px; margin-top: 10px; align-items: center;">
      <div class="dose-group" style="flex: 2; display: flex; gap: 4px;">
        <label class="dose-chip" title="Morning"><input type="checkbox" class="med-morn" /><span>Morn</span></label>
        <label class="dose-chip" title="Afternoon"><input type="checkbox" class="med-aft" /><span>Aft</span></label>
        <label class="dose-chip" title="Night"><input type="checkbox" class="med-night" /><span>Night</span></label>
      </div>
      <input type="number" placeholder="Days" class="med-days consult-input" style="flex: 1;" />
      <button type="button" class="btn-icon text-red" onclick="removeMedRow(this)" style="background: rgba(239, 68, 68, 0.1);"><span class="material-icons-round">delete_outline</span></button>
    </div>
  `;
}

function removeMedRow(btn) {
  const row = btn.closest('.c-med-row');
  if (document.querySelectorAll('#cMedicationEntries .c-med-row').length > 1) {
    row.remove();
  } else {
    const medicineInput = row.querySelector('input.med-name');
    medicineInput.value = '';
    medicineInput.removeAttribute('data-selected-medicine');
    medicineInput.removeAttribute('data-stock-status');
    row.querySelector('.med-morn').checked = false;
    row.querySelector('.med-aft').checked = false;
    row.querySelector('.med-night').checked = false;
    row.querySelector('.med-days').value = '';
  }
}

function addLabRow() {
  const container = document.getElementById('cLabEntries');
  const row = document.createElement('div');
  row.className = 'c-lab-row consult-entry';
  row.innerHTML = `
    <div style="display: flex; gap: 8px; width: 100%; align-items: center;">
      <input type="text" placeholder="e.g. CBC Panel" class="lab-name consult-input" style="flex: 1; font-weight: 600;" />
      <button type="button" class="btn-icon text-red" onclick="removeLabRow(this)" style="background: rgba(239, 68, 68, 0.1);"><span class="material-icons-round">delete_outline</span></button>
    </div>
  `;
  container.appendChild(row);
}

function removeLabRow(btn) {
  const row = btn.closest('.c-lab-row');
  if (document.querySelectorAll('#cLabEntries .c-lab-row').length > 1) {
    row.remove();
  } else {
    row.querySelector('.lab-name').value = '';
  }
}

document.addEventListener('DOMContentLoaded', initWorkspace);

// --- Autocomplete for Medications ---
let activeAutocompleteDropdown = null;
let activeAutocompleteMatches = [];
let activeAutocompleteIndex = -1;
let activeAutocompleteInput = null;

function closeAllAutocompletes() {
  if (activeAutocompleteDropdown) {
    activeAutocompleteDropdown.remove();
    activeAutocompleteDropdown = null;
  }
  if (activeAutocompleteInput) {
    activeAutocompleteInput.setAttribute('aria-expanded', 'false');
  }
  activeAutocompleteMatches = [];
  activeAutocompleteIndex = -1;
  activeAutocompleteInput = null;
}

function updateAutocompleteHighlight() {
  if (!activeAutocompleteDropdown) return;
  const items = activeAutocompleteDropdown.querySelectorAll('.autocomplete-item');
  items.forEach((item, index) => {
    if (index === activeAutocompleteIndex) {
      item.classList.add('active-suggestion');
      item.scrollIntoView({ block: 'nearest' });
    } else {
      item.classList.remove('active-suggestion');
    }
  });
}

function selectAutocompleteItem(match) {
  if (!activeAutocompleteInput) return;
  const ss = stockStatus(match);
  if (ss === 'out-stock') {
    toast(`${medicineName(match)} is out of stock. Consider an alternative.`, 'warning');
  }
  activeAutocompleteInput.value = medicineName(match);
  activeAutocompleteInput.dataset.selectedMedicine = medicineName(match);
  activeAutocompleteInput.dataset.stockStatus = ss;
  const inputToFocus = activeAutocompleteInput;
  closeAllAutocompletes();
  inputToFocus.focus();
}

document.addEventListener('click', function(e) {
  if (e.target.matches('input.med-name')) {
    handleMedAutocomplete(e.target);
  } else if (!e.target.closest('.med-input-wrap') && !e.target.closest('.autocomplete-dropdown')) {
    closeAllAutocompletes();
  }
});

function handleMedAutocomplete(input) {
  if (!(input instanceof HTMLInputElement)) return;
  const val = input.value.trim().toLowerCase();

  const inventory = getMedicineSearchInventory();
  let matches = [];
  if (val) {
    // Filter matches: In-stock and low-stock items first, out-of-stock items last
    matches = [
      ...inventory.filter(m => medicineName(m) && (m.status !== 'out' && m.stock !== 0) && medicineMatches(m, val)),
      ...inventory.filter(m => medicineName(m) && (m.status === 'out' || m.stock === 0) && medicineMatches(m, val)),
    ];
  } else {
    // Show all medicines, sorted by stock status (in-stock first, low-stock next, out-of-stock last)
    matches = [
      ...inventory.filter(m => medicineName(m) && m.status !== 'out' && m.stock !== 0),
      ...inventory.filter(m => medicineName(m) && (m.status === 'out' || m.stock === 0))
    ];
  }

  if (!matches.length) {
    updateMedicineMatchStatus(input, null);
    closeAllAutocompletes();
    return;
  }

  updateMedicineMatchStatus(input, matches[0]);

  // Clear previous dropdown before opening a new one
  closeAllAutocompletes();

  activeAutocompleteInput = input;
  activeAutocompleteMatches = matches;
  activeAutocompleteIndex = -1;

  const wrapper = input.closest('.med-input-wrap');
  if (!wrapper) return;

  const dropdown = document.createElement('div');
  dropdown.className = 'autocomplete-dropdown glass-card';
  dropdown.setAttribute('role', 'listbox');

  matches.forEach((m, idx) => {
    const ss = stockStatus(m);
    const qty = m.qty !== undefined ? m.qty : m.stock;
    const name = medicineName(m);
    const category = medicineCategory(m);
    const statusColor = ss === 'out-stock' ? 'var(--accent-red)'
                      : ss === 'low-stock' ? 'var(--accent-amber)'
                      : 'var(--accent-green)';
    const statusLabel = ss === 'out-stock' ? 'Out of Stock'
                      : ss === 'low-stock' ? 'Low Stock'
                      : 'In Stock';
    const isOut = ss === 'out-stock';

    const item = document.createElement('div');
    item.className = 'autocomplete-item';
    if (isOut) item.style.opacity = '0.6';
    item.innerHTML = `
      <div style="font-weight:600;color:var(--on-surface);font-size:.9rem">${name}</div>
      <div class="autocomplete-item-stock">
        <span style="font-size:.7rem;font-weight:700;color:${statusColor}">${statusLabel} - ${qty} units</span>
        <span style="font-size:.7rem;color:var(--outline);margin-left:6px;text-transform:capitalize">${category}</span>
      </div>
    `;

    // Use mousedown with preventDefault to prevent input blur focus losses
    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
      selectAutocompleteItem(m);
    });

    dropdown.appendChild(item);
  });

  wrapper.appendChild(dropdown);
  activeAutocompleteDropdown = dropdown;
  input.setAttribute('aria-expanded', 'true');
}

function updateMedicineMatchStatus(input, match) {
  const row = input.closest('.c-med-row');
  const status = row ? row.querySelector('.med-match-status') : null;
  if (!status) return;

  if (!match || !input.value.trim()) {
    status.innerHTML = '';
    return;
  }

  const ss = stockStatus(match);
  const qty = match.qty !== undefined ? match.qty : match.stock;
  const stockLabel = ss === 'out-stock' ? 'Out of Stock'
                   : ss === 'low-stock' ? 'Low Stock'
                   : 'In Stock';
  status.innerHTML = `
    <span class="med-match-pill ${ss}">
      ${medicineName(match)} - ${stockLabel} (${qty} units)
    </span>
  `;
}

// Attach event listeners using document-level delegation
document.addEventListener('input', function(e) {
  if (e.target.matches('input.med-name')) {
    e.target.removeAttribute('data-selected-medicine');
    e.target.removeAttribute('data-stock-status');
    handleMedAutocomplete(e.target);
  }
});

document.addEventListener('focusin', function(e) {
  if (e.target.matches('input.med-name')) {
    handleMedAutocomplete(e.target);
  }
});

window.addEventListener('resize', closeAllAutocompletes);
window.addEventListener('scroll', closeAllAutocompletes, true);

// Manage key navigation for autocomplete dropdown
document.addEventListener('keydown', function(e) {
  if (!activeAutocompleteDropdown) return;

  const key = e.key;
  if (key === 'ArrowDown') {
    e.preventDefault();
    activeAutocompleteIndex++;
    if (activeAutocompleteIndex >= activeAutocompleteMatches.length) {
      activeAutocompleteIndex = 0;
    }
    updateAutocompleteHighlight();
  } else if (key === 'ArrowUp') {
    e.preventDefault();
    activeAutocompleteIndex--;
    if (activeAutocompleteIndex < 0) {
      activeAutocompleteIndex = activeAutocompleteMatches.length - 1;
    }
    updateAutocompleteHighlight();
  } else if (key === 'Enter' || key === 'Tab') {
    if (activeAutocompleteIndex >= 0 && activeAutocompleteIndex < activeAutocompleteMatches.length) {
      e.preventDefault();
      selectAutocompleteItem(activeAutocompleteMatches[activeAutocompleteIndex]);
    } else {
      if (key === 'Enter') {
        e.preventDefault();
      }
      closeAllAutocompletes();
    }
  } else if (key === 'Escape') {
    e.preventDefault();
    closeAllAutocompletes();
  }
});
