const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const XLSX = require('xlsx');

async function importData() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'wellness_medicals',
    port: parseInt(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    // ============= IMPORT PATIENTS =============
    console.log('Reading Patients.xlsx...');
    const xlsxPath = path.join(__dirname, '../../public/Patients.xlsx');
    if (!fs.existsSync(xlsxPath)) {
      console.error('Patients.xlsx not found at', xlsxPath);
      return;
    }
    const wb = XLSX.readFile(xlsxPath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    console.log(`Found ${rows.length} patient rows.`);

    let patientInserted = 0;
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const values = [];
      for (const row of batch) {
        const name = String(row['Name'] || '').trim();
        if (!name) continue;
        const nameParts = name.split(/\s+/);
        const fname = nameParts[0] || '';
        const lname = nameParts.slice(1).join(' ') || '';

        let age = parseInt(row['Age']);
        if (isNaN(age) || age < 0 || age > 120) age = 0;
        const gender = String(row['Sex'] || '').trim();

        const phone = String(row['Phone'] || '').split(/[,/\s]+/)[0].trim().slice(0, 20);
        const address = [String(row[' House Name'] || '').trim(), String(row['Place'] || '').trim()].filter(Boolean).join(', ');

        let lastVisit = null;
        if (row['Date']) {
          const parts = String(row['Date']).split('-');
          if (parts.length === 3) lastVisit = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }

        let notesArr = [];
        if (row['Remarks']) notesArr.push(`Remarks: ${row['Remarks']}`);
        if (row['Remark ']) notesArr.push(`Notes: ${row['Remark ']}`);
        if (row['Diabetic Dtls']) notesArr.push(`Diabetic: ${row['Diabetic Dtls']}`);
        if (row['Allergy']) notesArr.push(`Allergy: ${row['Allergy']}`);
        if (row['BP']) notesArr.push(`BP: ${row['BP']}`);
        if (row['Temprature']) notesArr.push(`Temp: ${row['Temprature']}°F`);
        if (row['Place']) notesArr.push(`Place: ${row['Place']}`);
        if (row['Doctor']) notesArr.push(`Doctor: ${row['Doctor']}`);
        if (row['Hosp. OP No']) notesArr.push(`OP No: ${row['Hosp. OP No']}`);
        if (row['Relation']) notesArr.push(`Relation: ${row['Relation']}`);
        const notes = notesArr.join('\n');

        values.push([
          fname, lname, phone, '', 'General', 'Outpatient', '', age, gender, address,
          lastVisit, 'Active', null, null, notes
        ]);
      }

      if (values.length === 0) continue;

      const placeholders = values.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
      const flat = values.flat();
      await pool.query(
        `INSERT INTO patients 
         (fname, lname, contact, email, department, patient_type, blood_group, age, gender, address, last_visit, status, doctor_id, created_by, notes)
         VALUES ${placeholders}`,
        flat
      );
      patientInserted += values.length;
      console.log(`  Progress: ${Math.min(i + batchSize, rows.length)}/${rows.length} (${patientInserted} inserted)`);
    }
    console.log(`✓ Patients imported: ${patientInserted}`);

    // ============= IMPORT INVENTORY =============
    console.log('\nReading inventory.csv...');
    const csvPath = path.join(__dirname, '../../public/inventory.csv');
    if (!fs.existsSync(csvPath)) {
      console.error('inventory.csv not found at', csvPath);
      return;
    }
    const csvText = fs.readFileSync(csvPath, 'utf8');
    const lines = csvText.split('\n').filter(Boolean);
    const headers = lines[0].split(',').map(h => h.trim());
    const dataRows = lines.slice(1);

    console.log(`Found ${dataRows.length} inventory rows.`);

    function parseCSVLine(line) {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (const ch of line) {
        if (ch === '"') { inQuotes = !inQuotes; continue; }
        if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue; }
        current += ch;
      }
      result.push(current.trim());
      return result;
    }

    function parseDate(str) {
      if (!str || str === '-   -' || str === '  -   -') return null;
      str = String(str).trim();
      const parts = str.split('-');
      if (parts.length === 3) {
        const months = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
          Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
        let day = parts[0].padStart(2, '0');
        let month, year;
        if (months[parts[1]]) {
          month = months[parts[1]];
          year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
        } else {
          month = parts[1].padStart(2, '0');
          year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
        }
        if (year.length === 4 && parseInt(year) > 1900 && parseInt(year) < 2100) {
          return `${year}-${month}-${day}`;
        }
      }
      const ddmmyy = str.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
      if (ddmmyy) {
        let y = ddmmyy[3];
        if (y.length === 2) y = '20' + y;
        return `${y}-${ddmmyy[2].padStart(2, '0')}-${ddmmyy[1].padStart(2, '0')}`;
      }
      return null;
    }

    let invInserted = 0;
    const invBatchSize = 100;
    const nameIdx = headers.indexOf('name');
    const stockIdx = headers.indexOf('stock');
    const costIdx = headers.indexOf('cost');
    const mrpIdx = headers.indexOf('mrp');
    const rateIdx = headers.indexOf('rate');
    const companyIdx = headers.indexOf('company');
    const supplierIdx = headers.indexOf('supplier');
    const expIdx = headers.indexOf('exp');
    const recDateIdx = headers.indexOf('rec_date');
    const unitIdx = headers.indexOf('unit');
    const racknoIdx = headers.indexOf('rackno');

    for (let i = 0; i < dataRows.length; i += invBatchSize) {
      const batch = dataRows.slice(i, i + invBatchSize);
      const values = [];
      for (const line of batch) {
        const fields = parseCSVLine(line);
        const name = (fields[nameIdx] || '').trim();
        if (!name) continue;
        const stock = parseFloat(fields[stockIdx]) || 0;
        const costPrice = parseFloat(fields[costIdx]) || 0;
        const sellingPrice = parseFloat(fields[rateIdx]) || 0;
        const mrp = parseFloat(fields[mrpIdx]) || 0;
        const unit = (fields[unitIdx] || 'piece').trim();
        const supplier = (fields[supplierIdx] || '').trim();
        const company = (fields[companyIdx] || '').trim();
        const rackno = (fields[racknoIdx] || '').trim();
        const content = [company, rackno].filter(Boolean).join(' / ');

        if (stock <= 0 && !name) continue;

        values.push([
          name, content, '', supplier,
          parseDate(fields[recDateIdx]), parseDate(fields[expIdx]),
          Math.max(0, stock), unit, costPrice, sellingPrice || mrp, mrp, 5, 1, null
        ]);
      }

      if (values.length === 0) continue;

      const placeholders = values.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
      const flat = values.flat();
      await pool.query(
        `INSERT INTO inventory
         (brand_name, content, category, distributor, purchase_date, expiry_date, quantity, unit, cost_price, selling_price, mrp, reorder_level, is_active, created_by)
         VALUES ${placeholders}`,
        flat
      );
      invInserted += values.length;
      console.log(`  Progress: ${Math.min(i + invBatchSize, dataRows.length)}/${dataRows.length} (${invInserted} inserted)`);
    }
    console.log(`✓ Inventory items imported: ${invInserted}`);

    console.log('\n========================================');
    console.log('  Import completed successfully!');
    console.log('========================================');
  } catch (err) {
    console.error('Import error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

importData();
