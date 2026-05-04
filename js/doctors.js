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

// Mock Data: Pharmacy Stock
const PHARMACY_STOCK = [
  { id: 'MED-001', name: 'Paracetamol 500mg', category: 'Analgesic', stock: 'in-stock', qty: 1250 },
  { id: 'MED-002', name: 'Amoxicillin 250mg', category: 'Antibiotic', stock: 'low-stock', qty: 45 },
  { id: 'MED-003', name: 'Ibuprofen 400mg', category: 'NSAID', stock: 'in-stock', qty: 850 },
  { id: 'MED-004', name: 'Omeprazole 20mg', category: 'Antacid', stock: 'out-stock', qty: 0 },
  { id: 'MED-005', name: 'Cetirizine 10mg', category: 'Antihistamine', stock: 'in-stock', qty: 420 },
  { id: 'MED-006', name: 'Azithromycin 500mg', category: 'Antibiotic', stock: 'in-stock', qty: 300 },
  { id: 'MED-007', name: 'Atorvastatin 10mg', category: 'Statin', stock: 'low-stock', qty: 20 },
  { id: 'MED-008', name: 'Metformin 500mg', category: 'Anti-diabetic', stock: 'in-stock', qty: 1500 },
];

function initWorkspace() {
  // Set date
  const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', dateOptions);

  renderAppointments();
  renderPharmacyStock(PHARMACY_STOCK);
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
  
  if (stockList.length === 0) {
    list.innerHTML = `<div style="text-align:center;padding:24px;color:var(--on-surface-var)">No medicines found.</div>`;
    return;
  }

  list.innerHTML = stockList.map(med => {
    let stockLabel = 'In Stock';
    if (med.stock === 'low-stock') stockLabel = 'Low Stock';
    if (med.stock === 'out-stock') stockLabel = 'Out of Stock';

    return `
      <div class="med-item">
        <div class="med-info">
          <span class="med-name">${med.name}</span>
          <span class="med-category">${med.category}</span>
        </div>
        <div class="stock-badge ${med.stock}">
          ${stockLabel} (${med.qty})
        </div>
      </div>
    `;
  }).join('');
}

function searchMedicine() {
  const query = document.getElementById('medSearch').value.toLowerCase();
  const filtered = PHARMACY_STOCK.filter(med => 
    med.name.toLowerCase().includes(query) || 
    med.category.toLowerCase().includes(query)
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
    const name = row.querySelector('.med-name').value;
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
  
  document.getElementById('cMedicationEntries').innerHTML = `
    <div class="c-med-row consult-entry">
      <input type="text" placeholder="Medicine name (e.g. Amoxicillin 500mg)" class="med-name consult-input" style="font-weight: 600;" />
      <div style="display: flex; gap: 8px; margin-top: 10px; align-items: center;">
        <div class="dose-group" style="flex: 2; display: flex; gap: 4px;">
          <label class="dose-chip" title="Morning"><input type="checkbox" class="med-morn" /><span>Morn</span></label>
          <label class="dose-chip" title="Afternoon"><input type="checkbox" class="med-aft" /><span>Aft</span></label>
          <label class="dose-chip" title="Night"><input type="checkbox" class="med-night" /><span>Night</span></label>
        </div>
        <input type="number" placeholder="Days" class="med-days consult-input" style="flex: 1;" />
        <button type="button" class="btn-icon text-red" onclick="removeMedRow(this)" style="background: rgba(239, 68, 68, 0.1);"><span class="material-icons-round">delete_outline</span></button>
      </div>
    </div>
  `;
  
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
  row.innerHTML = `
    <input type="text" placeholder="Medicine name (e.g. Amoxicillin 500mg)" class="med-name consult-input" style="font-weight: 600;" />
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
  container.appendChild(row);
}

function removeMedRow(btn) {
  const row = btn.closest('.c-med-row');
  if (document.querySelectorAll('#cMedicationEntries .c-med-row').length > 1) {
    row.remove();
  } else {
    row.querySelector('.med-name').value = '';
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

function closeAllAutocompletes() {
  if (activeAutocompleteDropdown) {
    activeAutocompleteDropdown.remove();
    activeAutocompleteDropdown = null;
  }
}

document.addEventListener('click', function(e) {
  if (!e.target.closest('.c-med-row') && !e.target.closest('.autocomplete-dropdown')) {
    closeAllAutocompletes();
  }
});

function handleMedAutocomplete(input) {
  closeAllAutocompletes();
  const val = input.value.trim().toLowerCase();
  if (!val) return;

  const matches = PHARMACY_STOCK.filter(m => m.name.toLowerCase().includes(val) || m.category.toLowerCase().includes(val));
  
  if (matches.length === 0) return;

  const row = input.closest('.c-med-row');
  row.style.position = 'relative';

  const dropdown = document.createElement('div');
  dropdown.className = 'autocomplete-dropdown glass-card';
  // Position it right below the input
  dropdown.style.top = (input.offsetTop + input.offsetHeight + 4) + 'px';
  dropdown.style.left = input.offsetLeft + 'px';
  dropdown.style.width = input.offsetWidth + 'px';

  matches.forEach(match => {
    const item = document.createElement('div');
    item.className = 'autocomplete-item';
    
    // Format stock label
    let stockLabel = 'In Stock';
    if (match.stock === 'low-stock') stockLabel = 'Low Stock';
    if (match.stock === 'out-stock') stockLabel = 'Out of Stock';

    item.innerHTML = `
      <div style="font-weight: 600; color: var(--on-surface); font-size: 0.95rem;">${match.name}</div>
      <div class="autocomplete-item-stock">
        <span class="stock-badge ${match.stock}" style="padding: 2px 6px; font-size: 0.65rem;">${stockLabel} - ${match.qty} qty</span>
        <span style="margin-left: 8px;">${match.category}</span>
      </div>
    `;
    item.addEventListener('click', () => {
      input.value = match.name;
      closeAllAutocompletes();
    });
    dropdown.appendChild(item);
  });

  row.appendChild(dropdown);
  activeAutocompleteDropdown = dropdown;
}

// Attach event listeners using document-level delegation for better reliability
document.addEventListener('input', function(e) {
  if (e.target.classList.contains('med-name')) {
    handleMedAutocomplete(e.target);
  }
});

document.addEventListener('focusin', function(e) {
  if (e.target.classList.contains('med-name')) {
    handleMedAutocomplete(e.target);
  }
});
