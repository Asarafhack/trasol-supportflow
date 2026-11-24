import os
import shutil
import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.api.deps import get_db, get_current_user, require_agent, require_admin
from app.core.config import settings
from app.models.entities import (
    Ticket, TicketMessage, TicketAttachment, TicketFeedback,
    TicketStatusHistory, User, Order, Product
)
from app.schemas.schemas import (
    TicketCreate, TicketUpdate, TicketAssign, TicketEscalate,
    TicketOut, TicketDetailOut, TicketMessageCreate, TicketMessageOut,
    TicketFeedbackCreate, TicketFeedbackOut, TicketAttachmentOut,
    TicketStatusHistoryOut
)
from app.services.ticket_service import TicketService

router = APIRouter()

def _format_ticket_out(t: Ticket, db: Session, user: User) -> dict:
    unread_count = 0
    if user.role == "customer":
        # Unread messages from agent/staff
        unread_count = (
            db.query(TicketMessage)
            .filter(
                TicketMessage.ticket_id == t.id,
                TicketMessage.sender_role != "customer",
                TicketMessage.is_internal == False,
                TicketMessage.is_read == False
            )
            .count()
        )
    else:
        # Unread messages from customer
        unread_count = (
            db.query(TicketMessage)
            .filter(
                TicketMessage.ticket_id == t.id,
                TicketMessage.sender_role == "customer",
                TicketMessage.is_read == False
            )
            .count()
        )

    # Filter messages count: exclude internal notes for customers
    msg_query = db.query(TicketMessage).filter(TicketMessage.ticket_id == t.id)
    if user.role == "customer":
        msg_query = msg_query.filter(TicketMessage.is_internal == False)
    message_count = msg_query.count()

    fb_out = None
    if t.feedback:
        fb_out = {
            "id": t.feedback.id,
            "ticket_id": t.feedback.ticket_id,
            "customer_id": t.feedback.customer_id,
            "customer_name": t.customer.full_name if t.customer else "Customer",
            "rating": t.feedback.rating,
            "comments": t.feedback.comments,
            "created_at": t.feedback.created_at
        }

    return {
        "id": t.id,
        "ticket_number": t.ticket_number,
        "customer_id": t.customer_id,
        "customer_name": t.customer.full_name if t.customer else "Unknown",
        "customer_email": t.customer.email if t.customer else "",
        "order_id": t.order_id,
        "order_number": t.order.order_number if t.order else None,
        "product_id": t.product_id,
        "product_name": t.product.name if t.product else None,
        "assigned_agent_id": t.assigned_agent_id,
        "assigned_agent_name": t.assigned_agent.full_name if t.assigned_agent else "Unassigned",
        "category": t.category,
        "subcategory": t.subcategory,
        "priority": t.priority,
        "status": t.status,
        "subject": t.subject,
        "description": t.description,
        "preferred_contact_method": t.preferred_contact_method,
        "sla_deadline": t.sla_deadline,
        "first_response_at": t.first_response_at,
        "resolved_at": t.resolved_at,
        "is_escalated": t.is_escalated,
        "created_at": t.created_at,
        "updated_at": t.updated_at,
        "message_count": message_count,
        "unread_messages": unread_count,
        "feedback": fb_out
    }

@router.post("", response_model=TicketOut, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    ticket_in: TicketCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        ticket = await TicketService.create_ticket(db, current_user, ticket_in)
        return _format_ticket_out(ticket, db, current_user)
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))

@router.get("", response_model=List[TicketOut])
async def list_tickets(
    status_filter: Optional[str] = Query(None, alias="status"),
    priority_filter: Optional[str] = Query(None, alias="priority"),
    category_filter: Optional[str] = Query(None, alias="category"),
    search: Optional[str] = Query(None),
    agent_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Ticket)

    # Role-based restriction
    if current_user.role == "customer":
        # Customers must NEVER access other customers' tickets
        query = query.filter(Ticket.customer_id == current_user.id)
    elif current_user.role == "agent":
        # Agents see their assigned tickets or can filter unassigned
        if agent_id:
            query = query.filter(Ticket.assigned_agent_id == agent_id)
        # By default agent can also see unassigned or tickets assigned to them
    else:
        # Admins can filter by specific agent
        if agent_id:
            query = query.filter(Ticket.assigned_agent_id == agent_id)

    if status_filter and status_filter != "ALL":
        query = query.filter(Ticket.status == status_filter)
    if priority_filter and priority_filter != "ALL":
        query = query.filter(Ticket.priority == priority_filter)
    if category_filter and category_filter != "ALL":
        query = query.filter(Ticket.category == category_filter)

    if search:
        search_fmt = f"%{search.lower()}%"
        query = query.filter(
            or_(
                Ticket.ticket_number.ilike(search_fmt),
                Ticket.subject.ilike(search_fmt),
                Ticket.description.ilike(search_fmt)
            )
        )

    tickets = query.order_by(desc(Ticket.created_at)).all()
    return [_format_ticket_out(t, db, current_user) for t in tickets]

@router.get("/{ticket_id}", response_model=TicketDetailOut)
async def get_ticket_detail(
    ticket_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found.")

    # Access security check
    if current_user.role == "customer" and ticket.customer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this ticket.")

    base_data = _format_ticket_out(ticket, db, current_user)

    # Mark unread messages as read
    if current_user.role == "customer":
        db.query(TicketMessage).filter(
            TicketMessage.ticket_id == ticket.id,
            TicketMessage.sender_role != "customer",
            TicketMessage.is_internal == False
        ).update({"is_read": True})
    else:
        db.query(TicketMessage).filter(
            TicketMessage.ticket_id == ticket.id,
            TicketMessage.sender_role == "customer"
        ).update({"is_read": True})
    db.commit()

    # Load messages
    msg_query = db.query(TicketMessage).filter(TicketMessage.ticket_id == ticket.id)
    if current_user.role == "customer":
        # Critical rule: Internal staff notes must never be visible to customers
        msg_query = msg_query.filter(TicketMessage.is_internal == False)
    messages = msg_query.order_by(TicketMessage.created_at.asc()).all()

    formatted_messages = []
    for m in messages:
        attachments = []
        for a in m.attachments:
            attachments.append({
                "id": a.id,
                "file_name": a.file_name,
                "file_path": a.file_path,
                "file_type": a.file_type,
                "file_size": a.file_size,
                "created_at": a.created_at
            })
        formatted_messages.append({
            "id": m.id,
            "ticket_id": m.ticket_id,
            "sender_id": m.sender_id,
            "sender_role": m.sender_role,
            "sender_name": m.sender_name,
            "content": m.content,
            "is_internal": m.is_internal,
            "is_read": m.is_read,
            "created_at": m.created_at,
            "attachments": attachments
        })

    # Attachments
    att_list = []
    for a in ticket.attachments:
        att_list.append({
            "id": a.id,
            "file_name": a.file_name,
            "file_path": a.file_path,
            "file_type": a.file_type,
            "file_size": a.file_size,
            "created_at": a.created_at
        })

    # Status history
    hist_list = []
    for h in ticket.status_history:
        changed_by_user = db.query(User).filter(User.id == h.changed_by_id).first() if h.changed_by_id else None
        hist_list.append({
            "id": h.id,
            "old_status": h.old_status,
            "new_status": h.new_status,
            "changed_by_id": h.changed_by_id,
            "changed_by_name": changed_by_user.full_name if changed_by_user else "System",
            "reason": h.reason,
            "created_at": h.created_at
        })

    base_data["messages"] = formatted_messages
    base_data["attachments"] = att_list
    base_data["status_history"] = hist_list

    return base_data

@router.put("/{ticket_id}", response_model=TicketOut)
async def update_ticket(
    ticket_id: str,
    ticket_in: TicketUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found.")

    if current_user.role == "customer" and ticket.customer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    # Status update
    if ticket_in.status and ticket_in.status != ticket.status:
        # Customers can only resolve or reopen their own tickets
        if current_user.role == "customer" and ticket_in.status not in ("Resolved", "Reopened", "Closed"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Customers can only close, resolve, or reopen tickets.")
        await TicketService.update_status(db, ticket, ticket_in.status, current_user)

    if ticket_in.priority and current_user.role in ("agent", "admin", "super_admin"):
        ticket.priority = ticket_in.priority

    if ticket_in.category and current_user.role in ("agent", "admin", "super_admin"):
        ticket.category = ticket_in.category

    if ticket_in.assigned_agent_id and current_user.role in ("admin", "super_admin", "agent"):
        await TicketService.assign_ticket(db, ticket, ticket_in.assigned_agent_id, current_user)

    ticket.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(ticket)
    return _format_ticket_out(ticket, db, current_user)

@router.post("/{ticket_id}/messages", response_model=TicketMessageOut)
async def post_message(
    ticket_id: str,
    msg_in: TicketMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found.")

    if current_user.role == "customer" and ticket.customer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    try:
        msg = await TicketService.add_message(
            db=db,
            ticket=ticket,
            sender=current_user,
            content=msg_in.content,
            is_internal=msg_in.is_internal
        )
        return {
            "id": msg.id,
            "ticket_id": msg.ticket_id,
            "sender_id": msg.sender_id,
            "sender_role": msg.sender_role,
            "sender_name": msg.sender_name,
            "content": msg.content,
            "is_internal": msg.is_internal,
            "is_read": msg.is_read,
            "created_at": msg.created_at,
            "attachments": []
        }
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))

@router.post("/{ticket_id}/assign", response_model=TicketOut)
async def assign_ticket_endpoint(
    ticket_id: str,
    assign_in: TicketAssign,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found.")

    try:
        updated = await TicketService.assign_ticket(
            db=db,
            ticket=ticket,
            agent_id=assign_in.agent_id,
            assigned_by=current_user,
            note=assign_in.note
        )
        return _format_ticket_out(updated, db, current_user)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))

@router.post("/{ticket_id}/escalate", response_model=TicketOut)
async def escalate_ticket_endpoint(
    ticket_id: str,
    esc_in: TicketEscalate,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found.")

    updated = await TicketService.escalate_ticket(db, ticket, current_user, esc_in.reason)
    return _format_ticket_out(updated, db, current_user)

@router.post("/{ticket_id}/resolve", response_model=TicketOut)
async def resolve_ticket_endpoint(
    ticket_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found.")

    if current_user.role == "customer" and ticket.customer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    updated = await TicketService.update_status(db, ticket, "Resolved", current_user, "Resolved by user")
    return _format_ticket_out(updated, db, current_user)

@router.post("/{ticket_id}/reopen", response_model=TicketOut)
async def reopen_ticket_endpoint(
    ticket_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found.")

    if current_user.role == "customer" and ticket.customer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    updated = await TicketService.update_status(db, ticket, "Reopened", current_user, "Reopened by user")
    return _format_ticket_out(updated, db, current_user)

@router.post("/{ticket_id}/feedback", response_model=TicketFeedbackOut)
async def submit_feedback(
    ticket_id: str,
    feedback_in: TicketFeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found.")

    if ticket.customer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only ticket owner can submit feedback.")

    existing = db.query(TicketFeedback).filter(TicketFeedback.ticket_id == ticket.id).first()
    if existing:
        existing.rating = feedback_in.rating
        existing.comments = feedback_in.comments
        db.commit()
        db.refresh(existing)
        return {
            "id": existing.id,
            "ticket_id": existing.ticket_id,
            "customer_id": existing.customer_id,
            "customer_name": current_user.full_name,
            "rating": existing.rating,
            "comments": existing.comments,
            "created_at": existing.created_at
        }

    fb = TicketFeedback(
        ticket_id=ticket.id,
        customer_id=current_user.id,
        rating=feedback_in.rating,
        comments=feedback_in.comments,
        created_at=datetime.utcnow()
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)

    return {
        "id": fb.id,
        "ticket_id": fb.ticket_id,
        "customer_id": fb.customer_id,
        "customer_name": current_user.full_name,
        "rating": fb.rating,
        "comments": fb.comments,
        "created_at": fb.created_at
    }

@router.post("/{ticket_id}/attachments", response_model=TicketAttachmentOut)
async def upload_attachment(
    ticket_id: str,
    file: UploadFile = File(...),
    message_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found.")

    if current_user.role == "customer" and ticket.customer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    # Validate file extension and size
    ext = os.path.splitext(file.filename)[1].lower()
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    stored_filename = f"{uuid.uuid4()}{ext}"
    dest_path = os.path.join(settings.UPLOAD_DIR, stored_filename)

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(dest_path)
    attachment = TicketAttachment(
        ticket_id=ticket.id,
        message_id=message_id,
        file_name=file.filename,
        file_path=f"/uploads/{stored_filename}",
        file_type=file.content_type,
        file_size=file_size,
        uploaded_by_id=current_user.id,
        created_at=datetime.utcnow()
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    return {
        "id": attachment.id,
        "file_name": attachment.file_name,
        "file_path": attachment.file_path,
        "file_type": attachment.file_type,
        "file_size": attachment.file_size,
        "created_at": attachment.created_at
    }
