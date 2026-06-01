'use strict';

HMS.requireAuth();

// ============================================================
// CONFIGURATION
// ============================================================
// 1. Deploy the Apps Script as a Web App
// 2. Copy the Web App URL here
// 3. Set the same API_KEY in apps-script/Config.gs
// ============================================================

var SYNC_CONFIG = {
  // TODO: Replace with your deployed Apps Script Web App URL
  WEB_APP_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',

  // TODO: Must match the API_KEY in apps-script/Config.gs
  API_KEY: 'CHANGE_ME_TO_A_RANDOM_SECRET'
};

// Store API key in localStorage so it can be updated via the dashboard
try {
  var stored = localStorage.getItem('hms_google_sync_config');
  if (stored) {
    var parsed = JSON.parse(stored);
    if (parsed.webAppUrl) SYNC_CONFIG.WEB_APP_URL = parsed.webAppUrl;
    if (parsed.apiKey) SYNC_CONFIG.API_KEY = parsed.apiKey;
  }
} catch (e) { /* ignore */ }

// ===== STATE =====
var allPatients = [];
var syncLogs = [];
var syncConfig = { enabled: true, autoSyncNew: true, delegatedAdminEmail: '' };

// ===== HELPERS =====
function esc(val) {
  return typeof val === 'string' ? val.replace(/[&<>"']/g, function(m) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
  }) : (val == null ? '' : String(val));
}

function formatTime(ts) {
  if (!ts) return '--';
  var d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function syncStatusBadge(status) {
  var map = {
    synced: '<span class="badge-status confirmed">Synced</span>',
    pending: '<span class="badge-status pending">Pending</span>',
    failed: '<span class="badge-status critical">Failed</span>',
    disabled: '<span class="badge-status completed">Off</span>',
    skipped: '<span class="badge-status completed">Skipped</span>'
  };
  return map[status] || '<span class="badge-status">' + esc(status) + '</span>';
}

function logStatusBadge(status) {
  return status === 'success'
    ? '<span class="badge-status confirmed">Success</span>'
    : '<span class="badge-status critical">Failed</span>';
}

function logActionBadge(action) {
  var map = {
    create: '<span class="badge-status confirmed" style="background:rgba(16,185,129,0.12);color:#059669">Create</span>',
    update: '<span class="badge-status" style="background:rgba(59,130,246,0.12);color:#2563EB">Update</span>',
    skip: '<span class="badge-status completed">Skip</span>',
    error: '<span class="badge-status critical">Error</span>',
    delete: '<span class="badge-status critical">Delete</span>'
  };
  return map[action] || '<span class="badge-status">' + esc(action) + '</span>';
}

// ===== CALL APPS SCRIPT WEB APP =====
function callAppsScript(action, payload) {
  return new Promise(function(resolve, reject) {
    var url = SYNC_CONFIG.WEB_APP_URL + '?key=' + encodeURIComponent(SYNC_CONFIG.API_KEY);

    var body = { action: action };
    if (payload) {
      for (var k in payload) body[k] = payload[k];
    }

    var xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var result = JSON.parse(xhr.responseText);
          resolve(result);
        } catch (e) {
          reject(new Error('Invalid JSON response: ' + xhr.responseText));
        }
      } else {
        reject(new Error('HTTP ' + xhr.status + ': ' + xhr.statusText));
      }
    };

    xhr.onerror = function() {
      reject(new Error('Network error - check CORS and Web App URL'));
    };

    xhr.send(JSON.stringify(body));
  });
}

// ===== LOAD SYNC CONFIG =====
async function loadSyncConfig() {
  try {
    var snap = await window.firebaseFS.getDoc(
      window.firebaseFS.doc(window.firebaseDb, 'sync_config', 'settings')
    );
    if (snap.exists) {
      syncConfig = { enabled: true, autoSyncNew: true, delegatedAdminEmail: '', ...snap.data() };
      // If webAppUrl is stored in Firestore, use it
      if (snap.data().webAppUrl) {
        SYNC_CONFIG.WEB_APP_URL = snap.data().webAppUrl;
        persistSyncConfig();
      }
    }
  } catch (e) {
    console.warn('Failed to load sync config:', e);
  }
  document.getElementById('syncEnabled').checked = syncConfig.enabled !== false;
  document.getElementById('autoSyncNew').checked = syncConfig.autoSyncNew !== false;
  document.getElementById('delegatedEmail').value = syncConfig.delegatedAdminEmail || '';
}

function persistSyncConfig() {
  try {
    localStorage.setItem('hms_google_sync_config', JSON.stringify({
      webAppUrl: SYNC_CONFIG.WEB_APP_URL,
      apiKey: SYNC_CONFIG.API_KEY
    }));
  } catch (e) { /* ignore */ }
}

async function saveSyncConfig() {
  syncConfig.enabled = document.getElementById('syncEnabled').checked;
  syncConfig.autoSyncNew = document.getElementById('autoSyncNew').checked;
  syncConfig.delegatedAdminEmail = document.getElementById('delegatedEmail').value.trim();
  try {
    await window.firebaseFS.setDoc(
      window.firebaseFS.doc(window.firebaseDb, 'sync_config', 'settings'),
      syncConfig,
      { merge: true }
    );
    toast('Sync settings saved', 'success');
  } catch (e) {
    toast('Failed to save: ' + e.message, 'error');
  }
}
window.saveSyncConfig = saveSyncConfig;

async function toggleSyncConfig() {
  await saveSyncConfig();
}
window.toggleSyncConfig = toggleSyncConfig;

// ===== LOAD STATS =====
async function loadSyncStats() {
  try {
    var all = allPatients.filter(function(p) { return p.syncToGoogle === true; });
    var synced = all.filter(function(p) { return p.syncStatus === 'synced'; }).length;
    var pending = all.filter(function(p) { return p.syncStatus === 'pending' || !p.syncStatus; }).length;
    var failed = all.filter(function(p) { return p.syncStatus === 'failed'; }).length;

    document.getElementById('statSynced').textContent = synced;
    document.getElementById('statPending').textContent = pending;
    document.getElementById('statFailed').textContent = failed;

    var attempts = all
      .filter(function(p) { return p.syncLastAttempt; })
      .sort(function(a, b) {
        var ta = a.syncLastAttempt && a.syncLastAttempt.toDate ? a.syncLastAttempt.toDate() : new Date(0);
        var tb = b.syncLastAttempt && b.syncLastAttempt.toDate ? b.syncLastAttempt.toDate() : new Date(0);
        return tb - ta;
      });
    var lastEl = document.getElementById('statLastSync');
    if (attempts.length > 0) {
      lastEl.textContent = formatTime(attempts[0].syncLastAttempt);
      lastEl.style.fontSize = '1.2rem';
    } else {
      lastEl.textContent = 'Never';
    }
  } catch (e) {
    console.error('Stats error:', e);
  }
}

// ===== SYNC LOGS (local via Firestore) =====
async function loadSyncLogs() {
  var tbody = document.getElementById('syncLogsBody');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--on-surface-var)"><span class="material-icons-round" style="font-size:20px;vertical-align:middle">hourglass_empty</span> Loading...</td></tr>';
  try {
    var snap = await window.firebaseFS.getDocs(
      window.firebaseFS.query(
        window.firebaseFS.collection(window.firebaseDb, 'sync_logs'),
        window.firebaseFS.orderBy('timestamp', 'desc'),
        window.firebaseFS.limit(50)
      )
    );
    syncLogs = [];
    snap.forEach(function(d) { syncLogs.push({ id: d.id, ...d.data() }); });
    renderSyncLogs();
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--on-surface-var)">Failed to load logs.</td></tr>';
  }
}
window.loadSyncLogs = loadSyncLogs;

function renderSyncLogs() {
  var tbody = document.getElementById('syncLogsBody');
  if (syncLogs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--on-surface-var)">No sync activity yet.</td></tr>';
    return;
  }
  tbody.innerHTML = syncLogs.map(function(log) {
    return '<tr>' +
      '<td style="white-space:nowrap;font-size:.75rem">' + formatTime(log.timestamp) + '</td>' +
      '<td><strong>' + esc(log.patientName || log.patientId) + '</strong></td>' +
      '<td>' + logActionBadge(log.action) + '</td>' +
      '<td>' + logStatusBadge(log.status) + '</td>' +
      '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;font-size:.78rem">' + esc(log.message) + '</td>' +
      '</tr>';
  }).join('');
}

// ===== LOAD PATIENTS =====
async function loadSyncPatients() {
  try {
    var snap = await window.firebaseFS.getDocs(
      window.firebaseFS.query(
        window.firebaseFS.collection(window.firebaseDb, 'patients'),
        window.firebaseFS.orderBy('syncStatus', 'asc')
      )
    );
    allPatients = [];
    snap.forEach(function(d) { allPatients.push({ id: d.id, ...d.data() }); });
    renderSyncPatients();
    loadSyncStats();
  } catch (e) {
    document.getElementById('syncPatientsBody').innerHTML =
      '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--on-surface-var)">Failed to load patients.</td></tr>';
  }
}

function renderSyncPatients() {
  var filter = (document.getElementById('syncFilterStatus') && document.getElementById('syncFilterStatus').value) || 'all';
  var search = ((document.getElementById('syncPatientSearch') && document.getElementById('syncPatientSearch').value) || '').toLowerCase();
  var tbody = document.getElementById('syncPatientsBody');
  var countEl = document.getElementById('syncPatientCount');

  var filtered = allPatients;
  if (filter !== 'all') {
    filtered = filtered.filter(function(p) { return p.syncStatus === filter; });
  }
  if (search) {
    filtered = filtered.filter(function(p) {
      return ((p.fname || '') + ' ' + (p.lname || '')).toLowerCase().indexOf(search) !== -1 ||
             (p.contact || '').indexOf(search) !== -1;
    });
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--on-surface-var)">No patients match.</td></tr>';
    if (countEl) countEl.textContent = '0 patients';
    return;
  }

  tbody.innerHTML = filtered.map(function(p) {
    var name = esc((p.fname || '') + ' ' + (p.lname || ''));
    var phone = esc(p.contact || '--');
    var syncIndicator = p.syncToGoogle
      ? '<span class="material-icons-round" style="font-size:14px;color:#0D9488;vertical-align:middle">sync</span>'
      : '';
    return '<tr>' +
      '<td><strong style="font-size:.82rem">' + name + '</strong> ' + syncIndicator + '</td>' +
      '<td style="font-size:.8rem">' + phone + '</td>' +
      '<td>' + syncStatusBadge(p.syncStatus) + '</td>' +
      '<td style="font-size:.7rem;font-family:monospace;max-width:160px;overflow:hidden;text-overflow:ellipsis">' + esc(p.googleContactId || '--') + '</td>' +
      '<td style="font-size:.72rem;white-space:nowrap">' + (p.syncLastAttempt ? formatTime(p.syncLastAttempt) : '--') + '</td>' +
      '<td>' +
        '<button class="icon-btn" title="Sync Now" onclick="manualSync(\'' + esc(p.id) + '\')"' + (p.syncToGoogle ? '' : ' disabled') + '>' +
          '<span class="material-icons-round">sync</span>' +
        '</button>' +
        '<button class="icon-btn" title="' + (p.syncLastError ? esc(p.syncLastError) : 'No error') + '"' + (p.syncStatus === 'failed' ? '' : ' disabled') + '>' +
          '<span class="material-icons-round">error_outline</span>' +
        '</button>' +
      '</td>' +
      '</tr>';
  }).join('');

  if (countEl) countEl.textContent = filtered.length + ' patient' + (filtered.length !== 1 ? 's' : '');
}
window.renderSyncPatients = renderSyncPatients;

// ===== WRITE SYNC LOG TO FIRESTORE =====
async function writeSyncLog(entry) {
  try {
    await window.firebaseFS.addDoc(
      window.firebaseFS.collection(window.firebaseDb, 'sync_logs'),
      { ...entry, timestamp: window.firebaseFS.serverTimestamp() }
    );
  } catch (e) {
    console.warn('Failed to write sync log:', e);
  }
}

// ===== UPDATE PATIENT IN FIRESTORE =====
async function updatePatientSyncStatus(patientId, updates) {
  try {
    await window.firebaseFS.updateDoc(
      window.firebaseFS.doc(window.firebaseDb, 'patients', patientId),
      { ...updates, syncLastAttempt: window.firebaseFS.serverTimestamp() }
    );
  } catch (e) {
    console.warn('Failed to update patient sync status:', e);
  }
}

// ===== MANUAL SYNC =====
async function manualSync(patientId) {
  var patient = allPatients.find(function(p) { return p.id === patientId; });
  if (!patient) {
    toast('Patient not found', 'error');
    return;
  }

  // Show loading state
  toast('Syncing ' + (patient.fname || '') + '...', 'info');

  try {
    var result = await callAppsScript('syncPatient', {
      patient: {
        patientId: patient.id,
        fname: patient.fname,
        lname: patient.lname,
        contact: patient.contact,
        email: patient.email
      }
    });

    if (result.success) {
      // Update Firestore
      await updatePatientSyncStatus(patientId, {
        googleContactId: result.googleContactId,
        syncStatus: 'synced',
        syncMessage: result.message,
        syncRetryCount: 0
      });

      // Write log
      await writeSyncLog({
        patientId: patientId,
        patientName: (patient.fname || '') + ' ' + (patient.lname || ''),
        phone: patient.contact || '',
        action: result.action,
        googleContactId: result.googleContactId || '',
        status: 'success',
        message: result.message,
        retryCount: 0
      });

      toast('Synced: ' + result.message, 'success');
    } else {
      throw new Error(result.message || 'Unknown error');
    }

    await loadSyncPatients();
    await loadSyncLogs();

  } catch (e) {
    // Mark as failed
    await updatePatientSyncStatus(patientId, {
      syncStatus: 'failed',
      syncMessage: e.message,
      syncRetryCount: (patient.syncRetryCount || 0) + 1
    });

    await writeSyncLog({
      patientId: patientId,
      patientName: (patient.fname || '') + ' ' + (patient.lname || ''),
      phone: patient.contact || '',
      action: 'error',
      googleContactId: patient.googleContactId || '',
      status: 'failed',
      message: e.message,
      retryCount: (patient.syncRetryCount || 0) + 1
    });

    toast('Sync failed: ' + e.message, 'error');
    await loadSyncPatients();
    await loadSyncLogs();
  }
}
window.manualSync = manualSync;

// ===== BULK SYNC =====
async function startBulkSync() {
  var btn = document.getElementById('bulkSyncBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="material-icons-round">sync</span> Syncing...';

  var toSync = allPatients.filter(function(p) { return p.syncToGoogle === true; });
  if (toSync.length === 0) {
    toast('No patients marked for Google sync', 'info');
    btn.disabled = false;
    btn.innerHTML = '<span class="material-icons-round">sync</span> Bulk Sync All';
    return;
  }

  toast('Starting bulk sync of ' + toSync.length + ' patients...', 'info');

  try {
    // Build patients array for Apps Script
    var patientsPayload = toSync.map(function(p) {
      return {
        patientId: p.id,
        fname: p.fname,
        lname: p.lname,
        contact: p.contact,
        email: p.email
      };
    });

    var result = await callAppsScript('bulkSync', { patients: patientsPayload });

    // Process results and update Firestore
    var syncedCount = 0;
    var failedCount = 0;

    for (var i = 0; i < result.results.length; i++) {
      var r = result.results[i];
      var p = toSync[i];
      if (!p) continue;

      if (r.success) {
        await updatePatientSyncStatus(p.id, {
          googleContactId: r.googleContactId,
          syncStatus: 'synced',
          syncMessage: r.message,
          syncRetryCount: 0
        });
        syncedCount++;
      } else {
        await updatePatientSyncStatus(p.id, {
          syncStatus: 'failed',
          syncMessage: r.message,
          syncRetryCount: (p.syncRetryCount || 0) + 1
        });
        failedCount++;
      }

      // Write individual logs
      await writeSyncLog({
        patientId: p.id,
        patientName: (p.fname || '') + ' ' + (p.lname || ''),
        phone: p.contact || '',
        action: r.success ? (r.action || 'create') : 'error',
        googleContactId: r.googleContactId || '',
        status: r.success ? 'success' : 'failed',
        message: r.message,
        retryCount: r.success ? 0 : (p.syncRetryCount || 0) + 1
      });
    }

    toast('Bulk sync complete: ' + syncedCount + ' synced, ' + failedCount + ' failed', 'success');
    await loadSyncPatients();
    await loadSyncLogs();

  } catch (e) {
    toast('Bulk sync failed: ' + e.message, 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '<span class="material-icons-round">sync</span> Bulk Sync All';
}
window.startBulkSync = startBulkSync;

// ===== RETRY FAILED =====
async function retryFailedSyncs() {
  toast('Retrying failed syncs...', 'info');

  var failed = allPatients.filter(function(p) {
    return p.syncStatus === 'failed' && p.syncToGoogle === true;
  });

  if (failed.length === 0) {
    toast('No failed syncs to retry', 'info');
    return;
  }

  var syncedCount = 0;
  var stillFailed = 0;

  for (var i = 0; i < failed.length; i++) {
    var p = failed[i];
    try {
      var result = await callAppsScript('syncPatient', {
        patient: {
          patientId: p.id,
          fname: p.fname,
          lname: p.lname,
          contact: p.contact,
          email: p.email
        }
      });

      if (result.success) {
        await updatePatientSyncStatus(p.id, {
          googleContactId: result.googleContactId,
          syncStatus: 'synced',
          syncMessage: result.message,
          syncRetryCount: 0
        });
        syncedCount++;
      } else {
        await updatePatientSyncStatus(p.id, {
          syncStatus: 'failed',
          syncMessage: result.message,
          syncRetryCount: (p.syncRetryCount || 0) + 1
        });
        stillFailed++;
      }
    } catch (e) {
      stillFailed++;
    }
  }

  toast('Retry complete: ' + syncedCount + ' recovered, ' + stillFailed + ' still failed', syncedCount > 0 ? 'success' : 'error');
  await loadSyncPatients();
  await loadSyncLogs();
}
window.retryFailedSyncs = retryFailedSyncs;

// ===== OPEN CONFIG MODAL =====
function openSyncConfigModal() {
  var appUrl = prompt('Enter Apps Script Web App URL:', SYNC_CONFIG.WEB_APP_URL);
  if (appUrl) {
    SYNC_CONFIG.WEB_APP_URL = appUrl;
    persistSyncConfig();
    toast('Web App URL updated', 'success');
  }
  var key = prompt('Enter API Key:', SYNC_CONFIG.API_KEY);
  if (key) {
    SYNC_CONFIG.API_KEY = key;
    persistSyncConfig();
    toast('API Key updated', 'success');
  }
}
window.openSyncConfigModal = openSyncConfigModal;

// ===== TEST CONNECTION =====
async function testConnection() {
  toast('Testing connection...', 'info');
  try {
    var result = await callAppsScript('testConnection', {});
    if (result.success) {
      toast('Connection OK! Server time: ' + (result.timestamp || 'unknown'), 'success');
    } else {
      toast('Connection failed: ' + (result.message || 'Unknown'), 'error');
    }
  } catch (e) {
    toast('Connection failed: ' + e.message, 'error');
  }
}
window.testConnection = testConnection;

// ===== INIT =====
async function loadSyncDashboard() {
  await loadSyncConfig();
  await Promise.all([
    loadSyncPatients(),
    loadSyncLogs()
  ]);
}
window.loadSyncDashboard = loadSyncDashboard;

document.addEventListener('DOMContentLoaded', async function() {
  if (window._authReady) await window._authReady;
  if (!window._currentFirebaseUser) {
    await new Promise(function(resolve) {
      var check = setInterval(function() {
        if (window._currentFirebaseUser) { clearInterval(check); resolve(); }
      }, 50);
      setTimeout(function() { clearInterval(check); resolve(); }, 5000);
    });
  }
  loadSyncDashboard();
});
