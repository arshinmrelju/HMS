'use strict';
HMS.requireAuth();

let TODAY_APPOINTMENTS = [];

function initWorkspace() {
  const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const dateEl = document.getElementById('currentDate');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-US', dateOptions);
  renderAppointments();
}

function renderAppointments() {
  const list = document.getElementById('appointmentList');
  if (!list) return;
  const countEl = document.getElementById('appointmentCount');
  if (countEl) countEl.textContent = `${TODAY_APPOINTMENTS.length} Total`;

  if (TODAY_APPOINTMENTS.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:32px;color:var(--on-surface-var)"><span class="material-icons-round" style="font-size:32px;margin-bottom:8px">event_busy</span><p>No appointments today</p></div>';
    return;
  }

  list.innerHTML = TODAY_APPOINTMENTS.map(apt => {
    let actionBtn = '';
    if (apt.status === 'completed') {
      actionBtn = '<span class="badge-status available">Completed</span>';
    } else if (apt.status === 'waiting') {
      actionBtn = `<button class="btn-primary btn-sm" onclick="startConsultation('${esc(apt.patient)}')">Start Consult</button>`;
    } else {
      actionBtn = '<span class="badge-status busy">Upcoming</span>';
    }
    return `
      <div class="apt-item">
        <div class="apt-time">${esc(apt.time)}</div>
        <div class="apt-details">
          <div class="apt-patient">${esc(apt.patient)}</div>
          <div class="apt-reason">${esc(apt.reason)}</div>
        </div>
        <div class="apt-actions">${actionBtn}</div>
      </div>
    `;
  }).join('');
}

function esc(val) {
  return typeof val === 'string' ? val.replace(/[&<>"']/g, function(m) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
  }) : (val == null ? '' : String(val));
}

let activeConsultationPatient = null;

function startConsultation(patientName) {
  activeConsultationPatient = patientName;
  const nameEl = document.getElementById('cPatientName');
  if (nameEl) nameEl.textContent = patientName;
  const avatarEl = document.getElementById('cPatientAvatar');
  if (avatarEl) {
    avatarEl.textContent = patientName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }
  const metaEl = document.getElementById('cPatientMeta');
  if (metaEl) metaEl.textContent = 'In Progress...';
  const defaultWs = document.getElementById('defaultWorkspace');
  const consultWs = document.getElementById('consultationWorkspace');
  const pageTitle = document.getElementById('pageTitle');
  const headerActions = document.getElementById('headerActions');
  if (defaultWs) defaultWs.style.display = 'none';
  if (pageTitle) pageTitle.textContent = 'Active Consultation';
  if (headerActions) headerActions.style.display = 'none';
  if (consultWs) consultWs.style.display = 'block';
}

function startAdhocConsultation() {
  const name = prompt("Enter Patient Name:");
  if (name) startConsultation(name);
}

function endConsultation() {
  activeConsultationPatient = null;
  const consultWs = document.getElementById('consultationWorkspace');
  const defaultWs = document.getElementById('defaultWorkspace');
  const pageTitle = document.getElementById('pageTitle');
  const headerActions = document.getElementById('headerActions');
  if (consultWs) consultWs.style.display = 'none';
  if (defaultWs) defaultWs.style.display = 'block';
  if (pageTitle) pageTitle.textContent = 'My Workspace';
  if (headerActions) headerActions.style.display = 'flex';
  resetConsultationForm();
}

async function submitConsultation() {
  const diagnosis = document.getElementById('cDiagnosis')?.value;
  if (!diagnosis) { toast('Please enter a diagnosis.', 'error'); return; }

  if (activeConsultationPatient) {
    const apt = TODAY_APPOINTMENTS.find(a => a.patient === activeConsultationPatient && a.status === 'waiting');
    if (apt) { apt.status = 'completed'; renderAppointments();
      try { const fs = window.firebaseDb && window.firebaseFS; if (fs && apt.id) await fs.updateDoc(fs.doc(window.firebaseDb, 'appointments', apt.id), { status: 'completed', diagnosis }); } catch (e) { /* ignore */ }
    }
  }

  toast(`Consultation completed for ${activeConsultationPatient}.`, 'success');
  endConsultation();
}

function resetConsultationForm() {
  const complaint = document.getElementById('cComplaint');
  const diagnosis = document.getElementById('cDiagnosis');
  const notes = document.getElementById('cNotes');
  if (complaint) complaint.value = '';
  if (diagnosis) diagnosis.value = '';
  if (notes) notes.value = '';
  const medEntries = document.getElementById('cMedicationEntries');
  if (medEntries) medEntries.innerHTML = createMedicationRowHTML();
  const labEntries = document.getElementById('cLabEntries');
  if (labEntries) {
    labEntries.innerHTML = `
      <div class="c-lab-row consult-entry">
        <div style="display: flex; gap: 8px; width: 100%; align-items: center;">
          <input type="text" placeholder="e.g. CBC Panel" class="lab-name consult-input" style="flex: 1; font-weight: 600;" />
          <button type="button" class="btn-icon text-red" onclick="removeLabRow(this)" style="background: rgba(239, 68, 68, 0.1);"><span class="material-icons-round">delete_outline</span></button>
        </div>
      </div>
    `;
  }
}

function addMedRow() {
  const container = document.getElementById('cMedicationEntries');
  if (!container) return;
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
  const rows = document.querySelectorAll('#cMedicationEntries .c-med-row');
  if (rows.length > 1) {
    row.remove();
  } else {
    const medicineInput = row.querySelector('input.med-name');
    if (medicineInput) {
      medicineInput.value = '';
      medicineInput.removeAttribute('data-selected-medicine');
      medicineInput.removeAttribute('data-stock-status');
    }
    const morn = row.querySelector('.med-morn');
    const aft = row.querySelector('.med-aft');
    const night = row.querySelector('.med-night');
    const days = row.querySelector('.med-days');
    if (morn) morn.checked = false;
    if (aft) aft.checked = false;
    if (night) night.checked = false;
    if (days) days.value = '';
  }
}

function addLabRow() {
  const container = document.getElementById('cLabEntries');
  if (!container) return;
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
  const rows = document.querySelectorAll('#cLabEntries .c-lab-row');
  if (rows.length > 1) { row.remove(); }
  else { const input = row.querySelector('.lab-name'); if (input) input.value = ''; }
}

function searchMedicine() {
  var q = document.getElementById('medSearch')?.value.trim().toLowerCase() || '';
  var list = document.getElementById('medResultsList');
  if (!list) return;
  if (!q) {
    list.innerHTML = '<p style="text-align:center;padding:16px;color:var(--outline);font-size:.82rem">Start typing to search pharmacy inventory...</p>';
    return;
  }
  var inventory = [];
  try {
    var raw = localStorage.getItem('hms_inventory');
    if (raw) {
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) inventory = parsed;
    }
  } catch(e) {}
  var matches = inventory.filter(function(m) {
    var name = String(m.name || m.medName || m.medicineName || m.itemName || '').toLowerCase();
    var cat = String(m.cat || m.category || '').toLowerCase();
    return name.indexOf(q) !== -1 || cat.indexOf(q) !== -1;
  });
  if (matches.length === 0) {
    list.innerHTML = '<p style="text-align:center;padding:16px;color:var(--outline);font-size:.82rem">No medicines found.</p>';
    return;
  }
  list.innerHTML = matches.map(function(m) {
    var name = m.name || m.medName || '';
    var cat = m.cat || m.category || '';
    var price = Number(m.price || 0).toFixed(2);
    var stock = m.stock || 0;
    var rop = m.reorderPoint || 10;
    var stockLabel, stockColor;
    if (stock <= 0) { stockLabel = 'Out of Stock'; stockColor = 'var(--accent-red)'; }
    else if (stock <= rop) { stockLabel = 'Low Stock'; stockColor = 'var(--accent-amber)'; }
    else { stockLabel = 'In Stock'; stockColor = 'var(--accent-green)'; }
    return '<div class="med-result-item" style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--surface-mid)">' +
      '<div><strong>' + name + '</strong><br><span style="font-size:.75rem;color:var(--on-surface-var)">' + cat + ' \u00B7 \u20B9' + price + '</span></div>' +
      '<span style="font-size:.78rem;font-weight:600;color:' + stockColor + '">' + stockLabel + ' (' + stock + ' units)</span>' +
    '</div>';
  }).join('');
}


async function loadTodayAppointments() {
  try {
    const fs = window.firebaseDb && window.firebaseFS;
    if (!fs) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const q = fs.query(
      fs.collection(window.firebaseDb, 'appointments'),
      fs.where('createdAt', '>=', today),
      fs.where('createdAt', '<', tomorrow),
      fs.orderBy('createdAt', 'asc')
    );
    const snap = await fs.getDocs(q);
    if (snap.empty) return;
    TODAY_APPOINTMENTS = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        patient: data.patientName || data.patient || 'Unknown',
        reason: data.complaint || data.reason || 'Consultation',
        time: data.time || data.createdAt?.toDate?.()?.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) || '—',
        status: data.status || 'waiting'
      };
    });
  } catch (e) {
    addConsoleLog('WARN', 'Could not load today\'s appointments: ' + e.message);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadTodayAppointments();
  initWorkspace();
});
