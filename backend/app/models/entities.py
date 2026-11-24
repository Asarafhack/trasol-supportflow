import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, Table, Enum
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

# Association table for Role & Permission
role_permissions = Table(
    'role_permissions',
    Base.metadata,
    Column('role_id', String, ForeignKey('roles.id'), primary_key=True),
    Column('permission_id', String, ForeignKey('permissions.id'), primary_key=True)
)

class Role(Base):
    __tablename__ = 'roles'
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, unique=True, nullable=False, index=True)
    description = Column(String, nullable=True)

    permissions = relationship('Permission', secondary=role_permissions, back_populates='roles')

class Permission(Base):
    __tablename__ = 'permissions'
    id = Column(String, primary_key=True, default=generate_uuid)
    code = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)

    roles = relationship('Role', secondary=role_permissions, back_populates='permissions')

class User(Base):
    __tablename__ = 'users'
    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    role = Column(String, nullable=False, default='customer')  # customer, agent, admin, super_admin
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    verification_otp = Column(String, nullable=True)
    otp_expires_at = Column(DateTime, nullable=True)
    otp_last_sent_at = Column(DateTime, nullable=True)
    failed_otp_attempts = Column(Integer, default=0)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    profile = relationship('UserProfile', back_populates='user', uselist=False, cascade='all, delete-orphan')
    orders = relationship('Order', back_populates='customer', cascade='all, delete-orphan')
    created_tickets = relationship('Ticket', foreign_keys='Ticket.customer_id', back_populates='customer')
    assigned_tickets = relationship('Ticket', foreign_keys='Ticket.assigned_agent_id', back_populates='assigned_agent')
    notifications = relationship('Notification', back_populates='user', cascade='all, delete-orphan')
    availability = relationship('AgentAvailability', back_populates='user', uselist=False, cascade='all, delete-orphan')
    notification_pref = relationship('NotificationPreference', back_populates='user', uselist=False, cascade='all, delete-orphan')

class UserProfile(Base):
    __tablename__ = 'user_profiles'
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey('users.id'), unique=True, nullable=False)
    company_name = Column(String, nullable=True)
    job_title = Column(String, nullable=True)
    department = Column(String, nullable=True)
    timezone = Column(String, default='UTC')
    address = Column(String, nullable=True)

    user = relationship('User', back_populates='profile')

class RefreshToken(Base):
    __tablename__ = 'refresh_tokens'
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    token = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    is_revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Product(Base):
    __tablename__ = 'products'
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    sku = Column(String, unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    price = Column(Float, default=0.0)
    warranty_months = Column(Integer, default=12)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    order_items = relationship('OrderItem', back_populates='product')
    tickets = relationship('Ticket', back_populates='product')

class Order(Base):
    __tablename__ = 'orders'
    id = Column(String, primary_key=True, default=generate_uuid)
    order_number = Column(String, unique=True, nullable=False, index=True)
    customer_id = Column(String, ForeignKey('users.id'), nullable=False)
    total_amount = Column(Float, default=0.0)
    payment_status = Column(String, default='paid')  # paid, pending, failed, refunded
    order_status = Column(String, default='completed')  # processing, shipped, completed, cancelled
    shipping_address = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship('User', back_populates='orders')
    items = relationship('OrderItem', back_populates='order', cascade='all, delete-orphan')
    tickets = relationship('Ticket', back_populates='order')

class OrderItem(Base):
    __tablename__ = 'order_items'
    id = Column(String, primary_key=True, default=generate_uuid)
    order_id = Column(String, ForeignKey('orders.id'), nullable=False)
    product_id = Column(String, ForeignKey('products.id'), nullable=False)
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, default=0.0)

    order = relationship('Order', back_populates='items')
    product = relationship('Product', back_populates='order_items')

class TicketCategory(Base):
    __tablename__ = 'ticket_categories'
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, unique=True, nullable=False)
    description = Column(Text, nullable=True)
    default_priority = Column(String, default='Medium')
    is_active = Column(Boolean, default=True)

class Ticket(Base):
    __tablename__ = 'tickets'
    id = Column(String, primary_key=True, default=generate_uuid)
    ticket_number = Column(String, unique=True, nullable=False, index=True)  # TKT-YYYY-000001
    customer_id = Column(String, ForeignKey('users.id'), nullable=False)
    order_id = Column(String, ForeignKey('orders.id'), nullable=True)
    product_id = Column(String, ForeignKey('products.id'), nullable=True)
    assigned_agent_id = Column(String, ForeignKey('users.id'), nullable=True)
    
    category = Column(String, nullable=False)  # Payment, Delivery, Product Defect, Refund, Account Access, Technical Support, Warranty, Other
    subcategory = Column(String, nullable=True)
    priority = Column(String, default='Medium')  # Low, Medium, High, Critical
    status = Column(String, default='Open')  # Open, Assigned, In Progress, Waiting for Customer, Escalated, Resolved, Closed, Reopened
    subject = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    preferred_contact_method = Column(String, default='email')  # email, portal, phone
    
    sla_deadline = Column(DateTime, nullable=True)
    first_response_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    is_escalated = Column(Boolean, default=False)
    escalation_reason = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    customer = relationship('User', foreign_keys=[customer_id], back_populates='created_tickets')
    assigned_agent = relationship('User', foreign_keys=[assigned_agent_id], back_populates='assigned_tickets')
    order = relationship('Order', back_populates='tickets')
    product = relationship('Product', back_populates='tickets')
    messages = relationship('TicketMessage', back_populates='ticket', cascade='all, delete-orphan', order_by='TicketMessage.created_at')
    attachments = relationship('TicketAttachment', back_populates='ticket', cascade='all, delete-orphan')
    assignments = relationship('TicketAssignment', back_populates='ticket', cascade='all, delete-orphan')
    status_history = relationship('TicketStatusHistory', back_populates='ticket', cascade='all, delete-orphan')
    internal_notes = relationship('TicketInternalNote', back_populates='ticket', cascade='all, delete-orphan')
    feedback = relationship('TicketFeedback', back_populates='ticket', uselist=False, cascade='all, delete-orphan')

class TicketMessage(Base):
    __tablename__ = 'ticket_messages'
    id = Column(String, primary_key=True, default=generate_uuid)
    ticket_id = Column(String, ForeignKey('tickets.id'), nullable=False)
    sender_id = Column(String, ForeignKey('users.id'), nullable=True)
    sender_role = Column(String, nullable=False)  # customer, agent, admin, system
    sender_name = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=False)  # Hidden from customers
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    ticket = relationship('Ticket', back_populates='messages')
    sender = relationship('User', foreign_keys=[sender_id])
    attachments = relationship('TicketAttachment', back_populates='message')

class TicketAttachment(Base):
    __tablename__ = 'ticket_attachments'
    id = Column(String, primary_key=True, default=generate_uuid)
    ticket_id = Column(String, ForeignKey('tickets.id'), nullable=False)
    message_id = Column(String, ForeignKey('ticket_messages.id'), nullable=True)
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=True)
    file_size = Column(Integer, default=0)
    uploaded_by_id = Column(String, ForeignKey('users.id'), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    ticket = relationship('Ticket', back_populates='attachments')
    message = relationship('TicketMessage', back_populates='attachments')

class TicketAssignment(Base):
    __tablename__ = 'ticket_assignments'
    id = Column(String, primary_key=True, default=generate_uuid)
    ticket_id = Column(String, ForeignKey('tickets.id'), nullable=False)
    assigned_by_id = Column(String, ForeignKey('users.id'), nullable=True)
    agent_id = Column(String, ForeignKey('users.id'), nullable=False)
    note = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    ticket = relationship('Ticket', back_populates='assignments')
    agent = relationship('User', foreign_keys=[agent_id])

class TicketStatusHistory(Base):
    __tablename__ = 'ticket_status_history'
    id = Column(String, primary_key=True, default=generate_uuid)
    ticket_id = Column(String, ForeignKey('tickets.id'), nullable=False)
    old_status = Column(String, nullable=False)
    new_status = Column(String, nullable=False)
    changed_by_id = Column(String, ForeignKey('users.id'), nullable=True)
    reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    ticket = relationship('Ticket', back_populates='status_history')

class TicketInternalNote(Base):
    __tablename__ = 'ticket_internal_notes'
    id = Column(String, primary_key=True, default=generate_uuid)
    ticket_id = Column(String, ForeignKey('tickets.id'), nullable=False)
    author_id = Column(String, ForeignKey('users.id'), nullable=False)
    note = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    ticket = relationship('Ticket', back_populates='internal_notes')
    author = relationship('User', foreign_keys=[author_id])

class Notification(Base):
    __tablename__ = 'notifications'
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey('users.id'), nullable=True)  # Null if targeted to role
    role_target = Column(String, nullable=True)  # 'admin', 'agent', etc.
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String, nullable=False)  # ticket_created, status_changed, reply_received, etc.
    link_url = Column(String, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship('User', back_populates='notifications')

class EmailLog(Base):
    __tablename__ = 'email_logs'
    id = Column(String, primary_key=True, default=generate_uuid)
    ticket_id = Column(String, ForeignKey('tickets.id'), nullable=True)
    recipient_email = Column(String, nullable=False)
    recipient_type = Column(String, nullable=False)  # customer, owner, agent
    email_type = Column(String, nullable=False)  # ticket_created_customer, ticket_created_owner, status_update, etc.
    subject = Column(String, nullable=False)
    content_preview = Column(Text, nullable=True)
    delivery_status = Column(String, default='SENT')  # SENT, SIMULATED_DEV, FAILED, PENDING_RETRY
    provider = Column(String, default='brevo')  # brevo, smtp, simulation
    message_id = Column(String, nullable=True)
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class EmailTemplate(Base):
    __tablename__ = 'email_templates'
    id = Column(String, primary_key=True, default=generate_uuid)
    code = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    subject_template = Column(String, nullable=False)
    html_content = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)

class InboundEmail(Base):
    __tablename__ = 'inbound_emails'
    id = Column(String, primary_key=True, default=generate_uuid)
    message_id = Column(String, unique=True, nullable=False)
    sender_email = Column(String, nullable=False)
    sender_name = Column(String, nullable=True)
    subject = Column(String, nullable=False)
    raw_body = Column(Text, nullable=False)
    matched_ticket_id = Column(String, ForeignKey('tickets.id'), nullable=True)
    is_processed = Column(Boolean, default=False)
    processing_notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class SLAPolicy(Base):
    __tablename__ = 'sla_policies'
    id = Column(String, primary_key=True, default=generate_uuid)
    priority = Column(String, unique=True, nullable=False)  # Critical, High, Medium, Low
    first_response_hours = Column(Float, nullable=False)
    resolution_hours = Column(Float, nullable=False)
    escalation_hours = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)

class TicketFeedback(Base):
    __tablename__ = 'ticket_feedback'
    id = Column(String, primary_key=True, default=generate_uuid)
    ticket_id = Column(String, ForeignKey('tickets.id'), unique=True, nullable=False)
    customer_id = Column(String, ForeignKey('users.id'), nullable=False)
    rating = Column(Integer, nullable=False)  # 1 to 5
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    ticket = relationship('Ticket', back_populates='feedback')
    customer = relationship('User', foreign_keys=[customer_id])

class KnowledgeBaseArticle(Base):
    __tablename__ = 'knowledge_base_articles'
    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False, index=True)
    category = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    tags = Column(String, nullable=True)
    is_published = Column(Boolean, default=True)
    views_count = Column(Integer, default=0)
    helpful_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class AgentAvailability(Base):
    __tablename__ = 'agent_availability'
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey('users.id'), unique=True, nullable=False)
    is_available = Column(Boolean, default=True)
    status_message = Column(String, default='Available')
    max_tickets = Column(Integer, default=10)
    current_ticket_count = Column(Integer, default=0)
    last_active_at = Column(DateTime, default=datetime.utcnow)

    user = relationship('User', back_populates='availability')

class AuditLog(Base):
    __tablename__ = 'audit_logs'
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey('users.id'), nullable=True)
    user_email = Column(String, nullable=True)
    action = Column(String, nullable=False)
    entity_type = Column(String, nullable=False)
    entity_id = Column(String, nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class CompanySettings(Base):
    __tablename__ = 'company_settings'
    id = Column(String, primary_key=True, default=generate_uuid)
    company_name = Column(String, default='Trasol Technologies')
    company_logo = Column(String, nullable=True)
    owner_notification_email = Column(String, default='owner@trasol.tech')
    support_inbox_email = Column(String, default='support@trasol.tech')
    agent_notification_emails = Column(String, nullable=True)
    brevo_api_key = Column(String, nullable=True)
    brevo_sender_email = Column(String, default='support@trasol.tech')
    brevo_sender_name = Column(String, default='Trasol Technologies Support')
    support_contact_details = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class NotificationPreference(Base):
    __tablename__ = 'notification_preferences'
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey('users.id'), unique=True, nullable=False)
    email_on_ticket_update = Column(Boolean, default=True)
    email_on_message = Column(Boolean, default=True)
    email_on_assignment = Column(Boolean, default=True)
    in_app_notifications = Column(Boolean, default=True)

    user = relationship('User', back_populates='notification_pref')

class OutboxEvent(Base):
    __tablename__ = 'outbox_events'
    id = Column(String, primary_key=True, default=generate_uuid)
    event_type = Column(String, nullable=False)  # email_send, webhook, push_notification
    payload = Column(Text, nullable=False)  # JSON string
    status = Column(String, default='PENDING')  # PENDING, PROCESSED, FAILED
    retry_count = Column(Integer, default=0)
    last_error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)
