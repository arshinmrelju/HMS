'use strict';

(function () {
  // Mock Seed Data
  const defaultPatients = [
    { id: "1001", op_no: "1001", fname: 'Aarav', lname: 'Gupta', contact: '9988776655', email: 'aarav.g@email.com', department: 'Cardiology', patient_type: 'outpatient', blood_group: 'O+', age: 45, gender: 'Male', status: 'stable', last_visit: new Date().toISOString() },
    { id: "1002", op_no: "1002", fname: 'Neha', lname: 'Reddy', contact: '8877665544', email: 'neha.r@email.com', department: 'Pediatrics', patient_type: 'outpatient', blood_group: 'A+', age: 28, gender: 'Female', status: 'stable', last_visit: new Date().toISOString() },
    { id: "1003", op_no: "1003", fname: 'Vikram', lname: 'Singh', contact: '7766554433', email: 'vikram.s@email.com', department: 'Orthopedics', patient_type: 'admitted', blood_group: 'B+', age: 55, gender: 'Male', status: 'recovering', last_visit: new Date().toISOString() },
    { id: "1004", op_no: "1004", fname: 'Sita', lname: 'Devi', contact: '6655443322', email: 'sita.d@email.com', department: 'General Surgery', patient_type: 'outpatient', blood_group: 'AB+', age: 62, gender: 'Female', status: 'stable', last_visit: new Date().toISOString() },
    { id: "1005", op_no: "1005", fname: 'Rahul', lname: 'Joshi', contact: '5544332211', email: 'rahul.j@email.com', department: 'Cardiology', patient_type: 'outpatient', blood_group: 'O-', age: 38, gender: 'Male', status: 'recovering', last_visit: new Date().toISOString() }
  ];

  const defaultDoctors = [
    { initials: "RS", name: "Dr. Rajesh Sharma", dept: "Cardiology", slots: [{ time: "09:00 AM", type: "free" }, { time: "09:30 AM", type: "booked" }, { time: "10:00 AM", type: "free" }, { time: "10:30 AM", type: "free" }, { time: "11:00 AM", type: "break" }] },
    { initials: "AP", name: "Dr. Anita Patel", dept: "Pediatrics", slots: [{ time: "09:00 AM", type: "booked" }, { time: "09:30 AM", type: "booked" }, { time: "10:00 AM", type: "free" }, { time: "10:30 AM", type: "free" }] },
    { initials: "SV", name: "Dr. Sunil Verma", dept: "Orthopedics", slots: [{ time: "09:00 AM", type: "free" }, { time: "10:00 AM", type: "free" }, { time: "10:30 AM", type: "booked" }] }
  ];

  const defaultWards = {
    general: Array.from({ length: 24 }, (_, i) => ({ num: i + 1, status: i % 5 === 0 ? 'occupied' : i % 8 === 0 ? 'reserved' : 'available' })),
    icu: Array.from({ length: 8 }, (_, i) => ({ num: i + 1, status: i % 3 === 0 ? 'occupied' : 'available' })),
    maternity: Array.from({ length: 12 }, (_, i) => ({ num: i + 1, status: i % 4 === 0 ? 'occupied' : 'available' })),
    surgery: Array.from({ length: 10 }, (_, i) => ({ num: i + 1, status: i % 3 === 0 ? 'occupied' : 'available' }))
  };

  // Helper to initialize local storage
  function getStored(key, defaults) {
    const val = localStorage.getItem(key);
    if (!val) {
      localStorage.setItem(key, JSON.stringify(defaults));
      return defaults;
    }
    return JSON.parse(val);
  }

  function setStored(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // Initializing local variables (sync from localStorage)
  let patients = getStored('hms_patients', defaultPatients);
  let appointments = getStored('hms_appointments', []);
  let doctors = getStored('hms_doctors', defaultDoctors);
  let wards = getStored('hms_wards', defaultWards);

  window.API = {
    async getPatients(params) {
      patients = getStored('hms_patients', defaultPatients);
      let list = [...patients];
      if (params) {
        if (params.search) {
          const q = params.search.toLowerCase();
          list = list.filter(p => 
            `${p.fname} ${p.lname}`.toLowerCase().includes(q) || 
            (p.contact && p.contact.includes(q))
          );
        }
      }
      return { success: true, data: list };
    },

    async getPatient(id) {
      patients = getStored('hms_patients', defaultPatients);
      const match = patients.find(p => String(p.id) === String(id));
      if (!match) throw new Error('Patient not found');
      return { success: true, data: match };
    },

    async createPatient(data) {
      patients = getStored('hms_patients', defaultPatients);
      const newId = String(Date.now());
      const newP = {
        id: newId,
        op_no: newId.slice(-4),
        last_visit: new Date().toISOString(),
        status: 'stable',
        ...data
      };
      patients.unshift(newP);
      setStored('hms_patients', patients);
      return { success: true, data: newP };
    },

    async updatePatient(id, data) {
      patients = getStored('hms_patients', defaultPatients);
      const idx = patients.findIndex(p => String(p.id) === String(id));
      if (idx === -1) throw new Error('Patient not found');
      patients[idx] = { ...patients[idx], ...data };
      setStored('hms_patients', patients);
      return { success: true, data: patients[idx] };
    },

    async deletePatient(id) {
      patients = getStored('hms_patients', defaultPatients);
      patients = patients.filter(p => String(p.id) !== String(id));
      setStored('hms_patients', patients);
      return { success: true };
    },

    async getAppointments(params) {
      appointments = getStored('hms_appointments', []);
      let list = [...appointments];
      if (params) {
        if (params.limit) list = list.slice(0, params.limit);
      }
      return { success: true, data: list };
    },

    async getAppointment(id) {
      appointments = getStored('hms_appointments', []);
      const match = appointments.find(a => String(a.id) === String(id));
      if (!match) throw new Error('Appointment not found');
      return { success: true, data: match };
    },

    async createAppointment(data) {
      appointments = getStored('hms_appointments', []);
      const newA = {
        id: String(Date.now()),
        token: appointments.length + 1,
        ...data
      };
      appointments.push(newA);
      setStored('hms_appointments', appointments);
      return { success: true, data: newA };
    },

    async updateAppointment(id, data) {
      appointments = getStored('hms_appointments', []);
      const idx = appointments.findIndex(a => String(a.id) === String(id));
      if (idx === -1) throw new Error('Appointment not found');
      appointments[idx] = { ...appointments[idx], ...data };
      setStored('hms_appointments', appointments);
      return { success: true, data: appointments[idx] };
    },

    async deleteAppointment(id) {
      appointments = getStored('hms_appointments', []);
      appointments = appointments.filter(a => String(a.id) !== String(id));
      setStored('hms_appointments', appointments);
      return { success: true };
    },

    async getDoctors() {
      doctors = getStored('hms_doctors', defaultDoctors);
      return { success: true, data: doctors };
    },

    async getSchedules() {
      doctors = getStored('hms_doctors', defaultDoctors);
      return { success: true, data: doctors };
    }
  };

  // Exposed for compatibility with reception-dashboard.js
  window.firebaseDb = true; 
  window.firebaseFS = {
    collection: () => {},
    getDocs: async () => {
      wards = getStored('hms_wards', defaultWards);
      return Object.keys(wards).map(w => ({
        id: w,
        data: () => ({ name: w, beds: wards[w] })
      }));
    }
  };

  // Exposed for custom toggle persistence in reception-dashboard.js
  window.saveLocalWards = function(updatedWards) {
    setStored('hms_wards', updatedWards);
  };
})();
