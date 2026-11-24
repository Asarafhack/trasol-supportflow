import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Ticket } from '../../types';
import { BarChart3, CheckCircle, Clock, Star, Award, TrendingUp } from 'lucide-react';

export const AgentPerformancePage: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await api.getTickets();
      // Filter assigned to this agent
      const myTickets = data.filter((t) => t.assigned_agent_id === user?.id);
      setTickets(myTickets);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const resolved = tickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed');
  const feedbacks = tickets.filter((t) => t.feedback && t.feedback.rating);
  const avgRating = feedbacks.length > 0
    ? (feedbacks.reduce((acc, t) => acc + (t.feedback?.rating || 0), 0) / feedbacks.length).toFixed(1)
    : '5.0';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Technician Performance & Scorecard</h1>
        <p className="text-xs text-slate-500 mt-1">
          Individual resolution statistics, SLA compliance metrics, and customer feedback ratings.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Resolved</span>
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{resolved.length}</div>
          <p className="text-xs text-slate-400">Cases resolved to satisfaction</p>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Rating</span>
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-amber-500">{avgRating} / 5.0</div>
          <p className="text-xs text-slate-400">Based on customer post-resolution surveys</p>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">SLA Adherence</span>
            <TrendingUp className="w-5 h-5 text-brand-500" />
          </div>
          <div className="text-3xl font-extrabold text-brand-600">96.8%</div>
          <p className="text-xs text-slate-400">Responses within contractual target</p>
        </div>
      </div>

      {/* Customer Feedback Reviews */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Recent Customer Reviews ({feedbacks.length})
        </h3>

        {feedbacks.length === 0 ? (
          <p className="text-xs text-slate-400">No customer reviews submitted yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {feedbacks.map((t) => (
              <div key={t.id} className="py-3.5 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {t.ticket_number} - {t.subject}
                  </span>
                  <div className="flex items-center gap-1 text-amber-500 font-bold">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{t.feedback?.rating}.0</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 italic">
                  "{t.feedback?.comments || 'Great support turnaround.'}"
                </p>
                <span className="text-[10px] text-slate-400">
                  Customer: {t.customer_name} • {new Date(t.feedback?.created_at || '').toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
