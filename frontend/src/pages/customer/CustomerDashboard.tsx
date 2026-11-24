import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Ticket, Product, Order } from '../../types';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge';
import {
  Ticket as TicketIcon,
  Clock,
  CheckCircle,
  AlertCircle,
  PlusCircle,
  Package,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

export const CustomerDashboard: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [tkts, prods] = await Promise.all([
        api.getTickets(),
        api.getMyProducts(),
      ]);
      setTickets(tkts);
      setProducts(prods);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const totalCount = tickets.length;
  const openCount = tickets.filter((t) => t.status === 'Open' || t.status === 'Assigned').length;
  const inProgressCount = tickets.filter((t) => t.status === 'In Progress' || t.status === 'Waiting for Customer').length;
  const resolvedCount = tickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Customer Support Hub</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track active support cases, view purchased enterprise hardware, and coordinate with assigned technicians.
          </p>
        </div>
        <Link
          to="/customer/tickets/create"
          className="inline-flex items-center space-x-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Raise New Support Ticket</span>
        </Link>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Cases</span>
            <TicketIcon className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">{totalCount}</div>
          <span className="text-[11px] text-slate-400">All registered complaints</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-600">Open / Assigned</span>
            <AlertCircle className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold text-blue-600 mt-2">{openCount}</div>
          <span className="text-[11px] text-slate-400">Awaiting technician review</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-orange-600">In Progress</span>
            <Clock className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-extrabold text-orange-600 mt-2">{inProgressCount}</div>
          <span className="text-[11px] text-slate-400">Under active diagnostics</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-600">Resolved Cases</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-2">{resolvedCount}</div>
          <span className="text-[11px] text-slate-400">Successfully closed</span>
        </div>
      </div>

      {/* Main Grid: Recent Tickets & My Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Tickets Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Recent Support Tickets
            </h2>
            <Link
              to="/customer/tickets"
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 font-semibold"
            >
              View all ({tickets.length}) <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            {isLoading ? (
              <div className="p-8 text-center text-slate-400 text-xs">Loading support tickets...</div>
            ) : tickets.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <TicketIcon className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500">You haven't opened any support tickets yet.</p>
                <Link
                  to="/customer/tickets/create"
                  className="inline-block px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-semibold"
                >
                  Create your first ticket
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Ticket ID</th>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Priority</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {tickets.slice(0, 5).map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3.5 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {t.ticket_number}
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
                        <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                          {new Date(t.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Link
                            to={`/customer/tickets/${t.id}`}
                            className="inline-flex items-center space-x-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                          >
                            <span>Open</span>
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
        </div>

        {/* My Purchased Products Shelf */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              My Equipment
            </h2>
            <Link
              to="/customer/products"
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 font-semibold"
            >
              All ({products.length})
            </Link>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-xs">
            {products.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                <Package className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                <p>No verified purchases linked.</p>
                <Link to="/customer/orders" className="text-brand-600 font-semibold hover:underline mt-1 block">
                  Simulate Mock Checkout
                </Link>
              </div>
            ) : (
              products.slice(0, 4).map((p) => (
                <div key={p.id} className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="min-w-0 pr-2">
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate">{p.name}</h4>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">SKU: {p.sku} | {p.warranty_months}m warranty</p>
                  </div>
                  <Link
                    to={`/customer/tickets/create?product_id=${p.id}`}
                    className="flex-shrink-0 text-[11px] font-semibold text-brand-600 hover:underline whitespace-nowrap"
                  >
                    Raise Ticket
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
