/* =========================================
   PHARMACY.JS
   ========================================= */
'use strict';
HMS.requireAuth();

const MEDICINES = [
  {name:'Amoxicillin 500mg',cat:'antibiotics',stock:240,price:12.50,expiry:'2026-12-01',status:'in-stock'},
  {name:'Paracetamol 650mg',cat:'analgesics',stock:18,price:3.20,expiry:'2026-08-15',status:'low'},
  {name:'Atorvastatin 10mg',cat:'cardiac',stock:150,price:28.00,expiry:'2027-03-10',status:'in-stock'},
  {name:'Vitamin D3 60K',cat:'vitamins',stock:0,price:95.00,expiry:'2026-06-20',status:'out'},
  {name:'Ciprofloxacin 500mg',cat:'antibiotics',stock:88,price:18.00,expiry:'2026-11-30',status:'in-stock'},
  {name:'Ibuprofen 400mg',cat:'analgesics',stock:320,price:6.50,expiry:'2027-01-15',status:'in-stock'},
  {name:'Metformin 500mg',cat:'cardiac',stock:12,price:7.00,expiry:'2026-07-01',status:'low'},
  {name:'Vitamin B12',cat:'vitamins',stock:75,price:42.00,expiry:'2027-02-28',status:'in-stock'},
];

const INVOICES = [
  {inv:'INV-001',patient:'Sarah Mitchell',date:'2026-05-01',items:3,amount:1240,status:'paid'},
  {inv:'INV-002',patient:'Rajan Kapoor',date:'2026-05-02',items:5,amount:3870,status:'unpaid'},
  {inv:'INV-003',patient:'Alex Johnson',date:'2026-05-03',items:2,amount:840,status:'paid'},
  {inv:'INV-004',patient:'Mary Gates',date:'2026-05-03',items:7,amount:5620,status:'unpaid'},
];

const PRESCRIPTIONS = [
  {patient:'Arthur Pendragon',doctor:'Dr. Vance',drug:'Atorvastatin 10mg',qty:30,issued:'2026-05-03 09:45'},
  {patient:'Jordan Xiao',doctor:'Dr. Patel',drug:'Amoxicillin 500mg',qty:14,issued:'2026-05-03 10:30'},
  {patient:'Ananya Sharma',doctor:'Dr. Lee',drug:'Ibuprofen 400mg',qty:20,issued:'2026-05-03 11:15'},
];

const PATIENTS_DB = [
  { name: 'Sarah Mitchell', phone: '+91 9876000011', id: 'P001' },
  { name: 'Rajan Kapoor', phone: '+91 9876000021', id: 'P003' },
  { name: 'Alex Johnson', phone: '+91 9876000031', id: 'P004' },
  { name: 'Mary Gates', phone: '+91 9876000041', id: 'P005' },
  { name: 'Jordan Xiao', phone: '+91 9876000051', id: 'P006' },
  { name: 'Arthur Pendragon', phone: '+91 9876000061', id: 'P007' }
];

let medFilter = 'all';
let billFilter = 'all';

/* --- Medicine Table --- */
function renderMedTable(data = MEDICINES) {
  const tbody = document.getElementById('medTableBody');
  if (!tbody) return;
  const filtered = data.filter(m => medFilter === 'all' || m.cat === medFilter);
  tbody.innerHTML = filtered.map(m => `
    <tr>
      <td style="font-weight:600">${m.name}</td>
      <td><span class="badge-status stable" style="text-transform:capitalize;background:rgba(59,130,246,.1);color:#2563EB">${m.cat}</span></td>
      <td><span style="font-weight:700;color:${m.stock===0?'var(--accent-red)':m.stock<30?'var(--accent-amber)':'var(--accent-green)'}">${m.stock}</span> units</td>
      <td>₹${m.price.toFixed(2)}</td>
      <td style="font-size:.82rem">${m.expiry}</td>
      <td><span class="badge-status ${m.status==='in-stock'?'stable':m.status==='low'?'pending':'critical'}">${m.status==='in-stock'?'In Stock':m.status==='low'?'Low Stock':'Out of Stock'}</span></td>
      <td>
        <button class="icon-btn" onclick="toast('Restocking ${m.name}...','info','refresh')"><span class="material-icons-round">refresh</span></button>
        <button class="icon-btn" onclick="toast('Editing ${m.name}...','info','edit')"><span class="material-icons-round">edit</span></button>
      </td>
    </tr>
  `).join('');
}

function filterMedCategory(btn, cat) {
  document.querySelectorAll('#tab-inventory .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  medFilter = cat;
  renderMedTable();
}

function filterMedTable() {
  const q = document.getElementById('medSearch')?.value.toLowerCase() || '';
  renderMedTable(MEDICINES.filter(m => m.name.toLowerCase().includes(q)));
}

/* --- Prescriptions --- */
function renderPrescriptions() {
  const list = document.getElementById('prescriptionList');
  if (!list) return;
  list.innerHTML = PRESCRIPTIONS.map(p => `
    <div class="rx-card">
      <div class="rx-icon"><span class="material-icons-round">medication</span></div>
      <div class="rx-body">
        <strong>${p.patient}</strong>
        <p>${p.drug} × ${p.qty} tabs · Ordered by ${p.doctor}</p>
        <p style="font-size:.72rem;color:var(--outline);margin-top:3px">${p.issued}</p>
      </div>
      <button class="btn-primary btn-sm" onclick="toast('Dispensed: ${p.drug}','success','check_circle')">Dispense</button>
    </div>
  `).join('');
}

/* --- Billing Table --- */
function renderBillTable() {
  const tbody = document.getElementById('billTableBody');
  if (!tbody) return;
  const filtered = billFilter === 'all' ? INVOICES : INVOICES.filter(i => i.status === billFilter);
  tbody.innerHTML = filtered.map(i => `
    <tr>
      <td><code style="background:var(--surface-mid);padding:2px 6px;border-radius:4px;font-size:.78rem">${i.inv}</code></td>
      <td style="font-weight:600">${i.patient}</td>
      <td style="font-size:.82rem">${i.date}</td>
      <td>${i.items} items</td>
      <td style="font-weight:700;font-family:var(--font-head)">₹${i.amount.toLocaleString()}</td>
      <td><span class="badge-status ${i.status==='paid'?'stable':'pending'}">${i.status==='paid'?'Paid':'Unpaid'}</span></td>
      <td>
        <button class="icon-btn" onclick="viewBill('${i.inv}')"><span class="material-icons-round">visibility</span></button>
        <button class="icon-btn" onclick="printInvoice('${i.inv}')"><span class="material-icons-round">print</span></button>
        ${i.status==='unpaid'?`<button class="btn-primary btn-sm" onclick="markPaid('${i.inv}')">Mark Paid</button>`:''}
      </td>
    </tr>
  `).join('');
}

function filterBill(btn, f) {
  document.querySelectorAll('#tab-billing .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  billFilter = f;
  renderBillTable();
}

function markPaid(inv) {
  const i = INVOICES.find(x => x.inv === inv);
  if (i) { i.status = 'paid'; renderBillTable(); toast(`${inv} marked as paid!`, 'success'); }
}

function viewBill(inv) {
  const i = INVOICES.find(x => x.inv === inv);
  if (!i) return;
  document.getElementById('viewBillContent').innerHTML = `
    <div style="padding:28px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
        <div>
          <h2 style="font-family:var(--font-head);font-size:1.5rem;font-weight:800">Invoice ${i.inv}</h2>
          <p style="color:var(--on-surface-var);font-size:.85rem">${i.date} · ${i.patient}</p>
        </div>
        <span class="badge-status ${i.status==='paid'?'stable':'pending'}" style="font-size:.9rem;padding:6px 16px">${i.status==='paid'?'✓ PAID':'⏳ UNPAID'}</span>
      </div>
      <div style="border:1px solid var(--outline-var);border-radius:var(--radius-md);overflow:hidden;margin-bottom:16px">
        <div style="background:var(--surface-mid);padding:12px 16px;font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em">Wellness Medicals HMS · Tax Invoice</div>
        <div style="padding:16px">
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--surface-mid)"><span>Consultation Fee</span><span style="font-weight:600">₹500.00</span></div>
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--surface-mid)"><span>Medicines & Supplies</span><span style="font-weight:600">₹${(i.amount-500-180).toLocaleString()}.00</span></div>
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--surface-mid)"><span>GST (18%)</span><span style="font-weight:600">₹180.00</span></div>
          <div style="display:flex;justify-content:space-between;padding:12px 0;font-family:var(--font-head);font-size:1.1rem;font-weight:800;color:var(--primary-light)"><span>Total Amount</span><span>₹${i.amount.toLocaleString()}.00</span></div>
        </div>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button class="btn-secondary" onclick="closeModal(null,'viewBillModal')">Close</button>
        <button class="btn-primary" onclick="printInvoice('${i.inv}')"><span class="material-icons-round">print</span> Print</button>
      </div>
    </div>
  `;
  openModal('viewBillModal');
}

/* --- Add Medicine --- */
function submitAddMed(e) {
  e.preventDefault();
  const m = {
    name: document.getElementById('medName').value,
    cat: document.getElementById('medCat').value.toLowerCase(),
    stock: parseInt(document.getElementById('medStock').value),
    price: parseFloat(document.getElementById('medPrice').value)||0,
    expiry: document.getElementById('medExpiry').value || 'N/A',
    status: parseInt(document.getElementById('medStock').value) === 0 ? 'out' :
            parseInt(document.getElementById('medStock').value) < 30 ? 'low' : 'in-stock'
  };
  MEDICINES.unshift(m);
  renderMedTable();
  closeModal(null,'addMedModal');
  toast(`${m.name} added to inventory!`, 'success');
}

/* --- Bill Total --- */
function updateBillTotal() {
  const consult = parseFloat(document.getElementById('billConsult')?.value)||0;
  let itemsTotal = 0;
  document.querySelectorAll('.bill-item-row').forEach(row => {
    const qty = parseFloat(row.querySelector('.item-qty')?.value)||0;
    const price = parseFloat(row.querySelector('.item-price')?.value)||0;
    itemsTotal += qty * price;
  });
  const total = consult + itemsTotal;
  const el = document.getElementById('billTotalAmt');
  if (el) el.textContent = total.toFixed(2);
}

function addBillItem() {
  const container = document.getElementById('billItemsContainer');
  const row = document.createElement('div');
  row.className = 'bill-item-row';
  row.innerHTML = `<input type="text" placeholder="Item name" class="item-name" /><input type="number" placeholder="Qty" class="item-qty" min="1" value="1" oninput="updateBillTotal()" /><input type="number" placeholder="Price" class="item-price" min="0" oninput="updateBillTotal()" /><button type="button" class="icon-btn danger" onclick="this.parentElement.remove();updateBillTotal()"><span class="material-icons-round">delete</span></button>`;
  container.appendChild(row);
}

function submitBill(e) {
  e.preventDefault();
  const patient = document.getElementById('billPatient').value;
  const newInv = { inv: `INV-${String(INVOICES.length+1).padStart(3,'0')}`, patient, date: new Date().toISOString().slice(0,10), items: document.querySelectorAll('.bill-item-row').length+1, amount: parseFloat(document.getElementById('billTotalAmt').textContent)||0, status:'unpaid' };
  INVOICES.unshift(newInv);
  closeModal(null,'generateBillModal');
  switchTab(document.querySelector('.tab-btn:last-child'), 'billing');
  renderBillTable();
  toast(`Invoice ${newInv.inv} generated for ${patient}!`, 'success');
}

function showLowStock() { filterMedCategory(document.querySelector('.filter-chips .chip'), 'all'); }
function filterPharmacy() { filterMedTable(); }

function printInvoice(inv) {
  const i = INVOICES.find(x => x.inv === inv);
  if (!i) { toast('Invoice not found', 'error'); return; }

  const printWindow = window.open('', '_blank');
  
  const html = `
    <html>
      <head>
        <title>Print Invoice - ${i.inv}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
          body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #0d9488; padding-bottom: 20px; }
          .header h1 { margin: 0; color: #0d9488; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
          .header p { margin: 5px 0 0; color: #64748b; font-size: 14px; }
          .patient-info { display: flex; justify-content: space-between; margin-bottom: 30px; background: #f8fafc; padding: 15px 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .patient-info div p { margin: 5px 0; font-size: 14px; }
          .patient-info strong { color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { text-align: left; padding: 12px; background: rgba(13,148,136,0.1); color: #0f172a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #0d9488; }
          td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
          .total-row { font-weight: bold; font-size: 16px; background: #f8fafc; }
          .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px;}
          .status { font-weight: bold; color: ${i.status === 'paid' ? '#059669' : '#dc2626'}; text-transform: uppercase; }
          @media print {
            body { padding: 0; }
            .header { margin-top: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Wellness Medicals</h1>
          <p>123 Health Avenue, Medical District • Phone: +1 (555) 123-4567 • Email: info@wellnessmedicals.com</p>
        </div>
        
        <div style="display:flex; justify-content: space-between; align-items: baseline;">
          <h2 style="margin-top: 0; color: #0f172a;">Tax Invoice</h2>
          <span class="status">${i.status === 'paid' ? 'PAID' : 'UNPAID'}</span>
        </div>
        
        <div class="patient-info">
          <div>
            <p><strong>Patient Name:</strong> ${i.patient}</p>
          </div>
          <div style="text-align: right;">
            <p><strong>Invoice No:</strong> ${i.inv}</p>
            <p><strong>Date:</strong> ${i.date}</p>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Consultation Fee</td>
              <td style="text-align: right;">₹500.00</td>
            </tr>
            <tr>
              <td>Medicines & Supplies</td>
              <td style="text-align: right;">₹${(i.amount - 500 - 180).toLocaleString()}.00</td>
            </tr>
            <tr>
              <td>GST (18%)</td>
              <td style="text-align: right;">₹180.00</td>
            </tr>
            <tr class="total-row">
              <td style="padding-top: 20px; font-size: 18px; color: #0d9488;">Total Amount</td>
              <td style="padding-top: 20px; font-size: 18px; text-align: right; color: #0d9488;">₹${i.amount.toLocaleString()}.00</td>
            </tr>
          </tbody>
        </table>
        
        <div class="footer">
          <p>*** Thank you for choosing Wellness Medicals ***</p>
          <p>This is a computer-generated invoice. No signature is required.</p>
        </div>
        <script>
          window.onload = function() { 
            setTimeout(() => {
              window.print(); 
              window.close(); 
            }, 300);
          }
        </script>
      </body>
    </html>
  `;
  
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

/* --- Patient Autocomplete --- */
function initPatientAutocomplete() {
  const input = document.getElementById('billPatient');
  const dropdown = document.getElementById('billPatientDropdown');
  if (!input || !dropdown) return;

  function renderOptions(query = '') {
    const q = query.toLowerCase();
    const filtered = PATIENTS_DB.filter(p => 
      p.name.toLowerCase().includes(q) || p.phone.includes(q)
    );

    if (filtered.length === 0) {
      dropdown.innerHTML = `<div class="autocomplete-item" style="color:var(--on-surface-var); cursor:default;">No patients found.</div>`;
      return;
    }

    dropdown.innerHTML = filtered.map(p => `
      <div class="autocomplete-item" onclick="selectBillPatient('${p.name} - ${p.phone}')">
        <div class="ac-avatar">${p.name.substring(0,2).toUpperCase()}</div>
        <div class="ac-info">
          <span class="ac-name">${p.name}</span>
          <span class="ac-phone">${p.phone}</span>
        </div>
      </div>
    `).join('');
  }

  input.addEventListener('focus', () => {
    renderOptions(input.value);
    dropdown.classList.add('active');
  });

  input.addEventListener('input', () => {
    renderOptions(input.value);
    dropdown.classList.add('active');
  });

  document.addEventListener('click', (e) => {
    const wrapper = document.getElementById('billPatientAutocomplete');
    if (wrapper && !wrapper.contains(e.target)) {
      dropdown.classList.remove('active');
    }
  });

  window.selectBillPatient = function(val) {
    input.value = val;
    dropdown.classList.remove('active');
  };
}

document.addEventListener('DOMContentLoaded', () => {
  renderMedTable();
  renderPrescriptions();
  renderBillTable();
  initPatientAutocomplete();
  const billDate = document.getElementById('billDate');
  if (billDate) billDate.value = new Date().toISOString().slice(0,10);
});
