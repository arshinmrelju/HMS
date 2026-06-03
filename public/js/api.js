/* Wellness Medicals - Frontend API Helper
 * Replaces all Firebase/Firestore calls with Express REST API calls.
 * Usage: import './api.js' in HTML, then use window.API.* methods.
 */

(function () {
  const BASE_URL = '/api';
  let authToken = null;

  function getToken() {
    if (authToken) return authToken;
    try {
      const session = JSON.parse(sessionStorage.getItem('hms_session') || 'null');
      return session ? session.token : null;
    } catch { return null; }
  }

  function setToken(token) {
    authToken = token;
    try {
      const session = JSON.parse(sessionStorage.getItem('hms_session') || '{}');
      session.token = token;
      sessionStorage.setItem('hms_session', JSON.stringify(session));
    } catch {}
  }

  function clearToken() {
    authToken = null;
    sessionStorage.removeItem('hms_session');
  }

  async function request(endpoint, options = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      ...options.fetchOptions
    });

    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401) {
        clearToken();
        if (options.redirectOnAuth !== false) {
          window.location.href = '/';
        }
      }
      throw new Error(data.message || `Request failed (${response.status})`);
    }
    return data;
  }

  /* ============================================
     AUTH API
     ============================================ */
  async function login(email, password) {
    const data = await request('/auth/login', { method: 'POST', body: { email, password } });
    setToken(data.data.token);
    return data.data;
  }

  async function getProfile() {
    return request('/auth/me');
  }

  async function changePassword(currentPassword, newPassword) {
    return request('/auth/change-password', { method: 'PUT', body: { currentPassword, newPassword } });
  }

  function logout() {
    clearToken();
    window.location.href = '/';
  }

  /* ============================================
     PATIENTS API
     ============================================ */
  async function getPatients(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/patients${qs ? '?' + qs : ''}`);
  }

  async function getPatient(id) {
    return request(`/patients/${id}`);
  }

  async function createPatient(data) {
    return request('/patients', { method: 'POST', body: data });
  }

  async function updatePatient(id, data) {
    return request(`/patients/${id}`, { method: 'PUT', body: data });
  }

  async function deletePatient(id) {
    return request(`/patients/${id}`, { method: 'DELETE' });
  }

  /* ============================================
     APPOINTMENTS API
     ============================================ */
  async function getAppointments(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/appointments${qs ? '?' + qs : ''}`);
  }

  async function getAppointment(id) {
    return request(`/appointments/${id}`);
  }

  async function createAppointment(data) {
    return request('/appointments', { method: 'POST', body: data });
  }

  async function updateAppointment(id, data) {
    return request(`/appointments/${id}`, { method: 'PUT', body: data });
  }

  async function deleteAppointment(id) {
    return request(`/appointments/${id}`, { method: 'DELETE' });
  }

  /* ============================================
     DOCTORS API
     ============================================ */
  async function getDoctors() {
    return request('/doctors');
  }

  async function getDoctor(id) {
    return request(`/doctors/${id}`);
  }

  async function getDoctorPatients(id) {
    return request(`/doctors/${id}/patients`);
  }

  async function getDoctorAppointments(id, params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/doctors/${id}/appointments${qs ? '?' + qs : ''}`);
  }

  async function createPrescription(data) {
    return request('/doctors/prescriptions', { method: 'POST', body: data });
  }

  async function getDoctorPrescriptions(id) {
    return request(`/doctors/${id}/prescriptions`);
  }

  async function getDoctorStats(id) {
    return request(`/doctors/${id}/stats`);
  }

  /* ============================================
     PHARMACY API
     ============================================ */
  async function getInventory(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/pharmacy/inventory${qs ? '?' + qs : ''}`);
  }

  async function getInventoryItem(id) {
    return request(`/pharmacy/inventory/${id}`);
  }

  async function addInventoryItem(data) {
    return request('/pharmacy/inventory', { method: 'POST', body: data });
  }

  async function updateInventoryItem(id, data) {
    return request(`/pharmacy/inventory/${id}`, { method: 'PUT', body: data });
  }

  async function deleteInventoryItem(id) {
    return request(`/pharmacy/inventory/${id}`, { method: 'DELETE' });
  }

  async function getPharmacyPrescriptions(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/pharmacy/prescriptions${qs ? '?' + qs : ''}`);
  }

  async function fillPrescription(id) {
    return request(`/pharmacy/prescriptions/${id}/fill`, { method: 'PUT' });
  }

  async function getRequisitions() {
    return request('/pharmacy/requisitions');
  }

  async function createRequisition(data) {
    return request('/pharmacy/requisitions', { method: 'POST', body: data });
  }

  async function approveRequisition(id) {
    return request(`/pharmacy/requisitions/${id}/approve`, { method: 'PUT' });
  }

  async function receiveRequisition(id) {
    return request(`/pharmacy/requisitions/${id}/receive`, { method: 'PUT' });
  }

  /* ============================================
     LAB API
     ============================================ */
  async function getLabTests() {
    return request('/lab/tests');
  }

  async function getLabOrders(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/lab/orders${qs ? '?' + qs : ''}`);
  }

  async function createLabOrder(data) {
    return request('/lab/orders', { method: 'POST', body: data });
  }

  async function updateLabOrderStatus(id, status) {
    return request(`/lab/orders/${id}/status`, { method: 'PUT', body: { status } });
  }

  async function saveLabResults(id, results) {
    return request(`/lab/orders/${id}/results`, { method: 'PUT', body: { results } });
  }

  async function getLabResults(id) {
    return request(`/lab/orders/${id}/results`);
  }

  /* ============================================
     BILLING API
     ============================================ */
  async function getTransactions(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/billing/transactions${qs ? '?' + qs : ''}`);
  }

  async function getTransaction(id) {
    return request(`/billing/transactions/${id}`);
  }

  async function createTransaction(data) {
    return request('/billing/transactions', { method: 'POST', body: data });
  }

  async function updateTransactionStatus(id, data) {
    return request(`/billing/transactions/${id}/status`, { method: 'PUT', body: data });
  }

  async function getBillingStats(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/billing/transactions/stats${qs ? '?' + qs : ''}`);
  }

  /* ============================================
     STAFF API
     ============================================ */
  async function getStaff() {
    return request('/staff');
  }

  async function getStaffMember(id) {
    return request(`/staff/${id}`);
  }

  async function createStaff(data) {
    return request('/staff', { method: 'POST', body: data });
  }

  async function updateStaff(id, data) {
    return request(`/staff/${id}`, { method: 'PUT', body: data });
  }

  async function deleteStaff(id) {
    return request(`/staff/${id}`, { method: 'DELETE' });
  }

  async function getRoles() {
    return request('/staff/roles');
  }

  async function getSchedules(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/staff/schedules${qs ? '?' + qs : ''}`);
  }

  async function saveSchedule(data) {
    return request('/staff/schedules', { method: 'POST', body: data });
  }

  async function getAttendance(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/staff/attendance${qs ? '?' + qs : ''}`);
  }

  async function markAttendance(data) {
    return request('/staff/attendance', { method: 'POST', body: data });
  }

  async function getHeadOfStaff() {
    return request('/staff/head-of-staff');
  }

  async function assignHeadOfStaff(userId) {
    return request('/staff/head-of-staff', { method: 'POST', body: { user_id: userId } });
  }

  /* ============================================
     DASHBOARD API
     ============================================ */
  async function getDashboardStats(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/dashboard/stats${qs ? '?' + qs : ''}`);
  }

  async function getRoleStats() {
    return request('/dashboard/role-stats');
  }

  async function getRecentActivity() {
    return request('/dashboard/recent-activity');
  }

  /* ============================================
     AUDIT API
     ============================================ */
  async function getAuditLogs(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/audit${qs ? '?' + qs : ''}`);
  }

  /* ============================================
     EXPORT API
     ============================================ */
  window.HMS_AUTH = window.HMS_AUTH || {};
  window.HMS = window.HMS || {};

  /* Expose everything on window.API */
  window.API = {
    // Auth
    login, getProfile, changePassword, logout,
    // Patients
    getPatients, getPatient, createPatient, updatePatient, deletePatient,
    // Appointments
    getAppointments, getAppointment, createAppointment, updateAppointment, deleteAppointment,
    // Doctors
    getDoctors, getDoctor, getDoctorPatients, getDoctorAppointments,
    createPrescription, getDoctorPrescriptions, getDoctorStats,
    // Pharmacy
    getInventory, getInventoryItem, addInventoryItem, updateInventoryItem, deleteInventoryItem,
    getPharmacyPrescriptions, fillPrescription,
    getRequisitions, createRequisition, approveRequisition, receiveRequisition,
    // Lab
    getLabTests, getLabOrders, createLabOrder, updateLabOrderStatus, saveLabResults, getLabResults,
    // Billing
    getTransactions, getTransaction, createTransaction, updateTransactionStatus, getBillingStats,
    // Staff
    getStaff, getStaffMember, createStaff, updateStaff, deleteStaff,
    getRoles, getSchedules, saveSchedule, getAttendance, markAttendance,
    getHeadOfStaff, assignHeadOfStaff,
    // Dashboard
    getDashboardStats, getRoleStats, getRecentActivity,
    // Audit
    getAuditLogs,
    // Token helpers
    setToken, getToken, clearToken
  };
})();
