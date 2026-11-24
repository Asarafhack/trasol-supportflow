import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Ticket } from '../../types';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge';
import {
  Ticket as TicketIcon,
  Clock,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Users,
  Search,
  Filter
} from 'lucide-react';

export const AgentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTickets();
  }, [statusFilter, search]);

  const loadTickets = async () => {
    setIsLoading(true);
    try {
      const data = await api.getTickets({
        status: statusFilter,
        search,
      });
      setTickets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const assignedToMe = tickets.filter((t) => t.assigned_agent_id === user?.id);
  const inProgressCount = assignedToMe.filter((t) => t.status === 'In Progress').length;
  const waitingCount = assignedToMe.filter((t) => t.status === 'Waiting for Customer').length;
  const overdueCount = assignedToMe.filter((t) => {
    if (!t.sla_deadline) return false;
    return new Date(t.sla_deadline) < new Date() && t.status !== 'Resolved' && t.status !== 'Closed';
  }).length;
  const resolvedCount = assignedToMe.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Technician Workspace</h1>
        <p className="text-xs text-slate-500 mt-1">
          Review assignments, maintain SLA targets, collaborate with customers, and record internal engineering notes.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-medium text-slate-500">My Active Cases</span>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1.5">{assignedToMe.length}</div>
          <span className="text-[10px] text-slate-400">Total assigned to you</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-medium text-orange-600">In Progress</span>
          <div className="text-2xl font-extrabold text-orange-600 mt-1.5">{inProgressCount}</div>
          <span className="text-[10px] text-slate-400">Currently diagnostics</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-medium text-amber-600">Waiting Customer</span>
          <div className="text-2xl font-extrabold text-amber-600 mt-1.5">{waitingCount}</div>
          <span className="text-[10px] text-slate-400">Awaiting customer reply</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-medium text-rose-600">SLA Overdue</span>
          <div className="text-2xl font-extrabold text-rose-600 mt-1.5">{overdueCount}</div>
          <span className="text-[10px] text-slate-400">Requires emergency response</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-medium text-emerald-600">Resolved</span>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1.5">{resolvedCount}</div>
          <span className="text-[10px] text-slate-400">Completed tickets</span>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="space-y-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ticket ID, customer, or equipment..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Waiting for Customer">Waiting for Customer</option>
              <option value="Escalated">Escalated</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>

        {/* Tickets Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 text-xs">Loading ticket queue...</div>
          ) : tickets.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">No tickets in this view.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Ticket ID</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Subject / Equipment</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">SLA Deadline</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {tickets.map((t) => {
                    const isOverdue = t.sla_deadline && new Date(t.sla_deadline) < new Date() && t.status !== 'Resolved' && t.status !== 'Closed';
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3.5 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {t.ticket_number}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 block">{t.customer_name}</span>
                          <span className="text-[10px] text-slate-400">{t.customer_email}</span>
                        </td>
                        <td className="px-4 py-3.5 max-w-xs truncate">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 block truncate">{t.subject}</span>
                          <span className="text-[11px] text-slate-400">{t.product_name || t.category}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <PriorityBadge priority={t.priority} />
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={t.status} />
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-[11px] font-mono flex items-center gap-1 ${
                            isOverdue ? 'text-red-600 font-bold' : 'text-slate-500'
                          }`}>
                            <Clock className="w-3 h-3" />
                            {t.sla_deadline ? new Date(t.sla_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Link
                            to={`/agent/tickets/${t.id}`}
                            className="inline-flex items-center space-x-1 px-3 py-1 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 rounded-md font-semibold text-xs transition-colors"
                          >
                            <span>Open Desk</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
