import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { SLAPolicy } from '../../types';
import { Clock, ShieldAlert, CheckCircle, Save, AlertTriangle } from 'lucide-react';

export const AdminSLASettingsPage: React.FC = () => {
  const [policies, setPolicies] = useState<SLAPolicy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [editingPolicy, setEditingPolicy] = useState<{ [key: string]: Partial<SLAPolicy> }>({});

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSLAPolicies();
      setPolicies(data);
      const initial: { [key: string]: Partial<SLAPolicy> } = {};
      data.forEach((p) => {
        initial[p.id] = {
          first_response_hours: p.first_response_hours,
          resolution_hours: p.resolution_hours,
          escalation_hours: p.escalation_hours,
        };
      });
      setEditingPolicy(initial);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (id: string, field: string, value: number) => {
    setEditingPolicy((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleSavePolicy = async (id: string) => {
    setIsSaving(true);
    try {
      const updates = editingPolicy[id];
      await api.updateSLAPolicy(id, updates);
      setSuccessMsg('SLA Policy updated successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
      loadPolicies();
    } catch (err: any) {
      alert(err.message || 'Failed to update SLA Policy');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <ShieldAlert className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
          SLA Rules & Service Target Policies
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Configure real-time countdown deadlines, first response thresholds, and automated escalation timers for each ticket severity level.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-sm">
          <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          {successMsg}
        </div>
      )}

      {/* SLA Policy Cards */}
      {isLoading ? (
        <div className="p-12 text-center text-gray-500">Loading SLA policies...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {policies.map((policy) => {
            const current = editingPolicy[policy.id] || policy;
            const isCritical = policy.priority === 'Critical';
            const isHigh = policy.priority === 'High';

            return (
              <div
                key={policy.id}
                className={`bg-white dark:bg-gray-800 rounded-xl border p-6 shadow-sm transition ${
                  isCritical
                    ? 'border-red-200 dark:border-red-900/60 ring-1 ring-red-500/20'
                    : isHigh
                    ? 'border-orange-200 dark:border-orange-900/60'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-3 h-3 rounded-full ${
                        isCritical
                          ? 'bg-red-500'
                          : isHigh
                          ? 'bg-orange-500'
                          : policy.priority === 'Medium'
                          ? 'bg-blue-500'
                          : 'bg-emerald-500'
                      }`}
                    />
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                      {policy.priority} Priority SLA
                    </h3>
                  </div>
                  <span className="text-xs px-2.5 py-1 bg-gray-100 dark:bg-gray-700 rounded-full font-medium text-gray-700 dark:text-gray-300">
                    Tier {isCritical ? '1 - Urgent' : isHigh ? '2 - High' : 'Standard'}
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      First Response Deadline (Hours)
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      min="0.1"
                      value={current.first_response_hours ?? policy.first_response_hours}
                      onChange={(e) =>
                        handleFieldChange(policy.id, 'first_response_hours', parseFloat(e.target.value))
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      Target time for support agent to send initial public response.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      Resolution Target (Hours)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={current.resolution_hours ?? policy.resolution_hours}
                      onChange={(e) =>
                        handleFieldChange(policy.id, 'resolution_hours', parseFloat(e.target.value))
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      Max time before ticket is marked SLA breached if unresolved.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      Auto-Escalation Threshold (Hours)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.2"
                      value={current.escalation_hours ?? policy.escalation_hours}
                      onChange={(e) =>
                        handleFieldChange(policy.id, 'escalation_hours', parseFloat(e.target.value))
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      Tickets untouched after this time are automatically elevated to Tier 3 Engineers.
                    </p>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => handleSavePolicy(policy.id)}
                      disabled={isSaving}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition shadow-sm disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save Rule
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
