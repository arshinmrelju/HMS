/**
 * Google Contacts Sync - Web App Entry Point
 * 
 * DEPLOYMENT INSTRUCTIONS:
 *   1. Go to https://script.google.com and create a new project
 *   2. Copy ALL files from this folder into the Apps Script editor
 *      (Code.gs, PeopleApi.gs, SyncService.gs, Config.gs)
 *   3. In Config.gs, change API_KEY to a strong random secret
 *   4. In the Apps Script editor, go to Resources > Advanced Google Services
 *      and enable "People API" (v1)
 *   5. Also enable People API in Google Cloud Console:
 *      https://console.cloud.google.com/apis/library/people.googleapis.com
 *   6. Deploy > New Deployment > Web App:
 *      - Execute as: Me
 *      - Who has access: Anyone
 *   7. Copy the Web App URL into the HMS dashboard
 *   8. Set the same API_KEY in the HMS dashboard
 *
 * Security: All requests must include ?key=API_KEY matching CONFIG.API_KEY.
 * Rate limits are enforced internally to avoid People API bans.
 *
 * Endpoints (via POST body.action):
 *   syncPatient     - Sync one patient
 *   bulkSync        - Sync multiple patients
 *   testConnection  - Verify the API is reachable
 *   getStatus       - Get sync status summary
 */

function doGet(e) {
  return respond(405, { success: false, message: 'Use POST' });
}

function doPost(e) {
  try {
    // --- Auth check ---
    var apiKey = e.parameter.key;
    if (!apiKey || apiKey !== CONFIG.API_KEY) {
      return respond(401, { success: false, message: 'Invalid or missing API key' });
    }

    // --- Parse body ---
    var body;
    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    } else {
      return respond(400, { success: false, message: 'Empty request body' });
    }

    var action = body.action || '';
    var result;

    switch (action) {

      case 'syncPatient':
        result = syncPatient(body.patient || {});
        break;

      case 'bulkSync':
        result = bulkSyncPatients(body.patients || []);
        break;

      case 'testConnection':
        result = { success: true, message: 'Connection OK', timestamp: new Date().toISOString() };
        break;

      case 'getStatus':
        result = { success: true, message: 'Service running' };
        break;

      default:
        return respond(400, { success: false, message: 'Unknown action: ' + action });
    }

    return respond(200, result);

  } catch (e) {
    return respond(500, { success: false, message: 'Server error: ' + e.message });
  }
}

/**
 * Build and return a JSON response.
 */
function respond(statusCode, data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
