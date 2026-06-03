const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function seed() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'wellness_medicals',
    port: parseInt(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
  });

  try {
    console.log('Seeding database...');

    // Roles
    const roleNames = ['Admin', 'Doctor', 'Nurse', 'Receptionist', 'Pharmacist'];
    const roleIds = {};
    for (const name of roleNames) {
      const [r] = await pool.query('INSERT INTO roles (name) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)', [name]);
      roleIds[name] = r.insertId;
    }
    console.log('Roles created.');

    // Admin user (password: admin123)
    const salt = await bcrypt.genSalt(12);
    const adminHash = await bcrypt.hash('admin123', salt);
    const [admin] = await pool.query(
      `INSERT INTO users (email, password_hash, name, title, phone, role_id) VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), title=VALUES(title)`,
      ['admin@wellness.com', adminHash, 'Admin User', 'System Administrator', '9876543210', roleIds['Admin']]
    );
    const adminId = admin.insertId;

    // Doctor users (password: doctor123)
    const docHash = await bcrypt.hash('doctor123', salt);
    const doctors = [
      { email: 'dr.sharma@wellness.com', name: 'Dr. Rajesh Sharma', title: 'Senior Cardiologist', phone: '9876543211' },
      { email: 'dr.patel@wellness.com', name: 'Dr. Anita Patel', title: 'Pediatrician', phone: '9876543212' },
      { email: 'dr.verma@wellness.com', name: 'Dr. Sunil Verma', title: 'Orthopedic Surgeon', phone: '9876543213' }
    ];
    const doctorIds = [];
    for (const d of doctors) {
      const [result] = await pool.query(
        `INSERT INTO users (email, password_hash, name, title, phone, role_id) VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), title=VALUES(title)`,
        [d.email, docHash, d.name, d.title, d.phone, roleIds['Doctor']]
      );
      doctorIds.push(result.insertId);
    }
    console.log('Doctors created.');

    // Staff users (password: staff123)
    const staffHash = await bcrypt.hash('staff123', salt);
    const staffMembers = [
      { email: 'reception@wellness.com', name: 'Priya Singh', title: 'Head Receptionist', phone: '9876543214', role: 'Receptionist' },
      { email: 'nurse@wellness.com', name: 'Meena Kumari', title: 'Senior Nurse', phone: '9876543215', role: 'Nurse' },
      { email: 'pharmacist@wellness.com', name: 'Amit Kumar', title: 'Chief Pharmacist', phone: '9876543216', role: 'Pharmacist' }
    ];
    for (const s of staffMembers) {
      await pool.query(
        `INSERT INTO users (email, password_hash, name, title, phone, role_id) VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), title=VALUES(title)`,
        [s.email, staffHash, s.name, s.title, s.phone, roleIds[s.role]]
      );
    }
    console.log('Staff created.');

    // Sample Patients
    const patients = [
      { fname: 'Aarav', lname: 'Gupta', contact: '9988776655', email: 'aarav.g@email.com', department: 'Cardiology', patient_type: 'Outpatient', blood_group: 'O+', age: 45, gender: 'Male', status: 'Active', doctor_id: doctorIds[0] },
      { fname: 'Neha', lname: 'Reddy', contact: '8877665544', email: 'neha.r@email.com', department: 'Pediatrics', patient_type: 'Outpatient', blood_group: 'A+', age: 28, gender: 'Female', status: 'Active', doctor_id: doctorIds[1] },
      { fname: 'Vikram', lname: 'Singh', contact: '7766554433', email: 'vikram.s@email.com', department: 'Orthopedics', patient_type: 'Inpatient', blood_group: 'B+', age: 55, gender: 'Male', status: 'Active', doctor_id: doctorIds[2] },
      { fname: 'Sita', lname: 'Devi', contact: '6655443322', email: 'sita.d@email.com', department: 'General', patient_type: 'Outpatient', blood_group: 'AB+', age: 62, gender: 'Female', status: 'Active' },
      { fname: 'Rahul', lname: 'Joshi', contact: '5544332211', email: 'rahul.j@email.com', department: 'Cardiology', patient_type: 'Follow-up', blood_group: 'O-', age: 38, gender: 'Male', status: 'Follow-up', doctor_id: doctorIds[0] }
    ];
    for (const p of patients) {
      await pool.query(
        `INSERT INTO patients (fname, lname, contact, email, department, patient_type, blood_group, age, gender, status, doctor_id, created_by, last_visit)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [p.fname, p.lname, p.contact, p.email, p.department, p.patient_type, p.blood_group, p.age, p.gender, p.status, p.doctor_id || null, adminId]
      );
    }
    console.log('Patients created.');

    // Lab Tests
    const labTests = [
      { name: 'Complete Blood Count', category: 'Hematology', normal_range: '4.5-11.0 x10^9/L', unit: 'x10^9/L', price: 300 },
      { name: 'Blood Glucose Fasting', category: 'Biochemistry', normal_range: '70-110 mg/dL', unit: 'mg/dL', price: 150 },
      { name: 'Lipid Profile', category: 'Biochemistry', normal_range: 'Total Chol: <200 mg/dL', unit: 'mg/dL', price: 500 },
      { name: 'Urine Analysis', category: 'Microbiology', normal_range: 'Negative', unit: '', price: 200 },
      { name: 'Liver Function Test', category: 'Biochemistry', normal_range: 'ALT: 7-56 U/L', unit: 'U/L', price: 600 },
      { name: 'Thyroid Profile', category: 'Hormones', normal_range: 'TSH: 0.4-4.0 mIU/L', unit: 'mIU/L', price: 450 },
      { name: 'X-Ray Chest', category: 'Radiology', normal_range: 'Normal findings', unit: '', price: 400 },
      { name: 'ECG', category: 'Cardiology', normal_range: 'Normal sinus rhythm', unit: '', price: 250 }
    ];
    for (const t of labTests) {
      await pool.query(
        'INSERT INTO lab_tests (name, category, normal_range, unit, price) VALUES (?, ?, ?, ?, ?)',
        [t.name, t.category, t.normal_range, t.unit, t.price]
      );
    }
    console.log('Lab tests created.');

    // Sample Inventory
    const inventoryItems = [
      { brand_name: 'Paracetamol 500mg', content: 'Paracetamol', category: 'Analgesic', distributor: 'MediDistributors', quantity: 500, unit: 'tablet', selling_price: 2.00, mrp: 2.50, reorder_level: 100 },
      { brand_name: 'Amoxicillin 250mg', content: 'Amoxicillin', category: 'Antibiotic', distributor: 'PharmaDistributors', quantity: 300, unit: 'capsule', selling_price: 8.00, mrp: 10.00, reorder_level: 50 },
      { brand_name: 'Omeprazole 20mg', content: 'Omeprazole', category: 'Gastric', distributor: 'MediDistributors', quantity: 200, unit: 'capsule', selling_price: 5.00, mrp: 6.50, reorder_level: 40 },
      { brand_name: 'Cetirizine 10mg', content: 'Cetirizine', category: 'Antihistamine', distributor: 'PharmaDistributors', quantity: 150, unit: 'tablet', selling_price: 3.00, mrp: 4.00, reorder_level: 30 },
      { brand_name: 'Metformin 500mg', content: 'Metformin', category: 'Antidiabetic', distributor: 'HealthDistributors', quantity: 8, unit: 'tablet', selling_price: 4.00, mrp: 5.00, reorder_level: 50 }
    ];
    for (const item of inventoryItems) {
      await pool.query(
        `INSERT INTO inventory (brand_name, content, category, distributor, quantity, unit, selling_price, mrp, reorder_level, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [item.brand_name, item.content, item.category, item.distributor, item.quantity, item.unit, item.selling_price, item.mrp, item.reorder_level, adminId]
      );
    }
    console.log('Inventory created.');

    // Wards
    const wards = [
      { name: 'General Ward - A', ward_type: 'general', total_beds: 20, available_beds: 15 },
      { name: 'General Ward - B', ward_type: 'general', total_beds: 20, available_beds: 18 },
      { name: 'ICU', ward_type: 'ICU', total_beds: 10, available_beds: 8 },
      { name: 'Maternity', ward_type: 'maternity', total_beds: 15, available_beds: 12 }
    ];
    for (const w of wards) {
      await pool.query(
        'INSERT INTO wards (name, ward_type, total_beds, available_beds) VALUES (?, ?, ?, ?)',
        [w.name, w.ward_type, w.total_beds, w.available_beds]
      );
    }
    console.log('Wards created.');

    console.log('\n========================================');
    console.log('  Database seeded successfully!');
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
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
