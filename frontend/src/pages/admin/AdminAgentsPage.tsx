import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { User } from '../../types';
import { UserCheck, PlusCircle, Mail, Phone, ShieldCheck, CheckCircle } from 'lucide-react';

export const AdminAgentsPage: React.FC = () => {
  const [agents, setAgents] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Agent Form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Agent@12345');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('Hardware Diagnostics');
  const [maxTickets, setMaxTickets] = useState(15);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAdminAgents();
      setAgents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createAgent({
        full_name: fullName,
        email,
        password,
        phone,
        department,
        max_tickets: Number(maxTickets),
      });
      setShowAddModal(false);
      setFullName('');
      setEmail('');
      setPhone('');
      await loadAgents();
      alert('Support agent provisioned successfully!');
    } catch (err: any) {
      alert('Failed to provision agent: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Support Agent Team & Capacity</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage certified technicians, workload capacities, and automated ticket routing limits.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Provision New Agent</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading support team...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Technician</th>
                  <th className="px-4 py-3">Department / Focus</th>
                  <th className="px-4 py-3">Direct Phone</th>
                  <th className="px-4 py-3">System Role</th>
                  <th className="px-4 py-3">Roster Availability</th>
                  <th className="px-4 py-3">Active Since</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {agents.map((ag) => (
                  <tr key={ag.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center justify-center font-bold text-xs uppercase">
                          {ag.full_name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-white block">{ag.full_name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{ag.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 font-medium">
                      {ag.profile?.department || 'General Support'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 font-mono text-[11px]">
                      {ag.phone || 'Ext. 104'}
                    </td>
                    <td className="px-4 py-3.5 uppercase font-semibold text-[10px] text-brand-600">
                      {ag.role}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Available for Dispatch
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                      {new Date(ag.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Agent Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Provision Support Agent</h3>
                <p className="text-xs text-slate-400">Creates certified technician credentials in database</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateAgent} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Marcus Vance"
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Agent Work Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="agent.marcus@trasol.tech"
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Max Ticket Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={maxTickets}
                    onChange={(e) => setMaxTickets(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Specialty Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Edge Gateways / IoT Network"
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold"
                >
                  {isSubmitting ? 'Provisioning...' : 'Provision Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
