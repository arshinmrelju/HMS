# Wellness Medicals API Documentation

## Base URL: `/api`

All endpoints require JWT authentication via `Authorization: Bearer <token>` header except `/api/auth/login` and `/api/health`.

## Response Format
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```
Error responses:
```json
{
  "success": false,
  "message": "Error description"
}
```
Paginated responses:
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 }
}
```

---

## Authentication

### POST /api/auth/login
Login and receive JWT token.
```json
{ "email": "admin@wellness.com", "password": "admin123" }
```
Response includes `token` and `user` object.

### GET /api/auth/me
Get current authenticated user profile.

### PUT /api/auth/change-password
```json
{ "currentPassword": "old", "newPassword": "new" }
```

---

## Patients

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/patients | List patients (paginated) |
| GET | /api/patients/:id | Get single patient |
| POST | /api/patients | Create patient |
| PUT | /api/patients/:id | Update patient |
| DELETE | /api/patients/:id | Delete patient (Admin only) |

**Query params for GET /api/patients:** `page`, `limit`, `search`, `status`

**POST/PUT body:**
```json
{ "fname": "John", "lname": "Doe", "contact": "1234567890", "email": "john@example.com",
  "department": "Cardiology", "patient_type": "Outpatient", "blood_group": "O+",
  "dob": "1990-01-01", "age": 35, "gender": "Male", "address": "Address", "status": "Active" }
```

---

## Appointments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/appointments | List appointments (paginated) |
| GET | /api/appointments/:id | Get single appointment |
| POST | /api/appointments | Create appointment |
| PUT | /api/appointments/:id | Update appointment |
| DELETE | /api/appointments/:id | Delete (Admin only) |

**Query params:** `page`, `limit`, `date`, `status`, `doctor_id`

**POST/PUT body:**
```json
{ "patient_id": 1, "doctor_id": 2, "appointment_date": "2026-06-03",
  "appointment_time": "10:00", "type": "scheduled", "status": "confirmed", "reason": "Checkup" }
```

---

## Doctors

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/doctors | List all doctors |
| GET | /api/doctors/:id | Get doctor details |
| GET | /api/doctors/:id/patients | Get doctor's patients |
| GET | /api/doctors/:id/appointments | Get doctor's appointments |
| GET | /api/doctors/:id/stats | Get doctor's today stats |
| GET | /api/doctors/:id/prescriptions | Get doctor's prescriptions |
| POST | /api/doctors/prescriptions | Create prescription |

**POST /api/doctors/prescriptions body:**
```json
{ "patient_id": 1, "appointment_id": 1, "diagnosis": "Fever", "notes": "Rest",
  "items": [{ "medicine_name": "Paracetamol", "dosage": "500mg", "frequency": "1-0-1", "duration": "5 days", "quantity": 10 }] }
```

---

## Pharmacy

### Inventory
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/pharmacy/inventory | List inventory (paginated) |
| GET | /api/pharmacy/inventory/:id | Get item |
| POST | /api/pharmacy/inventory | Add item |
| PUT | /api/pharmacy/inventory/:id | Update item |
| DELETE | /api/pharmacy/inventory/:id | Deactivate item |

**Query params:** `page`, `limit`, `search`, `category`, `low_stock`

### Prescriptions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/pharmacy/prescriptions | List pharmacy prescriptions |
| PUT | /api/pharmacy/prescriptions/:id/fill | Dispense prescription |

### Requisitions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/pharmacy/requisitions | List requisitions |
| POST | /api/pharmacy/requisitions | Create requisition |
| PUT | /api/pharmacy/requisitions/:id/approve | Approve (Admin) |
| PUT | /api/pharmacy/requisitions/:id/receive | Receive stock |

---

## Laboratory

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/lab/tests | List lab tests |
| POST | /api/lab/tests | Create lab test (Admin) |
| GET | /api/lab/orders | List lab orders (paginated) |
| POST | /api/lab/orders | Create lab order |
| PUT | /api/lab/orders/:id/status | Update order status |
| PUT | /api/lab/orders/:id/results | Save lab results |
| GET | /api/lab/orders/:id/results | Get lab results |

---

## Billing

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/billing/transactions | List transactions (paginated) |
| GET | /api/billing/transactions/stats | Get billing statistics |
| GET | /api/billing/transactions/:id | Get transaction details |
| POST | /api/billing/transactions | Create transaction |
| PUT | /api/billing/transactions/:id/status | Update payment status |

---

## Staff Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/staff | List all staff |
| GET | /api/staff/roles | List roles |
| GET | /api/staff/schedules | Get staff schedules |
| POST | /api/staff/schedules | Save schedule (Admin) |
| GET | /api/staff/attendance | Get attendance |
| POST | /api/staff/attendance | Mark attendance |
| GET | /api/staff/head-of-staff | Get current head of staff |
| POST | /api/staff/head-of-staff | Assign head of staff (Admin) |
| GET | /api/staff/:id | Get staff member |
| POST | /api/staff | Create staff (Admin) |
| PUT | /api/staff/:id | Update staff (Admin) |
| DELETE | /api/staff/:id | Deactivate staff (Admin) |

---

## Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/dashboard/stats | Get admin dashboard stats |
| GET | /api/dashboard/role-stats | Get role-specific stats |
| GET | /api/dashboard/recent-activity | Get recent activity |

---

## Audit Logs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/audit | List audit logs (Admin only, paginated) |

## Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | Server health check |

---

## Role-Based Access

| Role | Access Level |
|------|-------------|
| Admin | Full access to all endpoints |
| Doctor | Patients, appointments, prescriptions, lab orders |
| Nurse | Patients, appointments, attendance |
| Receptionist | Patients, appointments, billing |
| Pharmacist | Pharmacy inventory, prescriptions, requisitions |
