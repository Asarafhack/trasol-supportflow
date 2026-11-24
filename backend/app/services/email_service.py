import os
import json
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime
from typing import Optional, Dict, Any, List
import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.entities import EmailLog, CompanySettings, OutboxEvent

logger = logging.getLogger("EmailService")

class EmailService:
    @staticmethod
    def _get_company_settings(db: Session) -> Dict[str, Any]:
        company = db.query(CompanySettings).first()
        if company:
            return {
                "company_name": company.company_name or settings.COMPANY_NAME,
                "owner_email": settings.ADMIN_NOTIFICATION_EMAIL or company.owner_notification_email or settings.OWNER_NOTIFICATION_EMAIL,
                "support_inbox": company.support_inbox_email or settings.SUPPORT_INBOX_EMAIL,
                "brevo_key": settings.BREVO_API_KEY or company.brevo_api_key,
                "sender_email": settings.MAIL_FROM or company.brevo_sender_email or settings.BREVO_SENDER_EMAIL,
                "sender_name": settings.MAIL_FROM_NAME or company.brevo_sender_name or settings.BREVO_SENDER_NAME,
            }
        return {
            "company_name": settings.COMPANY_NAME,
            "owner_email": settings.ADMIN_NOTIFICATION_EMAIL,
            "support_inbox": settings.SUPPORT_INBOX_EMAIL,
            "brevo_key": settings.BREVO_API_KEY,
            "sender_email": settings.MAIL_FROM,
            "sender_name": settings.MAIL_FROM_NAME,
        }

    @classmethod
    async def send_email(
        cls,
        db: Session,
        to_email: str,
        subject: str,
        html_content: str,
        recipient_type: str = "customer",
        email_type: str = "general",
        ticket_id: Optional[str] = None,
        require_brevo: bool = False
    ) -> EmailLog:
        """
        Sends transactional email via Brevo Transactional Email API (POST https://api.brevo.com/v3/smtp/email),
        or SMTP fallback if configured, or fails with an explicit HTTPException if required credentials are missing.
        """
        from fastapi import HTTPException, status
        cfg = cls._get_company_settings(db)
        sender_email = cfg["sender_email"]
        sender_name = cfg["sender_name"]
        brevo_key = cfg["brevo_key"]

        delivery_status = "PENDING_RETRY"
        provider = "simulation"
        message_id = None
        error_message = None

        # 1. Try Brevo Transactional Email API if key is present
        if brevo_key and brevo_key.strip() != "":
            provider = "brevo"
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.post(
                        "https://api.brevo.com/v3/smtp/email",
                        headers={
                            "api-key": brevo_key.strip(),
                            "Content-Type": "application/json",
                            "Accept": "application/json",
                        },
                        json={
                            "sender": {"name": sender_name, "email": sender_email},
                            "to": [{"email": to_email}],
                            "subject": subject,
                            "htmlContent": html_content,
                        },
                    )
                    if response.status_code in (200, 201, 202):
                        res_data = response.json()
                        message_id = res_data.get("messageId", f"brevo-{datetime.utcnow().timestamp()}")
                        delivery_status = "SENT"
                    else:
                        error_message = f"Brevo HTTP {response.status_code}: {response.text}"
                        delivery_status = "FAILED"
                        logger.warning(f"Brevo email failed: {error_message}")
                        if require_brevo:
                            raise HTTPException(
                                status_code=status.HTTP_502_BAD_GATEWAY,
                                detail=f"Brevo email dispatch rejected ({response.status_code}): {response.text}"
                            )
            except HTTPException:
                raise
            except Exception as ex:
                error_message = f"Brevo Exception: {str(ex)}"
                delivery_status = "FAILED"
                logger.error(error_message)
                if require_brevo:
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Brevo API connection failed: {str(ex)}"
                    )

        # 2. Try SMTP fallback if Brevo not configured and SMTP is set
        elif settings.SMTP_HOST and settings.SMTP_USERNAME:
            provider = "smtp"
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = f"{sender_name} <{sender_email}>"
                msg["To"] = to_email
                msg.attach(MIMEText(html_content, "html"))

                with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                    server.starttls()
                    server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                    server.sendmail(sender_email, [to_email], msg.as_string())
                delivery_status = "SENT"
                message_id = f"smtp-{datetime.utcnow().timestamp()}"
            except Exception as ex:
                error_message = f"SMTP Exception: {str(ex)}"
                delivery_status = "FAILED"
                logger.error(error_message)
                if require_brevo:
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"SMTP email dispatch failed: {str(ex)}"
                    )

        # 3. If credentials missing:
        else:
            if require_brevo:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Brevo email service is not configured. Please set BREVO_API_KEY and MAIL_FROM in backend/.env to deliver OTP emails."
                )
            provider = "simulation"
            delivery_status = "SIMULATED_DEV"
            message_id = f"sim-{datetime.utcnow().timestamp()}"
            logger.info(f"[SIMULATED EMAIL] To: {to_email} | Subject: {subject}")

        # Record in EmailLog table
        email_log = EmailLog(
            ticket_id=ticket_id,
            recipient_email=to_email,
            recipient_type=recipient_type,
            email_type=email_type,
            subject=subject,
            content_preview=subject + " - " + html_content[:200].replace("\n", " "),
            delivery_status=delivery_status,
            provider=provider,
            message_id=message_id,
            error_message=error_message,
            retry_count=0 if delivery_status in ("SENT", "SIMULATED_DEV") else 1
        )
        db.add(email_log)
        
        # Outbox event record for transaction guarantees
        outbox = OutboxEvent(
            event_type="email_send",
            payload=json.dumps({
                "to_email": to_email,
                "subject": subject,
                "recipient_type": recipient_type,
                "email_type": email_type,
                "ticket_id": ticket_id,
                "delivery_status": delivery_status
            }),
            status="PROCESSED" if delivery_status in ("SENT", "SIMULATED_DEV") else "FAILED",
            last_error=error_message,
            processed_at=datetime.utcnow()
        )
        db.add(outbox)
        db.commit()
        db.refresh(email_log)
        return email_log

    # ------------------ TEMPLATES ------------------

    @classmethod
    async def send_ticket_created_emails(cls, db: Session, ticket: Any, customer: Any) -> List[EmailLog]:
        """
        Required: Sends 2 distinct emails on ticket creation:
        1. Customer confirmation
        2. Company owner new-ticket alert
        """
        cfg = cls._get_company_settings(db)
        company_name = cfg["company_name"]
        owner_email = cfg["owner_email"]

        logs = []

        # Email 1: Customer Confirmation
        customer_subject = f"Your Support Ticket Has Been Created – {ticket.ticket_number}"
        product_name = ticket.product.name if ticket.product else "N/A"
        order_num = ticket.order.order_number if ticket.order else "N/A"

        customer_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }}
            .card {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
            .header {{ background-color: #0f172a; color: #ffffff; padding: 24px; text-align: left; border-bottom: 3px solid #3b82f6; }}
            .header h1 {{ margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }}
            .content {{ padding: 28px 24px; line-height: 1.6; font-size: 15px; }}
            .badge {{ display: inline-block; padding: 4px 10px; border-radius: 9999px; font-weight: 600; font-size: 13px; background: #e0f2fe; color: #0369a1; }}
            .details-box {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 18px; margin: 20px 0; }}
            .row {{ display: flex; justify-content: space-between; margin-bottom: 8px; }}
            .label {{ color: #64748b; font-size: 13px; font-weight: 500; }}
            .val {{ color: #0f172a; font-weight: 600; font-size: 14px; }}
            .btn {{ display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin-top: 15px; }}
            .footer {{ background: #f1f5f9; padding: 16px 24px; font-size: 12px; color: #64748b; text-align: center; }}
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1>{company_name} Support</h1>
            </div>
            <div class="content">
              <p>Hello <strong>{customer.full_name}</strong>,</p>
              <p>Your support request has been successfully registered. Our team has received your details and is actively reviewing the ticket.</p>
              
              <div class="details-box">
                <div class="row"><span class="label">Ticket ID:</span> <span class="val">{ticket.ticket_number}</span></div>
                <div class="row"><span class="label">Product:</span> <span class="val">{product_name}</span></div>
                <div class="row"><span class="label">Order ID:</span> <span class="val">{order_num}</span></div>
                <div class="row"><span class="label">Issue Subject:</span> <span class="val">{ticket.subject}</span></div>
                <div class="row"><span class="label">Category:</span> <span class="val">{ticket.category}</span></div>
                <div class="row"><span class="label">Priority:</span> <span class="val">{ticket.priority}</span></div>
                <div class="row"><span class="label">Current Status:</span> <span class="badge">{ticket.status}</span></div>
              </div>

              <p>You can track the progress, receive real-time updates, and chat with your assigned agent through your customer dashboard.</p>
              
              <p><a href="{settings.CUSTOMER_PORTAL_URL}/{ticket.id}" class="btn" style="color: #ffffff;">View Ticket in Portal</a></p>

              <p style="margin-top: 30px;">Thank you,<br><strong>{company_name} Support Team</strong></p>
            </div>
            <div class="footer">
              &copy; {datetime.utcnow().year} {company_name}. All rights reserved.
            </div>
          </div>
        </body>
        </html>
        """

        log_cust = await cls.send_email(
            db=db,
            to_email=customer.email,
            subject=customer_subject,
            html_content=customer_html,
            recipient_type="customer",
            email_type="ticket_created_customer",
            ticket_id=ticket.id
        )
        logs.append(log_cust)

        # Email 2: Company Owner Notification
        owner_subject = f"New Customer Complaint Received – {ticket.ticket_number}"
        owner_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }}
            .card {{ max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #cbd5e1; overflow: hidden; }}
            .header {{ background-color: #1e293b; color: #ffffff; padding: 20px 24px; border-bottom: 3px solid #ef4444; }}
            .header h2 {{ margin: 0; font-size: 18px; }}
            .content {{ padding: 24px; font-size: 14px; line-height: 1.6; }}
            .meta-table {{ width: 100%; border-collapse: collapse; margin: 15px 0; }}
            .meta-table td {{ padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }}
            .meta-table td.lbl {{ width: 140px; font-weight: 600; color: #64748b; background: #f8fafc; }}
            .desc-box {{ background: #f8fafc; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 15px 0; font-size: 14px; font-style: italic; }}
            .btn {{ display: inline-block; background-color: #0f172a; color: #ffffff; font-weight: 600; text-decoration: none; padding: 10px 20px; border-radius: 6px; }}
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h2>New Customer Support Ticket – {ticket.ticket_number}</h2>
            </div>
            <div class="content">
              <p>Hello Support Team,</p>
              <p>A new customer support ticket has been submitted and requires administrative review or agent assignment.</p>

              <table class="meta-table">
                <tr><td class="lbl">Ticket ID:</td><td><strong>{ticket.ticket_number}</strong></td></tr>
                <tr><td class="lbl">Customer Name:</td><td>{customer.full_name}</td></tr>
                <tr><td class="lbl">Customer Email:</td><td>{customer.email}</td></tr>
                <tr><td class="lbl">Customer Phone:</td><td>{customer.phone or 'Not provided'}</td></tr>
                <tr><td class="lbl">Product:</td><td>{product_name}</td></tr>
                <tr><td class="lbl">Order ID:</td><td>{order_num}</td></tr>
                <tr><td class="lbl">Category:</td><td>{ticket.category}</td></tr>
                <tr><td class="lbl">Priority:</td><td><strong style="color: {'#dc2626' if ticket.priority == 'Critical' else '#ea580c'};">{ticket.priority}</strong></td></tr>
                <tr><td class="lbl">Created At:</td><td>{ticket.created_at.strftime('%Y-%m-%d %H:%M:%S UTC')}</td></tr>
              </table>

              <p><strong>Description:</strong></p>
              <div class="desc-box">
                {ticket.description}
              </div>

              <p style="margin-top: 20px;">
                <a href="{settings.ADMIN_DASHBOARD_URL}/{ticket.id}" class="btn" style="color: #ffffff;">Open in Admin Dashboard</a>
              </p>

              <p style="margin-top: 25px; color: #64748b; font-size: 13px;">Regards,<br>{company_name} Automated Dispatch</p>
            </div>
          </div>
        </body>
        </html>
        """

        log_owner = await cls.send_email(
            db=db,
            to_email=owner_email,
            subject=owner_subject,
            html_content=owner_html,
            recipient_type="owner",
            email_type="ticket_created_owner",
            ticket_id=ticket.id
        )
        logs.append(log_owner)

        return logs

    @classmethod
    async def send_agent_assigned_email(cls, db: Session, ticket: Any, agent: Any) -> EmailLog:
        subject = f"Support Ticket Assigned to You – {ticket.ticket_number}"
        html = f"""
        <div style="font-family: sans-serif; padding: 20px;">
          <h3>Ticket Assigned: {ticket.ticket_number}</h3>
          <p>Hello {agent.full_name},</p>
          <p>You have been assigned to handle support ticket <strong>{ticket.ticket_number}</strong> ({ticket.subject}).</p>
          <p><strong>Priority:</strong> {ticket.priority} | <strong>Category:</strong> {ticket.category}</p>
          <p><a href="{settings.FRONTEND_URL}/agent/tickets/{ticket.id}">View Ticket in Agent Workspace</a></p>
        </div>
        """
        return await cls.send_email(
            db=db,
            to_email=agent.email,
            subject=subject,
            html_content=html,
            recipient_type="agent",
            email_type="agent_assigned",
            ticket_id=ticket.id
        )

    @classmethod
    async def send_status_updated_email(cls, db: Session, ticket: Any, customer: Any, old_status: str, new_status: str) -> EmailLog:
        subject = f"Update on Ticket {ticket.ticket_number} - Status Changed to {new_status}"
        html = f"""
        <div style="font-family: sans-serif; padding: 20px;">
          <h3>Ticket Status Update: {ticket.ticket_number}</h3>
          <p>Hello {customer.full_name},</p>
          <p>The status of your ticket <strong>{ticket.ticket_number}</strong> has changed from <strong>{old_status}</strong> to <strong>{new_status}</strong>.</p>
          <p>Issue: {ticket.subject}</p>
          <p><a href="{settings.CUSTOMER_PORTAL_URL}/{ticket.id}">Check Details in Customer Portal</a></p>
        </div>
        """
        return await cls.send_email(
            db=db,
            to_email=customer.email,
            subject=subject,
            html_content=html,
            recipient_type="customer",
            email_type="status_updated",
            ticket_id=ticket.id
        )

    @classmethod
    async def send_reply_notification(cls, db: Session, ticket: Any, recipient_user: Any, sender_name: str, message_snippet: str) -> EmailLog:
        subject = f"New Reply on Ticket [{ticket.ticket_number}] - {ticket.subject}"
        html = f"""
        <div style="font-family: sans-serif; padding: 20px;">
          <h3>New Message on [{ticket.ticket_number}]</h3>
          <p>Hello {recipient_user.full_name},</p>
          <p><strong>{sender_name}</strong> has replied to ticket <strong>{ticket.ticket_number}</strong>:</p>
          <blockquote style="border-left: 3px solid #3b82f6; padding-left: 10px; color: #475569;">
            {message_snippet}
          </blockquote>
          <p><a href="{settings.FRONTEND_URL}">Reply directly in SupportDesk Portal</a></p>
        </div>
        """
        return await cls.send_email(
            db=db,
            to_email=recipient_user.email,
            subject=subject,
            html_content=html,
            recipient_type=recipient_user.role,
            email_type="reply_notification",
            ticket_id=ticket.id
        )

    @classmethod
    async def send_registration_emails(cls, db: Session, user: Any) -> List[EmailLog]:
        """
        Sends dual emails on user registration:
        1. Welcome & confirmation email to new customer.
        2. Alert notification to company owner / administrator.
        """
        logs = []
        cfg = cls._get_company_settings(db)
        company_name = cfg["company_name"]
        owner_email = cfg["owner_email"]

        # 1. Customer Welcome Email
        cust_subject = f"Welcome to {company_name} – Account Activated"
        cust_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }}
            .card {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }}
            .header {{ background: linear-gradient(135deg, #4f46e5 0%, #312e81 100%); color: #ffffff; padding: 28px 24px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 22px; font-weight: 700; }}
            .content {{ padding: 28px; font-size: 14px; line-height: 1.6; color: #334155; }}
            .info-box {{ background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0; }}
            .info-row {{ display: flex; margin-bottom: 8px; font-size: 13px; }}
            .lbl {{ font-weight: 600; color: #64748b; width: 140px; }}
            .btn {{ display: inline-block; background-color: #4f46e5; color: #ffffff !important; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin-top: 10px; }}
            .footer {{ background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }}
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1>Welcome to {company_name}!</h1>
            </div>
            <div class="content">
              <p>Hello <strong>{user.full_name}</strong>,</p>
              <p>Your customer account has been created and verified. You now have full access to raised tickets, hardware orders, warranty tracking, and live agent chat.</p>
              <div class="info-box">
                <div class="info-row"><span class="lbl">Registered Email:</span> <strong>{user.email}</strong></div>
                <div class="info-row"><span class="lbl">Account Type:</span> <span>Customer</span></div>
                <div class="info-row"><span class="lbl">Phone Number:</span> <span>{user.phone or 'Not provided'}</span></div>
                <div class="info-row"><span class="lbl">Support Inbox:</span> <span>{cfg['support_inbox']}</span></div>
              </div>
              <p style="text-align: center; margin: 24px 0;">
                <a href="{settings.FRONTEND_URL}/login" class="btn">Access Customer Dashboard</a>
              </p>
              <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
                Need assistance? Our support agents and diagnostic tools are available 24/7 to resolve technical queries.
              </p>
            </div>
            <div class="footer">
              &copy; {datetime.utcnow().year} {company_name}. All rights reserved.
            </div>
          </div>
        </body>
        </html>
        """

        log_cust = await cls.send_email(
            db=db,
            to_email=user.email,
            subject=cust_subject,
            html_content=cust_html,
            recipient_type="customer",
            email_type="customer_registered_welcome"
        )
        logs.append(log_cust)

        # 2. Company Owner Alert
        owner_subject = f"New Customer Registered: {user.full_name} ({user.email})"
        owner_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9; padding: 20px; }}
            .card {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #cbd5e1; overflow: hidden; }}
            .header {{ background-color: #0f172a; color: #ffffff; padding: 18px 24px; }}
            .content {{ padding: 24px; font-size: 14px; line-height: 1.6; color: #1e293b; }}
            .tbl {{ width: 100%; border-collapse: collapse; margin: 16px 0; }}
            .tbl td {{ padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }}
            .tbl td.k {{ width: 140px; font-weight: 600; color: #64748b; background: #f8fafc; }}
            .btn {{ display: inline-block; background-color: #4f46e5; color: #ffffff !important; font-weight: 600; text-decoration: none; padding: 10px 20px; border-radius: 6px; }}
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h2 style="margin: 0; font-size: 16px;">New Customer Registered</h2>
            </div>
            <div class="content">
              <p>A new customer has registered on the <strong>{company_name}</strong> portal:</p>
              <table class="tbl">
                <tr><td class="k">Full Name:</td><td><strong>{user.full_name}</strong></td></tr>
                <tr><td class="k">Email Address:</td><td>{user.email}</td></tr>
                <tr><td class="k">Phone:</td><td>{user.phone or 'N/A'}</td></tr>
                <tr><td class="k">Registered At:</td><td>{user.created_at.strftime('%Y-%m-%d %H:%M:%S UTC')}</td></tr>
              </table>
              <p style="margin-top: 20px;">
                <a href="{settings.FRONTEND_URL}/admin/customers" class="btn">View in Admin Customers Roster</a>
              </p>
            </div>
          </div>
        </body>
        </html>
        """

        log_owner = await cls.send_email(
            db=db,
            to_email=owner_email,
            subject=owner_subject,
            html_content=owner_html,
            recipient_type="admin",
            email_type="customer_registered_owner_alert"
        )
        logs.append(log_owner)

        return logs

    @classmethod
    async def send_registration_otp_email(cls, db: Session, user: Any, otp_code: str) -> EmailLog:
        """
        Sends account verification OTP email to customer upon registration.
        """
        cfg = cls._get_company_settings(db)
        company_name = cfg["company_name"]
        subject = f"Your Verification OTP Code is [{otp_code}] – {company_name}"
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }}
            .card {{ max-width: 550px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
            .header {{ background: linear-gradient(135deg, #4f46e5 0%, #312e81 100%); color: #ffffff; padding: 24px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 20px; font-weight: 700; }}
            .content {{ padding: 28px; font-size: 14px; line-height: 1.6; color: #334155; }}
            .otp-box {{ background: #f1f5f9; border: 2px dashed #6366f1; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0; }}
            .otp-code {{ font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #4338ca; }}
            .expiry {{ font-size: 12px; color: #64748b; margin-top: 8px; }}
            .footer {{ background: #f8fafc; padding: 14px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }}
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1>{company_name} Security Verification</h1>
            </div>
            <div class="content">
              <p>Hello <strong>{user.full_name}</strong>,</p>
              <p>Thank you for signing up with {company_name}. Please use the One-Time Password (OTP) below to verify your email address and activate your customer account:</p>
              
              <div class="otp-box">
                <div class="otp-code">{otp_code}</div>
                <div class="expiry">Valid for 5 minutes • Do not share this code</div>
              </div>

              <p style="font-size: 13px; color: #64748b;">
                Enter this code on the registration verification screen to complete your sign in.
              </p>
            </div>
            <div class="footer">
              &copy; {datetime.utcnow().year} {company_name}. Automated Security Dispatch.
            </div>
          </div>
        </body>
        </html>
        """
        return await cls.send_email(
            db=db,
            to_email=user.email,
            subject=subject,
            html_content=html,
            recipient_type="customer",
            email_type="customer_registration_otp",
            require_brevo=True
        )

    @classmethod
    async def send_login_otp_email(cls, db: Session, user: Any, otp_code: str) -> EmailLog:
        """
        Sends account login OTP verification code to customer via Brevo.
        """
        cfg = cls._get_company_settings(db)
        company_name = cfg["company_name"]
        subject = f"Your SupportDesk Login Verification Code is [{otp_code}] – {company_name}"
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }}
            .card {{ max-width: 550px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
            .header {{ background: linear-gradient(135deg, #059669 0%, #065f46 100%); color: #ffffff; padding: 24px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 20px; font-weight: 700; }}
            .content {{ padding: 28px; font-size: 14px; line-height: 1.6; color: #334155; }}
            .otp-box {{ background: #ecfdf5; border: 2px dashed #10b981; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0; }}
            .otp-code {{ font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #065f46; }}
            .expiry {{ font-size: 12px; color: #64748b; margin-top: 8px; }}
            .footer {{ background: #f8fafc; padding: 14px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }}
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1>{company_name} Login Verification</h1>
            </div>
            <div class="content">
              <p>Hello <strong>{user.full_name}</strong>,</p>
              <p>We received a sign-in request for your {company_name} account. Use the 6-digit verification code below to complete your login:</p>
              
              <div class="otp-box">
                <div class="otp-code">{otp_code}</div>
                <div class="expiry">Valid for 5 minutes • Do not share this code</div>
              </div>

              <p style="font-size: 13px; color: #64748b;">
                If you did not initiate this login attempt, please secure your account immediately.
              </p>
            </div>
            <div class="footer">
              &copy; {datetime.utcnow().year} {company_name}. Secure Transactional Authentication.
            </div>
          </div>
        </body>
        </html>
        """
        return await cls.send_email(
            db=db,
            to_email=user.email,
            subject=subject,
            html_content=html,
            recipient_type="customer",
            email_type="customer_login_otp",
            require_brevo=True
        )

    @classmethod
    async def send_free_sms(cls, phone_number: str, message_text: str) -> Dict[str, Any]:
        """
        Sends free SMS using public Textbelt endpoint (1 free text per day without API key)
        with graceful fallback and structured delivery reporting.
        """
        clean_phone = "".join(filter(lambda c: c.isdigit() or c == '+', phone_number))
        if not clean_phone:
            return {"success": False, "status": "INVALID_PHONE", "detail": "No valid phone digits"}

        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.post(
                    "https://textbelt.com/text",
                    data={
                        "phone": clean_phone,
                        "message": message_text,
                        "key": "textbelt"  # Public free tier key
                    }
                )
                if res.status_code == 200:
                    data = res.json()
                    logger.info(f"Free SMS API response for {clean_phone}: {data}")
                    return {
                        "success": data.get("success", False),
                        "status": "SENT" if data.get("success") else "QUOTA_EXCEEDED_OR_LOGGED",
                        "provider": "textbelt_free",
                        "textId": data.get("textId"),
                        "quotaRemaining": data.get("quotaRemaining", 0),
                        "error": data.get("error")
                    }
        except Exception as e:
            logger.warning(f"SMS network dispatch failed: {e}. Falling back to simulation.")

        # Fallback simulation log
        logger.info(f"[SMS SIMULATION] To: {clean_phone} | Msg: {message_text}")
        return {
            "success": True,
            "status": "SIMULATED_FREE_SMS",
            "provider": "sms_simulation",
            "phone": clean_phone,
            "message": message_text
        }
