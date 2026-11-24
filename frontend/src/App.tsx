import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Layouts
import { DashboardLayout } from './layouts/DashboardLayout';
import { PublicLayout } from './layouts/PublicLayout';

// Public Pages
import { LandingPage } from './pages/public/LandingPage';
import { LoginPage } from './pages/public/LoginPage';
import { RegisterPage } from './pages/public/RegisterPage';
import { KnowledgeBasePage } from './pages/public/KnowledgeBasePage';

// Customer Pages
import { CustomerDashboard } from './pages/customer/CustomerDashboard';
import { MyTicketsPage } from './pages/customer/MyTicketsPage';
import { CreateTicketPage } from './pages/customer/CreateTicketPage';
import { TicketDetailPage } from './pages/customer/TicketDetailPage';
import { MyProductsPage } from './pages/customer/MyProductsPage';
import { MyOrdersPage } from './pages/customer/MyOrdersPage';
import { CustomerProfilePage } from './pages/customer/CustomerProfilePage';
import { LiveTroubleshootingPage } from './pages/customer/LiveTroubleshootingPage';

// Agent Pages
import { AgentDashboard } from './pages/agent/AgentDashboard';
import { AgentTicketDetailPage } from './pages/agent/AgentTicketDetailPage';
import { AgentPerformancePage } from './pages/agent/AgentPerformancePage';
import { AgentProfilePage } from './pages/agent/AgentProfilePage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminTicketsPage } from './pages/admin/AdminTicketsPage';
import { AdminCustomersPage } from './pages/admin/AdminCustomersPage';
import { AdminAgentsPage } from './pages/admin/AdminAgentsPage';
import { AdminProductsPage } from './pages/admin/AdminProductsPage';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { AdminEmailSettingsPage } from './pages/admin/AdminEmailSettingsPage';
import { AdminSLASettingsPage } from './pages/admin/AdminSLASettingsPage';
import { AdminCompanySettingsPage } from './pages/admin/AdminCompanySettingsPage';
import { AdminAuditLogsPage } from './pages/admin/AdminAuditLogsPage';

// Role Guard Wrapper
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-400">Authenticating session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role || '')) {
    // Redirect to respective dashboard if role doesn't match
    if (role === 'customer') return <Navigate to="/customer/dashboard" replace />;
    if (role === 'agent') return <Navigate to="/agent/dashboard" replace />;
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  const { user, role } = useAuth();

  return (
    <Routes>
      {/* Public Pages */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={user ? <Navigate to={role === 'customer' ? '/customer/dashboard' : role === 'agent' ? '/agent/dashboard' : '/admin/dashboard'} replace /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/customer/dashboard" replace /> : <RegisterPage />} />
        <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
      </Route>

      {/* Customer Routes */}
      <Route
        path="/customer"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/customer/dashboard" replace />} />
        <Route path="dashboard" element={<CustomerDashboard />} />
        <Route path="tickets" element={<MyTicketsPage />} />
        <Route path="tickets/create" element={<CreateTicketPage />} />
        <Route path="tickets/:id" element={<TicketDetailPage />} />
        <Route path="products" element={<MyProductsPage />} />
        <Route path="orders" element={<MyOrdersPage />} />
        <Route path="troubleshooting" element={<LiveTroubleshootingPage />} />
        <Route path="profile" element={<CustomerProfilePage />} />
      </Route>

      {/* Support Agent Routes */}
      <Route
        path="/agent"
        element={
          <ProtectedRoute allowedRoles={['agent', 'admin', 'super_admin']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/agent/dashboard" replace />} />
        <Route path="dashboard" element={<AgentDashboard />} />
        <Route path="tickets" element={<AgentDashboard />} />
        <Route path="tickets/:id" element={<AgentTicketDetailPage />} />
        <Route path="performance" element={<AgentPerformancePage />} />
        <Route path="profile" element={<AgentProfilePage />} />
      </Route>

      {/* Admin & Super Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="tickets" element={<AdminTicketsPage />} />
        <Route path="tickets/:id" element={<AgentTicketDetailPage />} />
        <Route path="customers" element={<AdminCustomersPage />} />
        <Route path="agents" element={<AdminAgentsPage />} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="email-settings" element={<AdminEmailSettingsPage />} />
        <Route path="sla-settings" element={<AdminSLASettingsPage />} />
        <Route path="troubleshooting" element={<LiveTroubleshootingPage />} />
        <Route path="company-settings" element={<AdminCompanySettingsPage />} />
        <Route path="audit-logs" element={<AdminAuditLogsPage />} />
      </Route>

      {/* Fallback Catch-All */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
export default App;
