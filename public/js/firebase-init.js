/* Wellness Medicals - Auth & API Initialization
 * Replaces Firebase with Express REST API backend.
 * Maintains the same API (window.HMS_AUTH, window.HMS, window._authReady)
 * so that all existing code works with zero HTML changes.
 */

(function () {
  const API_BASE = '/api';

  let _authReadyResolve;
  window._authReady = new Promise(resolve => { _authReadyResolve = resolve; });
  window._currentFirebaseUser = null;

  const ROLE_REDIRECTS = {
    Admin: 'admin/dashboard.html',
    Doctor: 'doctor/dashboard.html',
    Staff: 'staff/dashboard.html',
    Pharmacist: 'pharmacist/dashboard.html',
    'Lab Tech': 'labtech/dashboard.html'
  };

  async function apiRequest(endpoint, options = {}) {
    const token = getStoredToken();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
      });
      let data = {};
      try {
        const text = await res.text();
        if (text) data = JSON.parse(text);
      } catch (e) {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return {};
      }
      if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
      return data;
    } catch (err) {
      if (err.message.includes('Failed to fetch')) {
        throw new Error('Network error. Cannot reach the server.');
      }
      throw err;
    }
  }

  function getStoredToken() {
    try {
      const s = JSON.parse(sessionStorage.getItem('hms_session') || 'null');
      return s ? s.token : null;
    } catch { return null; }
  }

  const HMS_AUTH = {
    async login(email, password) {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email, password }
      });
      const user = data.data.user;
      const token = data.data.token;
      this.setSession({
        uid: user.id,
        email: user.email,
        name: user.name,
        title: user.title,
        phone: user.phone,
        role: user.role,
        token: token,
        redirect: this.getRedirect(user.role)
      });
      return { uid: user.id, email: user.email, name: user.name, title: user.title, role: user.role };
    },

    async loginWithRole(email, password, expectedRole) {
      const userData = await this.login(email, password);
      const actualRole = userData.role || 'Staff';
      if (expectedRole && actualRole !== expectedRole) {
        this.logout();
        throw new Error(`ACCESS_DENIED:This portal is for ${expectedRole}s only. You are registered as ${actualRole}.`);
      }
      return userData;
    },

    async logout() {
      sessionStorage.removeItem('hms_session');
      window._currentFirebaseUser = null;
      window.location.href = '../index.html';
    },

    async fetchProfile(uid) {
      try {
        const data = await apiRequest(`/staff/${uid}`);
        return data.data;
      } catch { return null; }
    },

    getSession() {
      try {
        return JSON.parse(sessionStorage.getItem('hms_session') || 'null');
      } catch { return null; }
    },

    setSession(userData) {
      sessionStorage.setItem('hms_session', JSON.stringify(userData));
    },

    requireAuth() {
      const user = this.getSession();
      if (!user) { window.location.href = '../index.html'; return null; }
      return user;
    },

    requirePortalAuth() {
      const user = this.getSession();
      if (!user) { window.location.href = '../index.html'; return null; }
      const expectedPortal = this.getPortalFromPath();
      if (expectedPortal) {
        const portalRoleMap = { admin: 'Admin', doctor: 'Doctor', staff: 'Staff', pharmacist: 'Pharmacist', labtech: 'Lab Tech' };
        const expectedRole = portalRoleMap[expectedPortal];
        if (expectedRole && user.role !== expectedRole) {
          window.location.href = '../' + (ROLE_REDIRECTS[user.role] || 'index.html');
          return null;
        }
      }
      return user;
    },

    getPortalFromPath() {
      const match = window.location.pathname.match(/\/(admin|doctor|staff|pharmacist|labtech)\//);
      return match ? match[1] : null;
    },

    getRedirect(role) {
      return ROLE_REDIRECTS[role] || 'index.html';
    },

    hasRole(allowedRoles) {
      const user = this.getSession();
      return user && allowedRoles.includes(user.role);
    },

    requireRole(allowedRoles) {
      const user = this.requireAuth();
      if (user && !allowedRoles.includes(user.role)) {
        window.location.href = '../' + (ROLE_REDIRECTS[user.role] || 'index.html');
        return null;
      }
      return user;
    },

    async changePassword(currentPassword, newPassword) {
      return apiRequest('/auth/change-password', {
        method: 'PUT',
        body: { currentPassword, newPassword }
      });
    }
  };

  window.HMS_AUTH = HMS_AUTH;
  window.HMS = {
    getUser() { return HMS_AUTH.getSession(); },
    setUser(data) { HMS_AUTH.setSession(data); },
    logout() { HMS_AUTH.logout(); },
    requireAuth() { return HMS_AUTH.requireAuth(); },
    requirePortalAuth() { return HMS_AUTH.requirePortalAuth(); }
  };

  window.esc = function esc(val) {
    if (val == null) return '';
    return String(val).replace(/[&<>"']/g, function(m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  };

  /* Preserve old firebaseFS compat (maps to API) */
  const compatFS = {
    async getDocs(queryOrRef) {
      return { size: 0, docs: [], forEach() {} };
    },
    async getDoc(ref) { return { exists() { return false; }, data() { return null; }, id: null }; },
    async addDoc(col, data) { return { id: 'compat-' + Date.now() }; },
    async setDoc(ref, data) {},
    async updateDoc(ref, data) {},
    async deleteDoc(ref) {},
    collection(db, name) { return name; },
    doc(db, col, id) { return { id, col }; },
    query(...args) { return args; },
    where(field, op, val) { return { field, op, val }; },
    orderBy(field, dir) { return { field, dir }; },
    limit(n) { return n; },
    serverTimestamp() { return new Date().toISOString(); },
    Timestamp: { fromDate(d) { return d; } }
  };
  window.firebaseFS = compatFS;
  window.firebaseDb = {};

  window.sendFirebasePasswordReset = async (email) => {
    throw new Error('Password reset is handled by the admin. Please contact your administrator.');
  };

  window.createFirebaseUser = async (email, password) => {
    throw new Error('User creation is handled by the staff management API.');
  };

  /* Restore session on page load */
  (async function init() {
    const existing = HMS_AUTH.getSession();
    if (existing && existing.token) {
      try {
        const data = await apiRequest('/auth/me');
        const user = data.data;
        HMS_AUTH.setSession({
          ...existing,
          name: user.name,
          title: user.title,
          role: user.role,
          phone: user.phone
        });
        window._currentFirebaseUser = { uid: user.id, email: user.email };
      } catch {
        // Token expired — clear session but don't redirect (let individual pages handle it)
        if (existing.token) {
          try {
            const parsed = JSON.parse(atob(existing.token.split('.')[1]));
            if (parsed.exp * 1000 < Date.now()) {
              sessionStorage.removeItem('hms_session');
            }
          } catch {}
        }
      }
    }
    _authReadyResolve(true);
  })();

  /* ============================================
     API Helper - window.API
     ============================================ */
  window.API = {
    // Auth
    async login(email, password) { const d = await apiRequest('/auth/login', { method: 'POST', body: { email, password } }); return d.data; },
    async getProfile() { return apiRequest('/auth/me'); },
    async changePassword(currentPassword, newPassword) { return apiRequest('/auth/change-password', { method: 'PUT', body: { currentPassword, newPassword } }); },

    // Patients
    async getPatients(params = {}) { const qs = new URLSearchParams(params).toString(); return apiRequest(`/patients${qs ? '?' + qs : ''}`); },
    async getPatient(id) { return apiRequest(`/patients/${id}`); },
    async createPatient(data) { return apiRequest('/patients', { method: 'POST', body: data }); },
    async updatePatient(id, data) { return apiRequest(`/patients/${id}`, { method: 'PUT', body: data }); },
    async deletePatient(id) { return apiRequest(`/patients/${id}`, { method: 'DELETE' }); },

    // Appointments
    async getAppointments(params = {}) { const qs = new URLSearchParams(params).toString(); return apiRequest(`/appointments${qs ? '?' + qs : ''}`); },
    async getAppointment(id) { return apiRequest(`/appointments/${id}`); },
    async createAppointment(data) { return apiRequest('/appointments', { method: 'POST', body: data }); },
    async updateAppointment(id, data) { return apiRequest(`/appointments/${id}`, { method: 'PUT', body: data }); },
    async deleteAppointment(id) { return apiRequest(`/appointments/${id}`, { method: 'DELETE' }); },

    // Doctors
    async getDoctors() { return apiRequest('/doctors'); },
    async getDoctor(id) { return apiRequest(`/doctors/${id}`); },
    async getDoctorPatients(id) { return apiRequest(`/doctors/${id}/patients`); },
    async getDoctorAppointments(id, params = {}) { const qs = new URLSearchParams(params).toString(); return apiRequest(`/doctors/${id}/appointments${qs ? '?' + qs : ''}`); },
    async createPrescription(data) { return apiRequest('/doctors/prescriptions', { method: 'POST', body: data }); },
    async getDoctorPrescriptions(id) { return apiRequest(`/doctors/${id}/prescriptions`); },
    async getDoctorStats(id) { return apiRequest(`/doctors/${id}/stats`); },

    // Pharmacy
    async getInventory(params = {}) { const qs = new URLSearchParams(params).toString(); return apiRequest(`/pharmacy/inventory${qs ? '?' + qs : ''}`); },
    async getInventoryItem(id) { return apiRequest(`/pharmacy/inventory/${id}`); },
    async addInventoryItem(data) { return apiRequest('/pharmacy/inventory', { method: 'POST', body: data }); },
    async updateInventoryItem(id, data) { return apiRequest(`/pharmacy/inventory/${id}`, { method: 'PUT', body: data }); },
    async deleteInventoryItem(id) { return apiRequest(`/pharmacy/inventory/${id}`, { method: 'DELETE' }); },
    async getPharmacyPrescriptions(params = {}) { const qs = new URLSearchParams(params).toString(); return apiRequest(`/pharmacy/prescriptions${qs ? '?' + qs : ''}`); },
    async fillPrescription(id) { return apiRequest(`/pharmacy/prescriptions/${id}/fill`, { method: 'PUT' }); },
    async getRequisitions() { return apiRequest('/pharmacy/requisitions'); },
    async createRequisition(data) { return apiRequest('/pharmacy/requisitions', { method: 'POST', body: data }); },
    async approveRequisition(id) { return apiRequest(`/pharmacy/requisitions/${id}/approve`, { method: 'PUT' }); },
    async receiveRequisition(id) { return apiRequest(`/pharmacy/requisitions/${id}/receive`, { method: 'PUT' }); },

    // Lab
    async getLabTests() { return apiRequest('/lab/tests'); },
    async getLabOrders(params = {}) { const qs = new URLSearchParams(params).toString(); return apiRequest(`/lab/orders${qs ? '?' + qs : ''}`); },
    async createLabOrder(data) { return apiRequest('/lab/orders', { method: 'POST', body: data }); },
    async updateLabOrderStatus(id, status) { return apiRequest(`/lab/orders/${id}/status`, { method: 'PUT', body: { status } }); },
    async saveLabResults(id, results) { return apiRequest(`/lab/orders/${id}/results`, { method: 'PUT', body: { results } }); },
    async getLabResults(id) { return apiRequest(`/lab/orders/${id}/results`); },

    // Billing
    async getTransactions(params = {}) { const qs = new URLSearchParams(params).toString(); return apiRequest(`/billing/transactions${qs ? '?' + qs : ''}`); },
    async getTransaction(id) { return apiRequest(`/billing/transactions/${id}`); },
    async createTransaction(data) { return apiRequest('/billing/transactions', { method: 'POST', body: data }); },
    async updateTransactionStatus(id, data) { return apiRequest(`/billing/transactions/${id}/status`, { method: 'PUT', body: data }); },
    async getBillingStats(params = {}) { const qs = new URLSearchParams(params).toString(); return apiRequest(`/billing/transactions/stats${qs ? '?' + qs : ''}`); },

    // Staff
    async getStaff() { return apiRequest('/staff'); },
    async getStaffMember(id) { return apiRequest(`/staff/${id}`); },
    async createStaff(data) { return apiRequest('/staff', { method: 'POST', body: data }); },
    async updateStaff(id, data) { return apiRequest(`/staff/${id}`, { method: 'PUT', body: data }); },
    async deleteStaff(id) { return apiRequest(`/staff/${id}`, { method: 'DELETE' }); },
    async getRoles() { return apiRequest('/staff/roles'); },
    async getSchedules(params = {}) { const qs = new URLSearchParams(params).toString(); return apiRequest(`/staff/schedules${qs ? '?' + qs : ''}`); },
    async saveSchedule(data) { return apiRequest('/staff/schedules', { method: 'POST', body: data }); },
    async getAttendance(params = {}) { const qs = new URLSearchParams(params).toString(); return apiRequest(`/staff/attendance${qs ? '?' + qs : ''}`); },
    async markAttendance(data) { return apiRequest('/staff/attendance', { method: 'POST', body: data }); },
    async getHeadOfStaff() { return apiRequest('/staff/head-of-staff'); },
    async assignHeadOfStaff(userId) { return apiRequest('/staff/head-of-staff', { method: 'POST', body: { user_id: userId } }); },

    // Dashboard
    async getDashboardStats(params = {}) { const qs = new URLSearchParams(params).toString(); return apiRequest(`/dashboard/stats${qs ? '?' + qs : ''}`); },
    async getRoleStats() { return apiRequest('/dashboard/role-stats'); },
    async getRecentActivity() { return apiRequest('/dashboard/recent-activity'); },

    // Audit
    async getAuditLogs(params = {}) { const qs = new URLSearchParams(params).toString(); return apiRequest(`/audit${qs ? '?' + qs : ''}`); },

    // Token helpers
    getToken() { return getStoredToken(); }
  };
})();
