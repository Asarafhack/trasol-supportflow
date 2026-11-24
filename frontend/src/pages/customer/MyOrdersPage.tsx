import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Order, Product } from '../../types';
import { ShoppingCart, Package, PlusCircle, CheckCircle, Clock } from 'lucide-react';

export const MyOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [shippingAddress, setShippingAddress] = useState('100 Industrial Parkway, Dock 4');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [ordList, prodList] = await Promise.all([
        api.getMyOrders(),
        api.getProducts(),
      ]);
      setOrders(ordList);
      setAvailableProducts(prodList);
      if (prodList.length > 0) {
        setSelectedProductId(prodList[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;

    setIsSubmitting(true);
    try {
      await api.createOrder({
        items: [{ product_id: selectedProductId, quantity: Number(quantity) }],
        shipping_address: shippingAddress,
      });
      setShowCheckoutModal(false);
      await loadData();
    } catch (err: any) {
      alert('Checkout failed: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Orders & Purchases</h1>
          <p className="text-xs text-slate-500 mt-1">
            Verified equipment purchases linked to your customer profile for ticket warranty validation.
          </p>
        </div>
        <button
          onClick={() => setShowCheckoutModal(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>+ Simulate Purchase (Mock Checkout)</span>
        </button>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
          <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No Order History Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Simulate a mock checkout to register order records and test ticket validation.
          </p>
          <button
            onClick={() => setShowCheckoutModal(true)}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg text-xs font-semibold mt-2"
          >
            Create Test Order
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div
              key={o.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-2">
                <div>
                  <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                    {o.order_number}
                  </span>
                  <span className="text-xs text-slate-400 ml-3">
                    Placed on {new Date(o.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-xs">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold uppercase text-[10px]">
                    {o.payment_status}
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                    ${o.total_amount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {o.items.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">{item.product_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">SKU: {item.product_sku || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 font-medium">Qty: {item.quantity}</span>
                      <span className="text-slate-900 dark:text-white font-mono font-bold ml-4">
                        ${(item.unit_price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                <span>Shipping Address: {o.shipping_address}</span>
                <span className="text-emerald-600 font-semibold">Status: {o.order_status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mock Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Simulate Purchase Order</h3>
                <p className="text-xs text-slate-400">Generates real order items and verifies customer link</p>
              </div>
              <button onClick={() => setShowCheckoutModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleCheckout} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Equipment Product
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {availableProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - ${p.price.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Gateway
                  </label>
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                    Mock Auth (Auto-Paid)
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Delivery Address
                </label>
                <input
                  type="text"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold"
                >
                  {isSubmitting ? 'Processing...' : 'Complete Mock Checkout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
