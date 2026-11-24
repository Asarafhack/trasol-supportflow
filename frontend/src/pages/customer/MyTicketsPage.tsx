import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Ticket } from '../../types';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge';
import { PlusCircle, Search, Filter, ExternalLink, Ticket as TicketIcon } from 'lucide-react';

export const MyTicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTickets();
  }, [statusFilter, priorityFilter, search]);

  const loadTickets = async () => {
    setIsLoading(true);
    try {
      const data = await api.getTickets({
        status: statusFilter,
        priority: priorityFilter,
        search,
      });
      setTickets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Support Tickets</h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete history and real-time status of all your support cases.
          </p>
        </div>
        <Link
          to="/customer/tickets/create"
          className="inline-flex items-center space-x-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Raise New Ticket</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ticket ID or subject..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
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
            <option value="Closed">Closed</option>
            <option value="Reopened">Reopened</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="ALL">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading tickets...</div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <TicketIcon className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500">No tickets found matching your filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Ticket ID</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Technician</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-900 dark:text-slate-100">
                      {t.ticket_number}
                    </td>
                    <td className="px-4 py-3.5 max-w-xs truncate">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 block truncate">{t.subject}</span>
                      <span className="text-[11px] text-slate-400">{t.product_name || 'N/A'}</span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                      {t.category}
                    </td>
                    <td className="px-4 py-3.5">
                      <PriorityBadge priority={t.priority} />
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                      {t.assigned_agent_name || 'Unassigned'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        to={`/customer/tickets/${t.id}`}
                        className="inline-flex items-center space-x-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
