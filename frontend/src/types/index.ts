export type UserRole = 'customer' | 'agent' | 'admin' | 'super_admin';

export interface UserProfile {
  company_name?: string;
  job_title?: string;
  department?: string;
  timezone?: string;
  address?: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  is_active: boolean;
  is_verified: boolean;
  avatar_url?: string;
  created_at: string;
  profile?: UserProfile;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface RegistrationResponse {
  status: string;
  message: string;
  email: string;
  otp_sent: boolean;
  dev_otp?: string;
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  user?: User;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  image_url?: string;
  price: number;
  warranty_months: number;
  is_active: boolean;
  created_at: string;
}

export interface OrderItem {
  id: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  product_image?: string;
  quantity: number;
  unit_price: number;
  product?: Product;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name?: string;
  total_amount: number;
  payment_status: string;
  order_status: string;
  status?: string;
  shipping_address?: string;
  created_at: string;
  items: OrderItem[];
}

export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TicketStatus =
  | 'Open'
  | 'Assigned'
  | 'In Progress'
  | 'Waiting for Customer'
  | 'Escalated'
  | 'Resolved'
  | 'Closed'
  | 'Reopened';

export interface TicketAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type?: string;
  file_size: number;
  created_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id?: string;
  sender_role: string;
  sender_name: string;
  content: string;
  is_internal: boolean;
  is_read: boolean;
  created_at: string;
  attachments?: TicketAttachment[];
}

export interface TicketStatusHistory {
  id: string;
  old_status: string;
  new_status: string;
  changed_by_id?: string;
  changed_by_name?: string;
  reason?: string;
  created_at: string;
}

export interface TicketFeedback {
  id: string;
  ticket_id: string;
  customer_id: string;
  customer_name?: string;
  rating: number;
  comments?: string;
  created_at: string;
}

export interface Ticket {
  id: string;
  ticket_number: string;
  customer_id: string;
  customer_name?: string;
  customer_email?: string;
  order_id?: string;
  order_number?: string;
  product_id?: string;
  product_name?: string;
  assigned_agent_id?: string;
  assigned_agent_name?: string;
  category: string;
  subcategory?: string;
  priority: TicketPriority;
  status: TicketStatus;
  subject: string;
  description: string;
  preferred_contact_method: string;
  sla_deadline?: string;
  first_response_at?: string;
  resolved_at?: string;
  is_escalated: boolean;
  created_at: string;
  updated_at: string;
  message_count: number;
  unread_messages: number;
  feedback?: TicketFeedback;
  messages?: TicketMessage[];
  attachments?: TicketAttachment[];
  status_history?: TicketStatusHistory[];
}

export interface Notification {
  id: string;
  user_id?: string;
  role_target?: string;
  title: string;
  message: string;
  notification_type: string;
  link_url?: string;
  is_read: boolean;
  created_at: string;
}

export interface EmailLog {
  id: string;
  ticket_id?: string;
  recipient_email: string;
  recipient_type: string;
  email_type: string;
  subject: string;
  content_preview?: string;
  delivery_status: 'SENT' | 'SIMULATED_DEV' | 'FAILED' | 'PENDING_RETRY';
  provider: string;
  message_id?: string;
  error_message?: string;
  retry_count: number;
  created_at: string;
}

export interface SLAPolicy {
  id: string;
  priority: string;
  first_response_hours: number;
  resolution_hours: number;
  escalation_hours: number;
  is_active: boolean;
}

export interface KnowledgeBaseArticle {
  id: string;
  title: string;
  slug: string;
  category: string;
  content: string;
  tags?: string;
  is_published: boolean;
  views_count: number;
  helpful_count: number;
  created_at: string;
}

export interface CompanySettings {
  company_name: string;
  company_logo?: string;
  logo_url?: string;
  owner_notification_email: string;
  support_inbox_email: string;
  agent_notification_emails?: string;
  brevo_api_key_configured: boolean;
  brevo_api_key?: string;
  brevo_sender_email: string;
  brevo_sender_name: string;
  support_phone?: string;
  support_website?: string;
  address?: string;
  support_contact_details?: string;
  updated_at?: string;
}

export interface AnalyticsCountItem {
  label: string;
  count: number;
}

export interface AgentPerformanceItem {
  agent_id: string;
  agent_name: string;
  agent_email: string;
  assigned_count: number;
  resolved_count: number;
  avg_rating: number;
  is_available: boolean;
}

export interface AdminDashboardStats {
  total_customers: number;
  total_tickets: number;
  open_tickets: number;
  unassigned_tickets: number;
  in_progress_tickets: number;
  resolved_tickets: number;
  overdue_tickets: number;
  avg_resolution_hours: number;
  tickets_by_category: AnalyticsCountItem[];
  tickets_by_priority: AnalyticsCountItem[];
  tickets_by_status: AnalyticsCountItem[];
  agent_performance: AgentPerformanceItem[];
  sla_compliance_rate: number;
  total_orders: number;
  total_revenue: number;
}
