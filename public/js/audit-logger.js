export function initAuditLogger(app) {
  console.log('[AuditLogger] Audit logging is now handled server-side. Client logger disabled.');
}

function getUserInfo() {
  try {
    const raw = sessionStorage.getItem('hms_session');
    if (raw) {
      const u = JSON.parse(raw);
      return { userId: u.uid || 'unknown', userEmail: u.email || 'unknown', userRole: u.role || 'unknown' };
    }
  } catch (e) { /* ignore */ }
  return { userId: 'unknown', userEmail: 'unknown', userRole: 'unknown' };
}

export async function logAuditEvent(action, resourceType, resourceId, details = {}) {
  const user = getUserInfo();
  console.log('[AuditLogger]', { action, resourceType, resourceId, details, user });
}

export async function getAuditLogs(actionFilter = null, maxResults = 100) {
  console.log('[AuditLogger] Fetch audit logs from server:', { actionFilter, maxResults });
  try {
    const url = actionFilter
      ? `/api/audit?action=${encodeURIComponent(actionFilter)}&limit=${maxResults}`
      : `/api/audit?limit=${maxResults}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.warn('[AuditLogger] Failed to fetch audit logs:', e.message);
    return [];
  }
}

export function logLogin(userId) {
  console.log('[AuditLogger] LOGIN', userId);
}

export function logLogout(userId) {
  console.log('[AuditLogger] LOGOUT', userId);
}

export function logPatientView(patientId, patientName) {
  console.log('[AuditLogger] PATIENT_VIEW', { patientId, patientName });
}

export function logPatientCreate(patientId, patientName) {
  console.log('[AuditLogger] PATIENT_CREATE', { patientId, patientName });
}

export function logPatientUpdate(patientId, patientName) {
  console.log('[AuditLogger] PATIENT_UPDATE', { patientId, patientName });
}

export function logPatientDelete(patientId, patientName) {
  console.log('[AuditLogger] PATIENT_DELETE', { patientId, patientName });
}

export function logPrescriptionCreate(rxId, patientName) {
  console.log('[AuditLogger] PRESCRIPTION_CREATE', { rxId, patientName });
}

export function logTransactionCreate(txnId, amount) {
  console.log('[AuditLogger] TRANSACTION_CREATE', { txnId, amount });
}

export function logInvoiceCreate(invId, amount) {
  console.log('[AuditLogger] INVOICE_CREATE', { invId, amount });
}

export function logAccessDenied(resource, userId, role) {
  console.log('[AuditLogger] ACCESS_DENIED', { resource, userId, role });
}
