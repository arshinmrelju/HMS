'use strict';

/**
 * firebase-api.js
 * ─────────────────────────────────────────────────────────────
 * Firestore-backed API layer. Exposes the same window.API
 * interface as the old local-api.js so no other JS changes needed.
 *
 * Pagination strategy (Firestore cursor-based):
 *   • Every getPatients() / getAppointments() call fetches PAGE_SIZE docs.
 *   • Pass { lastDoc } to get the next page.
 *   • Returns { data, lastDoc, hasMore } so the caller can load more.
 *
 * Fallback: if Firestore is unreachable, localStorage seeds are used.
 * ─────────────────────────────────────────────────────────────
 */

(function () {

  /* ── Constants ─────────────────────────────────────────────── */
  const PAGE_SIZE = 10;

  /* ── Default seed data (used only if Firestore is empty) ───── */
  const defaultPatients = [
    { id:'P001', op_no:'1001', fname:'Aarav',  lname:'Gupta',   contact:'9988776655', email:'aarav.g@email.com',   department:'Cardiology',     patient_type:'outpatient', blood_group:'O+', age:45, gender:'Male',   status:'stable',    last_visit: new Date().toISOString() },
    { id:'P002', op_no:'1002', fname:'Neha',   lname:'Reddy',   contact:'8877665544', email:'neha.r@email.com',    department:'Pediatrics',     patient_type:'outpatient', blood_group:'A+', age:28, gender:'Female', status:'stable',    last_visit: new Date().toISOString() },
    { id:'P003', op_no:'1003', fname:'Vikram', lname:'Singh',   contact:'7766554433', email:'vikram.s@email.com',  department:'Orthopedics',    patient_type:'admitted',   blood_group:'B+', age:55, gender:'Male',   status:'recovering',last_visit: new Date().toISOString() },
    { id:'P004', op_no:'1004', fname:'Sita',   lname:'Devi',    contact:'6655443322', email:'sita.d@email.com',    department:'General Surgery',patient_type:'outpatient', blood_group:'AB+',age:62, gender:'Female', status:'stable',    last_visit: new Date().toISOString() },
    { id:'P005', op_no:'1005', fname:'Rahul',  lname:'Joshi',   contact:'5544332211', email:'rahul.j@email.com',   department:'Cardiology',     patient_type:'outpatient', blood_group:'O-', age:38, gender:'Male',   status:'recovering',last_visit: new Date().toISOString() }
  ];

  const defaultDoctors = [
    { id:'D001', initials:'RS', name:'Dr. Rajesh Sharma', dept:'Cardiology',  slots:[{time:'09:00 AM',type:'free'},{time:'09:30 AM',type:'booked'},{time:'10:00 AM',type:'free'},{time:'10:30 AM',type:'free'},{time:'11:00 AM',type:'break'}] },
    { id:'D002', initials:'AP', name:'Dr. Anita Patel',   dept:'Pediatrics',  slots:[{time:'09:00 AM',type:'booked'},{time:'09:30 AM',type:'booked'},{time:'10:00 AM',type:'free'},{time:'10:30 AM',type:'free'}] },
    { id:'D003', initials:'SV', name:'Dr. Sunil Verma',   dept:'Orthopedics', slots:[{time:'09:00 AM',type:'free'},{time:'10:00 AM',type:'free'},{time:'10:30 AM',type:'booked'}] }
  ];

  const defaultWards = {
    general:  Array.from({length:24},(_,i)=>({num:i+1,status:i%5===0?'occupied':i%8===0?'reserved':'available'})),
    icu:      Array.from({length:8}, (_,i)=>({num:i+1,status:i%3===0?'occupied':'available'})),
    maternity:Array.from({length:12},(_,i)=>({num:i+1,status:i%4===0?'occupied':'available'})),
    surgery:  Array.from({length:10},(_,i)=>({num:i+1,status:i%3===0?'occupied':'available'}))
  };

  /* ── In-memory caches ──────────────────────────────────────── */
  let _doctorsCache  = null;
  let _wardsCache    = null;

  /* ── localStorage fallback helpers ────────────────────────── */
  function lsGet(key, def) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; }
    catch (_) { return def; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (_) {}
  }

  /* ── Firestore availability check ─────────────────────────── */
  function fsAvail() {
    return !!(window.db && window.firebase && window._firebaseAuthReady !== false);
  }

  /* ── Wait for Firebase ready event ────────────────────────── */
  function waitForFirebase() {
    return new Promise(resolve => {
      if (window._firebaseAuthReady !== undefined) return resolve();
      document.addEventListener('hms:firebase-ready', resolve, { once: true });
      // Safety timeout — 5 s
      setTimeout(resolve, 5000);
    });
  }

  /* ── Normalize a Firestore doc to our patient shape ────────── */
  function docToPatient(doc) {
    const d = doc.data();
    return {
      ...d,
      id:     doc.id,
      op_no:  d.op_no || doc.id,
      _ref:   doc          // keep the raw snapshot for cursor pagination
    };
  }

  /* ══════════════════════════════════════════════════════════
     window.API  (same interface as old local-api.js)
     ══════════════════════════════════════════════════════════ */
  window.API = {

    /* ── getPatients ──────────────────────────────────────────
       params: { search, lastDoc, limit }
       returns: { success, data, lastDoc, hasMore }
    ─────────────────────────────────────────────────────────── */
    async getPatients(params = {}) {
      await waitForFirebase();
      const pageSize = params.limit || PAGE_SIZE;

      if (!fsAvail()) {
        // Offline fallback: localStorage
        let list = lsGet('hms_patients', defaultPatients);
        if (params.search) {
          const q = params.search.toLowerCase();
          list = list.filter(p =>
            `${p.fname} ${p.lname}`.toLowerCase().includes(q) ||
            String(p.contact).includes(q)
          );
        }
        return { success: true, data: list, lastDoc: null, hasMore: false };
      }

      try {
        let query = window.db.collection('patients')
          .orderBy('fname')
          .limit(pageSize);

        if (params.lastDoc) {
          query = query.startAfter(params.lastDoc);
        }

        const snap = await query.get();

        if (snap.empty && !params.lastDoc) {
          // Firestore is empty — return default seeds
          console.info('HMS: patients collection empty, returning default seed data.');
          return { success: true, data: defaultPatients, lastDoc: null, hasMore: false };
        }

        const data    = snap.docs.map(docToPatient);
        const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
        const hasMore = snap.docs.length === pageSize;

        return { success: true, data, lastDoc, hasMore };
      } catch (err) {
        console.error('HMS API getPatients:', err);
        const fallback = lsGet('hms_patients', defaultPatients);
        return { success: true, data: fallback, lastDoc: null, hasMore: false };
      }
    },

    /* ── getPatient (single doc) ────────────────────────────── */
    async getPatient(id) {
      await waitForFirebase();
      if (!fsAvail()) {
        const list  = lsGet('hms_patients', defaultPatients);
        const match = list.find(p => String(p.id) === String(id));
        if (!match) throw new Error('Patient not found');
        return { success: true, data: match };
      }
      try {
        const snap = await window.db.collection('patients').doc(String(id)).get();
        if (!snap.exists) throw new Error('Patient not found');
        return { success: true, data: docToPatient(snap) };
      } catch (err) {
        throw err;
      }
    },

    /* ── createPatient ─────────────────────────────────────── */
    async createPatient(data) {
      await waitForFirebase();
      const cleaned = { ...data, last_visit: new Date().toISOString(), status: data.status || 'stable' };

      if (!fsAvail()) {
        const list  = lsGet('hms_patients', defaultPatients);
        const newId = 'P' + String(Date.now()).slice(-6);
        const newP  = { id: newId, op_no: newId, ...cleaned };
        list.unshift(newP);
        lsSet('hms_patients', list);
        return { success: true, data: newP };
      }
      try {
        const ref  = window.db.collection('patients').doc();
        const newP = { id: ref.id, op_no: ref.id, ...cleaned };
        await ref.set(newP);
        return { success: true, data: newP };
      } catch (err) {
        console.error('HMS API createPatient:', err);
        throw err;
      }
    },

    /* ── updatePatient ─────────────────────────────────────── */
    async updatePatient(id, data) {
      await waitForFirebase();
      if (!fsAvail()) {
        const list = lsGet('hms_patients', defaultPatients);
        const idx  = list.findIndex(p => String(p.id) === String(id));
        if (idx === -1) throw new Error('Patient not found');
        list[idx] = { ...list[idx], ...data };
        lsSet('hms_patients', list);
        return { success: true, data: list[idx] };
      }
      try {
        await window.db.collection('patients').doc(String(id)).update(data);
        const snap = await window.db.collection('patients').doc(String(id)).get();
        return { success: true, data: docToPatient(snap) };
      } catch (err) {
        console.error('HMS API updatePatient:', err);
        throw err;
      }
    },

    /* ── deletePatient ─────────────────────────────────────── */
    async deletePatient(id) {
      await waitForFirebase();
      if (!fsAvail()) {
        let list = lsGet('hms_patients', defaultPatients);
        list = list.filter(p => String(p.id) !== String(id));
        lsSet('hms_patients', list);
        return { success: true };
      }
      try {
        await window.db.collection('patients').doc(String(id)).delete();
        return { success: true };
      } catch (err) {
        console.error('HMS API deletePatient:', err);
        throw err;
      }
    },

    /* ─────────────── APPOINTMENTS ────────────────────────── */

    async getAppointments(params = {}) {
      await waitForFirebase();
      const pageSize = params.limit || PAGE_SIZE;
      if (!fsAvail()) {
        let list = lsGet('hms_appointments', []);
        if (params.limit) list = list.slice(0, params.limit);
        return { success: true, data: list, lastDoc: null, hasMore: false };
      }
      try {
        let query = window.db.collection('appointments')
          .orderBy('token')
          .limit(pageSize);
        if (params.lastDoc) query = query.startAfter(params.lastDoc);
        const snap    = await query.get();
        const data    = snap.docs.map(d => ({ id: d.id, ...d.data(), _ref: d }));
        const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
        return { success: true, data, lastDoc, hasMore: snap.docs.length === pageSize };
      } catch (err) {
        console.error('HMS API getAppointments:', err);
        return { success: true, data: lsGet('hms_appointments', []), lastDoc: null, hasMore: false };
      }
    },

    async getAppointment(id) {
      await waitForFirebase();
      if (!fsAvail()) {
        const list  = lsGet('hms_appointments', []);
        const match = list.find(a => String(a.id) === String(id));
        if (!match) throw new Error('Appointment not found');
        return { success: true, data: match };
      }
      try {
        const snap = await window.db.collection('appointments').doc(String(id)).get();
        if (!snap.exists) throw new Error('Appointment not found');
        return { success: true, data: { id: snap.id, ...snap.data() } };
      } catch (err) { throw err; }
    },

    async createAppointment(data) {
      await waitForFirebase();
      if (!fsAvail()) {
        const list = lsGet('hms_appointments', []);
        const newA = { id: String(Date.now()), token: list.length + 1, ...data };
        list.push(newA);
        lsSet('hms_appointments', list);
        return { success: true, data: newA };
      }
      try {
        const ref  = window.db.collection('appointments').doc();
        const snap = await window.db.collection('appointments').orderBy('token', 'desc').limit(1).get();
        const lastToken = snap.empty ? 0 : (snap.docs[0].data().token || 0);
        const newA = { id: ref.id, token: lastToken + 1, ...data };
        await ref.set(newA);
        return { success: true, data: newA };
      } catch (err) {
        console.error('HMS API createAppointment:', err);
        throw err;
      }
    },

    async updateAppointment(id, data) {
      await waitForFirebase();
      if (!fsAvail()) {
        const list = lsGet('hms_appointments', []);
        const idx  = list.findIndex(a => String(a.id) === String(id));
        if (idx === -1) throw new Error('Appointment not found');
        list[idx] = { ...list[idx], ...data };
        lsSet('hms_appointments', list);
        return { success: true, data: list[idx] };
      }
      try {
        await window.db.collection('appointments').doc(String(id)).update(data);
        const snap = await window.db.collection('appointments').doc(String(id)).get();
        return { success: true, data: { id: snap.id, ...snap.data() } };
      } catch (err) {
        console.error('HMS API updateAppointment:', err);
        throw err;
      }
    },

    async deleteAppointment(id) {
      await waitForFirebase();
      if (!fsAvail()) {
        let list = lsGet('hms_appointments', []);
        list = list.filter(a => String(a.id) !== String(id));
        lsSet('hms_appointments', list);
        return { success: true };
      }
      try {
        await window.db.collection('appointments').doc(String(id)).delete();
        return { success: true };
      } catch (err) {
        console.error('HMS API deleteAppointment:', err);
        throw err;
      }
    },

    /* ─────────────── DOCTORS ──────────────────────────────── */

    async getDoctors() {
      await waitForFirebase();
      if (_doctorsCache) return { success: true, data: _doctorsCache };
      if (!fsAvail()) {
        _doctorsCache = lsGet('hms_doctors', defaultDoctors);
        return { success: true, data: _doctorsCache };
      }
      try {
        const snap = await window.db.collection('doctors').orderBy('name').get();
        if (snap.empty) {
          _doctorsCache = defaultDoctors;
        } else {
          _doctorsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
        return { success: true, data: _doctorsCache };
      } catch (err) {
        console.error('HMS API getDoctors:', err);
        _doctorsCache = lsGet('hms_doctors', defaultDoctors);
        return { success: true, data: _doctorsCache };
      }
    },

    async getSchedules() {
      return this.getDoctors();
    },

    /* ─────────────── WARDS ────────────────────────────────── */

    async getWards() {
      await waitForFirebase();
      if (_wardsCache) return { success: true, data: _wardsCache };
      if (!fsAvail()) {
        _wardsCache = lsGet('hms_wards', defaultWards);
        return { success: true, data: _wardsCache };
      }
      try {
        const snap = await window.db.collection('wards').get();
        if (snap.empty) {
          _wardsCache = defaultWards;
        } else {
          _wardsCache = {};
          snap.docs.forEach(d => { _wardsCache[d.id] = d.data().beds || []; });
        }
        return { success: true, data: _wardsCache };
      } catch (err) {
        console.error('HMS API getWards:', err);
        _wardsCache = lsGet('hms_wards', defaultWards);
        return { success: true, data: _wardsCache };
      }
    }
  };

  /* ── Compatibility shims for reception-dashboard.js ────────── */

  // saveLocalWards: now writes to Firestore + localStorage
  window.saveLocalWards = async function (updatedWards) {
    lsSet('hms_wards', updatedWards);
    _wardsCache = updatedWards;
    if (!fsAvail()) return;
    try {
      const batch = window.db.batch();
      Object.entries(updatedWards).forEach(([wardId, beds]) => {
        const ref = window.db.collection('wards').doc(wardId);
        batch.set(ref, { beds }, { merge: true });
      });
      await batch.commit();
    } catch (err) {
      console.error('HMS saveLocalWards Firestore sync failed:', err.message);
    }
  };

  // Populate WARDS on window for reception-dashboard.js init
  window.getWardsForDashboard = async function () {
    const result = await window.API.getWards();
    return result.data;
  };

  console.info('HMS: firebase-api.js loaded. Waiting for Firebase ready event...');

})();
