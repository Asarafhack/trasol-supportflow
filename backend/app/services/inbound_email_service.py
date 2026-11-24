import re
import uuid
import logging
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models.entities import Ticket, TicketMessage, InboundEmail, User, Notification
from app.websockets.manager import ws_manager

logger = logging.getLogger("InboundEmailService")

class InboundEmailService:
    @classmethod
    def extract_ticket_number(cls, subject: str) -> Optional[str]:
        """
        Extracts ticket ID from subject patterns such as:
        - Re: [TKT-2026-000001] Issue description
        - Re: TKT-2026-000001: Refund query
        - [TKT-2026-000001]
        """
        match = re.search(r'TKT-\d{4}-\d{6}', subject, re.IGNORECASE)
        if match:
            return match.group(0).upper()
        return None

    @classmethod
    async def process_incoming_email(
        cls,
        db: Session,
        sender_email: str,
        sender_name: str,
        subject: str,
        body: str,
        message_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Processes an incoming customer reply or enquiry.
        Prevents duplicate imports using provider message_id.
        """
        if not message_id:
            message_id = f"inbound-{uuid.uuid4()}"

        # 1. Prevent duplicate message imports
        existing = db.query(InboundEmail).filter(InboundEmail.message_id == message_id).first()
        if existing:
            return {
                "status": "duplicate_skipped",
                "inbound_id": existing.id,
                "message": "Message already ingested."
            }

        ticket_number = cls.extract_ticket_number(subject)
        matched_ticket = None
        if ticket_number:
            matched_ticket = db.query(Ticket).filter(Ticket.ticket_number == ticket_number).first()

        # Inbound email audit log
        inbound_record = InboundEmail(
            message_id=message_id,
            sender_email=sender_email,
            sender_name=sender_name,
            subject=subject,
            raw_body=body,
            matched_ticket_id=matched_ticket.id if matched_ticket else None,
            is_processed=False,
            processing_notes="",
            created_at=datetime.utcnow()
        )
        db.add(inbound_record)
        db.commit()

        if matched_ticket:
            # Check sender in database
            user = db.query(User).filter(User.email.ilike(sender_email)).first()
            sender_role = user.role if user else "customer"
            sender_display_name = user.full_name if user else sender_name

            # Add message to ticket
            message = TicketMessage(
                ticket_id=matched_ticket.id,
                sender_id=user.id if user else None,
                sender_role=sender_role,
                sender_name=sender_display_name,
                content=f"[Incoming Email Reply]\n{body}",
                is_internal=False,
                is_read=False,
                created_at=datetime.utcnow()
            )
            db.add(message)
            matched_ticket.updated_at = datetime.utcnow()
            inbound_record.is_processed = True
            inbound_record.processing_notes = f"Appended message to {matched_ticket.ticket_number}"

            # Real-time WebSocket delivery
            await ws_manager.broadcast_to_ticket(matched_ticket.id, {
                "type": "NEW_MESSAGE",
                "ticket_id": matched_ticket.id,
                "message": {
                    "id": message.id,
                    "sender_name": sender_display_name,
                    "sender_role": sender_role,
                    "content": message.content,
                    "is_internal": False,
                    "created_at": message.created_at.isoformat()
                }
            })

            # Notify assigned agent in real-time
            if matched_ticket.assigned_agent_id:
                notif = Notification(
                    user_id=matched_ticket.assigned_agent_id,
                    title=f"Incoming Email Reply: {matched_ticket.ticket_number}",
                    message=f"{sender_display_name} sent a reply via email",
                    notification_type="reply_received",
                    link_url=f"/agent/tickets/{matched_ticket.id}"
                )
                db.add(notif)
                await ws_manager.send_to_user(matched_ticket.assigned_agent_id, {
                    "type": "NOTIFICATION",
                    "title": notif.title,
                    "message": notif.message
                })

            db.commit()
            return {
                "status": "matched_and_appended",
                "ticket_number": matched_ticket.ticket_number,
                "inbound_id": inbound_record.id
            }

        else:
            # Unassigned email enquiry: create notification for admin
            admin_notif = Notification(
                role_target="admin",
                title="Unassigned Inbound Email",
                message=f"Received email from {sender_email}: '{subject}'. No matching ticket ID found.",
                notification_type="email_enquiry",
                link_url="/admin/tickets"
            )
            db.add(admin_notif)
            inbound_record.processing_notes = "No matching ticket ID. Logged for admin review."
            db.commit()
            return {
                "status": "unmatched_logged",
                "inbound_id": inbound_record.id,
                "message": "Inbound email logged as unassigned enquiry."
            }
