import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { Save, CheckCircle, Shield, Award, UserCheck } from 'lucide-react';

export const AgentProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [phone, setPhone] = useState(user?.phone || '');
  const [department, setDepartment] = useState(user?.profile?.department || 'Hardware Diagnostics');
  const [isAvailable, setIsAvailable] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Technician Profile & Roster Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage technician dispatch status, specialized hardware focus, and operational availability.
        </p>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>Status updated successfully!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-5 shadow-xs text-xs">
        <div className="flex items-center space-x-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="w-14 h-14 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-lg uppercase shadow-md">
            {user?.full_name?.charAt(0) || 'A'}
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">{user?.full_name}</h3>
            <p className="text-slate-400 font-mono text-[11px]">{user?.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
              Support Technician • Level 2
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Engineering Department / Focus
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Direct Support Extension / Phone
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">Active Dispatch Availability</span>
              <span className="text-[11px] text-slate-400">Receive automatic ticket routing based on algorithm</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
            </label>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center space-x-1.5"
          >
            <Save className="w-4 h-4" />
            <span>Update Availability</span>
          </button>
        </div>
      </form>
    </div>
  );
};
