# Wellness Medicals – Hospital Management System

<div align="center">
  <img src="public/assets/hms-logo.jpg" alt="Wellness Medicals Logo" width="120" height="120" style="border-radius: 20%;">
  <h3>VitalGlass Ecosystem</h3>
  <p>A modern, full-stack Hospital Management System (HMS) with a premium glassmorphic UI, purpose-built for multi-role healthcare environments.</p>

  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
  [![Express.js](https://img.shields.io/badge/Express.js-4.21-000000?logo=express)](https://expressjs.com)
  [![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com)
  [![Firebase](https://img.shields.io/badge/Firebase-Hosting%20%7C%20Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com)
  [![JWT](https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens)](https://jwt.io)
  [![Styled with CSS3](https://img.shields.io/badge/Style-CSS3%20VitalGlass-1572B6?logo=css3)](https://developer.mozilla.org/en-US/docs/Web/CSS)
</div>

---

## Features

### Role-Based Portals
Five distinct portals, each with a dedicated theme colour and tailored interface:

| Portal      | Theme Colour | Responsibilities |
|-------------|-------------|------------------|
| **Admin**   | Blue (#2563EB) | Personnel, departments, system configuration, audit logs |
| **Doctor**  | Teal (#0D9488) | Consultations, patient history, e-prescriptions |
| **Reception** | Violet (#7C3AED) | Patient registration, appointment scheduling, OPD queue |
| **Pharmacist** | Amber (#D97706) | Inventory, dispensing, purchase requisitions |
| **Lab Tech** | Rose (#E11D48) | Test orders, results entry, printable reports |

### Clinical Workflows
- **Appointment Scheduling** – Interactive calendar with real-time status tracking (confirmed, in-progress, completed, cancelled)
- **Patient Registry** – Centralised records with full medical history, contact info, and visit tracking
- **Consultation Workspace** – Doctor interface with integrated pharmacy, lab ordering, and billing links
- **OPD Queue** – Real-time queue management with token system

### Operations & Inventory
- **Pharmacy Management** – Stock tracking, low-stock alerts, autocomplete search, batch imports via CSV
- **Lab & Diagnostics** – Order tests, record results, and generate professional print-ready reports
- **Purchase Requisitions** – Request and approve inventory orders

### Billing & Finance
- **Automated Billing** – Generate invoices for consultations, medications, and lab tests
- **Transaction Logging** – Track payments with UPI/cash support
- **Revenue Dashboard** – Real-time financial metrics and trends

### Administration & Security
- **Personnel Management** – CRUD for staff, role assignment, department organisation
- **Audit Logging** – Immutable action logs for compliance
- **Role-Based Access Control** – JWT-authenticated sessions with per-route guards
- **Staff Scheduling** – Shift management and attendance tracking

---

## Tech Stack

| Layer       | Technology |
|-------------|-----------|
| **Frontend** | HTML5, CSS3 (VitalGlass design system), Vanilla JavaScript, Chart.js |
| **Backend**  | Node.js, Express.js |
| **Database** | MySQL 8.0 (primary), Firebase Firestore (secondary layer) |
| **Auth**     | JWT (jsonwebtoken + bcryptjs) |
| **Hosting**  | Firebase Hosting |
| **Infrastructure** | 15+ MySQL tables, 15 Firestore composite indexes |

---

## Project Structure

```
Wellness Medicals/
├── public/                          # Frontend (static root)
│   ├── index.html                   # Portal selector / landing page
│   ├── dashboard.html               # Role-based dashboard redirector
│   ├── login-*.html                 # Role-specific login pages
│   ├── *.html                       # Page redirectors (appointments, patients, etc.)
│   ├── assets/
│   │   └── hms-logo.jpg             # Application logo
│   ├── css/
│   │   ├── main.css                 # VitalGlass design system (1678 lines)
│   │   ├── layout.css               # Sidebar, topbar, page shell
│   │   ├── login.css                # Login page styles
│   │   ├── dashboard.css            # Dashboard widgets
│   │   ├── administration.css       # Admin panel styles
│   │   └── *.css                    # Page-specific styles
│   ├── js/
│   │   ├── firebase-init.js         # API client (Express REST + Firebase fallback)
│   │   ├── auth-guard.js            # Role-based session guard
│   │   ├── login.js                 # Login page logic
│   │   ├── dashboard.js             # Dashboard logic
│   │   ├── *.js                     # Page-specific controllers
│   │   └── api.js                   # API helper
│   ├── admin/                       # Admin portal pages
│   ├── doctor/                      # Doctor portal pages
│   ├── staff/                       # Reception portal pages
│   ├── pharmacist/                  # Pharmacy portal pages
│   └── labtech/                     # Lab Tech portal pages
├── server/                          # Backend (Express + MySQL)
│   ├── server.js                    # App entry point
│   ├── config/
│   │   └── db.js                    # MySQL connection pool
│   ├── models/
│   │   ├── schema.sql               # Full database schema (15 tables)
│   │   ├── init-db.js               # Database initialisation script
│   │   ├── seed.js                  # Seed data script
│   │   └── API.md                   # REST API documentation
│   ├── routes/
│   │   ├── auth.js                  # Authentication endpoints
│   │   ├── patients.js              # Patient CRUD
│   │   ├── appointments.js          # Appointment scheduling
│   │   ├── doctors.js               # Doctor management
│   │   ├── pharmacy.js              # Inventory & prescriptions
│   │   ├── lab.js                   # Lab orders & results
│   │   ├── billing.js               # Billing & transactions
│   │   ├── staff.js                 # Staff management
│   │   ├── dashboard.js             # Dashboard statistics
│   │   └── audit.js                 # Audit log endpoints
│   ├── controllers/                 # Route handlers
│   ├── middleware/
│   │   ├── auth.js                  # JWT verification middleware
│   │   ├── errorHandler.js          # Global error handler
│   │   └── validation.js            # Request validation
│   └── services/
│       └── auditService.js          # Audit logging service
├── .env                             # Environment variables
├── .firebaserc                      # Firebase project config
├── firebase.json                    # Firebase hosting & Firestore config
├── firestore.rules                  # Firestore security rules
├── firestore.indexes.json           # Firestore composite indexes
├── package.json                     # NPM dependencies & scripts
└── README.md                        # This file
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- MySQL 8.0
- npm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/arshinmrelju/HMS.git
   cd HMS
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   Edit `.env` in the project root:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=wellness_medicals
   DB_PORT=3306
   JWT_SECRET=your_secret_key
   JWT_EXPIRES_IN=24h
   PORT=3000
   NODE_ENV=development
   ```

4. **Initialise the database**
   ```bash
   npm run db:init
   npm run db:seed
   ```

5. **Start the server**
   ```bash
   npm run dev    # Development with hot-reload (nodemon)
   # or
   npm start      # Production
   ```

6. **Open the application**
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

---

## Design System: VitalGlass

Wellness Medicals features a custom **glassmorphic** design language:

- **Frosted Glass Surfaces** – `backdrop-filter: blur()` with subtle opacity for depth
- **Ambient Lighting** – Dynamic gradient orbs in the background
- **Micro-Interactions** – Smooth transitions, hover lifts, ripple effects
- **Responsive** – Adapts from clinical monitors down to mobile (768px, 480px, 360px breakpoints)
- **Role-Specific Accents** – Each portal gets a unique accent colour applied via CSS variables
- **Typography** – Outfit (headings), Inter (body), Material Icons Round

---

## API Documentation

Full REST API docs are available at [`server/models/API.md`](server/models/API.md).

**Base URL:** `/api`

Key endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Authenticate user |
| GET | `/api/auth/me` | Get current user profile |
| GET | `/api/patients` | List patients (paginated) |
| POST | `/api/appointments` | Create appointment |
| GET | `/api/dashboard/stats` | Dashboard metrics |
| GET | `/api/audit/logs` | Audit trail (admin only) |

---

## Screenshots

<div align="center">
  <p><i>Screenshots coming soon.</i></p>
</div>

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the project
2. Create your feature branch: `git checkout -b feature/AmazingFeature`
3. Commit your changes: `git commit -m 'Add some AmazingFeature'`
4. Push: `git push origin feature/AmazingFeature`
5. Open a Pull Request

---

## License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for more information.

---

<div align="center">
  <p>Built with the VitalGlass design system by Wellness Medicals Team</p>
</div>
