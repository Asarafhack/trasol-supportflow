# API Reference Documentation

## Trasol SupportFlow 360 (SupportDesk 360)

---

## 1. Overview & Protocol Standards

The **Trasol SupportFlow 360** backend provides a RESTful API built on FastAPI, adhering to OpenAPI 3.1 standards, along with bidirectional WebSocket channels for real-time ticket messaging and notifications.

* **Base URL**: `/api/v1`
* **Interactive Documentation (Swagger UI)**: `http://localhost:8000/docs`
* **Alternative Documentation (ReDoc)**: `http://localhost:8000/redoc`
* **Data Format**: `application/json`
* **Authentication**: JWT Bearer token in the `Authorization` header (`Bearer <access_token>`) or `access_token` HTTP-only cookie.

---

## 2. Authentication & Session Endpoints (`/api/v1/auth`)

### 2.1 Customer Registration with OTP Dispatch
* **Endpoint**: `POST /api/v1/auth/register`
* **Access**: Public
* **Status**: `201 Created`
* **Description**: Creates a new customer account in an unverified state (`is_verified=False`), generates a 6-digit cryptographic OTP, and dispatches it to the customer email via Brevo API v3.
* **Request Body**:
  ```json
  {
    "full_name": "Aarav Sharma",
    "email": "aarav.sharma@example.com",
    "password": "SecurePassword123!",
    "phone": "+919876543210",
    "terms_accepted": true
  }
  ```
* **Response Body (`201 Created`)**:
  ```json
  {
    "status": "OTP_SENT",
    "message": "Verification code sent to aarav.sharma@example.com. Enter the 6-digit code to activate your account.",
    "email": "aarav.sharma@example.com",
    "otp_sent": true,
    "dev_otp": null
  }
  ```
* **Errors**:
  * `400 Bad Request`: User with email already exists and is verified.
  * `429 Too Many Requests`: Resend cooldown active (must wait 60 seconds).
  * `503 Service Unavailable`: Brevo credentials missing in `backend/.env`.

---

### 2.2 Verify Registration or Login OTP
* **Endpoint**: `POST /api/v1/auth/verify-otp`
* **Access**: Public
* **Status**: `200 OK`
* **Description**: Verifies the submitted 6-digit code against the SHA-256 hash in the database. On success, activates the account, invalidates the OTP, sets an HTTP-only cookie, and returns access and refresh JWT tokens.
* **Request Body**:
  ```json
  {
    "email": "aarav.sharma@example.com",
    "otp": "486317"
  }
  ```
* **Response Body (`200 OK`)**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "user": {
      "id": "11c7b8eb-42d4-4904-8899-c72c25d6e5ce",
      "email": "aarav.sharma@example.com",
      "full_name": "Aarav Sharma",
      "phone": "+919876543210",
      "role": "customer",
      "is_active": true,
      "is_verified": true,
      "avatar_url": null,
      "created_at": "2026-11-24T12:00:00Z",
      "profile": {
        "company_name": null,
        "job_title": null,
        "department": null,
        "timezone": "UTC",
        "address": null
      }
    }
  }
  ```
* **Errors**:
  * `400 Bad Request`: Invalid OTP (reports attempts remaining) or OTP expired (> 5 minutes).
  * `429 Too Many Requests`: 5 failed attempts exceeded; OTP invalidated.

---

### 2.3 Resend Registration OTP
* **Endpoint**: `POST /api/v1/auth/resend-otp`
* **Access**: Public
* **Status**: `200 OK`
* **Description**: Dispatches a new 6-digit OTP code to the customer email via Brevo. Enforces a 60-second cooldown.
* **Request Body**:
  ```json
  {
    "email": "aarav.sharma@example.com"
  }
  ```
* **Response Body**:
  ```json
  {
    "status": "OTP_SENT",
    "message": "A new verification code was sent to aarav.sharma@example.com."
  }
  ```

---

### 2.4 Request Email Login OTP (Method B Login)
* **Endpoint**: `POST /api/v1/auth/request-login-otp`
* **Access**: Public
* **Status**: `200 OK`
* **Description**: Initiates passwordless OTP authentication for registered active accounts. Dispatches a 6-digit code with 5-minute validity via Brevo.
* **Request Body**:
  ```json
  {
    "email": "aarav.sharma@example.com"
  }
  ```
* **Response Body**:
  ```json
  {
    "status": "OTP_SENT",
    "message": "Login verification code sent to aarav.sharma@example.com.",
    "email": "aarav.sharma@example.com"
  }
  ```

---

### 2.5 Password Login (Method A Login)
* **Endpoint**: `POST /api/v1/auth/login`
* **Access**: Public
* **Status**: `200 OK`
* **Description**: Authenticates via email and password. Enforces account active check and `is_verified=True` check. Returns access and refresh JWT tokens and sets an HTTP-only cookie.
* **Request Body**:
  ```json
  {
    "email": "admin@trasol.com",
    "password": "trasol2026"
  }
  ```
* **Response Body**: Identical to `POST /verify-otp` Token payload.
* **Errors**:
  * `401 Unauthorized`: Incorrect email or password.
  * `403 Forbidden`: Account email is not verified (directs user to OTP verification).

---

### 2.6 Token Refresh
* **Endpoint**: `POST /api/v1/auth/refresh`
* **Access**: Public
* **Status**: `200 OK`
* **Request Body**:
  ```json
  {
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

---

### 2.7 Current Authenticated User Profile
* **Endpoint**: `GET /api/v1/auth/me`
* **Access**: Authenticated (`customer`, `agent`, `admin`, `super_admin`)
* **Status**: `200 OK`

---

## 3. Tickets & Communication Endpoints (`/api/v1/tickets`)

### 3.1 List Tickets
* **Endpoint**: `GET /api/v1/tickets`
* **Access**: Authenticated
* **Query Parameters**:
  * `status` (string, optional): Filter by status (`Open`, `In Progress`, `Resolved`, `Closed`).
  * `priority` (string, optional): Filter by priority (`Critical`, `High`, `Medium`, `Low`).
  * `category` (string, optional): Filter by category name.
  * `search` (string, optional): Search across ticket numbers, subjects, descriptions.
  * `skip` (int, default: 0), `limit` (int, default: 50).
* **Behavior**:
  * Customers receive only their own tickets.
  * Agents receive assigned tickets or all open tickets.
  * Admins receive all organizational tickets.

---

### 3.2 Create Support Ticket
* **Endpoint**: `POST /api/v1/tickets`
* **Access**: Customer
* **Status**: `201 Created`
* **Description**: Generates a sequential `TKT-YYYY-000001` identifier, computes SLA deadlines, dispatches customer confirmation email, dispatches owner alert email, and notifies online admins via WebSocket.
* **Request Body**:
  ```json
  {
    "subject": "Edge Gateway 4G LTE dropouts in field deployment",
    "category": "Hardware & Firmware",
    "priority": "High",
    "description": "Observed intermittent disconnection every 4 hours on gateway IMEI 864209...",
    "product_id": "prod-uuid",
    "order_id": "order-uuid",
    "preferred_contact_method": "email"
  }
  ```

---

### 3.3 Post Ticket Message / Internal Staff Note
* **Endpoint**: `POST /api/v1/tickets/{ticket_id}/messages`
* **Access**: Authenticated (Customers for public replies; Agents/Admins for replies & staff notes)
* **Status**: `200 OK`
* **Request Body**:
  ```json
  {
    "content": "Diagnostics confirm cellular baseband firmware requires patch v2.4.1.",
    "is_internal": false
  }
  ```
* **Security Rule**: When `is_internal = true`, only `agent`, `admin`, or `super_admin` can submit. If a customer views the ticket, internal staff notes are excluded by the backend query.

---

### 3.4 Assign Ticket to Support Agent
* **Endpoint**: `POST /api/v1/tickets/{ticket_id}/assign`
* **Access**: Admin, Super Admin
* **Request Body**:
  ```json
  {
    "agent_id": "agent-uuid",
    "note": "Assigned to Sarah Connor for tier-2 RF analysis."
  }
  ```

---

### 3.5 Resolve Ticket
* **Endpoint**: `POST /api/v1/tickets/{ticket_id}/resolve`
* **Access**: Agent, Admin, Super Admin
* **Description**: Updates status to `Resolved`, sets `resolved_at` timestamp, checks SLA deadline compliance, and notifies customer via email and WebSocket.

---

### 3.6 Submit Customer Feedback
* **Endpoint**: `POST /api/v1/tickets/{ticket_id}/feedback`
* **Access**: Customer (Owner of the ticket)
* **Request Body**:
  ```json
  {
    "rating": 5,
    "comments": "Prompt resolution and excellent technical guidance."
  }
  ```

---

## 4. Admin & Operations Intelligence (`/api/v1/admin`)

### 4.1 Operations Command Center Analytics
* **Endpoint**: `GET /api/v1/admin/dashboard`
* **Access**: Admin, Super Admin
* **Status**: `200 OK`
* **Response Body**:
  ```json
  {
    "total_tickets": 19,
    "open_tickets": 2,
    "in_progress_tickets": 7,
    "resolved_tickets": 6,
    "unassigned_tickets": 1,
    "overdue_tickets": 0,
    "total_customers": 15,
    "avg_resolution_hours": 3.6,
    "sla_compliance_rate": 85.7,
    "tickets_by_category": [
      {"name": "Hardware & Firmware", "count": 8},
      {"name": "Cloud Sync", "count": 6}
    ],
    "tickets_by_priority": [
      {"name": "Critical", "count": 2},
      {"name": "High", "count": 7}
    ],
    "agent_performance": [
      {
        "agent_id": "agent-uuid",
        "agent_name": "Sarah Connor",
        "assigned_count": 8,
        "resolved_count": 5,
        "avg_rating": 4.8
      }
    ]
  }
  ```

---

### 4.2 Export Tickets to CSV
* **Endpoint**: `GET /api/v1/admin/tickets/export-csv`
* **Access**: Admin, Super Admin
* **Response**: `text/csv` attachment with complete ticket logs, resolution times, and customer IDs.

---

### 4.3 Email Delivery Logs
* **Endpoint**: `GET /api/v1/admin/email-logs`
* **Access**: Admin, Super Admin
* **Query Parameters**: `skip=0`, `limit=50`, `delivery_status=SENT`.
* **Description**: Returns all outgoing transactional emails dispatched via Brevo or logged via simulation.

---

### 4.4 Audit Trail
* **Endpoint**: `GET /api/v1/admin/audit-logs`
* **Access**: Admin, Super Admin
* **Description**: Immutable security log of user logins, role assignments, OTP verifications, and administrative modifications.

---

## 5. Inbound Email Webhook (`/api/v1/inbound/webhook`)

* **Endpoint**: `POST /api/v1/inbound/webhook`
* **Access**: Public Webhook (accepts payloads from SendGrid, Brevo, or Mailgun inbound parsers)
* **Status**: `200 OK`
* **Description**: Parses inbound email subjects for ticket IDs via `r"\[(TKT-\d{4}-\d{6})\]"`. Deduplicates messages using `message_id`. Appends matched reply to ticket conversation and triggers live WebSocket push to the assigned agent.
* **Payload Structure**:
  ```json
  {
    "sender_email": "customer@example.com",
    "sender_name": "John Doe",
    "subject": "Re: [TKT-2026-000004] Gateway firmware update confirmation",
    "body": "Thank you Sarah, the updated firmware resolved our MQTT connectivity issue.",
    "message_id": "<0100018d99f...@smtp.client.com>"
  }
  ```

---

## 6. Real-Time WebSockets (`/ws`)

### 6.1 User Notification Stream
* **URL**: `ws://localhost:8000/ws/notifications?token={jwt}`
* **Events Emitted by Server**:
  * `CONNECTION_ACK`: Sent on successful handshake.
  * `CUSTOMER_REGISTERED`: Broadcast to admins when a new customer verifies their OTP.
  * `TICKET_ASSIGNED`: Sent to an agent when a ticket is assigned.
  * `NOTIFICATION`: User-specific in-app notification.
* **Heartbeat**: Client sends `{"type": "PING"}`; Server replies `{"type": "PONG"}`.

### 6.2 Ticket Chat Room
* **URL**: `ws://localhost:8000/ws/tickets/{ticket_id}?token={jwt}`
* **Events Emitted by Server**:
  * `NEW_MESSAGE`: Real-time public message posted by customer or agent.
  * `STATUS_CHANGED`: Ticket status updated (e.g., to `In Progress` or `Resolved`).
