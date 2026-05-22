/* =========================================================
   REPORTS.JS – Financial Reports & PhonePe UPI Integration
   Features: Sync simulation, Live transaction simulator,
             Chart.js analytics, filters, and CSV export.
   ========================================================= */

'use strict';

// 1. Auth Guard & Role Verification
HMS.requireAuth();
const user = HMS.getUser();
if (user && (user.role === 'Doctor' || user.role === 'Pharmacist')) {
  // Restrict access for non-finance users
  toast('Unauthorized access to financial reports redirected.', 'error');
  setTimeout(() => {
    window.location.href = 'dashboard.html';
  }, 1000);
}

// 2. Initial Mock Data
const INITIAL_TRANSACTIONS = [
  { id: 'TXN20260522001', patientName: 'Rajan Kapoor', patientId: 'PAT042', vpa: 'rajan.kapoor@ybl', amount: 1500, time: '2026-05-22T08:30:00Z', app: 'PhonePe', status: 'SUCCESS', reconciled: true },
  { id: 'TXN20260522002', patientName: 'Sara Parker', patientId: 'PAT108', vpa: 'sara.p@oksbi', amount: 500, time: '2026-05-22T08:12:00Z', app: 'Google Pay', status: 'SUCCESS', reconciled: true },
  { id: 'TXN20260522003', patientName: 'Alex Johnson', patientId: 'PAT223', vpa: 'alex.j@paytm', amount: 2450, time: '2026-05-22T07:45:00Z', app: 'Paytm', status: 'SUCCESS', reconciled: true },
  { id: 'TXN20260522004', patientName: 'Meera Nair', patientId: 'PAT152', vpa: 'meera.nair@ybl', amount: 3200, time: '2026-05-22T06:15:00Z', app: 'PhonePe', status: 'FAILED', reconciled: false },
  { id: 'TXN20260522005', patientName: 'Vikram Singh', patientId: 'PAT089', vpa: 'vik.singh@okaxis', amount: 1200, time: '2026-05-22T05:30:00Z', app: 'BHIM UPI', status: 'SUCCESS', reconciled: true },
  { id: 'TXN20260521001', patientName: 'Anjali Sharma', patientId: 'PAT304', vpa: 'anjali@ybl', amount: 850, time: '2026-05-21T18:45:00Z', app: 'PhonePe', status: 'SUCCESS', reconciled: true },
  { id: 'TXN20260521002', patientName: 'David Miller', patientId: 'PAT190', vpa: 'miller.d@oksbi', amount: 500, time: '2026-05-21T15:20:00Z', app: 'Google Pay', status: 'PENDING', reconciled: false },
  { id: 'TXN20260521003', patientName: 'Priya Patel', patientId: 'PAT099', vpa: 'priya.patel@paytm', amount: 4150, time: '2026-05-21T11:10:00Z', app: 'Paytm', status: 'SUCCESS', reconciled: true },
  { id: 'TXN20260520001', patientName: 'Rohan Verma', patientId: 'PAT273', vpa: 'rohan.v@ybl', amount: 1800, time: '2026-05-20T16:30:00Z', app: 'PhonePe', status: 'SUCCESS', reconciled: true },
  { id: 'TXN20260520002', patientName: 'Lisa Gonsalves', patientId: 'PAT112', vpa: 'lisa.g@oksbi', amount: 500, time: '2026-05-20T10:15:00Z', app: 'Google Pay', status: 'SUCCESS', reconciled: true }
];

// Load from LocalStorage or seed new list
let transactionList = JSON.parse(localStorage.getItem('hms_upi_transactions')) || INITIAL_TRANSACTIONS;

function saveTransactions() {
  localStorage.setItem('hms_upi_transactions', JSON.stringify(transactionList));
}

// 3. PhonePe Connection Setting Handles
function initPhonePeSettings() {
  const midInput = document.getElementById('phonepeMerchantId');
  const saltInput = document.getElementById('phonepeSaltKey');
  const indexInput = document.getElementById('phonepeSaltIndex');
  const endpointInput = document.getElementById('phonepeEndpoint');

  // Load saved keys or prefill with credentials
  if (midInput) midInput.value = localStorage.getItem('hms_phonepe_mid') || 'WELLNESS_MED_M2308';
  if (saltInput) saltInput.value = localStorage.getItem('hms_phonepe_salt') || '985f36e4-411a-4c28-bb73-982823812ee2';
  if (indexInput) indexInput.value = localStorage.getItem('hms_phonepe_index') || '1';
  if (endpointInput) endpointInput.value = localStorage.getItem('hms_phonepe_endpoint') || 'https://api.phonepe.com/apis/hermes/v1/sync';
}

function savePhonePeSettings() {
  const mid = document.getElementById('phonepeMerchantId').value.trim();
  const salt = document.getElementById('phonepeSaltKey').value.trim();
  const index = document.getElementById('phonepeSaltIndex').value.trim();
  const endpoint = document.getElementById('phonepeEndpoint').value.trim();

  localStorage.setItem('hms_phonepe_mid', mid);
  localStorage.setItem('hms_phonepe_salt', salt);
  localStorage.setItem('hms_phonepe_index', index);
  localStorage.setItem('hms_phonepe_endpoint', endpoint);

  toast('PhonePe API configuration saved!', 'success');
  addConsoleLog('SYSTEM', 'Saved local credential mappings for API client authorization.');
}

// Console helper
function addConsoleLog(type, msg, isSpecial = false) {
  const consoleEl = document.getElementById('apiConsoleLog');
  if (!consoleEl) return;

  const timeStr = new Date().toLocaleTimeString('en-IN', { hour12: false });
  const entry = document.createElement('div');
  entry.className = `log-entry ${isSpecial ? 'log-success' : (type === 'WARN' ? 'log-warn' : '')}`;
  
  entry.innerHTML = `
    <span class="log-time">[${timeStr}]</span>
    <span class="log-tag"><strong>[${type}]</strong></span>
    <span class="log-msg">${msg}</span>
  `;
  
  consoleEl.appendChild(entry);
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

// 4. Synchronize PhonePe API Simulation
async function syncPhonePeHistory() {
  const syncBtn = document.getElementById('syncBtn');
  const progressWrap = document.getElementById('syncProgressWrap');
  const progressFill = document.getElementById('syncProgressFill');

  if (!syncBtn) return;

  // Toggle Loading States
  syncBtn.disabled = true;
  syncBtn.innerHTML = `<span class="material-icons-round spinning">sync</span> Synchronizing...`;
  progressWrap.style.display = 'block';
  progressFill.style.width = '0%';

  const logSteps = [
    { delay: 400, type: 'INFO', msg: 'Initializing secure network handshake with PhonePe host api.phonepe.com...' },
    { delay: 800, type: 'INFO', msg: `Authorizing client headers using Merchant ID: ${localStorage.getItem('hms_phonepe_mid') || 'WELLNESS_MED_M2308'}` },
    { delay: 1200, type: 'INFO', msg: 'Computing payload check-signature using SHA-256 with Salt Index key' },
    { delay: 1700, type: 'SUCCESS', msg: 'Handshake successful. Secure HTTPS connection established with hermes-settlement-cluster', special: true },
    { delay: 2100, type: 'INFO', msg: 'Querying latest daily settlement cycle invoices & transaction ledgers...' },
    { delay: 2500, type: 'SUCCESS', msg: 'Settlement cycle S20260522 reconciled. Found outstanding transaction logs.', special: true },
    { delay: 2800, type: 'INFO', msg: 'Merging and updating local Wellness Medicals HMS transactional databases...' }
  ];

  // Run the logs sequence
  for (const step of logSteps) {
    await new Promise(r => setTimeout(r, step.delay - (step.delay > 400 ? logSteps[logSteps.indexOf(step)-1].delay : 0)));
    addConsoleLog(step.type, step.msg, step.special);
    const progressPercent = Math.round((logSteps.indexOf(step) + 1) / logSteps.length * 90);
    progressFill.style.width = `${progressPercent}%`;
  }

  // Simulate pulling the settlements
  let newSyncCount = 0;
  transactionList.forEach(txn => {
    if (txn.status === 'PENDING') {
      txn.status = 'SUCCESS';
      txn.reconciled = true;
      newSyncCount++;
    }
  });

  // Also simulate adding a newly synchronized external phonepe transaction if none were pending
  if (newSyncCount === 0) {
    const mockSyncTxn = {
      id: `TXN20260522${String(Math.floor(Math.random()*900) + 100)}`,
      patientName: 'Neelam Sen',
      patientId: 'PAT144',
      vpa: 'neelam.sen@oksbi',
      amount: 850,
      time: new Date().toISOString(),
      app: 'PhonePe',
      status: 'SUCCESS',
      reconciled: true
    };
    transactionList.unshift(mockSyncTxn);
    newSyncCount = 1;
  }

  saveTransactions();
  
  await new Promise(r => setTimeout(r, 400));
  progressFill.style.width = '100%';
  
  // Update UI and charts
  renderTxnTable();
  updateKPIs();
  updateCharts();

  addConsoleLog('SUCCESS', `Synchronization complete! Successfully reconciled and updated ${newSyncCount} transaction records.`, true);
  toast(`PhonePe Sync Successful! Reconciled ${newSyncCount} records.`, 'success');

  // Reset Sync button
  setTimeout(() => {
    syncBtn.disabled = false;
    syncBtn.innerHTML = `<span class="material-icons-round">sync</span> Sync PhonePe History`;
    progressWrap.style.display = 'none';
  }, 1000);
}

// 5. Interactive UPI Payment Webhook Simulator
function triggerMockPaymentSimulator() {
  const patientSelect = document.getElementById('simPatientSelect');
  const billTypeSelect = document.getElementById('simBillType');
  const payAppSelect = document.getElementById('simPayApp');

  if (!patientSelect) return;

  const patientName = patientSelect.options[patientSelect.selectedIndex].text;
  const patientId = patientSelect.value;
  const billType = billTypeSelect.value;
  const app = payAppSelect.value;

  // Invoice type details
  const billDetails = {
    Consultation: { amount: 500, label: 'Doctor Consultation' },
    Pharmacy: { amount: Math.floor(Math.random()*1500) + 120, label: 'Medication Order' },
    Laboratory: { amount: Math.floor(Math.random()*2500) + 350, label: 'Lab Test Panels' },
    Registration: { amount: 150, label: 'Outpatient Registration' }
  };

  const selectedBill = billDetails[billType];
  const formattedVpa = `${patientName.toLowerCase().replace(/\s+/g, '.')}@${app === 'PhonePe' ? 'ybl' : (app === 'Google Pay' ? 'oksbi' : (app === 'Paytm' ? 'paytm' : 'okaxis'))}`;
  
  // Create simulated transaction (starts as Success or Pending)
  const isSuccess = Math.random() > 0.15; 
  const status = isSuccess ? 'SUCCESS' : 'FAILED';

  const simulatedTxn = {
    id: `TXN20260522${String(Math.floor(Math.random()*900) + 100)}`,
    patientName: patientName,
    patientId: patientId,
    vpa: formattedVpa,
    amount: selectedBill.amount,
    time: new Date().toISOString(),
    app: app,
    status: status,
    reconciled: isSuccess
  };

  // Add webhook log simulation
  addConsoleLog('WEBHOOK', `Received incoming payment alert for ${selectedBill.label} from ${patientName} via ${app}. Amount: ₹${selectedBill.amount}.`);
  addConsoleLog('WEBHOOK', `Transaction ID: ${simulatedTxn.id} status is ${status}. Signature verify payload checksum: PASSED`, isSuccess);

  // Trigger hospital-wide audio/visual alert toast
  if (isSuccess) {
    toast(`Incoming Payment Reconciled: ₹${selectedBill.amount} received from ${patientName}!`, 'success', 'payments');
  } else {
    toast(`Payment Alert: UPI Transaction ${simulatedTxn.id} from ${patientName} failed.`, 'error', 'warning');
  }

  // Prepend to our list and save
  transactionList.unshift(simulatedTxn);
  saveTransactions();

  // Refresh page visual statistics
  renderTxnTable();
  updateKPIs();
  updateCharts();
}

// 6. UI Render Methods
function renderTxnTable(data = transactionList) {
  const tbody = document.getElementById('txnTableBody');
  if (!tbody) return;

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--on-surface-var)">No UPI records matching criteria found.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(txn => {
    const isSuccess = txn.status === 'SUCCESS';
    const isPending = txn.status === 'PENDING';
    
    let statusClass = 'cancelled';
    if (isSuccess) statusClass = 'confirmed';
    if (isPending) statusClass = 'pending';

    const localTime = new Date(txn.time).toLocaleString('en-IN', {
      hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short'
    });

    return `
      <tr>
        <td><span class="txn-id-badge">${txn.id}</span></td>
        <td>
          <div style="font-weight:600">${txn.patientName}</div>
          <div style="font-size:0.72rem;color:var(--on-surface-var)">${txn.patientId}</div>
        </td>
        <td>
          <div class="vpa-text">${txn.vpa}</div>
        </td>
        <td><strong>₹${txn.amount.toLocaleString('en-IN')}</strong></td>
        <td><span style="font-size:0.8rem;color:var(--on-surface-var)">${localTime}</span></td>
        <td>
          <div style="display:flex;align-items:center;gap:6px">
            <img src="assets/${txn.app === 'PhonePe' ? 'phonepe-mini.png' : (txn.app === 'Google Pay' ? 'gpay-mini.png' : 'upi-mini.png')}" 
                 style="width:16px;height:16px;object-fit:contain;border-radius:4px" 
                 onerror="this.src='https://img.icons8.com/color/48/bank-cards.png'"/>
            <span style="font-size:0.78rem;font-weight:500">${txn.app}</span>
          </div>
        </td>
        <td>
          <span class="badge-status ${statusClass}">${txn.status}</span>
        </td>
      </tr>
    `;
  }).join('');
}

function updateKPIs() {
  const totalUpiEl = document.getElementById('kpiTotalUpi');
  const rateEl = document.getElementById('kpiSuccessRate');
  const pendingEl = document.getElementById('kpiPendingSettlements');
  
  let totalCollections = 0;
  let successCount = 0;
  let totalCount = 0;
  let pendingCount = 0;

  transactionList.forEach(txn => {
    totalCount++;
    if (txn.status === 'SUCCESS') {
      successCount++;
      totalCollections += txn.amount;
    } else if (txn.status === 'PENDING') {
      pendingCount += txn.amount;
    }
  });

  const successRate = totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(1) : 100;

  if (totalUpiEl) totalUpiEl.textContent = `₹${totalCollections.toLocaleString('en-IN')}`;
  if (rateEl) rateEl.textContent = `${successRate}%`;
  if (pendingEl) pendingEl.textContent = `₹${pendingCount.toLocaleString('en-IN')}`;
}

// 7. Interactive Charts Integration
let lineTrendChartInstance = null;
let appShareChartInstance = null;

function updateCharts() {
  const trendCtx = document.getElementById('upiTrendChart')?.getContext('2d');
  const shareCtx = document.getElementById('upiShareChart')?.getContext('2d');

  if (!trendCtx || !shareCtx) return;

  // Process data for Trends Chart (grouped by past few days)
  const pastDays = {};
  for (let i = 4; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    pastDays[dateStr] = 0;
  }

  // Populate days
  transactionList.forEach(txn => {
    if (txn.status === 'SUCCESS') {
      const dateStr = new Date(txn.time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      if (pastDays[dateStr] !== undefined) {
        pastDays[dateStr] += txn.amount;
      }
    }
  });

  const trendLabels = Object.keys(pastDays);
  const trendData = Object.values(pastDays);

  // App Distribution shares
  const appCounts = { 'PhonePe': 0, 'Google Pay': 0, 'Paytm': 0, 'BHIM UPI': 0 };
  transactionList.forEach(txn => {
    if (txn.status === 'SUCCESS') {
      const appName = txn.app;
      if (appCounts[appName] !== undefined) {
        appCounts[appName] += txn.amount;
      } else {
        appCounts['BHIM UPI'] += txn.amount;
      }
    }
  });

  const shareLabels = Object.keys(appCounts);
  const shareData = Object.values(appCounts);

  // Destroy previous instances to avoid rendering overlap
  if (lineTrendChartInstance) lineTrendChartInstance.destroy();
  if (appShareChartInstance) appShareChartInstance.destroy();

  // Create Trend Line Chart
  lineTrendChartInstance = new Chart(trendCtx, {
    type: 'line',
    data: {
      labels: trendLabels,
      datasets: [{
        label: 'UPI Revenue (₹)',
        data: trendData,
        borderColor: '#0D9488',
        backgroundColor: 'rgba(13, 148, 136, 0.1)',
        tension: 0.35,
        fill: true,
        borderWidth: 3,
        pointRadius: 4,
        pointBackgroundColor: '#0D9488'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: { font: { family: 'Inter' } }
        },
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Inter' } }
        }
      }
    }
  });

  // Create App Share Donut Chart
  appShareChartInstance = new Chart(shareCtx, {
    type: 'doughnut',
    data: {
      labels: shareLabels,
      datasets: [{
        data: shareData,
        backgroundColor: ['#5F259F', '#34A853', '#00BAF2', '#E21A22'],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            boxWidth: 12,
            font: { family: 'Inter', size: 11 }
          }
        }
      },
      cutout: '68%'
    }
  });
}

// 8. Search, Filters and CSV Export handlers
function filterTxnTable() {
  const query = document.getElementById('searchTxn').value.toLowerCase();
  const statusFilter = document.getElementById('statusFilter').value;
  const appFilter = document.getElementById('appFilter').value;

  const filtered = transactionList.filter(txn => {
    const matchesQuery = txn.patientName.toLowerCase().includes(query) || 
                         txn.id.toLowerCase().includes(query) || 
                         txn.vpa.toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'ALL' || txn.status === statusFilter;
    const matchesApp = appFilter === 'ALL' || txn.app === appFilter;

    return matchesQuery && matchesStatus && matchesApp;
  });

  renderTxnTable(filtered);
}

function exportTxnToCSV() {
  addConsoleLog('EXPORT', 'Preparing CSV export for UPI transaction ledgers...');
  
  const headers = ['Transaction ID', 'Patient Name', 'Patient ID', 'UPI VPA', 'Amount (INR)', 'Timestamp', 'UPI Gateway App', 'Reconciliation Status'];
  
  const rows = transactionList.map(txn => [
    txn.id,
    txn.patientName,
    txn.patientId,
    txn.vpa,
    txn.amount,
    txn.time,
    txn.app,
    txn.status
  ]);

  const csvContent = "data:text/csv;charset=utf-8," 
    + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `UPI_PhonePe_Reports_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  toast('Transaction ledger exported to CSV successfully!', 'success');
  addConsoleLog('EXPORT', 'Transaction ledger compiled and downloaded to local filesystem.', true);
}

// 9. Initializing DOM contents
document.addEventListener('DOMContentLoaded', () => {
  initPhonePeSettings();
  renderTxnTable();
  updateKPIs();
  updateCharts();

  // Add event listener to PhonePe settings form
  const phonepeForm = document.getElementById('phonepeSettingsForm');
  if (phonepeForm) {
    phonepeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      savePhonePeSettings();
    });
  }

  // Pre-expand setting toggles
  const apiToggle = document.getElementById('apiSettingsToggle');
  const apiConfig = document.getElementById('phonepeSettingsForm');
  if (apiToggle && apiConfig) {
    apiToggle.addEventListener('click', () => {
      apiConfig.hidden = !apiConfig.hidden;
      const arrow = apiToggle.querySelector('.material-icons-round');
      if (arrow) {
        arrow.textContent = apiConfig.hidden ? 'expand_more' : 'expand_less';
      }
    });
  }

  // Simulated live webhook check loop
  setTimeout(() => {
    addConsoleLog('SYSTEM', 'Wellness HMS live reconciliation console active. Listening on webhook port 443...');
  }, 1200);
});
