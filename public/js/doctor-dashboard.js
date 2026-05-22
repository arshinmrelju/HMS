/* =========================================
   DOCTOR-DASHBOARD.JS
   Physician Workspace Portal Logic
   ========================================= */

'use strict';

/* --- Mock Patient Queue --- */
const today = new Date().toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];
const lastMonth = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

let PATIENT_QUEUE = [
  { id: 'P-1041', name: 'Rajan Mehta', age: 54, gender: 'M', complaint: 'Chest pain, breathlessness', vitals: { bp: '148/92', pulse: 88, temp: '98.6°F', spo2: '96%' }, history: 'Hypertension (5 yrs), Type-2 Diabetes', status: 'waiting', time: '09:10 AM', timestamp: `${today}T09:10:00`, priority: 'high' },
  { id: 'P-1042', name: 'Shalini Rao', age: 31, gender: 'F', complaint: 'Persistent fever, chills', vitals: { bp: '110/70', pulse: 102, temp: '101.2°F', spo2: '98%' }, history: 'No significant history', status: 'in-progress', time: '09:25 AM', timestamp: `${today}T09:25:00`, priority: 'medium' },
  { id: 'P-1043', name: 'Arvind Gupta', age: 67, gender: 'M', complaint: 'Diabetes follow-up', vitals: { bp: '136/88', pulse: 76, temp: '98.4°F', spo2: '97%' }, history: 'Type-2 Diabetes (12 yrs), Dyslipidemia', status: 'waiting', time: '09:40 AM', timestamp: `${today}T09:40:00`, priority: 'low' },
  { id: 'P-1044', name: 'Meera Iyer', age: 43, gender: 'F', complaint: 'Migraine headache, nausea', vitals: { bp: '122/78', pulse: 82, temp: '98.2°F', spo2: '99%' }, history: 'Chronic migraine (3 yrs)', status: 'waiting', time: '09:55 AM', timestamp: `${today}T09:55:00`, priority: 'medium' },
  { id: 'P-1045', name: 'Suresh Babu', age: 59, gender: 'M', complaint: 'Knee pain, difficulty walking', vitals: { bp: '130/85', pulse: 74, temp: '98.7°F', spo2: '98%' }, history: 'Osteoarthritis', status: 'waiting', time: '10:10 AM', timestamp: `${today}T10:10:00`, priority: 'low' },
  // Yesterday's records
  { id: 'P-1039', name: 'Harish Kumar', age: 48, gender: 'M', complaint: 'Hypertension checkup', vitals: { bp: '142/90', pulse: 80, temp: '98.4°F', spo2: '97%' }, history: 'Essential Hypertension', status: 'done', time: '04:15 PM', timestamp: `${yesterday}T16:15:00`, priority: 'medium' },
  { id: 'P-1040', name: 'Leela Nair', age: 60, gender: 'F', complaint: 'Vertigo & dizziness', vitals: { bp: '118/74', pulse: 72, temp: '98.1°F', spo2: '98%' }, history: 'Inner ear issue', status: 'done', time: '05:30 PM', timestamp: `${yesterday}T17:30:00`, priority: 'low' },
  // Last 7 Days records
  { id: 'P-1037', name: 'Devendra Joshi', age: 36, gender: 'M', complaint: 'Acute bronchitis', vitals: { bp: '120/80', pulse: 92, temp: '100.5°F', spo2: '96%' }, history: 'Asthma in childhood', status: 'done', time: '11:00 AM', timestamp: `${threeDaysAgo}T11:00:00`, priority: 'high' },
  // This Month / Last Month records
  { id: 'P-1035', name: 'Sita Ramaswamy', age: 72, gender: 'F', complaint: 'Gastroenteritis', vitals: { bp: '105/65', pulse: 98, temp: '99.8°F', spo2: '95%' }, history: 'CAD, Stent placed (2021)', status: 'done', time: '10:30 AM', timestamp: `${lastMonth}T10:30:00`, priority: 'high' }
];

let filteredPatientQueue = null;
let activePatientId = null;
const prescriptionMeds = [];

/* --- Render Patient Queue --- */
function renderPatientQueue() {
  const container = document.getElementById('patientQueueContainer');
  if (!container) return;

  const priorityColors = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };
  const statusLabels = { waiting: 'Waiting', 'in-progress': 'In Consultation', done: 'Done' };

  const data = filteredPatientQueue || PATIENT_QUEUE;

  if (data.length === 0) {
    container.innerHTML = '<p style="padding:12px; font-size:0.875rem; text-align:center; color:var(--on-surface-var)">No patients found for this time span.</p>';
    // Update Badge to 0
    const countEl = document.getElementById('docResultCount');
    if (countEl) countEl.textContent = '0 consults';
    return;
  }

  container.innerHTML = data.map(p => `
    <div class="queue-list-item ${activePatientId === p.id ? 'active' : ''}" 
         onclick="selectPatient('${p.id}')" id="qItem-${p.id}">
      <div style="display:flex;align-items:center;gap:12px;flex:1;">
        <div style="width:8px;height:8px;border-radius:50%;background:${priorityColors[p.priority]};flex-shrink:0;"></div>
        <div>
          <div style="font-weight:700;font-size:0.87rem;">${p.name} 
            <span style="font-weight:400;font-size:0.77rem;color:var(--on-surface-var)">· ${p.age}${p.gender}</span>
          </div>
          <div style="font-size:0.75rem;color:var(--on-surface-var);margin-top:2px;">${p.complaint}</div>
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <span style="font-size:0.72rem;font-weight:700;padding:3px 8px;border-radius:20px;
          background:${p.status === 'in-progress' ? 'rgba(59,130,246,0.1)' : p.status === 'done' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)'};
          color:${p.status === 'in-progress' ? '#3b82f6' : p.status === 'done' ? '#059669' : '#d97706'};">
          ${statusLabels[p.status] || p.status}
        </span>
        <div style="font-size:0.72rem;color:var(--outline);margin-top:4px;">${p.time}</div>
      </div>
    </div>
  `).join('');

  // Update Badge Count
  const countEl = document.getElementById('docResultCount');
  if (countEl) countEl.textContent = `${data.length} consults`;
}

/* --- Filter Patient Queue --- */
function filterPatientQueue() {
  const startDate = document.getElementById('docStartDate')?.value;
  const startTime = document.getElementById('docStartTime')?.value || '00:00';
  const endDate = document.getElementById('docEndDate')?.value;
  const endTime = document.getElementById('docEndTime')?.value || '23:59';

  if (!startDate) {
    toast('Please select a start date to filter.', 'warning');
    return;
  }

  const startTimestamp = new Date(`${startDate}T${startTime}`).getTime();
  
  const endTimestamp = endDate 
    ? new Date(`${endDate}T${endTime}`).getTime()
    : new Date(`${startDate}T23:59:59`).getTime();

  filteredPatientQueue = PATIENT_QUEUE.filter(p => {
    const pTime = new Date(p.timestamp).getTime();
    return pTime >= startTimestamp && pTime <= endTimestamp;
  });

  renderPatientQueue();
  
  // Show result badge
  const badge = document.getElementById('docResultBadge');
  if (badge) badge.classList.add('visible');
  
  toast(`Found ${filteredPatientQueue.length} patient(s)`, 'info');
}

function clearPatientQueueFilter() {
  document.getElementById('docStartDate').value = '';
  document.getElementById('docStartTime').value = '';
  document.getElementById('docEndDate').value = '';
  document.getElementById('docEndTime').value = '';
  filteredPatientQueue = null;
  renderPatientQueue();
  
  // Hide result badge
  const badge = document.getElementById('docResultBadge');
  if (badge) badge.classList.remove('visible');
  
  toast('Filter cleared', 'info');
}

/* --- Select Patient --- */
function selectPatient(id) {
  activePatientId = id;
  const p = PATIENT_QUEUE.find(pt => pt.id === id);
  if (!p) return;

  // Mark as in-progress
  if (p.status === 'waiting') {
    p.status = 'in-progress';
    renderPatientQueue();
  }

  // Highlight
  document.querySelectorAll('.queue-list-item').forEach(el => {
    el.classList.toggle('active', el.id === `qItem-${id}`);
  });

  // Render clinical file
  const profile = document.getElementById('activePatientProfile');
  if (profile) {
    profile.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <!-- Patient Header -->
        <div style="display:flex;align-items:center;gap:14px;padding-bottom:12px;border-bottom:1px solid var(--outline-var);">
          <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--primary-light),var(--primary-dark));display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:1.1rem;flex-shrink:0;">
            ${p.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)}
          </div>
          <div>
            <div style="font-weight:800;font-size:1rem;">${p.name}</div>
            <div style="font-size:0.8rem;color:var(--on-surface-var);">${p.id} · Age ${p.age} · ${p.gender === 'M' ? 'Male' : 'Female'} · ${p.time}</div>
            <div style="font-size:0.82rem;color:var(--on-surface);margin-top:3px;">${p.complaint}</div>
          </div>
        </div>

        <!-- Vitals Grid -->
        <div>
          <p style="font-size:0.75rem;font-weight:700;color:var(--on-surface-var);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;">Current Vitals</p>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
            ${[
              { label: 'Blood Pressure', val: p.vitals.bp, icon: 'favorite', alert: p.vitals.bp.split('/')[0] > 140 },
              { label: 'Pulse Rate', val: p.vitals.pulse + ' bpm', icon: 'monitor_heart', alert: p.vitals.pulse > 100 },
              { label: 'Temperature', val: p.vitals.temp, icon: 'thermostat', alert: parseFloat(p.vitals.temp) > 99.5 },
              { label: 'SpO₂', val: p.vitals.spo2, icon: 'air', alert: parseInt(p.vitals.spo2) < 95 },
            ].map(v => `
              <div style="background:${v.alert ? 'rgba(239,68,68,0.07)' : 'var(--surface-low)'};border:1px solid ${v.alert ? 'rgba(239,68,68,0.2)' : 'var(--outline-var)'};border-radius:var(--radius-sm);padding:10px 12px;display:flex;align-items:center;gap:8px;">
                <span class="material-icons-round" style="font-size:18px;color:${v.alert ? '#ef4444' : 'var(--primary-light)'}">${v.icon}</span>
                <div>
                  <div style="font-size:0.7rem;color:var(--on-surface-var);">${v.label}</div>
                  <div style="font-weight:800;font-size:0.92rem;color:${v.alert ? '#ef4444' : 'var(--on-surface)'};">${v.val}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Medical History -->
        <div style="background:var(--surface-low);border:1px solid var(--outline-var);border-radius:var(--radius-sm);padding:12px;">
          <p style="font-size:0.75rem;font-weight:700;color:var(--on-surface-var);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px;">Medical History</p>
          <p style="font-size:0.85rem;color:var(--on-surface);">${p.history}</p>
        </div>

        <!-- Action Buttons -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <button class="btn-secondary btn-sm" onclick="requestLabTest('${p.id}')">
            <span class="material-icons-round">science</span> Request Lab Test
          </button>
          <button class="btn-secondary btn-sm" onclick="markConsultDone('${p.id}')">
            <span class="material-icons-round">check_circle</span> Complete Consult
          </button>
        </div>
      </div>
    `;
  }

  // Pre-fill prescription builder
  toast(`Patient ${p.name} loaded into workspace.`, 'info', 'person');
}

/* --- Add Medication to Prescription --- */
function addMedicationToScript() {
  const medSelect = document.getElementById('presMedSelect');
  const dosageInput = document.getElementById('presDosage');
  const listEl = document.getElementById('selectedMedsList');

  if (!medSelect || !listEl) return;

  const med = medSelect.value;
  const dosage = dosageInput?.value?.trim() || 'As directed';

  if (prescriptionMeds.find(m => m.med === med)) {
    toast('This medication is already in the prescription.', 'warning');
    return;
  }

  prescriptionMeds.push({ med, dosage });

  listEl.innerHTML = prescriptionMeds.map((m, i) => `
    <span class="medicine-tag">
      <span class="material-icons-round" style="font-size:12px">medication</span>
      ${m.med} · ${m.dosage}
      <button onclick="removeMedication(${i})" style="background:none;border:none;color:#ef4444;cursor:pointer;display:inline-flex;padding:0;margin-left:2px;">
        <span class="material-icons-round" style="font-size:14px">close</span>
      </button>
    </span>
  `).join('');

  if (dosageInput) dosageInput.value = '';
  toast(`${med} added to prescription.`, 'success', 'medication');
}

/* --- Remove Medication --- */
function removeMedication(index) {
  prescriptionMeds.splice(index, 1);
  const listEl = document.getElementById('selectedMedsList');
  if (!listEl) return;

  if (prescriptionMeds.length === 0) {
    listEl.innerHTML = '<span style="font-size:0.8rem;color:var(--outline);font-style:italic;">No drugs added yet. Enter items above.</span>';
    return;
  }

  listEl.innerHTML = prescriptionMeds.map((m, i) => `
    <span class="medicine-tag">
      <span class="material-icons-round" style="font-size:12px">medication</span>
      ${m.med} · ${m.dosage}
      <button onclick="removeMedication(${i})" style="background:none;border:none;color:#ef4444;cursor:pointer;display:inline-flex;padding:0;margin-left:2px;">
        <span class="material-icons-round" style="font-size:14px">close</span>
      </button>
    </span>
  `).join('');
}

/* --- Send Prescription --- */
document.getElementById('presBuilderForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!activePatientId) {
    toast('Please select a patient first.', 'warning');
    return;
  }
  if (prescriptionMeds.length === 0) {
    toast('Add at least one medication to the prescription.', 'warning');
    return;
  }

  const patient = PATIENT_QUEUE.find(p => p.id === activePatientId);
  const diagnosis = document.getElementById('presDiagnosis')?.value;

  // Mark patient as done
  if (patient) {
    patient.status = 'done';
    renderPatientQueue();
  }

  toast(`Prescription for ${patient?.name} sent to Pharmacy! (${prescriptionMeds.length} medication${prescriptionMeds.length > 1 ? 's' : ''})`, 'success', 'send');

  // Reset form
  prescriptionMeds.length = 0;
  const listEl = document.getElementById('selectedMedsList');
  if (listEl) listEl.innerHTML = '<span style="font-size:0.8rem;color:var(--outline);font-style:italic;">No drugs added yet. Enter items above.</span>';
  const diag = document.getElementById('presDiagnosis');
  if (diag) diag.value = '';
  activePatientId = null;
});

/* --- Request Lab Test --- */
function requestLabTest(patientId) {
  const patient = PATIENT_QUEUE.find(p => p.id === patientId);
  toast(`Lab test request sent for ${patient?.name}!`, 'info', 'science');
}

/* --- Mark Consultation Done --- */
function markConsultDone(patientId) {
  const patient = PATIENT_QUEUE.find(p => p.id === patientId);
  if (patient) {
    patient.status = 'done';
    renderPatientQueue();
    document.getElementById('activePatientProfile').innerHTML = `
      <div style="text-align:center;padding:24px;color:var(--outline);">
        <span class="material-icons-round" style="font-size:36px;color:var(--primary-light)">check_circle</span>
        <p style="font-size:0.85rem;margin-top:8px;font-weight:600;color:var(--on-surface)">Consultation marked complete for ${patient.name}.</p>
        <p style="font-size:0.78rem;margin-top:4px;">Select the next patient from the queue.</p>
      </div>
    `;
    activePatientId = null;
    toast(`Consultation complete for ${patient.name}.`, 'success', 'check_circle');
  }
}

/* --- DOMContentLoaded --- */
document.addEventListener('DOMContentLoaded', () => {
  const todayChip = document.querySelector(`#docSmartFilter .sf-chip[onclick*="'today'"]`);
  if (todayChip) {
    sfChipSelect(todayChip, 'doc', 'today');
  } else {
    renderPatientQueue();
  }
});
