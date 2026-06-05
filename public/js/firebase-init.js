/* Wellness Medicals - Firebase Auth & Firestore SDK
 * All data operations use Firestore (NoSQL).
 * Authentication via Firebase Auth (Email/Password).
 */

// Initialize Firebase if not already initialized (works with or without Hosting auto-init)
if (!firebase.apps.length) {
  firebase.initializeApp({
    apiKey: "AIzaSyAsdbCJ0vXaLAMmGmxpGkXz4Zd_OR4wzAA",
    authDomain: "wellnessplpy.firebaseapp.com",
    projectId: "wellnessplpy",
    storageBucket: "wellnessplpy.firebasestorage.app",
    messagingSenderId: "793276474494",
    appId: "1:793276474494:web:2a0591af677fd511f6242f",
    measurementId: "G-WTGQMNEK28"
  });
}

(function () {
  window._authReady = new Promise(function (resolve) {
    window._authReadyResolve = resolve;
  });
  window._currentFirebaseUser = null;

  var ROLE_REDIRECTS = {
    Admin: 'admin/dashboard.html',
    Doctor: 'doctor/dashboard.html',
    Staff: 'staff/dashboard.html',
    Pharmacist: 'pharmacist/dashboard.html',
    'Lab Tech': 'labtech/dashboard.html'
  };

  var db = firebase.firestore();
  var auth = firebase.auth();

  /* ---------- Firestore helpers ---------- */
  function addId(doc) {
    var d = doc.data();
    d.id = doc.id;
    return d;
  }

  function wrap(data) {
    return { success: true, data: data };
  }

  function wrapList(arr) {
    return { success: true, data: arr, total: arr.length };
  }

  async function fsGet(col, id) {
    var snap = await db.collection(col).doc(id).get();
    if (!snap.exists) throw new Error('Document not found');
    return addId(snap);
  }

  async function fsQuery(col, opts) {
    var ref = db.collection(col);
    if (opts) {
      if (opts.where) ref = ref.where(opts.where.field, opts.where.op || '==', opts.where.val);
      if (opts.orderBy) ref = ref.orderBy(opts.orderBy.field, opts.orderBy.dir || 'asc');
      if (opts.limit) ref = ref.limit(opts.limit);
    }
    var snap = await ref.get();
    return snap.docs.map(addId);
  }

  async function fsAdd(col, data) {
    data.created_at = firebase.firestore.FieldValue.serverTimestamp();
    data.updated_at = firebase.firestore.FieldValue.serverTimestamp();
    var ref = await db.collection(col).add(data);
    data.id = ref.id;
    return data;
  }

  async function fsUpdate(col, id, data) {
    data.updated_at = firebase.firestore.FieldValue.serverTimestamp();
    await db.collection(col).doc(id).set(data, { merge: true });
  }

  async function fsDelete(col, id) {
    await db.collection(col).doc(id).delete();
  }

  function getStoredToken() {
    try {
      var s = JSON.parse(sessionStorage.getItem('hms_session') || 'null');
      return s ? s.token : null;
    } catch (e) { return null; }
  }

  /* ---------- Auth State ---------- */
  var _authResolve;
  var _authPromise = new Promise(function (r) { _authResolve = r; });

  auth.onAuthStateChanged(async function (user) {
    window._currentFirebaseUser = user;
    if (user) {
      try {
        var profile = await fsGet('users', user.uid);
        HMS_AUTH.setSession({
          uid: user.uid,
          email: user.email,
          name: profile.name || user.email,
          title: profile.title || '',
          phone: profile.phone || '',
          role: profile.role || 'Staff',
          token: await user.getIdToken(),
          redirect: HMS_AUTH.getRedirect(profile.role || 'Staff')
        });
      } catch (e) {
        var old = HMS_AUTH.getSession();
        if (old) HMS_AUTH.setSession(old);
      }
    } else {
      sessionStorage.removeItem('hms_session');
    }
    _authResolve(user);
    if (window._authReadyResolve) window._authReadyResolve(true);
  });

  var HMS_AUTH = {
    async login(email, password) {
      var cred = await auth.signInWithEmailAndPassword(email, password);
      var user = cred.user;
      var profile = await fsGet('users', user.uid);
      var role = profile.role || 'Staff';
      this.setSession({
        uid: user.uid,
        email: user.email,
        name: profile.name,
        title: profile.title || '',
        phone: profile.phone || '',
        role: role,
        token: await user.getIdToken(),
        redirect: this.getRedirect(role)
      });
      return { uid: user.uid, email: user.email, name: profile.name, title: profile.title, role: role };
    },

    async loginWithRole(email, password, expectedRole) {
      var userData = await this.login(email, password);
      if (expectedRole && userData.role !== expectedRole) {
        await auth.signOut();
        throw new Error('ACCESS_DENIED:This portal is for ' + expectedRole + 's only. You are registered as ' + userData.role + '.');
      }
      return userData;
    },

    async logout() {
      sessionStorage.removeItem('hms_session');
      window._currentFirebaseUser = null;
      await auth.signOut();
      window.location.href = '../index.html';
    },

    async fetchProfile(uid) {
      try {
        var p = await fsGet('users', uid);
        return { success: true, data: p };
      } catch (e) { return null; }
    },

    getSession() {
      try { return JSON.parse(sessionStorage.getItem('hms_session') || 'null'); }
      catch (e) { return null; }
    },

    setSession(data) {
      sessionStorage.setItem('hms_session', JSON.stringify(data));
    },

    requireAuth() {
      var u = this.getSession();
      if (!u) { window.location.href = '../index.html'; return null; }
      return u;
    },

    requirePortalAuth() {
      var u = this.getSession();
      if (!u) { window.location.href = '../index.html'; return null; }
      var portal = this.getPortalFromPath();
      if (portal) {
        var map = { admin: 'Admin', doctor: 'Doctor', staff: 'Staff', pharmacist: 'Pharmacist', labtech: 'Lab Tech' };
        var expected = map[portal];
        if (expected && u.role !== expected) {
          window.location.href = '../' + (ROLE_REDIRECTS[u.role] || 'index.html');
          return null;
        }
      }
      return u;
    },

    getPortalFromPath() {
      var m = window.location.pathname.match(/\/(admin|doctor|staff|pharmacist|labtech)\//);
      return m ? m[1] : null;
    },

    getRedirect(role) {
      return ROLE_REDIRECTS[role] || 'index.html';
    },

    hasRole(allowedRoles) {
      var u = this.getSession();
      return u && allowedRoles.indexOf(u.role) !== -1;
    },

    requireRole(allowedRoles) {
      var u = this.requireAuth();
      if (u && allowedRoles.indexOf(u.role) === -1) {
        window.location.href = '../' + (ROLE_REDIRECTS[u.role] || 'index.html');
        return null;
      }
      return u;
    },

    async changePassword(currentPassword, newPassword) {
      var user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');
      var cred = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
      await user.reauthenticateWithCredential(cred);
      await user.updatePassword(newPassword);
      return { success: true };
    }
  };

  window.HMS_AUTH = HMS_AUTH;
  window.HMS = {
    getUser: function () { return HMS_AUTH.getSession(); },
    setUser: function (d) { HMS_AUTH.setSession(d); },
    logout: function () { HMS_AUTH.logout(); },
    requireAuth: function () { return HMS_AUTH.requireAuth(); },
    requirePortalAuth: function () { return HMS_AUTH.requirePortalAuth(); }
  };

  window.esc = function esc(val) {
    if (val == null) return '';
    return String(val).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  };

  /* ---------- Firestore API layer ---------- */
  window.API = {
    async login(email, password) {
      var cred = await auth.signInWithEmailAndPassword(email, password);
      var user = cred.user;
      var profile = await fsGet('users', user.uid);
      return { user: { id: user.uid, email: user.email, name: profile.name, title: profile.title, phone: profile.phone, role: profile.role }, token: await user.getIdToken() };
    },

    async getProfile() {
      var u = auth.currentUser;
      if (!u) throw new Error('Not authenticated');
      return wrap(await fsGet('users', u.uid));
    },

    async changePassword(current, newPw) {
      var u = auth.currentUser;
      if (!u) throw new Error('Not authenticated');
      var cred = firebase.auth.EmailAuthProvider.credential(u.email, current);
      await u.reauthenticateWithCredential(cred);
      await u.updatePassword(newPw);
      return { success: true };
    },

    /* ---------- Patients ---------- */
    async getPatients(params) {
      var ref = db.collection('patients');
      if (params) {
        if (params.status) ref = ref.where('status', '==', params.status);
        if (params.search) {
          var term = params.search.toLowerCase();
          var snap = await ref.get();
          var all = snap.docs.map(addId);
          all = all.filter(function (p) { return (p.fname && p.fname.toLowerCase().indexOf(term) !== -1) || (p.lname && p.lname.toLowerCase().indexOf(term) !== -1) || (p.contact && p.contact.indexOf(term) !== -1); });
          return wrapList(all);
        }
        if (params.limit) ref = ref.limit(parseInt(params.limit));
      }
      var snap = await ref.get();
      return wrapList(snap.docs.map(addId));
    },

    async getPatient(id) { return wrap(await fsGet('patients', id)); },

    async createPatient(data) {
      var u = auth.currentUser;
      data.created_by = u ? u.uid : null;
      return wrap(await fsAdd('patients', data));
    },

    async updatePatient(id, data) {
      delete data.created_at; delete data.id;
      await fsUpdate('patients', id, data);
      return { success: true };
    },

    async deletePatient(id) {
      await fsDelete('patients', id);
      return { success: true };
    },

    /* ---------- Appointments ---------- */
    async getAppointments(params) {
      var ref = db.collection('appointments');
      if (params) {
        if (params.status) ref = ref.where('status', '==', params.status);
        if (params.patient_id) ref = ref.where('patient_id', '==', params.patient_id);
        if (params.doctor_id) ref = ref.where('doctor_id', '==', params.doctor_id);
        if (params.limit) ref = ref.limit(parseInt(params.limit));
      }
      var snap = await ref.get();
      return wrapList(snap.docs.map(addId));
    },

    async getAppointment(id) { return wrap(await fsGet('appointments', id)); },

    async createAppointment(data) {
      var u = auth.currentUser;
      data.created_by = u ? u.uid : null;
      return wrap(await fsAdd('appointments', data));
    },

    async updateAppointment(id, data) {
      delete data.created_at; delete data.id;
      await fsUpdate('appointments', id, data);
      return { success: true };
    },

    async deleteAppointment(id) {
      await fsDelete('appointments', id);
      return { success: true };
    },

    /* ---------- Doctors ---------- */
    async getDoctors() {
      var snap = await db.collection('users').where('role', '==', 'Doctor').get();
      return wrapList(snap.docs.map(addId));
    },

    async getDoctor(id) { return wrap(await fsGet('users', id)); },

    async getDoctorPatients(id) {
      var snap = await db.collection('patients').where('doctor_id', '==', id).get();
      return wrapList(snap.docs.map(addId));
    },

    async getDoctorAppointments(id, params) {
      var ref = db.collection('appointments').where('doctor_id', '==', id);
      if (params && params.limit) ref = ref.limit(parseInt(params.limit));
      var snap = await ref.get();
      return wrapList(snap.docs.map(addId));
    },

    async createPrescription(data) {
      return wrap(await fsAdd('prescriptions', data));
    },

    async getDoctorPrescriptions(id) {
      var snap = await db.collection('prescriptions').where('doctor_id', '==', id).get();
      return wrapList(snap.docs.map(addId));
    },

    async getDoctorStats(id) {
      var patients = await db.collection('patients').where('doctor_id', '==', id).get();
      var appts = await db.collection('appointments').where('doctor_id', '==', id).get();
      return wrap({ total_patients: patients.size, total_appointments: appts.size });
    },

    /* ---------- Pharmacy / Inventory ---------- */
    async getInventory(params) {
      var ref = db.collection('inventory');
      if (params) {
        if (params.category) ref = ref.where('category', '==', params.category);
        if (params.search) {
          var term = params.search.toLowerCase();
          var snapAll = await ref.get();
          var all = snapAll.docs.map(addId);
          all = all.filter(function (i) { return (i.brand_name && i.brand_name.toLowerCase().indexOf(term) !== -1) || (i.content && i.content.toLowerCase().indexOf(term) !== -1); });
          return wrapList(all);
        }
        if (params.limit) ref = ref.limit(parseInt(params.limit));
      }
      var snap = await ref.get();
      return wrapList(snap.docs.map(addId));
    },

    async getInventoryItem(id) { return wrap(await fsGet('inventory', id)); },

    async addInventoryItem(data) {
      var u = auth.currentUser;
      data.created_by = u ? u.uid : null;
      return wrap(await fsAdd('inventory', data));
    },

    async updateInventoryItem(id, data) {
      delete data.created_at; delete data.id;
      await fsUpdate('inventory', id, data);
      return { success: true };
    },

    async deleteInventoryItem(id) {
      await fsDelete('inventory', id);
      return { success: true };
    },

    async getPharmacyPrescriptions(params) {
      var ref = db.collection('prescriptions');
      if (params) {
        if (params.status) ref = ref.where('status', '==', params.status);
        if (params.limit) ref = ref.limit(parseInt(params.limit));
      }
      var snap = await ref.get();
      return wrapList(snap.docs.map(addId));
    },

    async fillPrescription(id) {
      await fsUpdate('prescriptions', id, { status: 'filled' });
      return { success: true };
    },

    async getRequisitions() {
      var snap = await db.collection('purchase_requisitions').get();
      return wrapList(snap.docs.map(addId));
    },

    async createRequisition(data) {
      var u = auth.currentUser;
      data.created_by = u ? u.uid : null;
      return wrap(await fsAdd('purchase_requisitions', data));
    },

    async approveRequisition(id) {
      await fsUpdate('purchase_requisitions', id, { status: 'approved', approved_at: new Date().toISOString() });
      return { success: true };
    },

    async receiveRequisition(id) {
      await fsUpdate('purchase_requisitions', id, { status: 'received', received_at: new Date().toISOString() });
      return { success: true };
    },

    /* ---------- Lab ---------- */
    async getLabTests() {
      var snap = await db.collection('lab_tests').get();
      return wrapList(snap.docs.map(addId));
    },

    async getLabOrders(params) {
      var ref = db.collection('lab_orders');
      if (params) {
        if (params.status) ref = ref.where('status', '==', params.status);
        if (params.patient_id) ref = ref.where('patient_id', '==', params.patient_id);
        if (params.limit) ref = ref.limit(parseInt(params.limit));
      }
      var snap = await ref.get();
      return wrapList(snap.docs.map(addId));
    },

    async createLabOrder(data) {
      var u = auth.currentUser;
      data.ordered_by = u ? u.uid : null;
      return wrap(await fsAdd('lab_orders', data));
    },

    async updateLabOrderStatus(id, status) {
      var update = { status: status };
      if (status === 'processing') update.processed_at = new Date().toISOString();
      if (status === 'completed') update.completed_at = new Date().toISOString();
      await fsUpdate('lab_orders', id, update);
      return { success: true };
    },

    async saveLabResults(id, results) {
      var batch = db.batch();
      var orderRef = db.collection('lab_orders').doc(id);
      batch.update(orderRef, { status: 'completed', completed_at: new Date().toISOString(), updated_at: firebase.firestore.FieldValue.serverTimestamp() });
      if (Array.isArray(results)) {
        results.forEach(function (r) {
          var ref = db.collection('lab_orders').doc(id).collection('results').doc();
          batch.set(ref, { parameter: r.parameter, value: r.value, normal_range: r.normal_range, unit: r.unit, remarks: r.remarks || '', created_at: firebase.firestore.FieldValue.serverTimestamp() });
        });
      }
      await batch.commit();
      return { success: true };
    },

    async getLabResults(id) {
      var snap = await db.collection('lab_orders').doc(id).collection('results').get();
      return wrapList(snap.docs.map(addId));
    },

    /* ---------- Billing ---------- */
    async getTransactions(params) {
      var ref = db.collection('transactions');
      if (params) {
        if (params.payment_status) ref = ref.where('payment_status', '==', params.payment_status);
        if (params.patient_id) ref = ref.where('patient_id', '==', params.patient_id);
        if (params.limit) ref = ref.limit(parseInt(params.limit));
      }
      var snap = await ref.get();
      return wrapList(snap.docs.map(addId));
    },

    async getTransaction(id) { return wrap(await fsGet('transactions', id)); },

    async createTransaction(data) {
      var u = auth.currentUser;
      data.created_by = u ? u.uid : null;
      return wrap(await fsAdd('transactions', data));
    },

    async updateTransactionStatus(id, data) {
      await fsUpdate('transactions', id, data);
      return { success: true };
    },

    async getBillingStats(params) {
      var snap = await db.collection('transactions').get();
      var all = snap.docs.map(addId);
      var total = 0, pending = 0, paid = 0;
      all.forEach(function (t) {
        total += parseFloat(t.total) || 0;
        if (t.payment_status === 'paid') paid += parseFloat(t.total) || 0;
        else pending += parseFloat(t.total) || 0;
      });
      return wrap({ total_revenue: total, paid: paid, pending: pending, count: all.length });
    },

    /* ---------- Staff ---------- */
    async getStaff() {
      var snap = await db.collection('users').get();
      return wrapList(snap.docs.map(addId));
    },

    async getStaffMember(id) { return wrap(await fsGet('users', id)); },

    async createStaff(data) {
      return wrap(await fsAdd('users', data));
    },

    async updateStaff(id, data) {
      delete data.created_at; delete data.id;
      await fsUpdate('users', id, data);
      return { success: true };
    },

    async deleteStaff(id) {
      await fsDelete('users', id);
      return { success: true };
    },

    async getRoles() {
      var snap = await db.collection('roles').get();
      return wrapList(snap.docs.map(addId));
    },

    async getSchedules(params) {
      var ref = db.collection('staff_schedules');
      if (params && params.user_id) ref = ref.where('user_id', '==', params.user_id);
      var snap = await ref.get();
      return wrapList(snap.docs.map(addId));
    },

    async saveSchedule(data) {
      return wrap(await fsAdd('staff_schedules', data));
    },

    async getAttendance(params) {
      var ref = db.collection('attendance');
      if (params && params.user_id) ref = ref.where('user_id', '==', params.user_id);
      if (params && params.date) ref = ref.where('date', '==', params.date);
      var snap = await ref.get();
      return wrapList(snap.docs.map(addId));
    },

    async markAttendance(data) {
      return wrap(await fsAdd('attendance', data));
    },

    async getHeadOfStaff() {
      var snap = await db.collection('head_of_staff').where('is_current', '==', true).get();
      return wrapList(snap.docs.map(addId));
    },

    async assignHeadOfStaff(userId) {
      var batch = db.batch();
      var old = await db.collection('head_of_staff').where('is_current', '==', true).get();
      old.docs.forEach(function (d) { batch.update(d.ref, { is_current: false }); });
      var ref = db.collection('head_of_staff').doc();
      batch.set(ref, { user_id: userId, assigned_date: new Date().toISOString().split('T')[0], is_current: true, created_at: firebase.firestore.FieldValue.serverTimestamp() });
      await batch.commit();
      return { success: true };
    },

    /* ---------- Dashboard ---------- */
    async getDashboardStats(params) {
      var patientsSnap = await db.collection('patients').get();
      var apptsSnap = await db.collection('appointments').get();
      var usersSnap = await db.collection('users').get();
      var invSnap = await db.collection('inventory').get();
      var labSnap = await db.collection('lab_orders').get();
      return wrap({
        total_patients: patientsSnap.size,
        total_appointments: apptsSnap.size,
        total_staff: usersSnap.size,
        total_inventory: invSnap.size,
        total_lab_orders: labSnap.size
      });
    },

    async getRoleStats() {
      var snap = await db.collection('users').get();
      var stats = {};
      snap.docs.map(addId).forEach(function (u) {
        stats[u.role] = (stats[u.role] || 0) + 1;
      });
      return wrap(stats);
    },

    async getRecentActivity() {
      var snap = await db.collection('audit_logs').orderBy('created_at', 'desc').limit(20).get();
      return wrapList(snap.docs.map(addId));
    },

    /* ---------- Audit ---------- */
    async getAuditLogs(params) {
      var ref = db.collection('audit_logs');
      if (params && params.action) ref = ref.where('action', '==', params.action);
      ref = ref.orderBy('created_at', 'desc');
      if (params && params.limit) ref = ref.limit(parseInt(params.limit));
      var snap = await ref.get();
      return wrapList(snap.docs.map(addId));
    },

    getToken: function () { return getStoredToken(); }
  };

  window.firebaseDb = db;
  window.firebaseFS = {
    collection: function(db, path) { return db.collection(path); },
    doc: function(db, col, id) { return db.collection(col).doc(id); },
    where: function(field, op, val) { return { type: 'where', field: field, op: op, val: val }; },
    orderBy: function(field, dir) { return { type: 'orderBy', field: field, dir: dir || 'asc' }; },
    limit: function(val) { return { type: 'limit', val: val }; },
    query: function(colRef) {
      var q = colRef;
      for (var i = 1; i < arguments.length; i++) {
        var c = arguments[i];
        if (!c) continue;
        if (c.type === 'where') q = q.where(c.field, c.op, c.val);
        if (c.type === 'orderBy') q = q.orderBy(c.field, c.dir);
        if (c.type === 'limit') q = q.limit(c.val);
      }
      return q;
    },
    getDocs: function(query) { return query.get(); },
    getDoc: function(docRef) { return docRef.get(); },
    addDoc: function(colRef, data) { return colRef.add(data); },
    setDoc: function(docRef, data, options) { return docRef.set(data, options || {}); },
    updateDoc: function(docRef, data) { return docRef.update(data); },
    deleteDoc: function(docRef) { return docRef.delete(); }
  };
})();
