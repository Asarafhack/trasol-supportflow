import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Ticket, User } from '../../types';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge';
import {
  Ticket as TicketIcon,
  Search,
  Filter,
  UserCheck,
  ExternalLink,
  Download,
  AlertTriangle,
  Clock
} from 'lucide-react';

export const AdminTicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [agentFilter, setAgentFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Assign Modal
  const [assignModalTicket, setAssignModalTicket] = useState<Ticket | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [assignNote, setAssignNote] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    loadData();
  }, [statusFilter, priorityFilter, agentFilter, search]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tktList, agList] = await Promise.all([
        api.getTickets({
          status: statusFilter,
          priority: priorityFilter,
          agent_id: agentFilter || undefined,
          search,
        }),
        api.getAdminAgents(),
      ]);
      setTickets(tktList);
      setAgents(agList);
      if (agList.length > 0 && !selectedAgentId) {
        setSelectedAgentId(agList[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalTicket || !selectedAgentId) return;

    setIsAssigning(true);
    try {
      await api.assignTicket(assignModalTicket.id, selectedAgentId, assignNote);
      setAssignModalTicket(null);
      setAssignNote('');
      await loadData();
    } catch (err: any) {
      alert('Assignment failed: ' + err.message);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">All Company Support Tickets</h1>
          <p className="text-xs text-slate-500 mt-1">
            Global incident oversight, technician allocation, and customer complaint dispatch.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ticket, customer, equipment..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
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

          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="">All Technicians</option>
            {agents.map((ag) => (
              <option key={ag.id} value={ag.id}>
                {ag.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading all company tickets...</div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <TicketIcon className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500">No tickets match the current filters.</p>
          </div>
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
                  <th className="px-4 py-3">Assigned Agent</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
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
                      {t.assigned_agent_name ? (
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {t.assigned_agent_name}
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setAssignModalTicket(t);
                            if (agents.length > 0) setSelectedAgentId(agents[0].id);
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-950 dark:text-purple-300"
                        >
                          + Assign Agent
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-2">
                      <Link
                        to={`/agent/tickets/${t.id}`}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded font-semibold text-xs"
                      >
                        <span>Desk</span>
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

      {/* Assignment Modal */}
      {assignModalTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center space-x-2 text-brand-600">
              <UserCheck className="w-5 h-5" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Assign Ticket: {assignModalTicket.ticket_number}
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Select an available support technician. The agent will immediately receive a real-time notification and an assignment dispatch email.
            </p>

            <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Technician *
                </label>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.full_name} ({ag.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assignment Note / Directives
                </label>
                <textarea
                  rows={2}
                  value={assignNote}
                  onChange={(e) => setAssignNote(e.target.value)}
                  placeholder="e.g. High priority customer; review telemetry signal before calling."
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignModalTicket(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold"
                >
                  {isAssigning ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
