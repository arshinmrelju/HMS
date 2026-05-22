/* =========================================
   PHARMACY.JS
   ========================================= */
'use strict';
HMS.requireAuth();

let MEDICINES = [];
try {
  const raw = localStorage.getItem('hms_inventory');
  if (raw) {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) {
      MEDICINES = parsed;
    }
  }
} catch(e) { /* ignore parse errors */ }

if (!MEDICINES.length) {
  MEDICINES = [
    {name:'Amoxicillin 500mg',cat:'antibiotics',stock:240,price:12.50,expiry:'2026-12-01',status:'in-stock',safetyStock:50,reorderPoint:95,reorderQty:150},
    {name:'Paracetamol 650mg',cat:'analgesics',stock:18,price:3.20,expiry:'2026-08-15',status:'low',safetyStock:30,reorderPoint:60,reorderQty:200},
    {name:'Atorvastatin 10mg',cat:'cardiac',stock:150,price:28.00,expiry:'2027-03-10',status:'in-stock',safetyStock:25,reorderPoint:50,reorderQty:100},
    {name:'Vitamin D3 60K',cat:'vitamins',stock:0,price:95.00,expiry:'2026-06-20',status:'out',safetyStock:10,reorderPoint:25,reorderQty:50},
    {name:'Ciprofloxacin 500mg',cat:'antibiotics',stock:88,price:18.00,expiry:'2026-11-30',status:'in-stock',safetyStock:40,reorderPoint:80,reorderQty:120},
    {name:'Ibuprofen 400mg',cat:'analgesics',stock:320,price:6.50,expiry:'2027-01-15',status:'in-stock',safetyStock:50,reorderPoint:100,reorderQty:200},
    {name:'Metformin 500mg',cat:'cardiac',stock:12,price:7.00,expiry:'2026-07-01',status:'low',safetyStock:20,reorderPoint:40,reorderQty:100},
    {name:'Vitamin B12',cat:'vitamins',stock:75,price:42.00,expiry:'2027-02-28',status:'in-stock',safetyStock:15,reorderPoint:35,reorderQty:80},
  ];
}

const REQUISITIONS = [
  {id:'PR-2026-001',name:'Vitamin D3 60K',qty:50,date:'2026-05-20',status:'ordered'},
  {id:'PR-2026-002',name:'Paracetamol 650mg',qty:200,date:'2026-05-21',status:'pending'},
  {id:'PR-2026-003',name:'Metformin 500mg',qty:100,date:'2026-05-21',status:'pending'},
];

const NOTIFICATIONS = [
  {time:'07:15 AM',message:'Automated PR-2026-002 generated for Paracetamol 650mg (Stock: 18 units, ROP: 60 units). Alert dispatched to purchasing.',type:'warning'},
  {time:'07:30 AM',message:'Automated PR-2026-003 generated for Metformin 500mg (Stock: 12 units, ROP: 40 units). Alert dispatched to purchasing.',type:'warning'},
];

/* ---- Shared Inventory Bridge ----
   Persist MEDICINES to localStorage so doctors.js (and any other page)
   can read real-time stock without a server round-trip.           */
function saveInventory() {
  try {
    localStorage.setItem('hms_inventory', JSON.stringify(MEDICINES));
  } catch(e) { /* quota errors – silent */ }
}


function medicineName(m) {
  return String(m.name || m.medName || m.medicineName || m.itemName || m.product || '').trim();
}

function medicineCategory(m) {
  return String(m.cat || m.category || m.type || '').trim();
}

function medicineMatches(m, query) {
  const name = medicineName(m).toLowerCase();
  const category = medicineCategory(m).toLowerCase();
  return name.includes(query) || category.includes(query);
}

function populateBillingMedicineDatalist() {
  const datalist = document.getElementById('billingMedicineList');
  if (!datalist) return;
  datalist.innerHTML = MEDICINES
    .filter(m => medicineName(m))
    .map(m => `<option value="${medicineName(m)}"></option>`)
    .join('');
}

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
      <td><span style="font-weight:700;color:${m.stock===0?'var(--accent-red)':m.stock<=m.reorderPoint?'var(--accent-amber)':'var(--accent-green)'}">${m.stock}</span> units</td>
      <td>₹${m.price.toFixed(2)}</td>
      <td style="font-size:.82rem">${m.expiry}</td>
      <td><span class="badge-status ${m.status==='in-stock'?'stable':m.status==='low'?'pending':'critical'}">${m.status==='in-stock'?'In Stock':m.status==='low'?'Low Stock':'Out of Stock'}</span></td>
      <td>
        <button class="icon-btn" onclick="triggerRopCheck('${m.name}')" title="Trigger Automated ROP Check"><span class="material-icons-round">sensors</span></button>
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
  const stock = parseInt(document.getElementById('medStock').value);
  const safetyStock = 30;
  const leadTime = 3;
  const adu = 10;
  const reorderPoint = (adu * leadTime) + safetyStock; // 60
  const reorderQty = 100;
  
  const m = {
    name: document.getElementById('medName').value,
    cat: document.getElementById('medCat').value.toLowerCase(),
    stock: stock,
    price: parseFloat(document.getElementById('medPrice').value)||0,
    expiry: document.getElementById('medExpiry').value || 'N/A',
    safetyStock: safetyStock,
    leadTime: leadTime,
    adu: adu,
    reorderPoint: reorderPoint,
    reorderQty: reorderQty,
    status: stock === 0 ? 'out' : stock <= reorderPoint ? 'low' : 'in-stock'
  };
  MEDICINES.unshift(m);
  saveInventory();  // sync to localStorage for cross-page autofill
  renderMedTable();
  if (typeof renderRopConfigTable === 'function') {
    renderRopConfigTable();
    populateSimMedSelect();
  }
  populateBillingMedicineDatalist();
  closeModal(null,'addMedModal');
  toast(`${m.name} added to inventory!`, 'success');
}

/* --- Bill Total --- */
function renderBillItemMatch(row, match) {
  const status = row.querySelector('.bill-item-status');
  if (!status) return;

  if (!match) {
    status.innerHTML = '';
    return;
  }

  const statusColor = match.status === 'out' ? 'var(--accent-red)' :
                      match.status === 'low' ? 'var(--accent-amber)' :
                      'var(--accent-green)';
  const statusLabel = match.status === 'out' ? 'Out of Stock' :
                      match.status === 'low' ? 'Low Stock' : 'In Stock';
  const qty = parseFloat(row.querySelector('.item-qty')?.value) || 0;
  const unitPrice = Number(match.price || 0);
  const lineAmount = qty * unitPrice;

  status.innerHTML = `
    <span class="bill-match-pill" style="color:${statusColor}">
      ${medicineName(match)} - ${statusLabel} (${match.stock} units) - Unit Rs ${unitPrice.toFixed(2)} - Amount Rs ${lineAmount.toFixed(2)}
    </span>
  `;
}

function updateBillTotal() {
  const consult = parseFloat(document.getElementById('billConsult')?.value)||0;
  let itemsTotal = 0;
  document.querySelectorAll('.bill-item-row').forEach(row => {
    const amount = parseFloat(row.querySelector('.item-price')?.value)||0;
    itemsTotal += amount;
  });
  const total = consult + itemsTotal;
  const el = document.getElementById('billTotalAmt');
  if (el) el.textContent = total.toFixed(2);
}

function updateBillLineAmount(qtyInput) {
  const row = qtyInput.closest('.bill-item-row');
  if (!row) return;

  const amountInput = row.querySelector('.item-price');
  const unitPrice = parseFloat(row.dataset.unitPrice);
  if (amountInput && Number.isFinite(unitPrice)) {
    const qty = parseFloat(qtyInput.value) || 0;
    amountInput.value = (qty * unitPrice).toFixed(2);
    amountInput.dataset.manual = 'false';
    const match = MEDICINES.find(m => medicineName(m).toLowerCase() === (row.dataset.selectedMedicine || '').toLowerCase());
    if (match) renderBillItemMatch(row, match);
  }

  updateBillTotal();
}

function addBillItem() {
  const container = document.getElementById('billItemsContainer');
  const row = document.createElement('div');
  row.className = 'bill-item-row';
  row.innerHTML = `<input type="text" placeholder="Item name" class="item-name" list="billingMedicineList" autocomplete="off" /><input type="number" placeholder="Qty" class="item-qty" min="1" value="1" oninput="updateBillLineAmount(this)" /><input type="number" placeholder="Amount" class="item-price" min="0" oninput="this.dataset.manual='true';updateBillTotal()" /><button type="button" class="icon-btn danger" onclick="this.parentElement.remove();updateBillTotal()"><span class="material-icons-round">delete</span></button><div class="bill-item-status" aria-live="polite"></div>`;
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
  // Initialize ADU and LeadTime for pre-existing items if not set
  MEDICINES.forEach(m => {
    if (m.leadTime === undefined) m.leadTime = 3;
    if (m.adu === undefined) m.adu = Math.round((m.reorderPoint - m.safetyStock) / m.leadTime) || 10;
  });

  // Sync live inventory to localStorage for cross-page autofill
  saveInventory();

  renderMedTable();
  renderPrescriptions();
  renderBillTable();
  initPatientAutocomplete();
  initBillItemAutocomplete();

  // ROP Inits
  renderRopConfigTable();
  renderPrTable();
  renderRopNotifList();
  populateSimMedSelect();

  const billDate = document.getElementById('billDate');
  if (billDate) billDate.value = new Date().toISOString().slice(0,10);
});

/* =========================================
   ROP & PROCUREMENT SYSTEM AUTOMATION
   ========================================= */

function renderRopConfigTable() {
  const tbody = document.getElementById('ropConfigTableBody');
  if (!tbody) return;
  tbody.innerHTML = MEDICINES.map(m => `
    <tr>
      <td style="font-weight:600">${m.name}</td>
      <td><span style="font-weight:700;color:${m.stock===0?'var(--accent-red)':m.stock<=m.reorderPoint?'var(--accent-amber)':'var(--accent-green)'}">${m.stock}</span> units</td>
      <td>${m.safetyStock} units</td>
      <td style="font-weight:600;color:var(--primary-light)">${m.reorderPoint} units</td>
      <td>${m.reorderQty} units</td>
      <td>
        <button class="icon-btn" onclick="openRopConfig('${m.name}')" title="Configure ROP"><span class="material-icons-round">settings</span></button>
      </td>
    </tr>
  `).join('');
}

function populateSimMedSelect() {
  const select = document.getElementById('simMedSelect');
  if (!select) return;
  select.innerHTML = MEDICINES.map(m => `
    <option value="${m.name}">${m.name} (Stock: ${m.stock})</option>
  `).join('');
}

function renderPrTable() {
  const tbody = document.getElementById('prTableBody');
  if (!tbody) return;
  if (REQUISITIONS.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--outline)">No active purchase requisitions</td></tr>`;
    return;
  }
  tbody.innerHTML = REQUISITIONS.map(r => {
    let statusClass = 'pending';
    let statusLabel = 'Pending';
    let actionBtn = '';

    if (r.status === 'ordered') {
      statusClass = 'recovering';
      statusLabel = 'Ordered';
      actionBtn = `<button type="button" class="btn-primary btn-sm" onclick="receiveRopStock('${r.id}')"><span class="material-icons-round">download</span> Receive</button>`;
    } else if (r.status === 'received') {
      statusClass = 'stable';
      statusLabel = 'Received';
    } else {
      // pending
      actionBtn = `<button type="button" class="btn-secondary btn-sm" onclick="approveRopPR('${r.id}')"><span class="material-icons-round">local_shipping</span> Order</button>`;
    }

    return `
      <tr>
        <td style="font-weight:700;font-family:monospace">${r.id}</td>
        <td>${r.name}</td>
        <td><strong>${r.qty}</strong> units</td>
        <td><span class="badge-status ${statusClass}">${statusLabel}</span></td>
        <td>${actionBtn}</td>
      </tr>
    `;
  }).join('');
}

function renderRopNotifList() {
  const list = document.getElementById('ropNotificationList');
  if (!list) return;
  if (NOTIFICATIONS.length === 0) {
    list.innerHTML = `<p style="padding:12px;font-size:.82rem;color:var(--on-surface-var);text-align:center">No alerts logged</p>`;
    return;
  }
  list.innerHTML = NOTIFICATIONS.map(n => `
    <div class="rx-card" style="border-left: 4px solid ${n.type==='error'?'var(--accent-red)':n.type==='warning'?'var(--accent-amber)':n.type==='info'?'var(--accent-blue)':'var(--accent-green)'}; padding: 10px 14px; margin-bottom: 8px;">
      <div class="rx-icon" style="color:${n.type==='error'?'var(--accent-red)':n.type==='warning'?'var(--accent-amber)':n.type==='info'?'var(--accent-blue)':'var(--accent-green)'}; background:rgba(0,0,0,0.03); width:32px; height:32px;">
        <span class="material-icons-round" style="font-size:18px">${n.type==='error'?'error':n.type==='warning'?'sensors':n.type==='info'?'info':'check_circle'}</span>
      </div>
      <div class="rx-body" style="margin-left:-4px">
        <p style="font-size:0.8rem; line-height:1.4; color:var(--on-surface)">${n.message}</p>
        <span style="font-size:0.68rem; color:var(--outline); display:block; margin-top:2px;">${n.time}</span>
      </div>
    </div>
  `).join('');
}

function openRopConfig(medName) {
  const m = MEDICINES.find(x => x.name === medName);
  if (!m) return;
  document.getElementById('ropConfigMedName').value = m.name;
  document.getElementById('ropConfigMedNameHidden').value = m.name;
  document.getElementById('ropConfigSafetyStock').value = m.safetyStock;
  document.getElementById('ropConfigLeadTime').value = m.leadTime || 3;
  document.getElementById('ropConfigAdu').value = m.adu || 10;
  document.getElementById('ropConfigReorderQty').value = m.reorderQty || 100;
  calculateRopValue();
  openModal('configRopModal');
}

function calculateRopValue() {
  const ss = parseInt(document.getElementById('ropConfigSafetyStock').value) || 0;
  const lt = parseInt(document.getElementById('ropConfigLeadTime').value) || 0;
  const adu = parseInt(document.getElementById('ropConfigAdu').value) || 0;
  const calculated = (adu * lt) + ss;
  document.getElementById('ropConfigCalculatedVal').textContent = calculated;
}

function submitRopConfig(e) {
  e.preventDefault();
  const name = document.getElementById('ropConfigMedNameHidden').value;
  const m = MEDICINES.find(x => x.name === name);
  if (!m) return;

  m.safetyStock = parseInt(document.getElementById('ropConfigSafetyStock').value) || 0;
  m.leadTime = parseInt(document.getElementById('ropConfigLeadTime').value) || 0;
  m.adu = parseInt(document.getElementById('ropConfigAdu').value) || 0;
  m.reorderQty = parseInt(document.getElementById('ropConfigReorderQty').value) || 100;
  m.reorderPoint = (m.adu * m.leadTime) + m.safetyStock;

  // Recalculate status
  m.status = m.stock === 0 ? 'out' : m.stock <= m.reorderPoint ? 'low' : 'in-stock';

  renderMedTable();
  renderRopConfigTable();
  populateSimMedSelect();
  closeModal(null, 'configRopModal');
  toast(`ROP parameters updated for ${m.name}!`, 'success');

  // Trigger check in case updated parameters immediately trigger reorder
  checkAndTriggerRop(m);
}

function checkAndTriggerRop(m) {
  if (m.stock <= m.reorderPoint) {
    // Check if there is already an active (pending or ordered) PR for this item
    const activePr = REQUISITIONS.find(r => r.name === m.name && (r.status === 'pending' || r.status === 'ordered'));
    if (!activePr) {
      const prId = `PR-2026-${String(REQUISITIONS.length + 1).padStart(3, '0')}`;
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // Auto generate Requisition
      REQUISITIONS.unshift({
        id: prId,
        name: m.name,
        qty: m.reorderQty,
        date: now.toISOString().slice(0, 10),
        status: 'pending'
      });

      // Log notification
      NOTIFICATIONS.unshift({
        time: timeStr,
        message: `Automated PR generated: ${prId} created for ${m.name} (Stock: ${m.stock} units, ROP: ${m.reorderPoint} units). Alert dispatched to purchasing.`,
        type: m.stock <= m.safetyStock ? 'error' : 'warning'
      });

      // Update UI elements
      renderPrTable();
      renderRopNotifList();
      toast(`Auto-PR ${prId} generated for ${m.name}!`, 'warning', 'sensors');
    }
  }
}

function runDispenseSimulation(e) {
  e.preventDefault();
  const medName = document.getElementById('simMedSelect').value;
  const qty = parseInt(document.getElementById('simDispenseQty').value) || 0;
  const m = MEDICINES.find(x => x.name === medName);
  if (!m) return;

  if (m.stock < qty) {
    toast(`Cannot dispense ${qty} units. Only ${m.stock} available.`, 'error');
    return;
  }

  m.stock -= qty;
  m.status = m.stock === 0 ? 'out' : m.stock <= m.reorderPoint ? 'low' : 'in-stock';

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Log audit or notice
  NOTIFICATIONS.unshift({
    time: timeStr,
    message: `Simulation: Dispensed ${qty} units of ${m.name}. Stock reduced to ${m.stock} units.`,
    type: 'info'
  });

  toast(`Dispensed ${qty} units of ${m.name}`, 'info');

  renderMedTable();
  renderRopConfigTable();
  populateSimMedSelect();
  renderRopNotifList();
  saveInventory();  // sync updated stock levels

  // Run ROP automated trigger check!
  checkAndTriggerRop(m);
}

function triggerRopCheck(name) {
  const m = MEDICINES.find(x => x.name === name);
  if (!m) return;
  toast(`Re-Order Point check triggered for ${m.name}...`, 'info');
  if (m.stock <= m.reorderPoint) {
    checkAndTriggerRop(m);
  } else {
    toast(`${m.name} stock (${m.stock}) is above ROP (${m.reorderPoint}). No PR needed.`, 'success');
  }
}

function approveRopPR(prId) {
  const r = REQUISITIONS.find(x => x.id === prId);
  if (!r) return;
  r.status = 'ordered';
  renderPrTable();
  toast(`Requisition ${prId} approved and ordered from supplier.`, 'success');

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  NOTIFICATIONS.unshift({
    time: timeStr,
    message: `Purchase Requisition ${prId} approved. Order transmitted to supplier.`,
    type: 'info'
  });
  renderRopNotifList();
}

function receiveRopStock(prId) {
  const r = REQUISITIONS.find(x => x.id === prId);
  if (!r) return;
  const m = MEDICINES.find(x => x.name === r.name);
  if (!m) return;

  m.stock += r.qty;
  m.status = m.stock === 0 ? 'out' : m.stock <= m.reorderPoint ? 'low' : 'in-stock';
  r.status = 'received';

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  NOTIFICATIONS.unshift({
    time: timeStr,
    message: `Received ${r.qty} units of ${m.name} from Order ${prId}. Stock level restored to ${m.stock} units.`,
    type: 'success'
  });

  renderMedTable();
  renderRopConfigTable();
  populateSimMedSelect();
  renderPrTable();
  renderRopNotifList();
  saveInventory();  // sync restocked medicine
  toast(`Stock received! Added ${r.qty} units to ${m.name}.`, 'success');
}

function clearRopNotifs() {
  NOTIFICATIONS.length = 0;
  renderRopNotifList();
  toast('Alert log cleared.', 'info');
}

/* =========================================
   BILL ITEM MEDICINE AUTOCOMPLETE
   Connects the Create Invoice form medicine
   fields to the live MEDICINES inventory.
   ========================================= */
function initBillItemAutocomplete() {
  // Attach to dynamically added rows via delegation
  const container = document.getElementById('billItemsContainer');
  if (!container) return;
  populateBillingMedicineDatalist();

  let activeAc = null;

  function closeAc() {
    if (activeAc) { activeAc.remove(); activeAc = null; }
  }

  document.addEventListener('click', (e) => {
    if (!e.target.classList.contains('item-name')) closeAc();
  });

  function setBillItemMatch(row, match) {
    renderBillItemMatch(row, match);
  }

  function applyBillMedicine(input, match, forceName = false) {
    const row = input.closest('.bill-item-row');
    if (!row || !match) return;

    if (forceName) input.value = medicineName(match);
    row.dataset.selectedMedicine = medicineName(match);
    row.dataset.unitPrice = Number(match.price || 0).toFixed(2);
    setBillItemMatch(row, match);

    const amountInput = row.querySelector('.item-price');
    const qty = parseFloat(row.querySelector('.item-qty')?.value) || 0;
    if (amountInput && match.status !== 'out') {
      amountInput.value = (qty * Number(match.price || 0)).toFixed(2);
      amountInput.dataset.manual = 'false';
      setBillItemMatch(row, match);
    }

    updateBillTotal();

    if (match.status === 'out') {
      toast(`${medicineName(match)} is out of stock!`, 'error');
    }
  }

  container.addEventListener('input', (e) => {
    if (!e.target.classList.contains('item-name')) return;
    const input = e.target;
    closeAc();
    const val = input.value.trim().toLowerCase();
    const row = input.closest('.bill-item-row');
    if (!row) return;
    if (!val) {
      setBillItemMatch(row, null);
      return;
    }

    const matches = MEDICINES.filter(m =>
      medicineName(m) && medicineMatches(m, val)
    );
    if (!matches.length) {
      setBillItemMatch(row, null);
      return;
    }

    row.style.position = 'relative';
    const exactMatch = matches.find(m => medicineName(m).toLowerCase() === val);
    applyBillMedicine(input, exactMatch || matches[0], false);

    const dd = document.createElement('div');
    dd.className = 'autocomplete-dropdown glass-card';
    dd.style.cssText = 'position:absolute;top:100%;left:0;width:280px;z-index:9999;max-height:220px;overflow-y:auto;';

    matches.forEach(m => {
      const statusColor = m.status === 'out' ? 'var(--accent-red)' :
                          m.status === 'low' ? 'var(--accent-amber)' :
                          'var(--accent-green)';
      const statusLabel = m.status === 'out' ? 'Out of Stock' :
                          m.status === 'low' ? 'Low Stock' : 'In Stock';
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      if (m.status === 'out') item.style.opacity = '0.55';
      item.innerHTML = `
        <div style="font-weight:600;font-size:.88rem">${medicineName(m)}</div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:2px">
          <span style="font-size:.72rem;font-weight:700;color:${statusColor}">${statusLabel} (${m.stock} units)</span>
          <span style="font-size:.72rem;color:var(--outline)">₹${m.price.toFixed(2)}</span>
        </div>
      `;
      item.addEventListener('mousedown', (ev) => {
        ev.preventDefault();
        applyBillMedicine(input, m, true);
        closeAc();
      });
      dd.appendChild(item);
    });

    row.appendChild(dd);
    activeAc = dd;
  });
}
