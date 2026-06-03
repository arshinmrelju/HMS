CREATE DATABASE IF NOT EXISTS wellness_medicals
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE wellness_medicals;

-- ============================================================
-- USERS & AUTH
-- ============================================================
CREATE TABLE roles (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(150) NOT NULL,
  title         VARCHAR(100) DEFAULT '',
  phone         VARCHAR(20) DEFAULT '',
  role_id       INT NOT NULL,
  is_active     TINYINT(1) DEFAULT 1,
  last_login    DATETIME DEFAULT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB;

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role_id);

-- ============================================================
-- PATIENTS
-- ============================================================
CREATE TABLE patients (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  fname           VARCHAR(100) NOT NULL,
  lname           VARCHAR(100) NOT NULL,
  contact         VARCHAR(20) DEFAULT '',
  email           VARCHAR(255) DEFAULT '',
  department      VARCHAR(100) DEFAULT '',
  patient_type    VARCHAR(50) DEFAULT 'Outpatient',
  blood_group     VARCHAR(10) DEFAULT '',
  dob             DATE DEFAULT NULL,
  age             INT DEFAULT NULL,
  gender          VARCHAR(10) DEFAULT '',
  address         TEXT DEFAULT NULL,
  last_visit      DATETIME DEFAULT NULL,
  status          VARCHAR(50) DEFAULT 'Active',
  doctor_id       INT DEFAULT NULL,
  created_by      INT DEFAULT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_patients_name ON patients(fname, lname);
CREATE INDEX idx_patients_contact ON patients(contact);
CREATE INDEX idx_patients_status ON patients(status);
CREATE INDEX idx_patients_doctor ON patients(doctor_id);

-- ============================================================
-- APPOINTMENTS
-- ============================================================
CREATE TABLE appointments (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  patient_id      INT NOT NULL,
  doctor_id       INT DEFAULT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME DEFAULT NULL,
  type            VARCHAR(50) DEFAULT 'scheduled',
  status          VARCHAR(50) DEFAULT 'scheduled',
  reason          TEXT DEFAULT NULL,
  notes           TEXT DEFAULT NULL,
  created_by      INT DEFAULT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_appt_date ON appointments(appointment_date);
CREATE INDEX idx_appt_patient ON appointments(patient_id);
CREATE INDEX idx_appt_doctor ON appointments(doctor_id);
CREATE INDEX idx_appt_status ON appointments(status);

-- ============================================================
-- PRESCRIPTIONS
-- ============================================================
CREATE TABLE prescriptions (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  patient_id      INT NOT NULL,
  doctor_id       INT NOT NULL,
  appointment_id  INT DEFAULT NULL,
  diagnosis       TEXT DEFAULT NULL,
  notes           TEXT DEFAULT NULL,
  status          VARCHAR(50) DEFAULT 'active',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_rx_patient ON prescriptions(patient_id);
CREATE INDEX idx_rx_doctor ON prescriptions(doctor_id);

CREATE TABLE prescription_items (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  prescription_id INT NOT NULL,
  medicine_name   VARCHAR(255) NOT NULL,
  dosage          VARCHAR(100) DEFAULT '',
  frequency       VARCHAR(100) DEFAULT '',
  duration        VARCHAR(100) DEFAULT '',
  quantity        INT DEFAULT 0,
  instructions    TEXT DEFAULT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_rx_item_prescription ON prescription_items(prescription_id);

-- ============================================================
-- PHARMACY INVENTORY
-- ============================================================
CREATE TABLE inventory (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  brand_name      VARCHAR(255) NOT NULL,
  content         VARCHAR(255) DEFAULT '',
  category        VARCHAR(100) DEFAULT '',
  distributor     VARCHAR(255) DEFAULT '',
  purchase_date   DATE DEFAULT NULL,
  expiry_date     DATE DEFAULT NULL,
  quantity        INT DEFAULT 0,
  unit            VARCHAR(50) DEFAULT 'piece',
  cost_price      DECIMAL(12,2) DEFAULT 0.00,
  selling_price   DECIMAL(12,2) DEFAULT 0.00,
  mrp             DECIMAL(12,2) DEFAULT 0.00,
  reorder_level   INT DEFAULT 10,
  is_active       TINYINT(1) DEFAULT 1,
  created_by      INT DEFAULT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_inv_name ON inventory(brand_name);
CREATE INDEX idx_inv_category ON inventory(category);
CREATE INDEX idx_inv_expiry ON inventory(expiry_date);
CREATE INDEX idx_inv_reorder ON inventory(reorder_level);

-- ============================================================
-- LABORATORY
-- ============================================================
CREATE TABLE lab_tests (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  category        VARCHAR(100) DEFAULT '',
  normal_range    VARCHAR(255) DEFAULT '',
  unit            VARCHAR(50) DEFAULT '',
  price           DECIMAL(12,2) DEFAULT 0.00,
  is_active       TINYINT(1) DEFAULT 1,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE lab_orders (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  patient_id      INT NOT NULL,
  doctor_id       INT DEFAULT NULL,
  test_id         INT DEFAULT NULL,
  test_name       VARCHAR(255) NOT NULL,
  status          VARCHAR(50) DEFAULT 'ordered',
  priority        VARCHAR(20) DEFAULT 'normal',
  notes           TEXT DEFAULT NULL,
  ordered_by      INT DEFAULT NULL,
  processed_by    INT DEFAULT NULL,
  ordered_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at    DATETIME DEFAULT NULL,
  completed_at    DATETIME DEFAULT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (test_id) REFERENCES lab_tests(id) ON DELETE SET NULL,
  FOREIGN KEY (ordered_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_lab_patient ON lab_orders(patient_id);
CREATE INDEX idx_lab_status ON lab_orders(status);
CREATE INDEX idx_lab_date ON lab_orders(ordered_at);

CREATE TABLE lab_results (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  lab_order_id    INT NOT NULL,
  parameter       VARCHAR(255) NOT NULL,
  value           VARCHAR(255) DEFAULT '',
  normal_range    VARCHAR(255) DEFAULT '',
  unit            VARCHAR(50) DEFAULT '',
  remarks         TEXT DEFAULT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_order_id) REFERENCES lab_orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_lab_result_order ON lab_results(lab_order_id);

-- ============================================================
-- BILLING / TRANSACTIONS
-- ============================================================
CREATE TABLE transactions (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  patient_id      INT DEFAULT NULL,
  invoice_no      VARCHAR(50) DEFAULT NULL UNIQUE,
  type            VARCHAR(50) DEFAULT 'consultation',
  description     TEXT DEFAULT NULL,
  amount          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  discount        DECIMAL(12,2) DEFAULT 0.00,
  tax             DECIMAL(12,2) DEFAULT 0.00,
  total           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  payment_method  VARCHAR(50) DEFAULT 'cash',
  payment_status  VARCHAR(50) DEFAULT 'pending',
  upi_transaction_id VARCHAR(255) DEFAULT NULL,
  created_by      INT DEFAULT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_txn_patient ON transactions(patient_id);
CREATE INDEX idx_txn_status ON transactions(payment_status);
CREATE INDEX idx_txn_date ON transactions(created_at);
CREATE INDEX idx_txn_invoice ON transactions(invoice_no);

CREATE TABLE transaction_items (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id  INT NOT NULL,
  item_name       VARCHAR(255) NOT NULL,
  quantity        INT DEFAULT 1,
  unit_price      DECIMAL(12,2) DEFAULT 0.00,
  total_price     DECIMAL(12,2) DEFAULT 0.00,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_txn_item_txn ON transaction_items(transaction_id);

-- ============================================================
-- STAFF ATTENDANCE
-- ============================================================
CREATE TABLE attendance (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  date            DATE NOT NULL,
  check_in        DATETIME DEFAULT NULL,
  check_out       DATETIME DEFAULT NULL,
  status          VARCHAR(50) DEFAULT 'present',
  notes           TEXT DEFAULT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_attendance_user_date (user_id, date)
) ENGINE=InnoDB;

CREATE INDEX idx_att_date ON attendance(date);
CREATE INDEX idx_att_user ON attendance(user_id);

-- ============================================================
-- STAFF SCHEDULES
-- ============================================================
CREATE TABLE staff_schedules (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  day_of_week     TINYINT NOT NULL COMMENT '0=Sun,1=Mon,...6=Sat',
  shift_start     TIME DEFAULT NULL,
  shift_end       TIME DEFAULT NULL,
  is_active       TINYINT(1) DEFAULT 1,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_schedule_user_day (user_id, day_of_week)
) ENGINE=InnoDB;

CREATE INDEX idx_sched_user ON staff_schedules(user_id);

-- ============================================================
-- HEAD OF STAFF
-- ============================================================
CREATE TABLE head_of_staff (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  assigned_date   DATE NOT NULL,
  week_start      DATE NOT NULL,
  week_end        DATE NOT NULL,
  is_current      TINYINT(1) DEFAULT 1,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_hos_current ON head_of_staff(is_current);

-- ============================================================
-- PURCHASE REQUISITIONS
-- ============================================================
CREATE TABLE purchase_requisitions (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  inventory_id    INT DEFAULT NULL,
  item_name       VARCHAR(255) NOT NULL,
  quantity_needed INT NOT NULL,
  status          VARCHAR(50) DEFAULT 'pending',
  approved_by     INT DEFAULT NULL,
  approved_at     DATETIME DEFAULT NULL,
  received_at     DATETIME DEFAULT NULL,
  notes           TEXT DEFAULT NULL,
  created_by      INT DEFAULT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_pr_status ON purchase_requisitions(status);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE audit_logs (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT DEFAULT NULL,
  action          VARCHAR(100) NOT NULL,
  resource_type   VARCHAR(100) DEFAULT '',
  resource_id     VARCHAR(100) DEFAULT '',
  details         TEXT DEFAULT NULL,
  ip_address      VARCHAR(45) DEFAULT '',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_date ON audit_logs(created_at);
CREATE INDEX idx_audit_user ON audit_logs(user_id);

-- ============================================================
-- WARDS / BEDS
-- ============================================================
CREATE TABLE wards (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,
  ward_type       VARCHAR(50) DEFAULT 'general',
  total_beds      INT DEFAULT 0,
  available_beds  INT DEFAULT 0,
  is_active       TINYINT(1) DEFAULT 1,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE bed_assignments (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  ward_id         INT NOT NULL,
  bed_number      VARCHAR(20) NOT NULL,
  patient_id      INT DEFAULT NULL,
  assigned_at     DATETIME DEFAULT NULL,
  discharged_at   DATETIME DEFAULT NULL,
  status          VARCHAR(50) DEFAULT 'available',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (ward_id) REFERENCES wards(id) ON DELETE CASCADE,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_bed_ward ON bed_assignments(ward_id);
CREATE INDEX idx_bed_patient ON bed_assignments(patient_id);
CREATE INDEX idx_bed_status ON bed_assignments(status);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT DEFAULT NULL,
  title           VARCHAR(255) NOT NULL,
  message         TEXT DEFAULT NULL,
  type            VARCHAR(50) DEFAULT 'info',
  is_read         TINYINT(1) DEFAULT 0,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_notif_user ON notifications(user_id);
CREATE INDEX idx_notif_read ON notifications(is_read);
