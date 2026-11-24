import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ShieldCheck, Search, Filter, Calendar, Activity, Clock } from 'lucide-react';

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = logs.filter((log) => {
    const matchesSearch =
      (log.action && log.action.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.ip_address && log.ip_address.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesAction = actionFilter === 'ALL' || (log.action && log.action.toLowerCase().includes(actionFilter.toLowerCase()));
    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Security & Audit Activity Trail
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Immutable log of administrative operations, ticket assignments, status escalations, and authentication events.
          </p>
        </div>
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          Total Audit Records: <span className="font-bold text-indigo-600 dark:text-indigo-400">{logs.length}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by action, operator, IP address, or details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-transparent text-sm text-gray-700 dark:text-gray-300 focus:outline-none"
          >
            <option value="ALL">All Actions</option>
            <option value="login">Login Events</option>
            <option value="ticket">Ticket Actions</option>
            <option value="assign">Assignments</option>
            <option value="settings">Settings Changes</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      {isLoading ? (
        <div className="p-12 text-center text-gray-500">Loading audit trail...</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500">
          No audit records found matching your query.
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Actor</th>
                  <th className="px-6 py-4">Resource</th>
                  <th className="px-6 py-4">IP Address</th>
                  <th className="px-6 py-4">Context Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-700/30 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                        <Activity className="w-3 h-3" />
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-900 dark:text-white">
                      {log.user_id ? log.user_id.substring(0, 8) + '...' : 'System Service'}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-600 dark:text-gray-400">
                      {log.resource_type ? `${log.resource_type}:${log.resource_id?.substring(0, 8)}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-500 dark:text-gray-400">
                      {log.ip_address || '127.0.0.1'}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-300 max-w-sm truncate">
                      {log.details || 'Routine operation performed successfully.'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
