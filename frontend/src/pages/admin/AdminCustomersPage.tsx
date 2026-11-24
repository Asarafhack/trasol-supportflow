import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { User } from '../../types';
import { useSocket } from '../../contexts/SocketContext';
import { Users, Search, Mail, Phone, Building, Calendar, CheckCircle, RefreshCw, Radio } from 'lucide-react';

export const AdminCustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { isConnected, lastMessage } = useSocket();
  const [recentLiveUserId, setRecentLiveUserId] = useState<string | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  // Real-time listener for customer registration
  useEffect(() => {
    if (lastMessage?.type === 'CUSTOMER_REGISTERED') {
      loadCustomers();
      if (lastMessage.user?.id) {
        setRecentLiveUserId(lastMessage.user.id);
        setTimeout(() => setRecentLiveUserId(null), 8000);
      }
    }
  }, [lastMessage]);

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAdminCustomers();
      setCustomers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = customers.filter(
    (c) =>
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.profile?.company_name && c.profile.company_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Customer Directory</h1>
            {isConnected ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                Sync Offline
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Registered customer accounts, verified contact points, and instant real-time registration sync.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadCustomers}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, email, or company..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>
        <span className="text-xs text-slate-500">{filtered.length} customers found</span>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading customer directory...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">No customer accounts matched.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Enterprise Organization</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Account Status</th>
                  <th className="px-4 py-3">Registered Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 flex items-center justify-center font-bold text-xs uppercase">
                          {c.full_name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-white block">{c.full_name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{c.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 font-medium">
                      {c.profile?.company_name || 'Individual Customer'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 font-mono text-[11px]">
                      {c.phone || 'Not provided'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        <CheckCircle className="w-3 h-3" />
                        Verified
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                      {new Date(c.created_at).toLocaleDateString()}
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
