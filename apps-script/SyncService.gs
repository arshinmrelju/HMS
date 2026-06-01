/**
 * Core sync logic.
 * Each public function returns an object:
 *   { success: bool, action: string, googleContactId: string, message: string }
 */

/**
 * Sync a single patient to Google Contacts.
 *
 * @param {Object} patient - { patientId, fname, lname, contact, email }
 * @return {Object} result
 */
function syncPatient(patient) {
  var name = (patient.fname || '') + ' ' + (patient.lname || '');
  name = name.trim();
  var phone = patient.contact || patient.phone || '';
  var email = patient.email || '';
  var uhid = patient.patientId || patient.id || '';

  if (!name) {
    return { success: false, action: 'skip', googleContactId: '', message: 'No name provided' };
  }
  if (!phone) {
    return { success: false, action: 'skip', googleContactId: '', message: 'No phone number' };
  }

  try {
    // Dedup: search by phone
    var existing = findContactByPhone(phone);

    var googleContactId;
    var action;

    if (existing && existing.resourceName) {
      // Update
      googleContactId = updateContact(
        existing.resourceName, name, phone, email, uhid, existing.etag
      );
      action = 'update';
    } else {
      // Create
      googleContactId = createContact(name, phone, email, uhid);
      action = 'create';
    }

    return {
      success: true,
      action: action,
      googleContactId: googleContactId,
      message: 'Contact ' + action + 'd successfully'
    };

  } catch (e) {
    return {
      success: false,
      action: 'error',
      googleContactId: patient.googleContactId || '',
      message: 'Sync failed: ' + e.message
    };
  }
}

/**
 * Bulk sync multiple patients.
 * Processes in small batches with delays to avoid rate limits.
 *
 * @param {Array} patients - Array of patient objects
 * @return {Object} { total, synced, failed, results }
 */
function bulkSyncPatients(patients) {
  var total = patients.length;
  var synced = 0;
  var failed = 0;
  var results = [];

  for (var i = 0; i < patients.length; i += CONFIG.BATCH_SIZE) {
    var batch = patients.slice(i, i + CONFIG.BATCH_SIZE);

    for (var j = 0; j < batch.length; j++) {
      var result = syncPatient(batch[j]);
      results.push(result);
      if (result.success) {
        synced++;
      } else {
        failed++;
      }
      // Internal delay between contacts
      if (j < batch.length - 1) {
        sleep(CONFIG.BATCH_INTERNAL_DELAY_MS);
      }
    }

    // Delay between batches
    if (i + CONFIG.BATCH_SIZE < patients.length) {
      sleep(CONFIG.BATCH_DELAY_MS);
    }
  }

  return {
    total: total,
    synced: synced,
    failed: failed,
    results: results,
    message: 'Bulk sync complete: ' + synced + ' synced, ' + failed + ' failed of ' + total
  };
}
