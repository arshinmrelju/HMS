/**
 * scripts/seed-firestore.js
 * ─────────────────────────────────────────────────────────────
 * One-time seed script to populate Firestore with demo data.
 *
 * USAGE:
 *   1. Install Firebase Admin SDK (once):
 *        npm install firebase-admin --save-dev
 *
 *   2. Download your service account key from:
 *        Firebase Console → Project Settings → Service Accounts
 *        → Generate New Private Key → save as scripts/serviceAccountKey.json
 *
 *   3. Run:
 *        node scripts/seed-firestore.js
 *
 * ⚠️  Run this ONLY ONCE. Re-running will overwrite existing data.
 * ─────────────────────────────────────────────────────────────
 */

const admin = require('firebase-admin');
const path  = require('path');

// ── Load service account key ─────────────────────────────────
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ── Seed Data ────────────────────────────────────────────────

const patients = [
  { id:'P001', op_no:'1001', fname:'Aarav',  lname:'Gupta',   contact:'9988776655', email:'aarav.g@email.com',   department:'Cardiology',     patient_type:'outpatient', blood_group:'O+', age:45, gender:'Male',   status:'stable',     last_visit: new Date().toISOString() },
  { id:'P002', op_no:'1002', fname:'Neha',   lname:'Reddy',   contact:'8877665544', email:'neha.r@email.com',    department:'Pediatrics',     patient_type:'outpatient', blood_group:'A+', age:28, gender:'Female', status:'stable',     last_visit: new Date().toISOString() },
  { id:'P003', op_no:'1003', fname:'Vikram', lname:'Singh',   contact:'7766554433', email:'vikram.s@email.com',  department:'Orthopedics',    patient_type:'admitted',   blood_group:'B+', age:55, gender:'Male',   status:'recovering', last_visit: new Date().toISOString() },
  { id:'P004', op_no:'1004', fname:'Sita',   lname:'Devi',    contact:'6655443322', email:'sita.d@email.com',    department:'General Surgery',patient_type:'outpatient', blood_group:'AB+',age:62, gender:'Female', status:'stable',     last_visit: new Date().toISOString() },
  { id:'P005', op_no:'1005', fname:'Rahul',  lname:'Joshi',   contact:'5544332211', email:'rahul.j@email.com',   department:'Cardiology',     patient_type:'outpatient', blood_group:'O-', age:38, gender:'Male',   status:'recovering', last_visit: new Date().toISOString() }
];

const doctors = [
  { id:'D001', initials:'RS', name:'Dr. Rajesh Sharma', dept:'Cardiology',  slots:[{time:'09:00 AM',type:'free'},{time:'09:30 AM',type:'booked'},{time:'10:00 AM',type:'free'},{time:'10:30 AM',type:'free'},{time:'11:00 AM',type:'break'}] },
  { id:'D002', initials:'AP', name:'Dr. Anita Patel',   dept:'Pediatrics',  slots:[{time:'09:00 AM',type:'booked'},{time:'09:30 AM',type:'booked'},{time:'10:00 AM',type:'free'},{time:'10:30 AM',type:'free'}] },
  { id:'D003', initials:'SV', name:'Dr. Sunil Verma',   dept:'Orthopedics', slots:[{time:'09:00 AM',type:'free'},{time:'10:00 AM',type:'free'},{time:'10:30 AM',type:'booked'}] }
];

const wards = {
  general:   Array.from({length:24},(_,i)=>({num:i+1,status:i%5===0?'occupied':i%8===0?'reserved':'available'})),
  icu:       Array.from({length:8}, (_,i)=>({num:i+1,status:i%3===0?'occupied':'available'})),
  maternity: Array.from({length:12},(_,i)=>({num:i+1,status:i%4===0?'occupied':'available'})),
  surgery:   Array.from({length:10},(_,i)=>({num:i+1,status:i%3===0?'occupied':'available'}))
};

// ── Seed functions ────────────────────────────────────────────

async function seedCollection(collectionName, docs, idField = 'id') {
  console.log(`\nSeeding "${collectionName}"...`);
  const batch = db.batch();
  docs.forEach(doc => {
    const ref = db.collection(collectionName).doc(doc[idField]);
    batch.set(ref, doc);
  });
  await batch.commit();
  console.log(`  ✓ ${docs.length} documents written to "${collectionName}"`);
}

async function seedWards() {
  console.log('\nSeeding "wards"...');
  const batch = db.batch();
  Object.entries(wards).forEach(([wardId, beds]) => {
    const ref = db.collection('wards').doc(wardId);
    batch.set(ref, { beds });
  });
  await batch.commit();
  console.log(`  ✓ ${Object.keys(wards).length} ward documents written`);
}

async function main() {
  try {
    await seedCollection('patients', patients);
    await seedCollection('doctors',  doctors);
    await seedWards();
    console.log('\n✅  Seed complete! Your Firestore is ready.');
  } catch (err) {
    console.error('\n❌  Seed failed:', err.message);
    process.exit(1);
  }
  process.exit(0);
}

main();
