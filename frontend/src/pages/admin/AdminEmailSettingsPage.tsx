import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { EmailLog, CompanySettings } from '../../types';
import {
  Mail,
  Send,
  Save,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Key,
  ShieldCheck,
  Inbox,
  Play
} from 'lucide-react';

export const AdminEmailSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form fields
  const [ownerEmail, setOwnerEmail] = useState('');
  const [supportInbox, setSupportInbox] = useState('');
  const [brevoApiKey, setBrevoApiKey] = useState('');
  const [brevoSenderEmail, setBrevoSenderEmail] = useState('');
  const [brevoSenderName, setBrevoSenderName] = useState('');

  // Inbound Email Simulator
  const [simSenderEmail, setSimSenderEmail] = useState('customer.john@example.com');
  const [simSenderName, setSimSenderName] = useState('John Doe');
  const [simSubject, setSimSubject] = useState('Re: [TKT-2026-000001] Sensor update');
  const [simBody, setSimBody] = useState('Hello, following up on our ticket. The issue is confirmed resolved on our end.');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cfg, logs] = await Promise.all([
        api.getCompanySettings(),
        api.getEmailLogs(),
      ]);
      setSettings(cfg);
      setEmailLogs(logs);

      setOwnerEmail(cfg.owner_notification_email || '');
      setSupportInbox(cfg.support_inbox_email || '');
      setBrevoSenderEmail(cfg.brevo_sender_email || '');
      setBrevoSenderName(cfg.brevo_sender_name || '');
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const updated = await api.updateCompanySettings({
        owner_notification_email: ownerEmail,
        support_inbox_email: supportInbox,
        brevo_api_key: brevoApiKey || undefined,
        brevo_sender_email: brevoSenderEmail,
        brevo_sender_name: brevoSenderName,
      });
      setSettings(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert('Failed to save settings: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSimulateInbound = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulating(true);
    setSimResult(null);

    try {
      const res = await api.simulateInboundEmail({
        sender_email: simSenderEmail,
        sender_name: simSenderName,
        subject: simSubject,
        body: simBody,
      });
      setSimResult(`Success: Status = ${res.status}. ${res.message || 'Message matched and appended to ticket conversation.'}`);
      await loadData();
    } catch (err: any) {
      setSimResult(`Error: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  if (isLoading || !settings) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading email dispatch settings...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Email Infrastructure & Delivery Logs</h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure Brevo Transactional API credentials, owner alert dispatch, and monitor real-time delivery logs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Settings Form */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-brand-600" />
              <span>Brevo & Transactional Dispatch</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Dual-notification engine for customer confirmation and company alerts
            </p>
          </div>

          {saveSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Settings updated successfully!</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Company Owner Notification Email *
              </label>
              <input
                type="email"
                required
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="owner@trasol.tech"
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <span className="text-[10px] text-slate-400">Receives Email #2 on every new ticket</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Support Inbox Email *
              </label>
              <input
                type="email"
                required
                value={supportInbox}
                onChange={(e) => setSupportInbox(e.target.value)}
                placeholder="support@trasol.tech"
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Brevo Transactional API Key</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${settings.brevo_api_key_configured ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                  {settings.brevo_api_key_configured ? 'CONFIGURED' : 'DEV SIMULATION'}
                </span>
              </label>
              <input
                type="password"
                value={brevoApiKey}
                onChange={(e) => setBrevoApiKey(e.target.value)}
                placeholder={settings.brevo_api_key_configured ? '••••••••••••••••••••••••' : 'xkeysib-... (leave blank for simulation)'}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
              <span className="text-[10px] text-slate-400">If unset, emails run safely via transactional outbox</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Verified Sender Email
              </label>
              <input
                type="email"
                value={brevoSenderEmail}
                onChange={(e) => setBrevoSenderEmail(e.target.value)}
                placeholder="support@trasol.tech"
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Sender Display Name
              </label>
              <input
                type="text"
                value={brevoSenderName}
                onChange={(e) => setBrevoSenderName(e.target.value)}
                placeholder="Trasol Technologies Support"
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center space-x-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Dispatch Settings'}</span>
            </button>
          </form>

          {/* Inbound Email Simulator Card */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-bold text-xs">
              <Inbox className="w-4 h-4 text-purple-600" />
              <span>Inbound Email Reply Simulator</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Simulate an incoming email reply with [TKT-2026-XXXXXX] in subject to test the parser.
            </p>

            <form onSubmit={handleSimulateInbound} className="space-y-2 text-xs">
              <input
                type="text"
                value={simSubject}
                onChange={(e) => setSimSubject(e.target.value)}
                placeholder="Subject with [TKT-2026-000001]"
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-[11px]"
              />
              <textarea
                rows={2}
                value={simBody}
                onChange={(e) => setSimBody(e.target.value)}
                placeholder="Body content..."
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-[11px]"
              ></textarea>
              <button
                type="submit"
                disabled={isSimulating}
                className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 text-xs shadow-xs"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Simulate Inbound Reply</span>
              </button>
            </form>

            {simResult && (
              <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-mono break-all text-slate-700 dark:text-slate-300">
                {simResult}
              </div>
            )}
          </div>
        </div>

        {/* Live Delivery Logs Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Mail className="w-4 h-4 text-brand-600" />
              <span>Real-Time Email Delivery Records ({emailLogs.length})</span>
            </h3>
            <button
              onClick={loadData}
              className="text-xs text-brand-600 hover:underline flex items-center gap-1 font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Logs
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Notification Type</th>
                    <th className="px-4 py-3">Recipient</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {emailLogs.map((log) => {
                    const statusBadge = {
                      SENT: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200',
                      SIMULATED_DEV: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200',
                      FAILED: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-200',
                      PENDING_RETRY: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200',
                    }[log.delivery_status] || 'bg-slate-100 text-slate-700';

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${statusBadge}`}>
                            {log.delivery_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                          {log.email_type.replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {log.recipient_email}
                          <span className="block text-[10px] text-slate-400 capitalize">({log.recipient_type})</span>
                        </td>
                        <td className="px-4 py-3 max-w-xs truncate text-slate-900 dark:text-white">
                          <span className="block truncate font-medium">{log.subject}</span>
                          <span className="text-[10px] text-slate-400 block truncate">{log.content_preview}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 uppercase font-mono text-[10px]">
                          {log.provider}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-[11px] whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
