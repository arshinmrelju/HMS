function log(msg) {
  const logEl = document.getElementById('log');
  logEl.innerHTML += `<div>${msg}</div>`;
  logEl.scrollTop = logEl.scrollHeight;
}

async function waitForAuth() {
  if (window._authReady) await window._authReady;
  const user = window.HMS ? window.HMS.getUser() : null;
  if (!user || user.role !== 'Admin') {
    log('<span style="color:red">Access denied: Admin role required.</span>');
    return false;
  }
  return true;
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
    log('<span style="color:green">Authenticated as Admin — ready to import.</span>');
  } else {
    btn.textContent = 'Access Denied';
    return;
  }

  btn.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) {
      log('<span style="color:red">Please select a .csv file first.</span>');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Importing... Please wait';
    progressWrap.style.display = 'block';

    log(`Reading ${file.name}...`);
    try {
      const text = await file.text();

      log('Parsing CSV...');
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: async function(results) {
          const data = results.data;
          log(`Parsed ${data.length} rows. Importing via Firestore...`);

          const db = firebase.firestore();
          const user = window._currentFirebaseUser;
          const ts = firebase.firestore.FieldValue.serverTimestamp;

          let imported = 0;
          const batchSize = 50;
          for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            const fbBatch = db.batch();
            batch.forEach(row => {
              const ref = db.collection('inventory').doc();
              fbBatch.set(ref, {
                ...row,
                created_by: user ? user.uid : null,
                created_at: ts(),
                updated_at: ts()
              });
            });
            await fbBatch.commit();
            imported += batch.length;
            const pct = Math.round((imported / data.length) * 100);
            progressFill.style.width = `${pct}%`;
            log(`Imported ${imported}/${data.length} (${pct}%)`);
          }

          log('<span style="color:green"><b>Import Complete!</b></span>');
          btn.textContent = 'Import Completed';
        }
      });
    } catch (error) {
      log(`<span style="color:red">Error: ${error.message}</span>`);
      btn.disabled = false;
      btn.textContent = 'Retry Import';
    }
  });
});
