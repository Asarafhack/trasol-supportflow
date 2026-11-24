import re
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.models.entities import (
    Ticket, TicketMessage, TicketStatusHistory, TicketAssignment,
    TicketFeedback, Notification, SLAPolicy, Order, Product, User,
    AgentAvailability, AuditLog
)
from app.schemas.schemas import TicketCreate
from app.services.email_service import EmailService
from app.websockets.manager import ws_manager

class TicketService:
    @staticmethod
    def generate_ticket_number(db: Session) -> str:
        """
        Concurrency-safe ticket sequence generator: TKT-YYYY-000001
        """
        current_year = datetime.utcnow().year
        prefix = f"TKT-{current_year}-"
        
        # Query highest ticket number for current year
        last_ticket = (
            db.query(Ticket)
            .filter(Ticket.ticket_number.like(f"{prefix}%"))
            .order_by(desc(Ticket.ticket_number))
            .first()
        )
        
        if last_ticket and last_ticket.ticket_number:
            match = re.search(r'TKT-\d{4}-(\d+)', last_ticket.ticket_number)
            if match:
                last_seq = int(match.group(1))
                new_seq = last_seq + 1
            else:
                new_seq = 1
        else:
            new_seq = 1
            
        return f"{prefix}{new_seq:06d}"

    @staticmethod
    def calculate_sla_deadline(db: Session, priority: str) -> datetime:
        policy = db.query(SLAPolicy).filter(SLAPolicy.priority == priority, SLAPolicy.is_active == True).first()
        now = datetime.utcnow()
        if policy:
            return now + timedelta(hours=policy.resolution_hours)
        
        # Default policies
        defaults = {
            "Critical": 4,
            "High": 12,
            "Medium": 24,
            "Low": 48
        }
        hours = defaults.get(priority, 24)
        return now + timedelta(hours=hours)

    @classmethod
    def find_best_agent(cls, db: Session, category: str) -> Optional[User]:
        """Auto-assignment based on availability and workload."""
        agents = (
            db.query(User)
            .join(AgentAvailability, AgentAvailability.user_id == User.id, isouter=True)
            .filter(User.role == "agent", User.is_active == True)
            .all()
        )
        if not agents:
            return None
        
        # Sort by active tickets count
        def agent_workload(agent: User):
            active_count = (
                db.query(Ticket)
                .filter(
                    Ticket.assigned_agent_id == agent.id,
                    Ticket.status.in_(["Assigned", "In Progress", "Waiting for Customer"])
                )
                .count()
            )
            return active_count

        agents.sort(key=agent_workload)
        return agents[0]

    @classmethod
    def check_duplicate_ticket(cls, db: Session, customer_id: str, subject: str, product_id: Optional[str] = None) -> bool:
        """Checks for similar unresolved tickets from this customer in the past 48 hours."""
        since = datetime.utcnow() - timedelta(hours=48)
        query = (
            db.query(Ticket)
            .filter(
                Ticket.customer_id == customer_id,
                Ticket.status.notin_(["Resolved", "Closed"]),
                Ticket.created_at >= since
            )
        )
        if product_id:
            query = query.filter(Ticket.product_id == product_id)
        
        existing = query.all()
        for t in existing:
            # Simple similarity check
            if subject.strip().lower() in t.subject.strip().lower() or t.subject.strip().lower() in subject.strip().lower():
                return True
        return False

    @classmethod
    async def create_ticket(
        cls,
        db: Session,
        customer: User,
        data: TicketCreate
    ) -> Ticket:
        # Validate order ownership
        if data.order_id:
            order = db.query(Order).filter(Order.id == data.order_id).first()
            if not order:
                raise ValueError("Referenced order not found.")
            if order.customer_id != customer.id:
                raise PermissionError("Order does not belong to authenticated customer.")
            # If product_id not specified, pick from order
            if not data.product_id and order.items:
                data.product_id = order.items[0].product_id

        # Generate unique ticket number
        ticket_number = cls.generate_ticket_number(db)
        sla_deadline = cls.calculate_sla_deadline(db, data.priority)

        # Smart auto-assign agent
        auto_agent = cls.find_best_agent(db, data.category)
        initial_status = "Assigned" if auto_agent else "Open"

        ticket = Ticket(
            ticket_number=ticket_number,
            customer_id=customer.id,
            order_id=data.order_id,
            product_id=data.product_id,
            assigned_agent_id=auto_agent.id if auto_agent else None,
            category=data.category,
            subcategory=data.subcategory,
            priority=data.priority,
            status=initial_status,
            subject=data.subject,
            description=data.description,
            preferred_contact_method=data.preferred_contact_method,
            sla_deadline=sla_deadline,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(ticket)
        db.commit()
        db.refresh(ticket)

        # Create initial status history entry
        status_hist = TicketStatusHistory(
            ticket_id=ticket.id,
            old_status="None",
            new_status=initial_status,
            changed_by_id=customer.id,
            reason="Ticket created by customer"
        )
        db.add(status_hist)

        # Create in-app notification for admin/support staff
        admin_notif = Notification(
            role_target="admin",
            title=f"New Ticket: {ticket.ticket_number}",
            message=f"{customer.full_name} submitted '{ticket.subject}' [{ticket.priority}]",
            notification_type="ticket_created",
            link_url=f"/admin/tickets/{ticket.id}"
        )
        db.add(admin_notif)

        if auto_agent:
            # Also notify assigned agent
            agent_notif = Notification(
                user_id=auto_agent.id,
                title=f"Assigned Ticket: {ticket.ticket_number}",
                message=f"You were automatically assigned to '{ticket.subject}'",
                notification_type="ticket_assigned",
                link_url=f"/agent/tickets/{ticket.id}"
            )
            db.add(agent_notif)

        db.commit()

        # Step 3 & 4: Core requirement - Send 2 separate emails asynchronously
        # 1. Customer confirmation
        # 2. Company owner new-ticket alert
        await EmailService.send_ticket_created_emails(db, ticket, customer)

        # Real-time WebSocket event broadcast to admins and assigned agent
        await ws_manager.broadcast_event({
            "type": "TICKET_CREATED",
            "ticket": {
                "id": ticket.id,
                "ticket_number": ticket.ticket_number,
                "subject": ticket.subject,
                "priority": ticket.priority,
                "status": ticket.status,
                "customer_name": customer.full_name,
                "created_at": ticket.created_at.isoformat()
            }
        })

        return ticket

    @classmethod
    async def add_message(
        cls,
        db: Session,
        ticket: Ticket,
        sender: User,
        content: str,
        is_internal: bool = False
    ) -> TicketMessage:
        if is_internal and sender.role not in ("agent", "admin", "super_admin"):
            raise PermissionError("Only agents and administrators can post internal notes.")

        message = TicketMessage(
            ticket_id=ticket.id,
            sender_id=sender.id,
            sender_role=sender.role,
            sender_name=sender.full_name,
            content=content,
            is_internal=is_internal,
            is_read=False,
            created_at=datetime.utcnow()
        )
        db.add(message)
        ticket.updated_at = datetime.utcnow()

        # Update first response timestamp if this is the first agent response
        if sender.role in ("agent", "admin", "super_admin") and not ticket.first_response_at and not is_internal:
            ticket.first_response_at = datetime.utcnow()
            if ticket.status in ("Open", "Assigned"):
                ticket.status = "In Progress"

        db.commit()
        db.refresh(message)

        # Real-time WebSocket delivery to ticket conversation room
        msg_payload = {
            "type": "NEW_MESSAGE",
            "ticket_id": ticket.id,
            "message": {
                "id": message.id,
                "sender_id": message.sender_id,
                "sender_name": message.sender_name,
                "sender_role": message.sender_role,
                "content": message.content,
                "is_internal": message.is_internal,
                "created_at": message.created_at.isoformat()
            }
        }
        await ws_manager.broadcast_to_ticket(ticket.id, msg_payload)

        # Notify recipient if public message
        if not is_internal:
            if sender.role == "customer":
                # Customer sent a message -> notify assigned agent
                if ticket.assigned_agent:
                    notif = Notification(
                        user_id=ticket.assigned_agent_id,
                        title=f"New Customer Reply on {ticket.ticket_number}",
                        message=f"{sender.full_name}: {content[:80]}",
                        notification_type="reply_received",
                        link_url=f"/agent/tickets/{ticket.id}"
                    )
                    db.add(notif)
                    db.commit()
                    await ws_manager.send_to_user(ticket.assigned_agent_id, {
                        "type": "NOTIFICATION",
                        "title": notif.title,
                        "message": notif.message
                    })
                    await EmailService.send_reply_notification(
                        db=db,
                        ticket=ticket,
                        recipient_user=ticket.assigned_agent,
                        sender_name=sender.full_name,
                        message_snippet=content
                    )
            else:
                # Agent/Admin sent message -> notify customer
                notif = Notification(
                    user_id=ticket.customer_id,
                    title=f"New Reply on {ticket.ticket_number}",
                    message=f"{sender.full_name}: {content[:80]}",
                    notification_type="reply_received",
                    link_url=f"/customer/tickets/{ticket.id}"
                )
                db.add(notif)
                db.commit()
                await ws_manager.send_to_user(ticket.customer_id, {
                    "type": "NOTIFICATION",
                    "title": notif.title,
                    "message": notif.message
                })
                await EmailService.send_reply_notification(
                    db=db,
                    ticket=ticket,
                    recipient_user=ticket.customer,
                    sender_name=sender.full_name,
                    message_snippet=content
                )

        return message

    @classmethod
    async def assign_ticket(
        cls,
        db: Session,
        ticket: Ticket,
        agent_id: str,
        assigned_by: User,
        note: Optional[str] = None
    ) -> Ticket:
        agent = db.query(User).filter(User.id == agent_id).first()
        if not agent:
            raise ValueError("Agent not found.")
        
        ticket.assigned_agent_id = agent.id
        if ticket.status == "Open":
            ticket.status = "Assigned"
        ticket.updated_at = datetime.utcnow()

        # Assignment record
        assignment = TicketAssignment(
            ticket_id=ticket.id,
            assigned_by_id=assigned_by.id,
            agent_id=agent.id,
            note=note,
            created_at=datetime.utcnow()
        )
        db.add(assignment)

        # Status history
        hist = TicketStatusHistory(
            ticket_id=ticket.id,
            old_status="Open",
            new_status=ticket.status,
            changed_by_id=assigned_by.id,
            reason=f"Assigned to {agent.full_name}. Note: {note or 'N/A'}"
        )
        db.add(hist)

        # In-app notification to agent
        notif = Notification(
            user_id=agent.id,
            title=f"Assigned: {ticket.ticket_number}",
            message=f"You were assigned to ticket '{ticket.subject}' by {assigned_by.full_name}",
            notification_type="ticket_assigned",
            link_url=f"/agent/tickets/{ticket.id}"
        )
        db.add(notif)
        db.commit()
        db.refresh(ticket)

        # Realtime WebSocket event
        await ws_manager.send_to_user(agent.id, {
            "type": "TICKET_ASSIGNED",
            "ticket_id": ticket.id,
            "ticket_number": ticket.ticket_number,
            "subject": ticket.subject
        })

        # Email notification to agent
        await EmailService.send_agent_assigned_email(db, ticket, agent)

        return ticket

    @classmethod
    async def update_status(
        cls,
        db: Session,
        ticket: Ticket,
        new_status: str,
        changed_by: User,
        reason: Optional[str] = None
    ) -> Ticket:
        old_status = ticket.status
        if old_status == new_status:
            return ticket
        
        ticket.status = new_status
        ticket.updated_at = datetime.utcnow()

        if new_status == "Resolved":
            ticket.resolved_at = datetime.utcnow()
        elif new_status == "Closed":
            ticket.closed_at = datetime.utcnow()

        hist = TicketStatusHistory(
            ticket_id=ticket.id,
            old_status=old_status,
            new_status=new_status,
            changed_by_id=changed_by.id,
            reason=reason or f"Status changed to {new_status}"
        )
        db.add(hist)
        db.commit()
        db.refresh(ticket)

        # Real-time WebSocket broadcast to ticket room and customer
        await ws_manager.broadcast_to_ticket(ticket.id, {
            "type": "STATUS_CHANGED",
            "ticket_id": ticket.id,
            "old_status": old_status,
            "new_status": new_status,
            "updated_at": ticket.updated_at.isoformat()
        })

        # Customer notification & email
        if ticket.customer:
            notif = Notification(
                user_id=ticket.customer_id,
                title=f"Status Updated: {ticket.ticket_number}",
                message=f"Your ticket status changed to {new_status}",
                notification_type="status_changed",
                link_url=f"/customer/tickets/{ticket.id}"
            )
            db.add(notif)
            db.commit()
            await EmailService.send_status_updated_email(db, ticket, ticket.customer, old_status, new_status)

        return ticket

    @classmethod
    async def escalate_ticket(
        cls,
        db: Session,
        ticket: Ticket,
        changed_by: User,
        reason: str
    ) -> Ticket:
        ticket.is_escalated = True
        ticket.escalation_reason = reason
        ticket.status = "Escalated"
        ticket.priority = "Critical"
        ticket.updated_at = datetime.utcnow()

        hist = TicketStatusHistory(
            ticket_id=ticket.id,
            old_status=ticket.status,
            new_status="Escalated",
            changed_by_id=changed_by.id,
            reason=f"Escalated: {reason}"
        )
        db.add(hist)

        # Broadcast critical alert to all admins
        admin_notif = Notification(
            role_target="admin",
            title=f"ESCALATION: {ticket.ticket_number}",
            message=f"Ticket escalated by {changed_by.full_name}: {reason}",
            notification_type="escalation",
            link_url=f"/admin/tickets/{ticket.id}"
        )
        db.add(admin_notif)
        db.commit()
        db.refresh(ticket)

        await ws_manager.broadcast_event({
            "type": "TICKET_ESCALATED",
            "ticket_id": ticket.id,
            "ticket_number": ticket.ticket_number,
            "reason": reason
        })
        return ticket
