# End-User Operational Manual & Role Guide

## Trasol SupportFlow 360 (SupportDesk 360)

---

## 1. Overview & Role Permissions

**Trasol SupportFlow 360** provides role-tailored workspaces for four distinct user personas:
1. **Customers**: Manage purchased hardware, raise tickets, chat in real time, and reply directly via email.
2. **Support Agents**: Troubleshoot complaints, chat with customers, log private staff notes, and resolve incidents.
3. **Operations Admins**: Assign tickets, monitor SLA compliance, inspect email logs, and track technician utilization.
4. **Super Admins**: Manage company branding, configure SLA policies, and review compliance audit trails.

---

## 2. Customer Portal User Guide

### 2.1 Account Registration & Email OTP Activation
1. Navigate to `http://localhost:5173/register`.
2. Enter your **Full Name**, **Email Address**, **Phone Number**, and **Password**.
3. Click **Send OTP & Register**.
4. Check your email inbox for a message titled:
   `Your Verification OTP Code is [XXXXXX] – Trasol Technologies`.
5. Enter the 6-digit verification code.
6. Once verified, your account is activated and you will be automatically redirected to your Customer Dashboard.

> [!NOTE]
> The verification code is valid for **5 minutes**. If you do not receive the email immediately, you may click **Resend Code** after a 60-second cooldown period.

---

### 2.2 Dual Sign-In Options
When navigating to `http://localhost:5173/login`, you may sign in using either of two methods:
* **Option A: Password Login**: Enter your registered email address and password.
* **Option B: Email OTP Login**: Click the **Email OTP** tab, enter your email address, click **Request Login Code**, and enter the 6-digit code received in your email.

---

### 2.3 Viewing Purchased Hardware & Orders
1. From the sidebar, click **My Products** to inspect hardware equipment, warranty periods, and technical specifications.
2. Click **My Orders** to review historical invoices, order numbers (`ORD-YYYY-XXXX`), and delivery addresses.

---

### 2.4 Raising a Verified Support Ticket
1. Navigate to **Tickets > Raise New Ticket**.
2. Select the relevant **Hardware Product** and **Order ID** from the dropdown menu to link your ticket directly to your verified purchase.
3. Choose an **Issue Category** (e.g. *Hardware & Firmware*, *Cloud Sync*, *Billing*).
4. Select a **Priority** (*Low*, *Medium*, *High*, *Critical*).
5. Provide a descriptive summary and detailed narrative of the technical issue.
6. Click **Submit Ticket**.
7. You will immediately receive a confirmation email with your unique ticket ID (`TKT-YYYY-000001`).

---

### 2.5 Real-Time Communication & Direct Email Replies
* **In-Portal Live Chat**: Open your ticket to chat in real time with your assigned support technician. New messages push instantly without refreshing.
* **Direct Email Replies**: You can reply directly to any ticket notification email from your regular email client (Gmail, Outlook, etc.). As long as the subject contains your ticket number (e.g., `[TKT-2026-000004]`), the system's inbound email parser will automatically append your reply to the ticket thread.

---

### 2.6 Post-Resolution Feedback
Once your issue is marked **Resolved**, a rating card appears on the ticket page. Select a rating from 1 to 5 stars and submit your review to help our engineering team maintain service standards.

---

## 3. Support Agent Workspace Guide

### 3.1 Managing the Incident Queue
1. Log in with your technician credentials.
2. From the **Agent Dashboard**, view tickets assigned directly to you, filtered by priority and SLA deadline.
3. Tickets approaching their SLA deadline are highlighted in amber or red.

---

### 3.2 Public Replies vs. Private Internal Staff Notes
When viewing a ticket in the technician workspace:
* **Public Customer Reply**: Use the standard input box to communicate directly with the customer. The customer receives an in-portal notification and an email update.
* **Internal Staff Note**: Click the **Internal Note (Staff Only)** toggle before sending.
  * Internal notes are rendered with a distinct yellow/amber border.
  * Internal notes are strictly hidden from customers and never transmitted in customer API responses. Use them for circuit diagnostics, firmware checksums, or escalation remarks.

---

### 3.3 Status Lifecycle Transitions
* Click **Mark In Progress** when actively investigating hardware diagnostics.
* Click **Waiting for Customer** if requesting sensor logs or error captures.
* Click **Resolve Ticket** when the technical fault is corrected. The system records the exact resolution timestamp and validates SLA compliance.

---

## 4. Operations Admin & Super Admin Guide

### 4.1 Operations Command Center
Navigate to `/admin/dashboard` to monitor organizational support metrics:
* **Total Tickets & Open Incident Volume**.
* **SLA Compliance Rate (%)**: Percentage of tickets resolved before deadline.
* **Average Resolution Hours**: Mean time to resolve across all categories.
* **Technician Leaderboard**: Real-time breakdown of assigned tickets, resolution counts, and customer feedback ratings per technician.
* **Export to CSV**: Click **Export Report** to download an audit-ready CSV file of all tickets.

---

### 4.2 Ticket Reassignment
1. Navigate to **Admin > Tickets Roster**.
2. Select any unassigned or active ticket.
3. Choose an available support technician from the assignment dropdown and click **Assign**.
4. The technician receives an instant WebSocket push and email notification.

---

### 4.3 Email Delivery Inspection & Audit Trail
* **Email Logs (`/admin/email-settings`)**: Review outbound email delivery status (`SENT`, `SIMULATED_DEV`, `FAILED`), recipient addresses, and Brevo message IDs.
* **Audit Trail (`/admin/audit-logs`)**: Review immutable security logs detailing user logins, IP addresses, role changes, and administrative actions.
