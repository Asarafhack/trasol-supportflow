import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Product } from '../../types';
import { Package, PlusCircle, ShieldCheck, ShoppingCart } from 'lucide-react';

export const MyProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const data = await api.getMyProducts();
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Purchased Products</h1>
          <p className="text-xs text-slate-500 mt-1">
            Registered industrial IoT, cameras, gateways, and hardware keys linked to your account.
          </p>
        </div>
        <Link
          to="/customer/orders"
          className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold rounded-lg shadow-sm transition-colors"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Simulate Purchase / Orders</span>
        </Link>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Loading registered equipment...</div>
      ) : products.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
          <Package className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No Verified Products Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Support tickets can link to verified orders. Complete a mock checkout to register hardware to your company profile.
          </p>
          <Link
            to="/customer/orders"
            className="inline-block px-4 py-2 bg-brand-600 text-white rounded-lg text-xs font-semibold mt-2"
          >
            Go to Mock Checkout
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p) => (
            <div
              key={p.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col"
            >
              <div className="p-5 flex-1 space-y-3">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-mono uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                    SKU: {p.sku}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{p.warranty_months}m Warranty</span>
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{p.name}</h3>
                <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">{p.description}</p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                  ${p.price.toFixed(2)}
                </span>
                <Link
                  to={`/customer/tickets/create?product_id=${p.id}`}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Raise Ticket</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
