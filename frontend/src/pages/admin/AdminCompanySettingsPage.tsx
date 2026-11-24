import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { CompanySettings } from '../../types';
import { Building2, Mail, Phone, Globe, MapPin, CheckCircle, Save } from 'lucide-react';

export const AdminCompanySettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Form Fields
  const [companyName, setCompanyName] = useState('Trasol Technologies');
  const [logoUrl, setLogoUrl] = useState('');
  const [supportPhone, setSupportPhone] = useState('+1 (800) 555-TRASOL');
  const [supportWebsite, setSupportWebsite] = useState('https://trasol.tech');
  const [ownerEmail, setOwnerEmail] = useState('owner@trasol.tech');
  const [inboxEmail, setInboxEmail] = useState('support@trasol.tech');
  const [address, setAddress] = useState('100 Innovation Blvd, Suite 400, Austin, TX 78701');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await api.getCompanySettings();
      if (data) {
        setSettings(data);
        setCompanyName(data.company_name || 'Trasol Technologies');
        setLogoUrl(data.logo_url || '');
        setSupportPhone(data.support_phone || '+1 (800) 555-TRASOL');
        setSupportWebsite(data.support_website || 'https://trasol.tech');
        setOwnerEmail(data.owner_notification_email || 'owner@trasol.tech');
        setInboxEmail(data.support_inbox_email || 'support@trasol.tech');
        setAddress(data.address || '100 Innovation Blvd, Suite 400, Austin, TX 78701');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.updateCompanySettings({
        company_name: companyName,
        logo_url: logoUrl,
        support_phone: supportPhone,
        support_website: supportWebsite,
        owner_notification_email: ownerEmail,
        support_inbox_email: inboxEmail,
        address,
      });
      setSuccessMsg('Company configuration saved successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to save company settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Building2 className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
          Company Profile & Global Settings
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Configure corporate branding, owner dispatch emails, and customer-facing support contact channels.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-sm">
          <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          {successMsg}
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center text-gray-500">Loading company settings...</div>
      ) : (
        <form onSubmit={handleSave} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Brand Logo URL
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-700/60 pt-6">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-500" />
              Automated Notification Email Routing
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Company Owner Notification Email *
                </label>
                <input
                  type="email"
                  required
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Receives automated alerts whenever any customer submits a new complaint ticket.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Customer Support Inbox Email *
                </label>
                <input
                  type="email"
                  required
                  value={inboxEmail}
                  onChange={(e) => setInboxEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Sender address shown on all outbound customer confirmation and resolution emails.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-700/60 pt-6">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-500" />
              Support & Contact Channels
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Hotline Telephone
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={supportPhone}
                    onChange={(e) => setSupportPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Corporate Website URL
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="url"
                    value={supportWebsite}
                    onChange={(e) => setSupportWebsite(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Corporate Headquarters Address
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving Changes...' : 'Save Settings'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
