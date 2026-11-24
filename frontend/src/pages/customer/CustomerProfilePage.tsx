import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { User, Save, CheckCircle, UserCircle, Building, Phone, Clock } from 'lucide-react';

export const CustomerProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [companyName, setCompanyName] = useState(user?.profile?.company_name || '');
  const [jobTitle, setJobTitle] = useState(user?.profile?.job_title || '');
  const [department, setDepartment] = useState(user?.profile?.department || '');
  const [timezone, setTimezone] = useState(user?.profile?.timezone || 'UTC');

  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setPhone(user.phone || '');
      setCompanyName(user.profile?.company_name || '');
      setJobTitle(user.profile?.job_title || '');
      setDepartment(user.profile?.department || '');
      setTimezone(user.profile?.timezone || 'UTC');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccess(false);

    try {
      await api.updateMyProfile({
        full_name: fullName,
        phone,
        profile: {
          company_name: companyName,
          job_title: jobTitle,
          department,
          timezone,
        },
      } as any);
      await refreshUser();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      alert('Failed to update profile: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Customer Profile Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Update your contact information, enterprise organization details, and timezone.
        </p>
      </div>

      {success && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>Profile changes saved successfully!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-5 shadow-xs text-xs">
        <div className="flex items-center space-x-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="w-14 h-14 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-lg uppercase shadow-md">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">{user?.full_name}</h3>
            <p className="text-slate-400 font-mono text-[11px]">{user?.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 uppercase">
              Customer Account
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1-555-0199"
              className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Enterprise Company Name
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Nexus Corp"
              className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Job Title / Department
            </label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Lead Systems Engineer"
              className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Timezone Preference
          </label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="UTC">UTC (Universal Coordinated Time)</option>
            <option value="America/New_York">America/New_York (EST/EDT)</option>
            <option value="America/Chicago">America/Chicago (CST/CDT)</option>
            <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
            <option value="Europe/London">Europe/London (GMT/BST)</option>
            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
          </select>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center space-x-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Profile'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
