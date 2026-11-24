import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LifeBuoy,
  Zap,
  Mail,
  Shield,
  Clock,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Layers,
  Database,
  Users
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleQuickLogin = async (email: string, pass: string, targetPath: string) => {
    try {
      await login({ email, password: pass });
      navigate(targetPath);
    } catch (err: any) {
      alert('Login failed: ' + err.message);
    }
  };

  return (
    <div className="space-y-20 py-12">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-brand-600 animate-ping"></span>
          <span>Trasol SupportDesk 360 v1.0 Production Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight">
          Enterprise Customer Support & <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-indigo-600 to-blue-500">Real-Time Ticket Management</span>
        </h1>

        <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Centralized customer authentication, product purchases, automatic confirmation & owner alert emails, real-time agent collaboration, SLA timers, and incident lifecycle resolution.
        </p>

        {/* 1-Click Demo Evaluation Launcher */}
        <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              1-Click Interactive Role Evaluation (Select Role to Enter)
            </span>
            <span className="text-xs text-slate-400">Pre-seeded with real database records</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              onClick={() => handleQuickLogin('admin@trasol.com', 'trasol2026', '/admin/dashboard')}
              className="flex flex-col p-4 text-left rounded-xl border-2 border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 hover:border-indigo-600 hover:shadow-lg transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">★ Primary Admin</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-indigo-600 text-white rounded font-mono font-bold">trasol2026</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Full control, live sync, ticket assignment, email logs</span>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-3 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Enter Admin Portal <ArrowRight className="w-3 h-3" />
              </span>
            </button>

            <button
              onClick={() => handleQuickLogin('superadmin@trasol.tech', 'Admin@12345', '/admin/dashboard')}
              className="flex flex-col p-4 text-left rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/20 hover:border-purple-500 hover:shadow-md transition-all group"
            >
              <span className="text-xs font-bold text-purple-700 dark:text-purple-300">Super Admin</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Analytics, Brevo settings, SLA, audit logs</span>
              <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 mt-3 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Enter Super Admin <ArrowRight className="w-3 h-3" />
              </span>
            </button>

            <button
              onClick={() => handleQuickLogin('agent.sarah@trasol.tech', 'Agent@12345', '/agent/dashboard')}
              className="flex flex-col p-4 text-left rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 hover:border-amber-500 hover:shadow-md transition-all group"
            >
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300">Support Agent</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Live customer chat, internal staff notes, status transitions, SLA</span>
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-3 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Enter Agent Workspace <ArrowRight className="w-3 h-3" />
              </span>
            </button>

            <button
              onClick={() => handleQuickLogin('customer.john@example.com', 'Customer@12345', '/customer/dashboard')}
              className="flex flex-col p-4 text-left rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 hover:border-blue-500 hover:shadow-md transition-all group"
            >
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300">Customer (John Doe)</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Raise tickets, mock checkout, chat with agent, rate resolution</span>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-3 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Enter Customer Dashboard <ArrowRight className="w-3 h-3" />
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Core Architectural Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Engineered for High-Reliability Operations
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            Fully functional backend with PostgreSQL / SQLite ORM, transaction outbox, and WebSocket pub/sub.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Dual Automated Email Engine
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Every customer ticket triggers <strong>Email 1 (Customer confirmation)</strong> and <strong>Email 2 (Owner notification)</strong> with delivery status tracking via Brevo transactional API or high-fidelity outbox logs.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Real-Time WebSockets & Chat
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Instant customer-agent conversation with typing indicators, presence, and live notification badges that update dashboards without page reload.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              SLA Timers & Smart Assignment
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Configurable response and resolution targets for Critical, High, Medium, and Low priorities with automatic agent workload routing and escalation triggers.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
