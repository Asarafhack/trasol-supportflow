import React from 'react';
import { TicketPriority, TicketStatus } from '../../types';

export const StatusBadge: React.FC<{ status: TicketStatus | string }> = ({ status }) => {
  let colorStyles = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200';

  switch (status) {
    case 'Open':
      colorStyles = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
      break;
    case 'Assigned':
      colorStyles = 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800';
      break;
    case 'In Progress':
      colorStyles = 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800';
      break;
    case 'Waiting for Customer':
      colorStyles = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
      break;
    case 'Escalated':
      colorStyles = 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-800 font-semibold animate-pulse';
      break;
    case 'Resolved':
      colorStyles = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
      break;
    case 'Closed':
      colorStyles = 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
      break;
    case 'Reopened':
      colorStyles = 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800 font-semibold';
      break;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorStyles}`}>
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current"></span>
      {status}
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: TicketPriority | string }> = ({ priority }) => {
  let colorStyles = 'bg-slate-100 text-slate-700 border-slate-200';

  switch (priority) {
    case 'Critical':
      colorStyles = 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800 font-bold';
      break;
    case 'High':
      colorStyles = 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800 font-semibold';
      break;
    case 'Medium':
      colorStyles = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
      break;
    case 'Low':
      colorStyles = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
      break;
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colorStyles}`}>
      {priority}
    </span>
  );
};
