import React from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { Bell, X, CheckCircle, AlertTriangle } from 'lucide-react';

export const LiveToast: React.FC = () => {
  const { liveToast, clearLiveToast } = useSocket();

  if (!liveToast) return null;

  return (
    <div className="fixed top-5 right-5 z-50 max-w-sm w-full bg-white dark:bg-slate-900 border border-brand-500 shadow-xl rounded-xl p-4 flex items-start space-x-3 transition-all animate-bounce">
      <div className="flex-shrink-0 bg-brand-100 dark:bg-brand-950 p-2 rounded-lg text-brand-600 dark:text-brand-400">
        <Bell className="w-5 h-5 animate-pulse" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          <span>{liveToast.title}</span>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded-full font-mono">LIVE</span>
        </h4>
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
          {liveToast.message}
        </p>
      </div>
      <button
        onClick={clearLiveToast}
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
