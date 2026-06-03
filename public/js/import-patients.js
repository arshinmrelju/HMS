const API_BASE = '/api';

function log(msg) {
  const logEl = document.getElementById('log');
  logEl.innerHTML += `<div>${msg}</div>`;
  logEl.scrollTop = logEl.scrollHeight;
}

async function waitForAuth() {
  if (window._authReady) await window._authReady;
  const user = window.HMS ? window.HMS.getUser() : null;
  if (!user || (user.role !== 'Admin' && user.role !== 'Staff')) {
    log('<span style="color:red">Access denied: Admin or Staff role required.</span>');
    return false;
  }
  return true;
}

function getToken() {
  try {
    const s = JSON.parse(sessionStorage.getItem('hms_session') || 'null');
    return s ? s.token : null;
  } catch { return null; }
}

async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

document.addEventListener('DOMContentLoaded', async () => {
  const btn = document.getElementById('startBtn');
  const fileInput = document.getElementById('fileInput');
  const progressWrap = document.getElementById('progressWrap');
  const progressFill = document.getElementById('progressFill');

  const authed = await waitForAuth();
  if (authed) {
    btn.disabled = false;
    btn.textContent = 'Start Import';
    log('<span style="color:green">Authenticated — ready to import.</span>');
  } else {
    btn.textContent = 'Access Denied';
    return;
  }

  btn.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) {
      log('<span style="color:red">Please select a .xlsx file first.</span>');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Importing... Please wait';
    progressWrap.style.display = 'block';

    log(`Reading ${file.name}...`);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);

      log('Parsing Excel...');
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet);

      log(`Parsed ${rawRows.length} rows. Importing via API...`);

      let imported = 0;
      const batchSize = 50;
      for (let i = 0; i < rawRows.length; i += batchSize) {
        const batch = rawRows.slice(i, i + batchSize);
        await apiRequest('/patients/bulk', {
          method: 'POST',
          body: { patients: batch }
        });
        imported += batch.length;
        const pct = Math.round((imported / rawRows.length) * 100);
        progressFill.style.width = `${pct}%`;
        log(`Imported ${imported}/${rawRows.length} (${pct}%)`);
      }

      log('<span style="color:green"><b>Import Complete!</b></span>');
      btn.textContent = 'Import Completed';
    } catch (error) {
      log(`<span style="color:red">Error: ${error.message}</span>`);
      btn.disabled = false;
      btn.textContent = 'Retry Import';
    }
  });

  if (typeof XLSX === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    document.head.appendChild(script);
  }
});
