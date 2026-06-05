const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Find the service account key file
const fs = require('fs');
const keyFiles = fs.readdirSync(__dirname + '/..').filter(f => f.endsWith('.json') && f.includes('firebase-adminsdk'));
const keyFile = keyFiles[0];
if (!keyFile) {
  console.error('No Firebase service account key file found in project root!');
  console.error('Download one from Firebase Console -> Project Settings -> Service Accounts');
  process.exit(1);
}

const serviceAccount = require(path.join(__dirname, '..', keyFile));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const auth = admin.auth();
const db = admin.firestore();

const SEED_USERS = [
  { email: 'admin@wellness.com', password: 'admin123', name: 'Admin User', title: 'System Administrator', phone: '9876543210', role: 'Admin' },
  { email: 'dr.sharma@wellness.com', password: 'doctor123', name: 'Dr. Rajesh Sharma', title: 'Senior Cardiologist', phone: '9876543211', role: 'Doctor' },
  { email: 'dr.patel@wellness.com', password: 'doctor123', name: 'Dr. Anita Patel', title: 'Pediatrician', phone: '9876543212', role: 'Doctor' },
  { email: 'dr.verma@wellness.com', password: 'doctor123', name: 'Dr. Sunil Verma', title: 'Orthopedic Surgeon', phone: '9876543213', role: 'Doctor' },
  { email: 'reception@wellness.com', password: 'staff123', name: 'Priya Singh', title: 'Head Receptionist', phone: '9876543214', role: 'Staff' },
  { email: 'nurse@wellness.com', password: 'staff123', name: 'Meena Kumari', title: 'Senior Nurse', phone: '9876543215', role: 'Staff' },
  { email: 'pharmacist@wellness.com', password: 'staff123', name: 'Amit Kumar', title: 'Chief Pharmacist', phone: '9876543216', role: 'Pharmacist' }
];

const SEED_PATIENTS = [
  { fname: 'Aarav', lname: 'Gupta', contact: '9988776655', email: 'aarav.g@email.com', department: 'Cardiology', patient_type: 'Outpatient', blood_group: 'O+', age: 45, gender: 'Male', status: 'Active' },
  { fname: 'Neha', lname: 'Reddy', contact: '8877665544', email: 'neha.r@email.com', department: 'Pediatrics', patient_type: 'Outpatient', blood_group: 'A+', age: 28, gender: 'Female', status: 'Active' },
  { fname: 'Vikram', lname: 'Singh', contact: '7766554433', email: 'vikram.s@email.com', department: 'Orthopedics', patient_type: 'Inpatient', blood_group: 'B+', age: 55, gender: 'Male', status: 'Active' },
  { fname: 'Sita', lname: 'Devi', contact: '6655443322', email: 'sita.d@email.com', department: 'General', patient_type: 'Outpatient', blood_group: 'AB+', age: 62, gender: 'Female', status: 'Active' },
  { fname: 'Rahul', lname: 'Joshi', contact: '5544332211', email: 'rahul.j@email.com', department: 'Cardiology', patient_type: 'Follow-up', blood_group: 'O-', age: 38, gender: 'Male', status: 'Follow-up' }
];

const SEED_LAB_TESTS = [
  { name: 'Complete Blood Count', category: 'Hematology', normal_range: '4.5-11.0 x10^9/L', unit: 'x10^9/L', price: 300 },
  { name: 'Blood Glucose Fasting', category: 'Biochemistry', normal_range: '70-110 mg/dL', unit: 'mg/dL', price: 150 },
  { name: 'Lipid Profile', category: 'Biochemistry', normal_range: 'Total Chol: <200 mg/dL', unit: 'mg/dL', price: 500 },
  { name: 'Urine Analysis', category: 'Microbiology', normal_range: 'Negative', unit: '', price: 200 },
  { name: 'Liver Function Test', category: 'Biochemistry', normal_range: 'ALT: 7-56 U/L', unit: 'U/L', price: 600 },
  { name: 'Thyroid Profile', category: 'Hormones', normal_range: 'TSH: 0.4-4.0 mIU/L', unit: 'mIU/L', price: 450 },
  { name: 'X-Ray Chest', category: 'Radiology', normal_range: 'Normal findings', unit: '', price: 400 },
  { name: 'ECG', category: 'Cardiology', normal_range: 'Normal sinus rhythm', unit: '', price: 250 }
];

const SEED_INVENTORY = [
  { brand_name: 'Paracetamol 500mg', content: 'Paracetamol', category: 'Analgesic', distributor: 'MediDistributors', quantity: 500, unit: 'tablet', selling_price: 2.00, mrp: 2.50, reorder_level: 100 },
  { brand_name: 'Amoxicillin 250mg', content: 'Amoxicillin', category: 'Antibiotic', distributor: 'PharmaDistributors', quantity: 300, unit: 'capsule', selling_price: 8.00, mrp: 10.00, reorder_level: 50 },
  { brand_name: 'Omeprazole 20mg', content: 'Omeprazole', category: 'Gastric', distributor: 'MediDistributors', quantity: 200, unit: 'capsule', selling_price: 5.00, mrp: 6.50, reorder_level: 40 },
  { brand_name: 'Cetirizine 10mg', content: 'Cetirizine', category: 'Antihistamine', distributor: 'PharmaDistributors', quantity: 150, unit: 'tablet', selling_price: 3.00, mrp: 4.00, reorder_level: 30 },
  { brand_name: 'Metformin 500mg', content: 'Metformin', category: 'Antidiabetic', distributor: 'HealthDistributors', quantity: 8, unit: 'tablet', selling_price: 4.00, mrp: 5.00, reorder_level: 50 }
];

const SEED_ROLES = ['Admin', 'Doctor', 'Nurse', 'Receptionist', 'Pharmacist'];

const SEED_WARDS = [
  { name: 'General Ward - A', ward_type: 'general', total_beds: 20, available_beds: 15 },
  { name: 'General Ward - B', ward_type: 'general', total_beds: 20, available_beds: 18 },
  { name: 'ICU', ward_type: 'ICU', total_beds: 10, available_beds: 8 },
  { name: 'Maternity', ward_type: 'maternity', total_beds: 15, available_beds: 12 }
];

async function seed() {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const ts = { created_at: now, updated_at: now };

  console.log('Seeding Firestore...\n');

  // Roles
  console.log('Creating roles...');
  for (const name of SEED_ROLES) {
    await db.collection('roles').doc(name).set({ name, ...ts });
  }

  // Users (Auth + Firestore profiles)
  console.log('Creating users...');
  const userIds = {};
  for (const u of SEED_USERS) {
    // Delete existing user if any
    try {
      const existing = await auth.getUserByEmail(u.email);
      await auth.deleteUser(existing.uid);
    } catch (e) { /* doesn't exist */ }

    const rec = await auth.createUser({
      email: u.email,
      password: u.password,
      displayName: u.name
    });
    userIds[u.email] = rec.uid;

    await db.collection('users').doc(rec.uid).set({
      email: u.email,
      name: u.name,
      title: u.title,
      phone: u.phone,
      role: u.role,
      is_active: true,
      ...ts
    });
    console.log('  ' + u.email + ' (' + u.role + ') -> ' + rec.uid);
  }

  // Patients
  console.log('\nCreating patients...');
  const adminUid = userIds['admin@wellness.com'];
  for (const p of SEED_PATIENTS) {
    const ref = db.collection('patients').doc();
    await ref.set({ ...p, created_by: adminUid, ...ts });
    console.log('  ' + p.fname + ' ' + p.lname + ' -> ' + ref.id);
  }

  // Lab Tests
  console.log('\nCreating lab tests...');
  for (const t of SEED_LAB_TESTS) {
    const ref = db.collection('lab_tests').doc();
    await ref.set({ ...t, is_active: true, ...ts });
    console.log('  ' + t.name);
  }

  // Inventory
  console.log('\nCreating inventory items...');
  for (const item of SEED_INVENTORY) {
    const ref = db.collection('inventory').doc();
    await ref.set({ ...item, created_by: adminUid, ...ts });
    console.log('  ' + item.brand_name);
  }

  // Wards
  console.log('\nCreating wards...');
  for (const w of SEED_WARDS) {
    const ref = db.collection('wards').doc();
    await ref.set({ ...w, ...ts });
    console.log('  ' + w.name);
  }

  console.log('\n========================================');
  console.log('  Firestore seeded successfully!');
  console.log('========================================');
  console.log('\nLogin Credentials:');
  console.log('  Admin:        admin@wellness.com / admin123');
  console.log('  Doctor:       dr.sharma@wellness.com / doctor123');
  console.log('  Doctor:       dr.patel@wellness.com / doctor123');
  console.log('  Doctor:       dr.verma@wellness.com / doctor123');
  console.log('  Receptionist: reception@wellness.com / staff123');
  console.log('  Nurse:        nurse@wellness.com / staff123');
  console.log('  Pharmacist:   pharmacist@wellness.com / staff123');
  console.log('========================================\n');
  process.exit(0);
}

seed().catch(function (err) {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
