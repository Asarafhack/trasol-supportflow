# Trasol SupportFlow 360
### Enterprise Customer Support, Complaint Management & Real-Time Incident Resolution Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110.0-009688.svg?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB.svg?style=flat-square&logo=python&logoColor=white)](https://www.python.org)
[![React](https://img.shields.io/badge/React-18.2-61DAFB.svg?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC.svg?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0-D71F00.svg?style=flat-square&logo=sqlalchemy&logoColor=white)](https://www.sqlalchemy.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com)
[![License](https://img.shields.io/badge/License-Proprietary-slate.svg?style=flat-square)](#-license--intellectual-property)

**SupportFlow 360 (Trasol SupportDesk 360)** is a full-stack, enterprise-grade customer support, warranty management, and real-time incident resolution platform. Built specifically for **Trasol Technologies** to support industrial IoT edge gateways, embedded hardware devices, and enterprise customer service level agreements (SLAs).

---

## 📑 Table of Contents

- [Executive Summary & Value Proposition](#-executive-summary--value-proposition)
- [Target Personas & User Roles](#-target-personas--user-roles)
- [System Architecture](#-system-architecture)
- [Authentication & OTP Workflow](#-authentication--otp-workflow)
- [Ticket Lifecycle & SLA Engine](#-ticket-lifecycle--sla-engine)
- [Technology Stack](#-technology-stack)
- [Repository Structure](#-repository-structure)
- [Quickstart & Local Installation](#-quickstart--local-installation)
- [Environment Configuration](#-environment-configuration)
- [Docker Production Deployment](#-docker-production-deployment)
- [Automated Testing & Verification](#-automated-testing--verification)
- [Security Architecture & Guarantees](#-security-architecture--guarantees)
- [Complete Documentation Index](#-complete-documentation-index)
- [Troubleshooting Common Issues](#-troubleshooting-common-issues)
- [License & Intellectual Property](#-license--intellectual-property)

---

## 🌟 Executive Summary & Value Proposition

### The Business Challenge
Enterprise hardware manufacturers and IoT solution providers face unique challenges in technical customer support:
1. **Disconnected Hardware Ownership**: Tickets often lack verified proof of customer purchase, serial numbers, or active warranty terms.
2. **Delayed Complaint Response**: Critical field hardware failures risk breaching strict client SLA contracts without automated alerts.
3. **Internal Triage Leaks**: Sensitive engineering remarks or root-cause debug notes can inadvertently leak to external clients.
4. **Email Channel Disconnect**: Field engineers replying via standard mobile email clients get detached from centralized ticket systems.

### The SupportFlow 360 Solution
SupportFlow 360 eliminates these operational friction points:
* **Verified Purchase Linking**: Customers link support complaints directly to cryptographically verified customer orders and serialized hardware units.
* **Deterministic Ticket Sequencing**: Thread-safe ticket sequencing (`TKT-YYYY-000001`) with zero numbering collisions.
* **Dual Real-Time Notifications**: Instant automated dispatch of both a customer confirmation email and an executive alert to company administrators upon ticket submission.
* **Staff Note Privacy Invariant**: Internal technician notes (`is_internal: true`) are filtered at the database ORM query level and structurally withheld from customer API serialization.
* **Inbound Email Ingestion**: Regex-driven webhook parser (`[TKT-YYYY-XXXXXX]`) that automatically associates incoming email replies with existing ticket threads.
* **SLA Breach Monitoring**: Real-time SLA tracking across four priority tiers (*Critical*, *High*, *Medium*, *Low*) with automated escalation.
* **Operations Command Center**: Executive intelligence dashboard calculating real-time SLA compliance rates, average resolution times, technician utilization, and one-click audit-ready CSV exports.

---

## 👥 Target Personas & User Roles

| Persona | Primary Interface | Core Responsibilities |
|---|---|---|
| **Customer** | `/customer/dashboard` | Browse purchased hardware, raise tickets linked to orders, participate in real-time chat, reply via email, and rate resolutions. |
| **Support Agent** | `/agent/dashboard` | Triage assigned complaints, conduct live chat, log private internal staff notes, update incident lifecycle statuses, and manage personal SLA metrics. |
| **Operations Admin** | `/admin/dashboard` | Monitor organizational SLA compliance, reassign tickets to technicians, track customer rosters, and export ticket audit CSV reports. |
| **Super Admin** | `/admin/company-settings` | Configure platform branding, define SLA resolution policies, manage email delivery providers, and audit immutable compliance security logs. |

### Verified Demo Credentials
The database contains pre-configured test accounts for evaluation across all roles:

| Role | Email | Password | Permissions & Scope |
|:---|:---|:---|:---|
| **Primary Admin** | `admin@trasol.com` | `trasol2026` | Full platform control, live sync, ticket assignment, email inspection |
| **Super Admin** | `superadmin@trasol.tech` | `Admin@12345` | Complete platform control, company branding, security audit trail |
| **Operations Admin** | `admin@trasol.tech` | `Admin@12345` | Ticket assignment, agent management, SLA policies, email settings |
| **Support Agent 1** | `agent.sarah@trasol.tech` | `Agent@12345` | Hardware diagnostics, customer chat, private internal notes |
| **Support Agent 2** | `agent.david@trasol.tech` | `Agent@12345` | Firmware & wireless gateway tier-2 technical support |
| **Customer** | `customer.john@example.com` | `Customer@12345` | Purchased hardware products, active tickets, mock checkout |

*(An interactive 1-Click Role Switcher is also available directly on the frontend sign-in page).*

---

## 🏗️ System Architecture

SupportFlow 360 utilizes a modern decoupled multi-tier architecture designed for horizontal scalability, zero data loss, and sub-second WebSocket synchronization:

```mermaid
graph TD
    subgraph ClientTier["Presentation Tier (Client Layer)"]
        CP["Customer Portal<br/>(React 18 / Tailwind)"]
        AD["Support Agent Desk<br/>(React 18 / Tailwind)"]
        OC["Operations Command<br/>(Admin Dashboard)"]
        EM["Email Client<br/>(Direct Customer Reply)"]
    end

    subgraph GatewayTier["API Gateway & Real-Time Tier"]
        NGX["Nginx Reverse Proxy<br/>(Port 80 / 443)"]
        FAP["FastAPI Application<br/>(Uvicorn ASGI / Python 3.11)"]
        WSM["WebSocket Connection Manager<br/>(/ws/notifications & /ws/tickets)"]
    end

    subgraph ServiceTier["Core Application Services"]
        AUTH["Auth & OTP Engine<br/>(SHA-256 / 5m Expiry)"]
        TKT["Ticket Lifecycle Engine<br/>(TKT-YYYY-XXXXXX)"]
        SLA["SLA Escalation Engine<br/>(Priority Deadlines)"]
        INB["Inbound Email Webhook<br/>(Regex Parser)"]
        OUT["Transactional Email Dispatcher<br/>(Brevo REST API v3)"]
    end

    subgraph PersistenceTier["Persistence & Integration Tier"]
        DB[("Database<br/>SQLite WAL / PostgreSQL 16")]
        RDS[("Redis 7<br/>Pub/Sub WebSocket Broker")]
        BRV["Brevo Cloud API<br/>(POST /v3/smtp/email)"]
    end

    CP -->|HTTPS / WSS| NGX
    AD -->|HTTPS / WSS| NGX
    OC -->|HTTPS / WSS| NGX
    EM -->|Inbound Webhook| NGX
    NGX --> FAP
    FAP <--> WSM
    FAP --> AUTH
    FAP --> TKT
    FAP --> SLA
    FAP --> INB
    FAP --> OUT
    AUTH --> DB
    TKT --> DB
    SLA --> DB
    INB --> DB
    OUT --> BRV
    OUT --> DB
    WSM <--> RDS
```

*For comprehensive architecture specifications, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).*

---

## 🔐 Authentication & OTP Workflow

The platform provides a dual authentication model combining **Email + Password** and **Email OTP** login, alongside cryptographically secure customer registration:

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant Frontend as React Frontend
    participant API as FastAPI Auth Router
    participant DB as SQLite / PostgreSQL
    participant Brevo as Brevo API v3

    Customer->>Frontend: Fill Registration Form (Name, Email, Phone, Password)
    Frontend->>API: POST /api/v1/auth/register
    Note over API: Generate 6-Digit OTP (secrets.SystemRandom)<br/>Compute SHA-256 Hash<br/>Set 5-Min Expiry & 60s Cooldown
    API->>DB: INSERT User (is_verified=False, verification_otp=hash)
    API->>Brevo: POST https://api.brevo.com/v3/smtp/email
    Brevo-->>API: 201 Created (messageId)
    API-->>Frontend: 201 Created (status="OTP_SENT", dev_otp=None)
    Customer->>Frontend: Enters 6-Digit Code from Email
    Frontend->>API: POST /api/v1/auth/verify-otp
    Note over API: Compare SHA-256(input) == DB hash<br/>Verify Expiry < 5m & Failed Attempts < 5
    API->>DB: UPDATE User (is_verified=True, verification_otp=NULL)
    API->>DB: INSERT RefreshToken
    API->>Brevo: Send Welcome Email & Owner Alert
    API-->>Frontend: 200 OK (access_token, refresh_token, HttpOnly Cookie)
    Frontend->>Customer: Navigate to Customer Dashboard
```

### Security Controls & Specifications
* **Cryptographic Randomness**: Generated via `secrets.SystemRandom().randint(100000, 999999)`.
* **Zero Plaintext Storage**: Stored exclusively as SHA-256 hashes (`hashlib.sha256(otp.encode())`).
* **5-Minute Strict Expiry**: Enforced by comparing `datetime.utcnow() > user.otp_expires_at`.
* **60-Second Resend Cooldown**: Returns `HTTP 429 Too Many Requests` if resend is attempted prematurely.
* **Failed Attempt Lockout**: Maximum 5 attempts. Invalidates the active code on the 5th incorrect attempt.
* **Dual Login**: Supports standard password authentication as well as passwordless OTP verification issuing identical JWT session tokens and HTTP-only cookies.

*For complete security details, see [docs/AUTHENTICATION_AND_SECURITY.md](docs/AUTHENTICATION_AND_SECURITY.md).*

---

## 🎫 Ticket Lifecycle & SLA Engine

```mermaid
stateDiagram-v2
    [*] --> Open: Customer Submits Ticket (Dual Email Dispatched)
    Open --> Assigned: Admin Assigns Support Agent
    Assigned --> InProgress: Agent Begins Diagnostics
    InProgress --> WaitingForCustomer: Agent Requests Logs / Info
    WaitingForCustomer --> InProgress: Customer Replies (Web or Email)
    InProgress --> Resolved: Technical Fault Corrected
    Resolved --> Closed: Customer Submits 1-5 Star Rating & Review
    Open --> Escalated: SLA Breach (sla_deadline passed)
    Assigned --> Escalated: SLA Breach (sla_deadline passed)
    InProgress --> Escalated: SLA Breach (sla_deadline passed)
    Escalated --> Resolved: Tier-3 Engineering Intervention
    Closed --> [*]
```

### SLA Priority Matrix
* **Critical** (Production Down): First response < 15 min | Target resolution < 4 hours.
* **High** (System Degraded): First response < 1 hour | Target resolution < 12 hours.
* **Medium** (Standard Issue): First response < 4 hours | Target resolution < 24 hours.
* **Low** (Inquiry / Non-urgent): First response < 8 hours | Target resolution < 48 hours.

---

## 💻 Technology Stack

### Backend
* **Language & Framework**: Python 3.11, FastAPI 0.110.0, Uvicorn (standard).
* **Database & ORM**: SQLAlchemy 2.0.28, SQLite with WAL mode (local), PostgreSQL 16 Alpine (production).
* **Data Validation**: Pydantic v2 (2.6.4), Pydantic Settings, Email-Validator.
* **Security & Crypto**: Passlib (Bcrypt), Python-Jose (JWT HS256), Python-Multipart.
* **Networking & Async**: HTTPX (0.27.0), WebSockets (12.0).
* **Transactional Email**: Brevo REST API v3 with Transactional Outbox pattern.

### Frontend
* **Core**: React 18.2.0, TypeScript 5.2.2, Vite 5.1.6.
* **Styling**: Tailwind CSS 3.4.1, PostCSS, Autoprefixer.
* **State & Data**: TanStack React Query v5.28.4, React Router v6.22.3.
* **Forms & Validation**: React Hook Form 7.51.1, Zod 3.22.4.
* **Icons & Formatting**: Lucide React 0.363.0, Date-fns 3.6.0.

### Infrastructure & Operations
* **Containers**: Docker Engine, Docker Compose v2, Multi-stage Dockerfiles.
* **Web Server**: Nginx Alpine reverse proxy with Gzip compression and WebSocket upgrades.
* **Real-time Broker**: Redis 7 Alpine Pub/Sub for multi-worker synchronization.

---

## 📁 Repository Structure

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
│   │   ├── api/                # API routers & endpoint controllers
│   │   ├── core/               # Configuration, security & SQLite WAL database
│   │   ├── models/             # SQLAlchemy declarative entities
│   │   ├── schemas/            # Pydantic v2 request/response schemas
│   │   ├── services/           # Brevo email & inbound webhook services
│   │   ├── websockets/         # ConnectionManager & chat room broker
│   │   ├── main.py             # FastAPI entrypoint & middleware
│   │   └── seed.py             # Database seeder (sample hardware & users)
│   ├── tests/                  # Pytest test suite
│   ├── Dockerfile              # Production Python 3.11 container image
│   ├── requirements.txt        # Python pip dependencies
│   ├── test_runner.py          # End-to-end integration test runner
│   ├── test_brevo_auth_flow.py # Brevo API & OTP test suite
│   └── test_admin_login.py     # Admin authentication & dashboard test
└── frontend/
    ├── src/
    │   ├── components/         # Shared UI components
    │   ├── contexts/           # AuthContext & SocketContext
    │   ├── layouts/            # DashboardLayout & PublicLayout
    │   ├── pages/              # Customer, Agent, Admin & Public pages
    │   ├── services/           # Centralized API & WebSocket service
    │   ├── types/              # TypeScript domain types & interfaces
    │   └── App.tsx             # Route definitions & ProtectedRoute guards
    ├── Dockerfile              # Production Nginx multi-stage build
    ├── nginx.conf              # Nginx reverse proxy configuration
    ├── package.json            # Node.js dependencies & scripts
    └── vite.config.ts          # Vite build config & dev proxy
```

---

## 🚀 Quickstart & Local Installation

### Prerequisites
* Python 3.10+ (Recommended: Python 3.11)
* Node.js 18+ (Recommended: Node.js 20 LTS)
* Git 2.30+

### Windows Setup (PowerShell)
```powershell
# 1. Clone repository
git clone https://github.com/Asarafhack/trasol-supportflow.git
Set-Location trasol-supportflow

# 2. Setup backend
Set-Location backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
python app/seed.py
uvicorn app.main:app --reload --port 8000
```
In a second PowerShell terminal:
```powershell
# 3. Setup frontend
Set-Location trasol-supportflow\frontend
npm install
npm run dev
```

### Linux / macOS Setup (Bash / Zsh)
```bash
# 1. Clone repository
git clone https://github.com/Asarafhack/trasol-supportflow.git
cd trasol-supportflow

# 2. Setup backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env
python app/seed.py
uvicorn app.main:app --reload --port 8000
```
In a second Bash terminal:
```bash
# 3. Setup frontend
cd trasol-supportflow/frontend
npm install
npm run dev
```

* **Frontend Web Application**: [http://localhost:5173](http://localhost:5173)
* **Backend API Documentation (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **API Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

## ⚙️ Environment Configuration

Configuration is managed via environment variables. Copy `.env.example` to `.env`:

```env
# Project & Branding
PROJECT_NAME="Trasol SupportDesk 360"
COMPANY_NAME="Trasol Technologies"

# Application URLs
FRONTEND_URL="http://localhost:5173"
BACKEND_URL="http://localhost:8000"
ADMIN_DASHBOARD_URL="http://localhost:5173/admin/tickets"
CUSTOMER_PORTAL_URL="http://localhost:5173/customer/tickets"

# JWT Security
SECRET_KEY="replace-this-with-a-random-32-byte-hex-secret-in-production"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=1440
REFRESH_TOKEN_EXPIRE_DAYS=7

# Database Configuration (SQLite local or PostgreSQL production)
DATABASE_URL="sqlite:///./trasol_supportdesk.db"
# DATABASE_URL="postgresql://trasol_admin:password@localhost:5432/trasol_supportdesk"

# Brevo Transactional Email Integration
BREVO_API_KEY=""
MAIL_FROM="support@trasol.tech"
MAIL_FROM_NAME="Trasol SupportDesk"

# Notification Alerts
ADMIN_NOTIFICATION_EMAIL="owner@trasol.tech"
SUPPORT_INBOX_EMAIL="support@trasol.tech"

# Simulation Mode (Used for offline development/evaluation)
ENABLE_EMAIL_SIMULATION=true
```

> [!IMPORTANT]
> If `BREVO_API_KEY` is omitted, the application transparently logs all outgoing transactional emails to the `email_logs` database table in simulation mode, allowing full evaluation without an external provider.

---

## 🐳 Docker Production Deployment

To run the complete production stack (PostgreSQL 16 + Redis 7 + FastAPI Backend + Nginx Frontend):

```bash
docker-compose up -d --build
```

Access the application at [http://localhost:80](http://localhost:80).

To seed the initial sample data in the Docker container:
```bash
docker-compose exec backend python app/seed.py
```

*For detailed production deployment instructions, see [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md).*

---

## 🧪 Automated Testing & Verification

The codebase includes comprehensive integration and end-to-end test suites:

### 1. Brevo Email & OTP Authentication Suite
Verifies 5-minute expiry, 60s cooldown, 5-attempt lockout, SHA-256 hashing, and dual login flows:
```bash
cd backend
python test_brevo_auth_flow.py
```
```text
=================================================================
ALL 9 BREVO & OTP INTEGRATION TESTS PASSED WITH 100% SUCCESS!
=================================================================
```

### 2. Admin Login & Dashboard Operations Test
Verifies `admin@trasol.com` authentication and live metric retrieval:
```bash
cd backend
python test_admin_login.py
```
```text
=================================================================
ALL ADMIN AUTHENTICATION & DASHBOARD TESTS PASSED WITH 100% SUCCESS!
=================================================================
```

### 3. End-to-End Integration Test Runner
Executes an 11-step integration sequence across checkout, dual emails, private staff notes, and webhook replies:
```bash
cd backend
python test_runner.py
```
```text
=======================================================
ALL 11 END-TO-END INTEGRATION TESTS PASSED 100%!
=======================================================
```

### 4. Pytest Integration Test Suite
```bash
cd backend
pytest tests/test_full_suite.py -v
```

### 5. Frontend Production Build
```bash
cd frontend
npm run build
```
```text
✓ built in ~18s (dist/ generated with 0 errors)
```

---

## 🛡️ Security Architecture & Guarantees

* **Password Security**: Salted Bcrypt password hashing (`passlib[bcrypt]`).
* **Cryptographic OTPs**: CSPRNG generation via `secrets.SystemRandom` with SHA-256 storage.
* **Staff Note Privacy**: Private staff notes are strictly excluded from customer API queries.
* **Cookie Protection**: HTTP-only, `SameSite=Lax` cookies mitigate XSS and CSRF risks.
* **SQLite Concurrency**: Write-Ahead Logging (`WAL`) mode with a 30-second busy timeout prevents concurrency lockouts.
* **Audit Trail**: Non-repudiation audit logging captures all logins, registrations, and administrative interventions.

---

## 📚 Complete Documentation Index

For in-depth operational and engineering guides, refer to the `docs/` documentation directory:

| Document | Purpose & Target Audience |
|---|---|
| [System Architecture](docs/ARCHITECTURE.md) | Multi-tier architectural specifications, component boundaries, and failure modes. |
| [API Reference](docs/API_DOCUMENTATION.md) | Comprehensive REST API endpoints, schemas, WebSockets, and webhook payloads. |
| [Database Design](docs/DATABASE_DESIGN.md) | Detailed SQLAlchemy 2.0 schema, entity specifications, constraints, and ER diagrams. |
| [Authentication & Security](docs/AUTHENTICATION_AND_SECURITY.md) | Cryptographic OTP, Bcrypt, JWT tokens, RBAC permissions matrix, and privacy rules. |
| [Deployment Guide](docs/DEPLOYMENT_GUIDE.md) | Docker Compose orchestration, Linux systemd services, Nginx SSL, and backups. |
| [Developer Guide](docs/DEVELOPER_GUIDE.md) | Local onboarding, project structure, coding standards, and test suites. |
| [User Guide](docs/USER_GUIDE.md) | Role-by-role operational manual for Customers, Agents, and Administrators. |

---

## 🛠️ Troubleshooting Common Issues

### 1. SQLite Database Lock Errors (`database is locked`)
* **Cause**: Interrupted write process or legacy rollback journal mode.
* **Fix**: Ensure WAL mode is active. In [database.py](backend/app/core/database.py), the application automatically executes `PRAGMA journal_mode=WAL;` and sets `timeout: 30.0`. If a stale `trasol_supportdesk.db-journal` file exists from an interrupted script, delete the `.db-journal` file.

### 2. Brevo Email Dispatch Rejections (`HTTP 503` or `HTTP 502`)
* **Cause**: Missing `BREVO_API_KEY` or unverified `MAIL_FROM` address in Brevo.
* **Fix**: Verify your sender email address in your [Brevo Senders Dashboard](https://app.brevo.com/senders). Set `BREVO_API_KEY` and `MAIL_FROM` in `backend/.env`.

### 3. PowerShell Execution Policy Restriction on Windows
* **Cause**: Windows blocks PowerShell script execution by default.
* **Fix**: Run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` before activating `venv`.

---

## 📄 License & Intellectual Property

Copyright &copy; 2026 **Trasol Technologies**. All rights reserved.  
This software and associated documentation files are proprietary to Trasol Technologies. Unauthorized copying, distribution, modification, or deployment without explicit written consent is strictly prohibited.
