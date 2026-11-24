import {
  AuthResponse,
  RegistrationResponse,
  User,
  Product,
  Order,
  Ticket,
  Notification,
  EmailLog,
  SLAPolicy,
  KnowledgeBaseArticle,
  CompanySettings,
  AdminDashboardStats,
} from '../types';

const rawApiUrl = import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).trim().replace(/\/+$/, '') : '';
// Prevent doubled '/api/v1' regardless of how VITE_API_URL is configured on Vercel
const API_BASE = rawApiUrl
  ? (rawApiUrl.endsWith('/api/v1') ? rawApiUrl : `${rawApiUrl}/api/v1`)
  : '/api/v1';

class ApiService {
  private getToken(): string | null {
    return localStorage.getItem('trasol_token');
  }

  public setToken(token: string) {
    localStorage.setItem('trasol_token', token);
  }

  public clearToken() {
    localStorage.removeItem('trasol_token');
    localStorage.removeItem('trasol_user');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      this.clearToken();
      window.location.href = '/login';
      throw new Error('Session expired. Please log in again.');
    }

    if (!response.ok) {
      let errorMsg = 'An error occurred';
      try {
        const errorData = await response.json();
        if (typeof errorData.detail === 'string') {
          errorMsg = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          errorMsg = errorData.detail
            .map((item: any) => {
              if (item.loc && item.msg) {
                const field = item.loc[item.loc.length - 1];
                return `${field}: ${item.msg}`;
              }
              return item.msg || JSON.stringify(item);
            })
            .join(' | ');
        } else if (typeof errorData.detail === 'object' && errorData.detail !== null) {
          errorMsg = JSON.stringify(errorData.detail);
        } else if (errorData.message) {
          errorMsg = typeof errorData.message === 'string' ? errorData.message : JSON.stringify(errorData.message);
        } else {
          errorMsg = JSON.stringify(errorData);
        }
      } catch {
        errorMsg = response.statusText || 'Request failed';
      }
      throw new Error(errorMsg);
    }

    // Handle CSV or text responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/csv')) {
      return (await response.text()) as unknown as T;
    }

    return response.json();
  }

  // ---------------- AUTH ----------------
  async login(credentials: { email: string; password: string }): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    this.setToken(data.access_token);
    localStorage.setItem('trasol_user', JSON.stringify(data.user));
    return data;
  }

  async register(data: {
    full_name: string;
    email: string;
    password: string;
    phone?: string;
    terms_accepted?: boolean;
  }): Promise<RegistrationResponse> {
    return this.request<RegistrationResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyOTP(payload: { email: string; otp: string }): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setToken(data.access_token);
    localStorage.setItem('trasol_user', JSON.stringify(data.user));
    return data;
  }

  async resendOTP(payload: { email: string }): Promise<{ status: string; message: string; dev_otp?: string }> {
    return this.request('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async requestLoginOTP(payload: { email: string }): Promise<{ status: string; message: string; email: string; dev_otp?: string }> {
    return this.request('/auth/request-login-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.clearToken();
    }
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  // ---------------- CUSTOMERS ----------------
  async getMyProfile(): Promise<User> {
    return this.request<User>('/customers/me');
  }

  async updateMyProfile(data: Partial<User>): Promise<User> {
    return this.request<User>('/customers/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getMyOrders(): Promise<Order[]> {
    return this.request<Order[]>('/customers/me/orders');
  }

  async getMyProducts(): Promise<Product[]> {
    return this.request<Product[]>('/customers/me/products');
  }

  // ---------------- PRODUCTS & ORDERS ----------------
  async getProducts(): Promise<Product[]> {
    return this.request<Product[]>('/products');
  }

  async createProduct(data: {
    name: string;
    sku: string;
    description?: string;
    price: number;
    warranty_months?: number;
    image_url?: string;
  }): Promise<Product> {
    return this.request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getOrders(): Promise<Order[]> {
    return this.request<Order[]>('/orders');
  }

  async createOrder(data: {
    items: { product_id: string; quantity: number }[];
    shipping_address?: string;
  }): Promise<Order> {
    return this.request<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ---------------- TICKETS ----------------
  async getTickets(params?: {
    status?: string;
    priority?: string;
    category?: string;
    search?: string;
    agent_id?: string;
  }): Promise<Ticket[]> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);
    if (params?.priority && params.priority !== 'ALL') query.append('priority', params.priority);
    if (params?.category && params.category !== 'ALL') query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    if (params?.agent_id) query.append('agent_id', params.agent_id);

    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<Ticket[]>(`/tickets${qs}`);
  }

  async getTicket(id: string): Promise<Ticket> {
    return this.request<Ticket>(`/tickets/${id}`);
  }

  async createTicket(data: {
    subject: string;
    category: string;
    subcategory?: string;
    priority: string;
    description: string;
    product_id?: string;
    order_id?: string;
    preferred_contact_method?: string;
  }): Promise<Ticket> {
    return this.request<Ticket>('/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTicket(id: string, data: Partial<Ticket>): Promise<Ticket> {
    return this.request<Ticket>(`/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async postMessage(
    ticketId: string,
    content: string,
    isInternal: boolean = false
  ): Promise<any> {
    return this.request(`/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, is_internal: isInternal }),
    });
  }

  async assignTicket(ticketId: string, agentId: string, note?: string): Promise<Ticket> {
    return this.request<Ticket>(`/tickets/${ticketId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ agent_id: agentId, note }),
    });
  }

  async escalateTicket(ticketId: string, reason: string): Promise<Ticket> {
    return this.request<Ticket>(`/tickets/${ticketId}/escalate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async resolveTicket(ticketId: string): Promise<Ticket> {
    return this.request<Ticket>(`/tickets/${ticketId}/resolve`, {
      method: 'POST',
    });
  }

  async reopenTicket(ticketId: string): Promise<Ticket> {
    return this.request<Ticket>(`/tickets/${ticketId}/reopen`, {
      method: 'POST',
    });
  }

  async submitFeedback(
    ticketId: string,
    data: { rating: number; comments?: string }
  ): Promise<any> {
    return this.request(`/tickets/${ticketId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async uploadAttachment(ticketId: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const token = this.getToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/tickets/${ticketId}/attachments`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload attachment');
    }
    return response.json();
  }

  // ---------------- NOTIFICATIONS ----------------
  async getNotifications(): Promise<Notification[]> {
    return this.request<Notification[]>('/notifications');
  }

  async markNotificationRead(id: string): Promise<Notification> {
    return this.request<Notification>(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsRead(): Promise<void> {
    await this.request('/notifications/read-all', { method: 'PUT' });
  }

  // ---------------- ADMIN ----------------
  async getAdminStats(): Promise<AdminDashboardStats> {
    return this.request<AdminDashboardStats>('/admin/dashboard');
  }

  async getAdminCustomers(): Promise<User[]> {
    return this.request<User[]>('/admin/customers');
  }

  async getAdminAgents(): Promise<User[]> {
    return this.request<User[]>('/admin/agents');
  }

  async createAgent(data: {
    email: string;
    full_name: string;
    password: string;
    phone?: string;
    department?: string;
    max_tickets?: number;
  }): Promise<User> {
    return this.request<User>('/admin/agents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getEmailLogs(): Promise<EmailLog[]> {
    return this.request<EmailLog[]>('/admin/email-logs');
  }

  async getAuditLogs(): Promise<any[]> {
    return this.request<any[]>('/admin/audit-logs');
  }

  async getCompanySettings(): Promise<CompanySettings> {
    return this.request<CompanySettings>('/admin/settings');
  }

  async updateCompanySettings(data: Partial<CompanySettings>): Promise<CompanySettings> {
    return this.request<CompanySettings>('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getSLAPolicies(): Promise<SLAPolicy[]> {
    return this.request<SLAPolicy[]>('/admin/sla-policies');
  }

  async updateSLAPolicy(id: string, data: Partial<SLAPolicy>): Promise<SLAPolicy> {
    return this.request<SLAPolicy>(`/admin/sla-policies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async exportTicketsCsv(): Promise<string> {
    return this.request<string>('/admin/export-csv');
  }

  // ---------------- KNOWLEDGE BASE ----------------
  async getArticles(category?: string, search?: string): Promise<KnowledgeBaseArticle[]> {
    const query = new URLSearchParams();
    if (category) query.append('category', category);
    if (search) query.append('search', search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<KnowledgeBaseArticle[]>(`/knowledge-base${qs}`);
  }

  async getArticleBySlug(slug: string): Promise<KnowledgeBaseArticle> {
    return this.request<KnowledgeBaseArticle>(`/knowledge-base/${slug}`);
  }

  async markArticleHelpful(articleId: string): Promise<any> {
    return this.request(`/knowledge-base/${articleId}/helpful`, {
      method: 'POST',
    });
  }

  // ---------------- INBOUND WEBHOOK (DEMO / SIMULATION) ----------------
  async simulateInboundEmail(payload: {
    sender_email: string;
    sender_name: string;
    subject: string;
    body: string;
  }): Promise<any> {
    return this.request('/inbound/webhook', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export const api = new ApiService();
