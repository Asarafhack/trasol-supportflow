import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { LifeBuoy, Moon, Sun, ArrowRight, ShieldCheck, Mail, Phone, MapPin } from 'lucide-react';

export const PublicLayout: React.FC = () => {
  const { user, role, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Banner */}
      <div className="bg-slate-900 text-slate-300 text-xs py-2 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Enterprise SLA Active: 15-Min Response for Critical Production Incidents</span>
          </div>
          <div className="flex items-center space-x-4 text-[11px]">
            <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-brand-400" /> +1 (800) 555-0199</span>
            <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-brand-400" /> support@trasol.tech</span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20 text-white font-bold">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white block leading-tight">
                SupportDesk <span className="text-brand-600 dark:text-brand-400">360</span>
              </span>
              <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">
                Trasol Technologies
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <Link to="/" className="text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-white transition-colors">
              Platform Overview
            </Link>
            <Link to="/knowledge-base" className="text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-white transition-colors">
              Knowledge Base
            </Link>
          </nav>

          <div className="flex items-center space-x-3">
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {user ? (
              <div className="flex items-center space-x-3">
                <Link
                  to={role === 'customer' ? '/customer/dashboard' : role === 'agent' ? '/agent/dashboard' : '/admin/dashboard'}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                >
                  <span>Go to Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={logout}
                  className="px-3 py-2 text-xs text-slate-600 hover:text-red-600 dark:text-slate-300 font-medium"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-brand-600 dark:text-slate-200 dark:hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                >
                  Customer Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Enterprise Footer */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-white font-bold text-sm">
              <LifeBuoy className="w-4 h-4 text-brand-400" />
              <span>Trasol SupportDesk 360</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Industrial Customer Support, Complaint Lifecycle, and Real-Time Incident Orchestration Platform.
            </p>
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>SOC2 Type II & ISO 27001 Certified Architecture</span>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-3">Support Features</h4>
            <ul className="space-y-2">
              <li><Link to="/knowledge-base" className="hover:text-white transition-colors">Knowledge Base & FAQs</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Customer Ticket Portal</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Agent Workspace</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Operations Command Center</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-3">Service Level Agreements</h4>
            <ul className="space-y-2">
              <li><span className="text-red-400 font-bold">Critical:</span> 15-min response / 4-hr resolution</li>
              <li><span className="text-orange-400 font-semibold">High:</span> 1-hr response / 12-hr resolution</li>
              <li><span className="text-blue-400">Medium:</span> 4-hr response / 24-hr resolution</li>
              <li><span className="text-emerald-400">Low:</span> 8-hr response / 48-hr resolution</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-3">Trasol Technologies</h4>
            <p className="flex items-center gap-1.5 mb-1.5"><MapPin className="w-3.5 h-3.5 text-brand-400" /> 100 Technology Plaza, San Francisco, CA</p>
            <p className="flex items-center gap-1.5 mb-1.5"><Phone className="w-3.5 h-3.5 text-brand-400" /> +1 (800) 555-0199</p>
            <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-brand-400" /> support@trasol.tech</p>
          </div>
        </div>

        <div className="border-t border-slate-800 py-4 px-4 text-center text-slate-500">
          &copy; {new Date().getFullYear()} Trasol Technologies Inc. All rights reserved. Built for production reliability.
        </div>
      </footer>
    </div>
  );
};
