import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Product } from '../../types';
import { Cpu, PlusCircle, Search, ShieldCheck, Tag, CheckCircle } from 'lucide-react';

export const AdminProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Product Form
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('299.00');
  const [warrantyMonths, setWarrantyMonths] = useState(24);
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createProduct({
        name,
        sku,
        description,
        price: parseFloat(price) || 0,
        warranty_months: Number(warrantyMonths),
        image_url: imageUrl || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&auto=format&fit=crop&q=60',
      });
      setShowAddModal(false);
      setName('');
      setSku('');
      setDescription('');
      setImageUrl('');
      setSuccessMsg('Product added successfully to Trasol catalog.');
      setTimeout(() => setSuccessMsg(''), 4000);
      loadProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to create product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Cpu className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Hardware Products & Catalog
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage enterprise IoT hardware devices, gateway models, firmware revisions, and warranty terms.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          Add Hardware Product
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-sm">
          <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          {successMsg}
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Filter products by model name or SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
        />
      </div>

      {/* Product Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-gray-500 dark:text-gray-400">Loading products catalog...</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500">
          No hardware products found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((product) => (
            <div
              key={product.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="h-44 w-full bg-gray-100 dark:bg-gray-700 overflow-hidden relative">
                  <img
                    src={product.image_url || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&auto=format&fit=crop&q=60'}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 px-2.5 py-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur rounded text-xs font-semibold text-gray-800 dark:text-gray-200 shadow">
                    ${product.price.toFixed(2)}
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-center gap-2 text-xs font-mono text-indigo-600 dark:text-indigo-400 mb-1">
                    <Tag className="w-3.5 h-3.5" />
                    {product.sku}
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base mb-2">
                    {product.name}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-3 mb-4">
                    {product.description || 'Standard Trasol industrial hardware specification.'}
                  </p>
                </div>
              </div>

              <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  {product.warranty_months} Months Warranty
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  Active SKU
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Add New Hardware Product
            </h2>
            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Device / Model Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Trasol Edge Gateway 5000"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    SKU Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TR-GW-5000"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-mono bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Price (USD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Warranty Duration (Months)
                </label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={warrantyMonths}
                  onChange={(e) => setWarrantyMonths(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Technical Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Industrial IoT gateway specifications, processor, connectivity, sensor bus..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
