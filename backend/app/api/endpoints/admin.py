import io
import csv
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.api.deps import get_db, require_admin, require_super_admin
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.entities import (
    User, Ticket, Order, EmailLog, AuditLog, CompanySettings,
    SLAPolicy, AgentAvailability, TicketFeedback, UserProfile, NotificationPreference
)
from app.schemas.schemas import (
    AdminDashboardStats, AnalyticsCountItem, AgentPerformanceItem,
    UserOut, AdminCreateAgent, EmailLogOut, AuditLogOut,
    CompanySettingsOut, CompanySettingsUpdate, SLAPolicyOut, SLAPolicyUpdate
)

router = APIRouter()

@router.get("/dashboard", response_model=AdminDashboardStats)
async def get_admin_dashboard_stats(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    now = datetime.utcnow()

    total_customers = db.query(User).filter(User.role == "customer").count()
    total_tickets = db.query(Ticket).count()
    open_tickets = db.query(Ticket).filter(Ticket.status == "Open").count()
    unassigned_tickets = db.query(Ticket).filter(Ticket.assigned_agent_id == None, Ticket.status.notin_(["Resolved", "Closed"])).count()
    in_progress_tickets = db.query(Ticket).filter(Ticket.status.in_(["In Progress", "Assigned", "Waiting for Customer"])).count()
    resolved_tickets = db.query(Ticket).filter(Ticket.status.in_(["Resolved", "Closed"])).count()

    # Overdue tickets
    overdue_tickets = (
        db.query(Ticket)
        .filter(
            Ticket.sla_deadline < now,
            Ticket.status.notin_(["Resolved", "Closed"])
        )
        .count()
    )

    # Average resolution hours calculation
    resolved_list = db.query(Ticket).filter(Ticket.resolved_at != None).all()
    if resolved_list:
        total_hours = sum(
            (t.resolved_at - t.created_at).total_seconds() / 3600.0
            for t in resolved_list
            if t.resolved_at and t.created_at
        )
        avg_resolution_hours = round(total_hours / len(resolved_list), 1)
        
        # SLA compliance
        compliant_count = sum(
            1 for t in resolved_list
            if t.sla_deadline and t.resolved_at <= t.sla_deadline
        )
        sla_compliance_rate = round((compliant_count / len(resolved_list)) * 100.0, 1)
    else:
        avg_resolution_hours = 0.0
        sla_compliance_rate = 100.0

    # Group counts
    by_category = (
        db.query(Ticket.category, func.count(Ticket.id))
        .group_by(Ticket.category)
        .all()
    )
    tickets_by_category = [{"label": c or "Other", "count": cnt} for c, cnt in by_category]

    by_priority = (
        db.query(Ticket.priority, func.count(Ticket.id))
        .group_by(Ticket.priority)
        .all()
    )
    tickets_by_priority = [{"label": p or "Medium", "count": cnt} for p, cnt in by_priority]

    by_status = (
        db.query(Ticket.status, func.count(Ticket.id))
        .group_by(Ticket.status)
        .all()
    )
    tickets_by_status = [{"label": s or "Open", "count": cnt} for s, cnt in by_status]

    # Agent performance
    agents = db.query(User).filter(User.role == "agent").all()
    agent_performance = []
    for ag in agents:
        assigned_cnt = db.query(Ticket).filter(Ticket.assigned_agent_id == ag.id).count()
        resolved_cnt = db.query(Ticket).filter(Ticket.assigned_agent_id == ag.id, Ticket.status.in_(["Resolved", "Closed"])).count()
        
        # Ratings
        ratings = (
            db.query(TicketFeedback.rating)
            .join(Ticket, Ticket.id == TicketFeedback.ticket_id)
            .filter(Ticket.assigned_agent_id == ag.id)
            .all()
        )
        avg_r = round(sum(r[0] for r in ratings) / len(ratings), 1) if ratings else 5.0
        is_avail = ag.availability.is_available if ag.availability else True

        agent_performance.append({
            "agent_id": ag.id,
            "agent_name": ag.full_name,
            "agent_email": ag.email,
            "assigned_count": assigned_cnt,
            "resolved_count": resolved_cnt,
            "avg_rating": avg_r,
            "is_available": is_avail
        })

    # Orders stats
    total_orders = db.query(Order).count()
    revenue_sum = db.query(func.sum(Order.total_amount)).scalar() or 0.0

    return {
        "total_customers": total_customers,
        "total_tickets": total_tickets,
        "open_tickets": open_tickets,
        "unassigned_tickets": unassigned_tickets,
        "in_progress_tickets": in_progress_tickets,
        "resolved_tickets": resolved_tickets,
        "overdue_tickets": overdue_tickets,
        "avg_resolution_hours": avg_resolution_hours,
        "tickets_by_category": tickets_by_category,
        "tickets_by_priority": tickets_by_priority,
        "tickets_by_status": tickets_by_status,
        "agent_performance": agent_performance,
        "sla_compliance_rate": sla_compliance_rate,
        "total_orders": total_orders,
        "total_revenue": round(revenue_sum, 2)
    }

@router.get("/customers", response_model=List[UserOut])
async def list_customers(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    customers = db.query(User).filter(User.role == "customer").order_by(desc(User.created_at)).all()
    return customers

@router.get("/agents", response_model=List[UserOut])
async def list_agents(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    agents = db.query(User).filter(User.role.in_(["agent", "admin"])).order_by(User.full_name.asc()).all()
    return agents

@router.post("/agents", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_agent(
    agent_in: AdminCreateAgent,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter(User.email == agent_in.email.lower()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered.")

    hashed = get_password_hash(agent_in.password)
    user = User(
        email=agent_in.email.lower(),
        hashed_password=hashed,
        full_name=agent_in.full_name,
        phone=agent_in.phone,
        role=agent_in.role,
        is_active=True,
        is_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    profile = UserProfile(user_id=user.id, department=agent_in.department or "Support")
    availability = AgentAvailability(user_id=user.id, max_tickets=agent_in.max_tickets or 10, is_available=True)
    db.add(profile)
    db.add(availability)
    db.commit()
    db.refresh(user)
    return user

@router.get("/email-logs", response_model=List[EmailLogOut])
async def get_email_logs(
    limit: int = Query(100, le=500),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    logs = db.query(EmailLog).order_by(desc(EmailLog.created_at)).limit(limit).all()
    return logs

@router.get("/audit-logs", response_model=List[AuditLogOut])
async def get_audit_logs(
    limit: int = Query(100, le=500),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    logs = db.query(AuditLog).order_by(desc(AuditLog.created_at)).limit(limit).all()
    return logs

@router.get("/settings", response_model=CompanySettingsOut)
async def get_company_settings(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    company = db.query(CompanySettings).first()
    if not company:
        company = CompanySettings()
        db.add(company)
        db.commit()
        db.refresh(company)

    return {
        "company_name": company.company_name or settings.COMPANY_NAME,
        "company_logo": company.company_logo,
        "owner_notification_email": company.owner_notification_email or settings.OWNER_NOTIFICATION_EMAIL,
        "support_inbox_email": company.support_inbox_email or settings.SUPPORT_INBOX_EMAIL,
        "agent_notification_emails": company.agent_notification_emails,
        "brevo_api_key_configured": bool(company.brevo_api_key and company.brevo_api_key.strip()),
        "brevo_sender_email": company.brevo_sender_email or settings.BREVO_SENDER_EMAIL,
        "brevo_sender_name": company.brevo_sender_name or settings.BREVO_SENDER_NAME,
        "support_contact_details": company.support_contact_details,
        "updated_at": company.updated_at
    }

@router.put("/settings", response_model=CompanySettingsOut)
async def update_company_settings(
    settings_in: CompanySettingsUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    company = db.query(CompanySettings).first()
    if not company:
        company = CompanySettings()
        db.add(company)

    if settings_in.company_name is not None:
        company.company_name = settings_in.company_name
    if settings_in.company_logo is not None:
        company.company_logo = settings_in.company_logo
    if settings_in.owner_notification_email is not None:
        company.owner_notification_email = settings_in.owner_notification_email
    if settings_in.support_inbox_email is not None:
        company.support_inbox_email = settings_in.support_inbox_email
    if settings_in.agent_notification_emails is not None:
        company.agent_notification_emails = settings_in.agent_notification_emails
    if settings_in.brevo_api_key is not None and settings_in.brevo_api_key.strip():
        company.brevo_api_key = settings_in.brevo_api_key
    if settings_in.brevo_sender_email is not None:
        company.brevo_sender_email = settings_in.brevo_sender_email
    if settings_in.brevo_sender_name is not None:
        company.brevo_sender_name = settings_in.brevo_sender_name
    if settings_in.support_contact_details is not None:
        company.support_contact_details = settings_in.support_contact_details

    company.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(company)

    return {
        "company_name": company.company_name,
        "company_logo": company.company_logo,
        "owner_notification_email": company.owner_notification_email,
        "support_inbox_email": company.support_inbox_email,
        "agent_notification_emails": company.agent_notification_emails,
        "brevo_api_key_configured": bool(company.brevo_api_key and company.brevo_api_key.strip()),
        "brevo_sender_email": company.brevo_sender_email,
        "brevo_sender_name": company.brevo_sender_name,
        "support_contact_details": company.support_contact_details,
        "updated_at": company.updated_at
    }

@router.get("/sla-policies", response_model=List[SLAPolicyOut])
async def list_sla_policies(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(SLAPolicy).all()

@router.put("/sla-policies/{policy_id}", response_model=SLAPolicyOut)
async def update_sla_policy(
    policy_id: str,
    update_in: SLAPolicyUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    policy = db.query(SLAPolicy).filter(SLAPolicy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SLA policy not found.")

    policy.first_response_hours = update_in.first_response_hours
    policy.resolution_hours = update_in.resolution_hours
    policy.escalation_hours = update_in.escalation_hours
    policy.is_active = update_in.is_active
    db.commit()
    db.refresh(policy)
    return policy

@router.get("/export-csv")
async def export_tickets_csv(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    tickets = db.query(Ticket).order_by(desc(Ticket.created_at)).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Ticket ID", "Subject", "Customer Name", "Customer Email", "Product",
        "Order Number", "Category", "Priority", "Status", "Agent",
        "Created At", "Resolved At", "SLA Deadline", "Is Escalated"
    ])

    for t in tickets:
        writer.writerow([
            t.ticket_number,
            t.subject,
            t.customer.full_name if t.customer else "",
            t.customer.email if t.customer else "",
            t.product.name if t.product else "N/A",
            t.order.order_number if t.order else "N/A",
            t.category,
            t.priority,
            t.status,
            t.assigned_agent.full_name if t.assigned_agent else "Unassigned",
            t.created_at.strftime("%Y-%m-%d %H:%M:%S") if t.created_at else "",
            t.resolved_at.strftime("%Y-%m-%d %H:%M:%S") if t.resolved_at else "",
            t.sla_deadline.strftime("%Y-%m-%d %H:%M:%S") if t.sla_deadline else "",
            "Yes" if t.is_escalated else "No"
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=supportdesk_tickets_{datetime.utcnow().strftime('%Y%m%d')}.csv"}
    )
