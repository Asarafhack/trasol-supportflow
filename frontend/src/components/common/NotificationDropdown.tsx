import React, { useState, useRef, useEffect } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { Bell, Check, ExternalLink, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const NotificationDropdown: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in-50 duration-150">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">Live Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 font-medium"
              >
                <Check className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-sm">
                No notifications yet.
              </div>
            ) : (
              notifications.slice(0, 15).map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    markAsRead(n.id);
                    if (n.link_url) {
                      navigate(n.link_url);
                      setIsOpen(false);
                    }
                  }}
                  className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors ${
                    !n.is_read ? 'bg-brand-50/40 dark:bg-brand-950/20' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <h5 className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-brand-600"></span>}
                      {n.title}
                    </h5>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                    {n.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
