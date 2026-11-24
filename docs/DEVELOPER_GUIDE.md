# Developer Onboarding & Contribution Guide

## Trasol SupportFlow 360 (SupportDesk 360)

---

## 1. Local Environment Setup

### 1.1 Prerequisites
* **Python**: 3.10+ (Recommended: 3.11)
* **Node.js**: 18+ (Recommended: 20 LTS)
* **Package Managers**: `pip` and `npm`
* **Git**: 2.30+

---

### 1.2 Windows Setup (PowerShell)

1. **Clone the repository**:
   ```powershell
   git clone https://github.com/Asarafhack/trasol-supportflow.git
   Set-Location trasol-supportflow
   ```

2. **Backend Setup**:
   ```powershell
   Set-Location backend
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   pip install --upgrade pip
   pip install -r requirements.txt
   Copy-Item .env.example .env
   python app/seed.py
   uvicorn app.main:app --reload --port 8000
   ```

3. **Frontend Setup (Open a second terminal)**:
   ```powershell
   Set-Location frontend
   npm install
   npm run dev
   ```

---

### 1.3 Linux / macOS Setup (Bash / Zsh)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Asarafhack/trasol-supportflow.git
   cd trasol-supportflow
   ```

2. **Backend Setup**:
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install --upgrade pip
   pip install -r requirements.txt
   cp .env.example .env
   python app/seed.py
   uvicorn app.main:app --reload --port 8000
   ```

3. **Frontend Setup (Open a second terminal)**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

* **Frontend URL**: `http://localhost:5173`
* **Backend API / Swagger UI**: `http://localhost:8000/docs`
* **Health Check**: `http://localhost:8000/health`

---

## 2. Project Directory Structure

```text
trasol-supportflow/
├── .env.example                # Unified master environment template
├── .gitignore                  # Git exclusions for secrets, DBs, and artifacts
├── docker-compose.yml          # Multi-container production stack
├── README.md                   # Enterprise root documentation
├── docs/                       # Comprehensive documentation suite
│   ├── ARCHITECTURE.md         # System design & multi-tier decomposition
│   ├── API_DOCUMENTATION.md    # REST & WebSocket endpoints reference
│   ├── DATABASE_DESIGN.md      # Database schema, entities & ER diagrams
│   ├── AUTHENTICATION_AND_SECURITY.md # OTP, Bcrypt, JWT & RBAC controls
│   ├── DEPLOYMENT_GUIDE.md     # Docker & Linux systemd production deployment
│   ├── DEVELOPER_GUIDE.md      # Onboarding, testing & development workflow
│   ├── USER_GUIDE.md           # Role-based user manual (Customer/Agent/Admin)
│   └── images/                 # Architecture & sequence SVG diagrams
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── api_v1.py       # Master API v1 router
│   │   │   ├── deps.py         # Auth, database & role dependencies
│   │   │   └── endpoints/      # Individual feature controllers
│   │   │       ├── admin.py
│   │   │       ├── auth.py
│   │   │       ├── customers.py
│   │   │       ├── inbound.py
│   │   │       ├── knowledge_base.py
│   │   │       ├── notifications.py
│   │   │       ├── products_orders.py
│   │   │       ├── tickets.py
│   │   │       └── ws.py
│   │   ├── core/
│   │   │   ├── config.py       # Pydantic BaseSettings environment loader
│   │   │   ├── database.py     # SQLAlchemy engine, session & WAL setup
│   │   │   └── security.py     # Bcrypt hashing & JWT token generators
│   │   ├── models/
│   │   │   └── entities.py     # SQLAlchemy 2.0 ORM declarative models
│   │   ├── schemas/
│   │   │   └── schemas.py      # Pydantic v2 validation models
│   │   ├── services/
│   │   │   ├── email_service.py # Brevo API v3 & outbox dispatcher
│   │   │   └── inbound_email_service.py # Inbound regex parser
│   │   ├── websockets/
│   │   │   └── manager.py      # WebSocket connection & room manager
│   │   ├── main.py             # FastAPI entrypoint, CORS, startup hooks
│   │   └── seed.py             # Database seeder (sample hardware & users)
│   ├── tests/
│   │   └── test_full_suite.py  # Pytest integration test suite
│   ├── Dockerfile              # Production Python 3.11 container image
│   ├── requirements.txt        # Python pip dependencies
│   ├── test_runner.py          # End-to-end integration test runner
│   ├── test_brevo_auth_flow.py # Brevo API & OTP test suite
│   └── test_admin_login.py     # Admin authentication & dashboard test
└── frontend/
    ├── src/
    │   ├── components/         # Reusable UI widgets
    │   ├── contexts/           # AuthContext & SocketContext
    │   ├── layouts/            # DashboardLayout & PublicLayout
    │   ├── pages/              # Role-specific application views
    │   │   ├── public/         # Landing, Login, Register, KB
    │   │   ├── customer/       # Tickets, Orders, Hardware, Diagnostics
    │   │   ├── agent/          # Ticket detail, performance, profile
    │   │   └── admin/          # Operations dashboard, roster, settings
    │   ├── services/
    │   │   └── api.ts          # Centralized HTTP & WebSocket client
    │   ├── types/
    │   │   └── index.ts        # TypeScript interfaces & domain types
    │   ├── App.tsx             # React Router v6 & ProtectedRoute guards
    │   └── main.tsx            # React root mount
    ├── Dockerfile              # Multi-stage Nginx container build
    ├── nginx.conf              # Production Nginx reverse proxy configuration
    ├── package.json            # Node.js dependencies & build scripts
    └── vite.config.ts          # Vite build config & dev proxy
```

---

## 3. Running Automated Test Suites

### 3.1 Brevo Real Email & OTP Authentication Suite
Verifies 5-minute expiration, 60-second cooldown, failed attempt lockout, SHA-256 hashing, Brevo API payload structure, and dual login flows:
```bash
cd backend
python test_brevo_auth_flow.py
```

### 3.2 Admin Authentication & Operations Dashboard Verification
Verifies `admin@trasol.com` login and live retrieval of Operations Command Center metrics:
```bash
cd backend
python test_admin_login.py
```

### 3.3 End-to-End Integration Test Runner
Executes the full 11-step integration sequence (products, mock checkout, ticket creation, dual email delivery, agent chat, internal staff note privacy, resolution, feedback, and inbound webhook ingestion):
```bash
cd backend
python test_runner.py
```

### 3.4 Pytest Integration Suite
```bash
cd backend
pytest tests/test_full_suite.py -v
```

### 3.5 Frontend Production Build Verification
Executes TypeScript type checking (`tsc`) and Vite bundling:
```bash
cd frontend
npm run build
```
Expected output: `✓ built in ~18s` with `dist/` generated with 0 errors.

---

## 4. Coding Conventions & Best Practices

1. **Strict Type Safety**:
   * Frontend: Enable TypeScript strict mode. Never use `any` when explicit types exist in `src/types/index.ts`.
   * Backend: All endpoints must annotate request bodies, query parameters, and return types with Pydantic schemas.
2. **Staff Note Privacy**: Never expose `is_internal: true` messages to customer endpoints. Always filter messages before serialization.
3. **Never Hardcode Secrets**: Never commit `.env`, API keys, or plaintext passwords. Always read configuration from `app.core.config.settings`.
4. **Database Migration Standard**: When altering schema in `app/models/entities.py`, run SQLite test migrations or Alembic revisions before committing.
