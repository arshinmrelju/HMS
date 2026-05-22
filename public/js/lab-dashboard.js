/* =========================================
   LAB-DASHBOARD.JS
   Pathology Lab Portal Logic
   ========================================= */

'use strict';

/* --- Mock Specimen Data --- */
const today = new Date().toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];
const lastMonth = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

let SPECIMENS = [
  { id: 'SPC-1101', patient: 'Rajan Mehta', age: 54, test: 'Complete Blood Count', sample: 'Venous Blood', doctor: 'Dr. Julian Vance', status: 'queued', time: '08:45 AM', timestamp: `${today}T08:45:00`, critical: false },
  { id: 'SPC-1102', patient: 'Priya Nambiar', age: 34, test: 'Thyroid Profile', sample: 'Venous Blood', doctor: 'Dr. Kavita Singh', status: 'processing', time: '09:00 AM', timestamp: `${today}T09:00:00`, critical: false },
  { id: 'SPC-1103', patient: 'Suresh Babu', age: 67, test: 'Kidney Function Test', sample: 'Venous Blood', doctor: 'Dr. Julian Vance', status: 'critical', time: '09:15 AM', timestamp: `${today}T09:15:00`, critical: true },
  { id: 'SPC-1104', patient: 'Ananya Sharma', age: 29, test: 'Blood Glucose', sample: 'Capillary Blood', doctor: 'Dr. Priya Nair', status: 'queued', time: '09:30 AM', timestamp: `${today}T09:30:00`, critical: false },
  { id: 'SPC-1105', patient: 'Vikram Pillai', age: 45, test: 'Lipid Panel', sample: 'Venous Blood', doctor: 'Dr. Julian Vance', status: 'processing', time: '09:45 AM', timestamp: `${today}T09:45:00`, critical: false },
  { id: 'SPC-1106', patient: 'Meera Iyer', age: 38, test: 'Liver Function Test', sample: 'Venous Blood', doctor: 'Dr. Kavita Singh', status: 'queued', time: '10:00 AM', timestamp: `${today}T10:00:00`, critical: false },
  { id: 'SPC-1107', patient: 'Kavitha Menon', age: 52, test: 'Urine Routine', sample: 'Urine', doctor: 'Dr. Priya Nair', status: 'critical', time: '10:05 AM', timestamp: `${today}T10:05:00`, critical: true },
  // Yesterday's records
  { id: 'SPC-1099', patient: 'Harish Kumar', age: 48, test: 'Complete Blood Count', sample: 'Venous Blood', doctor: 'Dr. Kavita Singh', status: 'complete', time: '04:15 PM', timestamp: `${yesterday}T16:15:00`, critical: false },
  { id: 'SPC-1100', patient: 'Leela Nair', age: 60, test: 'Urine Routine', sample: 'Urine', doctor: 'Dr. Priya Nair', status: 'complete', time: '05:30 PM', timestamp: `${yesterday}T17:30:00`, critical: false },
  // Last 7 Days records
  { id: 'SPC-1093', patient: 'Devendra Joshi', age: 36, test: 'Lipid Panel', sample: 'Venous Blood', doctor: 'Dr. Arjun Mehta', status: 'complete', time: '11:00 AM', timestamp: `${threeDaysAgo}T11:00:00`, critical: false },
  // This Month / Last Month records
  { id: 'SPC-1090', patient: 'Sita Ramaswamy', age: 72, test: 'Thyroid Profile', sample: 'Venous Blood', doctor: 'Dr. Julian Vance', status: 'complete', time: '10:30 AM', timestamp: `${lastMonth}T10:30:00`, critical: false }
];

let filteredSpecimens = null;

const COMPLETED_RESULTS = [
  { id: 'SPC-1095', patient: 'Rahul Kumar', test: 'Complete Blood Count', status: 'Normal', time: '07:30 AM', doctor: 'Dr. Julian Vance' },
  { id: 'SPC-1096', patient: 'Deepa Nair', test: 'Blood Glucose', status: 'Elevated', time: '07:50 AM', doctor: 'Dr. Kavita Singh' },
  { id: 'SPC-1097', patient: 'Arun Joseph', test: 'Lipid Panel', status: 'Normal', time: '08:10 AM', doctor: 'Dr. Priya Nair' },
  { id: 'SPC-1098', patient: 'Lakshmi Devi', test: 'Thyroid Profile', status: 'Normal', time: '08:25 AM', doctor: 'Dr. Julian Vance' },
];

let activeSpecimenId = null;
let isScanning = false;

/* --- Render Specimen Queue --- */
function renderSpecimenQueue() {
  const list = document.getElementById('specimenList');
  if (!list) return;

  const icons = {
    'Complete Blood Count': 'bloodtype',
    'Thyroid Profile': 'medication',
    'Kidney Function Test': 'biotech',
    'Blood Glucose': 'water_drop',
    'Lipid Panel': 'monitoring',
    'Liver Function Test': 'medical_services',
    'Urine Routine': 'science',
    'default': 'science'
  };

  const data = filteredSpecimens || SPECIMENS;

  if (data.length === 0) {
    list.innerHTML = '<p style="text-align:center;padding:20px;color:var(--outline);font-size:0.85rem">No specimens found for this time span.</p>';
    const countEl = document.getElementById('specimenCount');
    if (countEl) countEl.textContent = '0 Pending';
    const resultCount = document.getElementById('labResultCount');
    if (resultCount) resultCount.textContent = '0 Pending';
    return;
  }

  list.innerHTML = data.map(spc => `
    <div class="specimen-card ${activeSpecimenId === spc.id ? 'active' : ''}" onclick="selectSpecimen('${spc.id}')" id="spcCard-${spc.id}">
      <div class="specimen-icon">
        <span class="material-icons-round">${icons[spc.test] || icons.default}</span>
      </div>
      <div style="flex:1;min-width:0;">
        <div class="specimen-type">${spc.test}</div>
        <div class="specimen-name">${spc.patient} <span style="font-weight:400;font-size:0.77rem;color:var(--on-surface-var)">· Age ${spc.age}</span></div>
        <div class="specimen-detail">${spc.id} · ${spc.sample} · ${spc.time}</div>
      </div>
      <span class="spec-status ${spc.status}">${spc.critical ? '⚠ ' : ''}${spc.status.charAt(0).toUpperCase() + spc.status.slice(1)}</span>
    </div>
  `).join('');

  const countEl = document.getElementById('specimenCount');
  const pending = data.filter(s => s.status === 'queued').length;
  if (countEl) countEl.textContent = `${pending} Pending`;

  const resultCount = document.getElementById('labResultCount');
  if (resultCount) {
    resultCount.textContent = `${pending} Pending (${data.length} total)`;
  }

  // Populate metrics select
  const sel = document.getElementById('metricsSpecimenSelect');
  if (sel) {
    sel.innerHTML = '<option value="">-- Select Specimen --</option>' +
      data.map(s => `<option value="${s.id}">${s.id} · ${s.patient}</option>`).join('');
  }
}

/* --- Filter Specimen Queue --- */
function filterSpecimenQueue() {
  const startDate = document.getElementById('labStartDate')?.value;
  const startTime = document.getElementById('labStartTime')?.value || '00:00';
  const endDate = document.getElementById('labEndDate')?.value;
  const endTime = document.getElementById('labEndTime')?.value || '23:59';

  if (!startDate) {
    toast('Please select a start date to filter.', 'warning');
    return;
  }

  const startTimestamp = new Date(`${startDate}T${startTime}`).getTime();
  const endTimestamp = endDate 
    ? new Date(`${endDate}T${endTime}`).getTime()
    : new Date(`${startDate}T23:59:59`).getTime();

  filteredSpecimens = SPECIMENS.filter(p => {
    if (!p.timestamp) return false;
    const pTime = new Date(p.timestamp).getTime();
    return pTime >= startTimestamp && pTime <= endTimestamp;
  });

  renderSpecimenQueue();

  // Show result badge
  const badge = document.getElementById('labResultBadge');
  if (badge) badge.classList.add('visible');

  toast(`Found ${filteredSpecimens.length} specimen(s)`, 'info');
}

function clearSpecimenQueueFilter() {
  document.getElementById('labStartDate').value = '';
  document.getElementById('labStartTime').value = '';
  document.getElementById('labEndDate').value = '';
  document.getElementById('labEndTime').value = '';
  filteredSpecimens = null;
  renderSpecimenQueue();

  // Hide result badge
  const badge = document.getElementById('labResultBadge');
  if (badge) badge.classList.remove('visible');

  toast('Filter cleared', 'info');
}

/* --- Render Completed Results --- */
function renderResults() {
  const list = document.getElementById('resultsList');
  if (!list) return;

  list.innerHTML = COMPLETED_RESULTS.map(r => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--surface-low);border-radius:var(--radius-md);margin-bottom:6px;border:1px solid var(--outline-var);">
      <div style="display:flex;align-items:center;gap:10px;">
        <span class="material-icons-round" style="color:${r.status === 'Normal' ? '#059669' : '#d97706'};font-size:20px">${r.status === 'Normal' ? 'check_circle' : 'warning'}</span>
        <div>
          <div style="font-weight:700;font-size:0.85rem;">${r.patient}</div>
          <div style="font-size:0.75rem;color:var(--on-surface-var);">${r.id} · ${r.test} · ${r.time}</div>
        </div>
      </div>
      <div style="text-align:right;">
        <span style="font-size:0.75rem;font-weight:700;padding:3px 8px;border-radius:20px;background:${r.status === 'Normal' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)'};color:${r.status === 'Normal' ? '#059669' : '#d97706'};">${r.status}</span>
        <button onclick="printResult('${r.id}')" style="display:block;margin-top:4px;background:none;border:none;color:var(--primary-light);cursor:pointer;font-size:0.72rem;font-weight:600;">Print ↗</button>
      </div>
    </div>
  `).join('');
}

/* --- Select Specimen --- */
function selectSpecimen(id) {
  activeSpecimenId = id;
  document.querySelectorAll('.specimen-card').forEach(c => {
    c.classList.toggle('active', c.id === `spcCard-${id}`);
  });
  // Pre-fill scanner
  const spc = SPECIMENS.find(s => s.id === id);
  if (spc) {
    document.getElementById('scanSpcId').textContent = spc.id;
    document.getElementById('scanPatient').textContent = spc.patient;
    document.getElementById('scanTestType').textContent = spc.test;
    document.getElementById('scanWBC').textContent = '--';
    document.getElementById('scanRBC').textContent = '--';
    document.getElementById('scanHgb').textContent = '--';
    document.getElementById('scanPlatelet').textContent = '--';
    document.getElementById('scanStatus').textContent = 'READY TO SCAN';
    document.getElementById('scanStatus').className = 'value';
    toast(`Specimen ${spc.id} loaded into scanner.`, 'info', 'document_scanner');
  }
}

/* --- Run Scan Animation --- */
function runScan() {
  if (isScanning) return;
  if (!activeSpecimenId) {
    toast('Please select a specimen from the queue first!', 'warning');
    return;
  }

  isScanning = true;
  const btn = document.getElementById('scanBtn');
  if (btn) {
    btn.innerHTML = '<span class="material-icons-round">hourglass_empty</span> SCANNING...';
    btn.style.opacity = '0.7';
    btn.disabled = true;
  }

  document.getElementById('scanStatus').textContent = 'SCANNING IN PROGRESS...';
  document.getElementById('scanStatus').className = 'value';

  const phases = [
    () => {
      document.getElementById('scanWBC').textContent = (Math.random() * 5 + 4).toFixed(1) + ' ×10³/µL';
    },
    () => {
      document.getElementById('scanRBC').textContent = (Math.random() * 1 + 4.5).toFixed(2) + ' ×10⁶/µL';
    },
    () => {
      const hgb = (Math.random() * 4 + 11);
      const el = document.getElementById('scanHgb');
      el.textContent = hgb.toFixed(1) + ' g/dL';
      el.className = hgb < 12 ? 'value alert' : 'value normal';
    },
    () => {
      const plt = Math.round(Math.random() * 200 + 150);
      const el = document.getElementById('scanPlatelet');
      el.textContent = plt + ' ×10³/µL';
      el.className = plt < 150 ? 'value alert' : 'value normal';
    }
  ];

  phases.forEach((fn, i) => setTimeout(fn, (i + 1) * 600));

  setTimeout(() => {
    const spc = SPECIMENS.find(s => s.id === activeSpecimenId);
    const hasCritical = spc?.critical;
    const statusEl = document.getElementById('scanStatus');
    statusEl.textContent = hasCritical ? 'CRITICAL VALUES DETECTED!' : 'ANALYSIS COMPLETE – NORMAL';
    statusEl.className = hasCritical ? 'value alert' : 'value normal';

    if (btn) {
      btn.innerHTML = '<span class="material-icons-round">document_scanner</span> RUN SCAN';
      btn.style.opacity = '1';
      btn.disabled = false;
    }
    isScanning = false;

    // Update specimen status
    if (spc) {
      spc.status = hasCritical ? 'critical' : 'complete';
      renderSpecimenQueue();
    }

    // Move to completed
    if (spc && !COMPLETED_RESULTS.find(r => r.id === spc.id)) {
      COMPLETED_RESULTS.unshift({
        id: spc.id,
        patient: spc.patient,
        test: spc.test,
        status: hasCritical ? 'Elevated' : 'Normal',
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        doctor: spc.doctor
      });
      renderResults();
    }

    toast(hasCritical ? `⚠ Critical findings for ${spc?.patient}! Review immediately.` : `Scan complete for ${spc?.patient} – Normal.`, hasCritical ? 'error' : 'success');
  }, phases.length * 600 + 400);
}

/* --- Clear Scanner --- */
function clearScanner() {
  activeSpecimenId = null;
  document.getElementById('scanSpcId').textContent = '--';
  document.getElementById('scanPatient').textContent = '-- Select specimen --';
  document.getElementById('scanTestType').textContent = '--';
  document.getElementById('scanWBC').textContent = '--';
  document.getElementById('scanRBC').textContent = '--';
  document.getElementById('scanHgb').textContent = '--';
  document.getElementById('scanPlatelet').textContent = '--';
  document.getElementById('scanStatus').textContent = 'STANDBY';
  document.getElementById('scanStatus').className = 'value';
  document.querySelectorAll('.specimen-card').forEach(c => c.classList.remove('active'));
  toast('Scanner cleared.', 'info', 'refresh');
}

/* --- Save Metrics --- */
function saveMetrics() {
  const specId = document.getElementById('metricsSpecimenSelect')?.value;
  if (!specId) { toast('Select a specimen first.', 'warning'); return; }

  const fields = { wbc: 'm_wbc', rbc: 'm_rbc', hgb: 'm_hgb', plt: 'm_plt', glu: 'm_glu', cre: 'm_cre' };
  const vals = {};
  for (const [k, id] of Object.entries(fields)) {
    vals[k] = document.getElementById(id)?.value;
  }

  const spc = SPECIMENS.find(s => s.id === specId);
  if (!spc) return;

  // Color-code range hints
  const ranges = {
    m_wbc: [4, 11], m_rbc: [4.5, 5.5], m_hgb: [13.5, 17.5],
    m_plt: [150, 400], m_glu: [70, 100], m_cre: [0.7, 1.3]
  };
  let hasAlert = false;
  for (const [id, [lo, hi]] of Object.entries(ranges)) {
    const val = parseFloat(document.getElementById(id)?.value);
    const hint = document.getElementById(id)?.parentElement?.querySelector('.range-hint');
    if (val && hint) {
      if (val < lo || val > hi) { hint.className = 'range-hint range-alert'; hasAlert = true; }
      else { hint.className = 'range-hint range-ok'; }
    }
  }

  spc.status = hasAlert ? 'critical' : 'complete';
  renderSpecimenQueue();

  if (!COMPLETED_RESULTS.find(r => r.id === spc.id)) {
    COMPLETED_RESULTS.unshift({
      id: spc.id, patient: spc.patient, test: spc.test,
      status: hasAlert ? 'Elevated' : 'Normal',
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      doctor: spc.doctor
    });
    renderResults();
  }

  toast(hasAlert ? `⚠ Abnormal values detected for ${spc.patient}!` : `Results saved for ${spc.patient}!`, hasAlert ? 'warning' : 'success');
}

/* --- Add Specimen --- */
function addSpecimen() {
  const patient = document.getElementById('newSpcPatient')?.value.trim();
  const test = document.getElementById('newSpcType')?.value;
  const sample = document.getElementById('newSpcSample')?.value;
  const doctor = document.getElementById('newSpcDoctor')?.value.trim() || 'Unknown';
  if (!patient) { toast('Please enter patient name.', 'warning'); return; }

  const newSpc = {
    id: `SPC-${1100 + SPECIMENS.length + 1}`,
    patient, age: 0, test, sample, doctor,
    status: 'queued', time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    timestamp: new Date().toISOString(),
    critical: false
  };
  SPECIMENS.push(newSpc);
  renderSpecimenQueue();
  closeModal(null, 'newSpecimenModal');
  document.getElementById('newSpcPatient').value = '';
  document.getElementById('newSpcDoctor').value = '';
  toast(`Specimen ${newSpc.id} logged for ${patient}!`, 'success', 'science');
}

/* --- Print Result --- */
function printResult(id) {
  toast(`Printing result ${id}...`, 'info', 'print');
  setTimeout(() => toast('Report sent to print queue!', 'success'), 1000);
}

/* --- DOMContentLoaded --- */
document.addEventListener('DOMContentLoaded', () => {
  const todayChip = document.querySelector(`#labSmartFilter .sf-chip[onclick*="'today'"]`);
  if (todayChip) {
    sfChipSelect(todayChip, 'lab', 'today');
  } else {
    renderSpecimenQueue();
  }
  renderResults();
});

