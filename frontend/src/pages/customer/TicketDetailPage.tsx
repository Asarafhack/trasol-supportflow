import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { Ticket, TicketMessage } from '../../types';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge';
import {
  LifeBuoy,
  Send,
  User,
  Clock,
  CheckCircle,
  RotateCcw,
  Star,
  Paperclip,
  ArrowLeft,
  ShieldCheck,
  Package,
  Calendar,
  AlertTriangle
} from 'lucide-react';

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { createTicketSocket } = useSocket();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);

  // Feedback Modal
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedbackComments, setFeedbackComments] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (id) {
      loadTicket();
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;

    // Connect to live ticket chat WebSocket
    const ws = createTicketSocket(id, (event) => {
      if (event.type === 'NEW_MESSAGE') {
        const newMsg = event.message;
        // Customers must not see internal notes
        if (!newMsg.is_internal) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      } else if (event.type === 'STATUS_CHANGED') {
        setTicket((prev) => (prev ? { ...prev, status: event.new_status } : prev));
      } else if (event.type === 'USER_TYPING') {
        if (event.user_id !== user?.id && event.is_typing) {
          setTypingUser(event.user_name);
          setTimeout(() => setTypingUser(null), 3000);
        }
      }
    });

    socketRef.current = ws;

    return () => {
      if (ws) ws.close();
    };
  }, [id, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadTicket = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await api.getTicket(id);
      setTicket(data);
      setMessages(data.messages || []);
      if (data.feedback) {
        setRating(data.feedback.rating);
        setFeedbackComments(data.feedback.comments || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || !id) return;

    setIsSubmitting(true);
    try {
      const msg = await api.postMessage(id, replyContent, false);
      setMessages((prev) => [...prev, msg]);
      setReplyContent('');
    } catch (err: any) {
      alert('Failed to post reply: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async () => {
    if (!id || !confirm('Are you satisfied that this issue is resolved?')) return;
    try {
      const updated = await api.resolveTicket(id);
      setTicket(updated);
      setShowFeedbackModal(true);
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleReopen = async () => {
    if (!id || !confirm('Do you want to reopen this ticket?')) return;
    try {
      const updated = await api.reopenTicket(id);
      setTicket(updated);
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setIsSubmittingFeedback(true);
    try {
      const fb = await api.submitFeedback(id, {
        rating,
        comments: feedbackComments,
      });
      setShowFeedbackModal(false);
      setTicket((prev) => (prev ? { ...prev, feedback: fb } : prev));
      alert('Thank you for rating our support!');
    } catch (err: any) {
      alert('Failed to submit feedback: ' + err.message);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  if (isLoading || !ticket) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading ticket workspace...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        to="/customer/dashboard"
        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </Link>

      {/* Ticket Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono font-extrabold text-lg text-slate-900 dark:text-white">
                {ticket.ticket_number}
              </span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
            </div>
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-200 mt-1">
              {ticket.subject}
            </h1>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            {ticket.status !== 'Resolved' && ticket.status !== 'Closed' ? (
              <button
                onClick={handleResolve}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-xs"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Mark Resolved</span>
              </button>
            ) : (
              <button
                onClick={handleReopen}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reopen Ticket</span>
              </button>
            )}

            {ticket.feedback && (
              <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-current" />
                {ticket.feedback.rating}/5 Rated
              </span>
            )}
          </div>
        </div>

        {/* Metadata Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-600 dark:text-slate-400">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Equipment</span>
            <span className="font-semibold text-slate-900 dark:text-white truncate block">
              {ticket.product_name || 'General Query'}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Technician</span>
            <span className="font-semibold text-slate-900 dark:text-white block">
              {ticket.assigned_agent_name || 'Under Dispatch'}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Category</span>
            <span className="font-semibold text-slate-900 dark:text-white block">
              {ticket.category}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">SLA Target</span>
            <span className="font-semibold text-brand-600 block flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {ticket.sla_deadline ? new Date(ticket.sla_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Standard'}
            </span>
          </div>
        </div>
      </div>

      {/* Conversation Thread */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs flex flex-col h-[520px]">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Initial Ticket Description Bubble */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-brand-600" />
                Original Incident Report
              </span>
              <span className="text-slate-400 text-[11px]">
                {new Date(ticket.created_at).toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {ticket.description}
            </p>
          </div>

          {/* Conversation Stream */}
          {messages.map((m) => {
            const isMe = m.sender_role === 'customer';
            return (
              <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center space-x-1.5 mb-1 px-1">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    {m.sender_name}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div
                  className={`max-w-lg p-3.5 rounded-2xl text-xs leading-relaxed ${
                    isMe
                      ? 'bg-brand-600 text-white rounded-br-none shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-none border border-slate-200 dark:border-slate-700/60'
                  }`}
                >
                  <p className="whitespace-pre-line">{m.content}</p>
                </div>
              </div>
            );
          })}

          {typingUser && (
            <div className="text-[11px] text-slate-400 italic animate-pulse">
              {typingUser} is typing a response...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Reply Box */}
        <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center space-x-2">
          <input
            type="text"
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Type your response to the support technician..."
            className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="submit"
            disabled={isSubmitting || !replyContent.trim()}
            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1.5 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>

      {/* Customer Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="text-center space-y-1">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Rate Your Support Experience</h3>
              <p className="text-xs text-slate-500">How satisfied are you with the resolution of ticket {ticket.ticket_number}?</p>
            </div>

            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              <div className="flex justify-center space-x-2 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 focus:outline-none"
                  >
                    <Star
                      className={`w-7 h-7 transition-colors ${
                        star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-700'
                      }`}
                    />
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Comments or Feedback
                </label>
                <textarea
                  rows={3}
                  value={feedbackComments}
                  onChange={(e) => setFeedbackComments(e.target.value)}
                  placeholder="Share details on your technician's knowledge and responsiveness..."
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium"
                >
                  Skip
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFeedback}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold"
                >
                  {isSubmittingFeedback ? 'Submitting...' : 'Submit Rating'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
