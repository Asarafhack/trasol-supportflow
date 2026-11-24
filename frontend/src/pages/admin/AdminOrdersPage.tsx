import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Order } from '../../types';
import { ShoppingCart, Search, Filter, Calendar, CheckCircle, Clock } from 'lucide-react';

export const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const data = await api.getOrders();
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = orders.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.shipping_address && order.shipping_address.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || order.payment_status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShoppingCart className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Customer Orders & Purchase Ledger
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Global ledger of customer purchases used to cryptographically link and verify support complaint eligibility.
          </p>
        </div>
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          Total Orders: <span className="font-bold text-indigo-600 dark:text-indigo-400">{orders.length}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by order number (ORD-YYYY-XXXXX) or shipping address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent text-sm text-gray-700 dark:text-gray-300 focus:outline-none"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      {isLoading ? (
        <div className="p-12 text-center text-gray-500">Loading enterprise orders...</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500">
          No orders found matching the filter criteria.
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Items Purchased</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Payment</th>
                  <th className="px-6 py-4">Shipping Status</th>
                  <th className="px-6 py-4">Destination</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {filtered.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-700/30 transition">
                    <td className="px-6 py-4 font-mono font-medium text-indigo-600 dark:text-indigo-400">
                      {order.order_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(order.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {order.items?.map((item) => (
                          <div key={item.id} className="text-xs">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {item.product_name || item.product?.name || 'IoT Device'}
                            </span>{' '}
                            <span className="text-gray-400">× {item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                      ${order.total_amount?.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          order.payment_status.toLowerCase() === 'paid'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                        }`}
                      >
                        {order.payment_status.toLowerCase() === 'paid' ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        {order.payment_status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 capitalize">
                        {order.order_status || order.status || 'Completed'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate">
                      {order.shipping_address || 'Enterprise Facility Delivery'}
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
