from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr, Field

# ----------------- Auth & User Schemas -----------------
class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(..., min_length=6)
    phone: Optional[str] = None
    terms_accepted: bool = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenRefresh(BaseModel):
    refresh_token: str

class UserProfileOut(BaseModel):
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    timezone: Optional[str] = "UTC"
    address: Optional[str] = None

    class Config:
        from_attributes = True

class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str
    is_active: bool
    is_verified: bool
    avatar_url: Optional[str] = None
    created_at: datetime
    profile: Optional[UserProfileOut] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut

class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str

class OTPResendRequest(BaseModel):
    email: EmailStr

class RegistrationResponse(BaseModel):
    status: str = "OTP_SENT"
    message: str
    email: str
    otp_sent: bool = True
    dev_otp: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_type: Optional[str] = "bearer"
    user: Optional[UserOut] = None

class PasswordChange(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6)

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)

class EmailVerifyRequest(BaseModel):
    token: str

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    timezone: Optional[str] = None

class AdminCreateAgent(BaseModel):
    email: EmailStr
    full_name: str
    password: str = Field(..., min_length=6)
    phone: Optional[str] = None
    role: str = "agent"  # agent, admin
    department: Optional[str] = None
    max_tickets: Optional[int] = 10

# ----------------- Products & Orders -----------------
class ProductOut(BaseModel):
    id: str
    name: str
    sku: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    price: float
    warranty_months: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ProductCreate(BaseModel):
    name: str
    sku: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    price: float = 0.0
    warranty_months: int = 12

class OrderItemOut(BaseModel):
    id: str
    product_id: str
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    product_image: Optional[str] = None
    quantity: int
    unit_price: float

    class Config:
        from_attributes = True

class OrderOut(BaseModel):
    id: str
    order_number: str
    customer_id: str
    customer_name: Optional[str] = None
    total_amount: float
    payment_status: str
    order_status: str
    shipping_address: Optional[str] = None
    created_at: datetime
    items: List[OrderItemOut] = []

    class Config:
        from_attributes = True

class OrderCreateItem(BaseModel):
    product_id: str
    quantity: int = 1

class OrderCreate(BaseModel):
    items: List[OrderCreateItem]
    shipping_address: Optional[str] = "Standard Customer Address"

# ----------------- Tickets -----------------
class TicketCreate(BaseModel):
    subject: str
    category: str  # Payment, Delivery, Product Defect, Refund, Account Access, Technical Support, Warranty, Other
    subcategory: Optional[str] = None
    priority: str = "Medium"  # Low, Medium, High, Critical
    description: str
    product_id: Optional[str] = None
    order_id: Optional[str] = None
    preferred_contact_method: str = "email"

class TicketUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    assigned_agent_id: Optional[str] = None

class TicketAssign(BaseModel):
    agent_id: str
    note: Optional[str] = None

class TicketEscalate(BaseModel):
    reason: str

class TicketAttachmentOut(BaseModel):
    id: str
    file_name: str
    file_path: str
    file_type: Optional[str] = None
    file_size: int
    created_at: datetime

    class Config:
        from_attributes = True

class TicketMessageCreate(BaseModel):
    content: str
    is_internal: bool = False

class TicketMessageOut(BaseModel):
    id: str
    ticket_id: str
    sender_id: Optional[str] = None
    sender_role: str
    sender_name: str
    content: str
    is_internal: bool
    is_read: bool
    created_at: datetime
    attachments: List[TicketAttachmentOut] = []

    class Config:
        from_attributes = True

class TicketStatusHistoryOut(BaseModel):
    id: str
    old_status: str
    new_status: str
    changed_by_id: Optional[str] = None
    changed_by_name: Optional[str] = None
    reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class TicketFeedbackCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comments: Optional[str] = None

class TicketFeedbackOut(BaseModel):
    id: str
    ticket_id: str
    customer_id: str
    customer_name: Optional[str] = None
    rating: int
    comments: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class TicketOut(BaseModel):
    id: str
    ticket_number: str
    customer_id: str
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    order_id: Optional[str] = None
    order_number: Optional[str] = None
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    assigned_agent_id: Optional[str] = None
    assigned_agent_name: Optional[str] = None
    category: str
    subcategory: Optional[str] = None
    priority: str
    status: str
    subject: str
    description: str
    preferred_contact_method: str
    sla_deadline: Optional[datetime] = None
    first_response_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    is_escalated: bool
    created_at: datetime
    updated_at: datetime
    message_count: int = 0
    unread_messages: int = 0
    feedback: Optional[TicketFeedbackOut] = None

    class Config:
        from_attributes = True

class TicketDetailOut(TicketOut):
    messages: List[TicketMessageOut] = []
    attachments: List[TicketAttachmentOut] = []
    status_history: List[TicketStatusHistoryOut] = []

# ----------------- Notifications -----------------
class NotificationOut(BaseModel):
    id: str
    user_id: Optional[str] = None
    role_target: Optional[str] = None
    title: str
    message: str
    notification_type: str
    link_url: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Email Logs & Settings -----------------
class EmailLogOut(BaseModel):
    id: str
    ticket_id: Optional[str] = None
    recipient_email: str
    recipient_type: str
    email_type: str
    subject: str
    content_preview: Optional[str] = None
    delivery_status: str
    provider: str
    message_id: Optional[str] = None
    error_message: Optional[str] = None
    retry_count: int
    created_at: datetime

    class Config:
        from_attributes = True

class CompanySettingsOut(BaseModel):
    company_name: str
    company_logo: Optional[str] = None
    owner_notification_email: str
    support_inbox_email: str
    agent_notification_emails: Optional[str] = None
    brevo_api_key_configured: bool
    brevo_sender_email: str
    brevo_sender_name: str
    support_contact_details: Optional[str] = None
    updated_at: Optional[datetime] = None

class CompanySettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    company_logo: Optional[str] = None
    owner_notification_email: Optional[str] = None
    support_inbox_email: Optional[str] = None
    agent_notification_emails: Optional[str] = None
    brevo_api_key: Optional[str] = None
    brevo_sender_email: Optional[str] = None
    brevo_sender_name: Optional[str] = None
    support_contact_details: Optional[str] = None

# ----------------- SLA -----------------
class SLAPolicyOut(BaseModel):
    id: str
    priority: str
    first_response_hours: float
    resolution_hours: float
    escalation_hours: float
    is_active: bool

    class Config:
        from_attributes = True

class SLAPolicyUpdate(BaseModel):
    first_response_hours: float
    resolution_hours: float
    escalation_hours: float
    is_active: bool = True

# ----------------- Knowledge Base -----------------
class KBArticleOut(BaseModel):
    id: str
    title: str
    slug: str
    category: str
    content: str
    tags: Optional[str] = None
    is_published: bool
    views_count: int
    helpful_count: int
    created_at: datetime

    class Config:
        from_attributes = True

class KBArticleCreate(BaseModel):
    title: str
    category: str
    content: str
    tags: Optional[str] = None
    is_published: bool = True

# ----------------- Inbound Emails -----------------
class InboundEmailWebhook(BaseModel):
    sender_email: EmailStr
    sender_name: Optional[str] = "Customer"
    subject: str
    body: str
    message_id: Optional[str] = None

# ----------------- Audit Logs -----------------
class AuditLogOut(BaseModel):
    id: str
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Admin Analytics -----------------
class AnalyticsCountItem(BaseModel):
    label: str
    count: int

class AgentPerformanceItem(BaseModel):
    agent_id: str
    agent_name: str
    agent_email: str
    assigned_count: int
    resolved_count: int
    avg_rating: float
    is_available: bool

class AdminDashboardStats(BaseModel):
    total_customers: int
    total_tickets: int
    open_tickets: int
    unassigned_tickets: int
    in_progress_tickets: int
    resolved_tickets: int
    overdue_tickets: int
    avg_resolution_hours: float
    tickets_by_category: List[AnalyticsCountItem]
    tickets_by_priority: List[AnalyticsCountItem]
    tickets_by_status: List[AnalyticsCountItem]
    agent_performance: List[AgentPerformanceItem]
    sla_compliance_rate: float
    total_orders: int
    total_revenue: float
