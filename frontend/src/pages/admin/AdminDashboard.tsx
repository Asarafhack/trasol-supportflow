import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { AdminDashboardStats } from '../../types';
import {
  LayoutDashboard,
  Ticket,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Users,
  TrendingUp,
  Download,
  ShieldCheck,
  DollarSign,
  UserCheck,
  Star
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAdminStats();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const csvData = await api.exportTicketsCsv();
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trasol_supportdesk_tickets_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    }
  };

  if (isLoading || !stats) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading operations intelligence...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Operations Command Center</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time analytics, SLA contract compliance, technician utilization, and incident resolution throughput.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-brand-600" />
            <span>Export CSV Report</span>
          </button>
        </div>
      </div>

      {/* KPI 8-Grid Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Total Cases</span>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1.5">{stats.total_tickets}</div>
          <span className="text-[11px] text-slate-400">Company-wide tickets</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-medium text-purple-600">Unassigned Queue</span>
          <div className="text-3xl font-extrabold text-purple-600 mt-1.5">{stats.unassigned_tickets}</div>
          <span className="text-[11px] text-slate-400">Needs agent assignment</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-medium text-rose-600">SLA Overdue</span>
          <div className="text-3xl font-extrabold text-rose-600 mt-1.5">{stats.overdue_tickets}</div>
          <span className="text-[11px] text-slate-400">Exceeded contractual deadline</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-medium text-emerald-600">SLA Compliance</span>
          <div className="text-3xl font-extrabold text-emerald-600 mt-1.5">{stats.sla_compliance_rate}%</div>
          <span className="text-[11px] text-slate-400">Resolved before deadline</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-medium text-orange-600">In Progress</span>
          <div className="text-3xl font-extrabold text-orange-600 mt-1.5">{stats.in_progress_tickets}</div>
          <span className="text-[11px] text-slate-400">Active engineering tickets</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-medium text-blue-600">Avg Resolution</span>
          <div className="text-3xl font-extrabold text-blue-600 mt-1.5">{stats.avg_resolution_hours}h</div>
          <span className="text-[11px] text-slate-400">Turnaround hours</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Customers</span>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1.5">{stats.total_customers}</div>
          <span className="text-[11px] text-slate-400">Registered accounts</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-medium text-indigo-600">Order Volume</span>
          <div className="text-3xl font-extrabold text-indigo-600 mt-1.5">${stats.total_revenue.toLocaleString()}</div>
          <span className="text-[11px] text-slate-400">{stats.total_orders} verified orders</span>
        </div>
      </div>

      {/* Visual Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tickets by Category */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center justify-between">
            <span>Incidents by Category</span>
            <span className="text-[10px] text-slate-400 font-normal">Real-time DB query</span>
          </h3>

          <div className="space-y-3 pt-2">
            {stats.tickets_by_category.map((item) => {
              const pct = stats.total_tickets > 0 ? Math.round((item.count / stats.total_tickets) * 100) : 0;
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{item.label}</span>
                    <span className="text-slate-500 font-mono">{item.count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-brand-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tickets by Priority */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center justify-between">
            <span>Priority Distribution</span>
            <span className="text-[10px] text-slate-400 font-normal">Live SLA tiers</span>
          </h3>

          <div className="space-y-3 pt-2">
            {stats.tickets_by_priority.map((item) => {
              const pct = stats.total_tickets > 0 ? Math.round((item.count / stats.total_tickets) * 100) : 0;
              const barColor = item.label === 'Critical' ? 'bg-red-500' : item.label === 'High' ? 'bg-orange-500' : item.label === 'Medium' ? 'bg-blue-500' : 'bg-emerald-500';
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{item.label}</span>
                    <span className="text-slate-500 font-mono">{item.count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`${barColor} h-full rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center justify-between">
            <span>Lifecycle Status</span>
            <span className="text-[10px] text-slate-400 font-normal">Workflow stages</span>
          </h3>

          <div className="space-y-3 pt-2">
            {stats.tickets_by_status.map((item) => {
              const pct = stats.total_tickets > 0 ? Math.round((item.count / stats.total_tickets) * 100) : 0;
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{item.label}</span>
                    <span className="text-slate-500 font-mono">{item.count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Technician Performance Leaderboard */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs space-y-3 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Technician Performance & SLA Leaderboard
          </h3>
          <Link to="/admin/agents" className="text-xs text-brand-600 font-semibold hover:underline">
            Manage Agents
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Support Agent</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Active Tickets</th>
                <th className="px-4 py-3">Resolved Cases</th>
                <th className="px-4 py-3">CSAT Rating</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {stats.agent_performance.map((ag) => (
                <tr key={ag.agent_id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                    {ag.agent_name}
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 font-mono text-[11px]">
                    {ag.agent_email}
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-slate-800 dark:text-slate-200">
                    {ag.assigned_count}
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-emerald-600">
                    {ag.resolved_count}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 font-bold text-amber-500">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {ag.avg_rating.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      Available
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
