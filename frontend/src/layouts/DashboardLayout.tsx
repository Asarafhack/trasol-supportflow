import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSocket } from '../contexts/SocketContext';
import { NotificationDropdown } from '../components/common/NotificationDropdown';
import { LiveToast } from '../components/common/LiveToast';
import {
  LifeBuoy,
  LayoutDashboard,
  Ticket,
  PlusCircle,
  Package,
  ShoppingCart,
  Users,
  UserCheck,
  BarChart3,
  Mail,
  Clock,
  Settings,
  Shield,
  BookOpen,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  Radio,
  FileText,
  Activity
} from 'lucide-react';

export const DashboardLayout: React.FC = () => {
  const { user, role, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isConnected } = useSocket();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Navigation config per role
  let navItems = [];

  if (role === 'customer') {
    navItems = [
      { label: 'Customer Overview', path: '/customer/dashboard', icon: LayoutDashboard },
      { label: 'My Tickets', path: '/customer/tickets', icon: Ticket },
      { label: 'Create New Ticket', path: '/customer/tickets/create', icon: PlusCircle },
      { label: 'Live Diagnostics & Probes', path: '/customer/troubleshooting', icon: Activity },
      { label: 'My Purchased Products', path: '/customer/products', icon: Package },
      { label: 'My Orders & Checkout', path: '/customer/orders', icon: ShoppingCart },
      { label: 'Knowledge Base', path: '/knowledge-base', icon: BookOpen },
      { label: 'Profile Settings', path: '/customer/profile', icon: Settings },
    ];
  } else if (role === 'agent') {
    navItems = [
      { label: 'Agent Workspace', path: '/agent/dashboard', icon: LayoutDashboard },
      { label: 'Assigned Tickets', path: '/agent/tickets', icon: Ticket },
      { label: 'Performance & Ratings', path: '/agent/performance', icon: BarChart3 },
      { label: 'Knowledge Base', path: '/knowledge-base', icon: BookOpen },
      { label: 'My Profile', path: '/agent/profile', icon: Settings },
    ];
  } else {
    // Admin & Super Admin
    navItems = [
      { label: 'Analytics Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
      { label: 'All Support Tickets', path: '/admin/tickets', icon: Ticket },
      { label: 'Customers Directory', path: '/admin/customers', icon: Users },
      { label: 'Support Agents Team', path: '/admin/agents', icon: UserCheck },
      { label: 'Products & Hardware', path: '/admin/products', icon: Package },
      { label: 'Orders Management', path: '/admin/orders', icon: ShoppingCart },
      { label: 'Email Logs & Delivery', path: '/admin/email-settings', icon: Mail },
      { label: 'SLA Policy Rules', path: '/admin/sla-settings', icon: Clock },
      { label: 'Live Diagnostics Hub', path: '/admin/troubleshooting', icon: Activity },
      { label: 'Company & Branding', path: '/admin/company-settings', icon: Settings },
      { label: 'Security Audit Logs', path: '/admin/audit-logs', icon: Shield },
      { label: 'Knowledge Base', path: '/knowledge-base', icon: BookOpen },
    ];
  }

  const roleBadgeColor = {
    super_admin: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200',
    admin: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200',
    agent: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200',
    customer: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200',
  }[role || 'customer'];

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <LiveToast />

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-100 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800 bg-slate-950/60">
          <Link to="/" className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20 text-white font-bold">
              <LifeBuoy className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white block leading-tight">
                SupportDesk <span className="text-brand-400">360</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">
                Trasol Technologies
              </span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            {role === 'customer' ? 'Customer Portal' : role === 'agent' ? 'Agent Workspace' : 'Administration'}
          </div>

          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path + '/'));
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* User Card at bottom of sidebar */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center space-x-3 p-2 rounded-lg bg-slate-800/40">
            <div className="w-8 h-8 rounded-full bg-brand-700 text-white flex items-center justify-center font-bold text-xs uppercase shadow">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.full_name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="text-slate-400 hover:text-rose-400 transition-colors p-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Navbar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Real-time Indicator */}
            <div className="hidden sm:flex items-center space-x-2 text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              <span className="text-slate-600 dark:text-slate-300 font-medium text-[11px]">
                {isConnected ? 'Real-Time Connected' : 'Connecting to Server...'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Quick Action for Customers */}
            {role === 'customer' && (
              <Link
                to="/customer/tickets/create"
                className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium rounded-lg shadow-sm transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Raise Ticket</span>
              </Link>
            )}

            {/* Role Badge */}
            <span className={`px-2.5 py-1 text-xs font-bold rounded-full border uppercase tracking-wider ${roleBadgeColor}`}>
              {role?.replace('_', ' ')}
            </span>

            {/* Notification Bell */}
            <NotificationDropdown />

            {/* Dark/Light mode toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
