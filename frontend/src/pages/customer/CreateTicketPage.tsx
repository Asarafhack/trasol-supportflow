import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { Product, Order } from '../../types';
import {
  LifeBuoy,
  Send,
  AlertCircle,
  Paperclip,
  CheckCircle,
  ShieldAlert,
  Info,
  Clock,
  Mail
} from 'lucide-react';

export const CreateTicketPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedProdId = searchParams.get('product_id') || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form Fields
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Product Defect');
  const [subcategory, setSubcategory] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [selectedProductId, setSelectedProductId] = useState(preSelectedProdId);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [description, setDescription] = useState('');
  const [contactMethod, setContactMethod] = useState('email');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPrerequisites();
  }, []);

  const loadPrerequisites = async () => {
    setIsLoading(true);
    try {
      const [prods, ords] = await Promise.all([
        api.getMyProducts(),
        api.getMyOrders(),
      ]);
      setProducts(prods);
      setOrders(ords);

      if (ords.length > 0) {
        setSelectedOrderId(ords[0].id);
      }
      if (preSelectedProdId) {
        setSelectedProductId(preSelectedProdId);
      } else if (prods.length > 0) {
        setSelectedProductId(prods[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const ticket = await api.createTicket({
        subject,
        category,
        subcategory,
        priority,
        description,
        product_id: selectedProductId || undefined,
        order_id: selectedOrderId || undefined,
        preferred_contact_method: contactMethod,
      });

      // Upload file if selected
      if (selectedFile) {
        try {
          await api.uploadAttachment(ticket.id, selectedFile);
        } catch {
          // ignore attachment failure
        }
      }

      navigate(`/customer/tickets/${ticket.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to submit ticket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    'Product Defect',
    'Technical Support',
    'Delivery',
    'Payment',
    'Refund',
    'Account Access',
    'Warranty',
    'Other',
  ];

  const priorities = [
    { label: 'Low', desc: '48h target - General questions, minor inquiries' },
    { label: 'Medium', desc: '24h target - Standard operational issue' },
    { label: 'High', desc: '12h target - Degraded system performance' },
    { label: 'Critical', desc: '4h target - Production down, severe defect' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Raise Support Ticket</h1>
        <p className="text-xs text-slate-500 mt-1">
          Submit your technical issue or warranty claim. An agent and operations manager will be immediately notified.
        </p>
      </div>

      {/* Automated Email Notice Card */}
      <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex items-start space-x-3 text-xs">
        <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-blue-900 dark:text-blue-200">
            Automated Dual-Email Notification Guarantee
          </p>
          <p className="text-blue-700 dark:text-blue-300 leading-relaxed">
            Upon submission, you will immediately receive a <strong>Customer Confirmation Email</strong> with your unique ticket tracking ID, and our <strong>Company Owner & Lead Engineers</strong> will receive an instant high-priority alert.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-xs">
        {/* Subject */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Issue Subject *
          </label>
          <input
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Gateway losing cellular connectivity after 2.4 firmware update"
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
          />
        </div>

        {/* Product & Order Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Purchased Product
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">General Inquiry / Unlisted Equipment</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (SKU: {p.sku})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Verified Order ID
            </label>
            <select
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
            >
              <option value="">No linked order</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.order_number} (${o.total_amount.toFixed(2)})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category & Contact Method */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Issue Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Preferred Contact Channel
            </label>
            <select
              value={contactMethod}
              onChange={(e) => setContactMethod(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="email">Email Notifications & Inbound Replies</option>
              <option value="portal">Web Portal Live Chat</option>
              <option value="phone">Phone / Emergency Dispatch</option>
            </select>
          </div>
        </div>

        {/* Priority Selection Grid */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
            Priority Tier (SLA Target) *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {priorities.map((p) => (
              <div
                key={p.label}
                onClick={() => setPriority(p.label)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  priority === p.label
                    ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/40 ring-2 ring-brand-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${
                    p.label === 'Critical' ? 'text-red-600' : p.label === 'High' ? 'text-orange-600' : 'text-slate-900 dark:text-white'
                  }`}>
                    {p.label}
                  </span>
                  {priority === p.label && <CheckCircle className="w-4 h-4 text-brand-600" />}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Description */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Incident Description *
          </label>
          <textarea
            required
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Please describe the steps to reproduce, error codes observed, affected environment, and serial numbers..."
            className="w-full p-3.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          ></textarea>
        </div>

        {/* File Attachment Upload */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Log Files / Diagnostic Screenshots (Optional)
          </label>
          <div className="flex items-center space-x-3">
            <label className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold cursor-pointer border border-slate-200 dark:border-slate-700 flex items-center space-x-2">
              <Paperclip className="w-4 h-4" />
              <span>Choose Attachment</span>
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
              />
            </label>
            {selectedFile && (
              <span className="text-xs text-slate-600 dark:text-slate-400 font-mono truncate">
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/customer/dashboard')}
            className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-md transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Registering Ticket...' : 'Submit Support Ticket'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
