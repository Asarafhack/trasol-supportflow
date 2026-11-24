import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { KnowledgeBaseArticle } from '../../types';
import { Search, BookOpen, ThumbsUp, Eye, Tag, ArrowRight } from 'lucide-react';

export const KnowledgeBasePage: React.FC = () => {
  const [articles, setArticles] = useState<KnowledgeBaseArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeBaseArticle | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadArticles();
  }, [search, selectedCategory]);

  const loadArticles = async () => {
    setIsLoading(true);
    try {
      const data = await api.getArticles(selectedCategory === 'ALL' ? undefined : selectedCategory, search);
      setArticles(data);
      if (data.length > 0 && !selectedArticle) {
        setSelectedArticle(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHelpful = async (artId: string) => {
    try {
      const res = await api.markArticleHelpful(artId);
      if (selectedArticle && selectedArticle.id === artId) {
        setSelectedArticle({ ...selectedArticle, helpful_count: res.helpful_count });
      }
      setArticles(articles.map((a) => (a.id === artId ? { ...a, helpful_count: res.helpful_count } : a)));
    } catch {
      // ignore
    }
  };

  const categories = ['ALL', 'Gateways', 'Hardware', 'Security', 'Networking', 'General'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Search Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          Knowledge Base & Technical Guides
        </h1>
        <p className="text-sm text-slate-500">
          Search hardware documentation, troubleshooting playbooks, and configuration references.
        </p>

        <div className="relative max-w-lg mx-auto">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search keywords: MQTT, X.509, Thermal Camera, FIDO2..."
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                selectedCategory === c
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Articles List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            Articles ({articles.length})
          </h3>
          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading guides...</div>
          ) : articles.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              No matching articles found.
            </div>
          ) : (
            articles.map((art) => (
              <div
                key={art.id}
                onClick={() => setSelectedArticle(art)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedArticle?.id === art.id
                    ? 'bg-brand-50/60 dark:bg-brand-950/40 border-brand-500 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <span className="text-[10px] font-bold text-brand-600 uppercase tracking-wider">
                  {art.category}
                </span>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mt-1 line-clamp-2">
                  {art.title}
                </h4>
                <div className="flex items-center gap-4 text-[11px] text-slate-400 mt-2">
                  <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {art.views_count} views</span>
                  <span className="flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5 text-emerald-500" /> {art.helpful_count}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Selected Article Viewer */}
        <div className="md:col-span-2">
          {selectedArticle ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <span className="text-xs font-bold text-brand-600 uppercase tracking-wider bg-brand-50 dark:bg-brand-950 px-2.5 py-1 rounded-full">
                  {selectedArticle.category}
                </span>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-3">
                  {selectedArticle.title}
                </h2>
                <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                  <span>Published by Trasol Support Engineering</span>
                  <span>•</span>
                  <span>{new Date(selectedArticle.created_at).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{selectedArticle.views_count} reads</span>
                </div>
              </div>

              <div className="prose dark:prose-invert max-w-none text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {selectedArticle.content}
              </div>

              {selectedArticle.tags && (
                <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Tag className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-500">Tags: {selectedArticle.tags}</span>
                </div>
              )}

              {/* Feedback CTA */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Did this guide resolve your issue?
                </span>
                <button
                  onClick={() => handleHelpful(selectedArticle.id)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Yes, Helpful ({selectedArticle.helpful_count})</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400">
              Select an article to read the full guide.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
