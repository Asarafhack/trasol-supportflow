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
  AlertTriangle,
  Lock,
  ArrowLeft,
  ShieldAlert,
  Play,
  RotateCcw,
  Star,
  FileText
} from 'lucide-react';

export const AgentTicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { createTicketSocket } = useSocket();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Escalation Modal
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [isEscalating, setIsEscalating] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (id) {
      loadTicket();
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const ws = createTicketSocket(id, (event) => {
      if (event.type === 'NEW_MESSAGE') {
        const newMsg = event.message;
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      } else if (event.type === 'STATUS_CHANGED') {
        setTicket((prev) => (prev ? { ...prev, status: event.new_status } : prev));
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
      const msg = await api.postMessage(id, replyContent, isInternal);
      setMessages((prev) => [...prev, msg]);
      setReplyContent('');
    } catch (err: any) {
      alert('Failed to post message: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!id) return;
    try {
      const updated = await api.updateTicket(id, { status: newStatus as any });
      setTicket(updated);
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const handleEscalate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !escalateReason.trim()) return;

    setIsEscalating(true);
    try {
      const updated = await api.escalateTicket(id, escalateReason);
      setTicket(updated);
      setShowEscalateModal(false);
      setEscalateReason('');
      alert('Ticket escalated to Tier 3 Critical Operations.');
    } catch (err: any) {
      alert('Failed to escalate: ' + err.message);
    } finally {
      setIsEscalating(false);
    }
  };

  if (isLoading || !ticket) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading technician desk...</div>;
  }

  return (
    <div className="space-y-6">
      <Link
        to="/agent/dashboard"
        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Agent Queue</span>
      </Link>

      {/* Ticket Header & Status Action Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono font-extrabold text-lg text-slate-900 dark:text-white">
                {ticket.ticket_number}
              </span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              {ticket.is_escalated && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                  ESCALATED
                </span>
              )}
            </div>
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-200 mt-1">
              {ticket.subject}
            </h1>
          </div>

          {/* Workflow Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {ticket.status !== 'In Progress' && ticket.status !== 'Resolved' && (
              <button
                onClick={() => handleUpdateStatus('In Progress')}
                className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Start Working</span>
              </button>
            )}

            {ticket.status === 'In Progress' && (
              <button
                onClick={() => handleUpdateStatus('Waiting for Customer')}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Wait for Customer</span>
              </button>
            )}

            {ticket.status !== 'Resolved' && ticket.status !== 'Closed' && (
              <>
                <button
                  onClick={() => handleUpdateStatus('Resolved')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Mark Resolved</span>
                </button>

                <button
                  onClick={() => setShowEscalateModal(true)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Escalate</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Customer & Incident Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-600 dark:text-slate-400">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer</span>
            <span className="font-semibold text-slate-900 dark:text-white block truncate">{ticket.customer_name}</span>
            <span className="text-[10px] text-slate-400">{ticket.customer_email}</span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Equipment</span>
            <span className="font-semibold text-slate-900 dark:text-white block truncate">
              {ticket.product_name || 'General Inquiry'}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Linked Order</span>
            <span className="font-mono font-semibold text-slate-900 dark:text-white block">
              {ticket.order_number || 'N/A'}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">SLA Resolution Target</span>
            <span className="font-semibold text-brand-600 block flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {ticket.sla_deadline ? new Date(ticket.sla_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Standard'}
            </span>
          </div>
        </div>
      </div>

      {/* Conversation Thread with Internal Notes */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs flex flex-col h-[520px]">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Initial Customer Complaint */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-brand-600" />
                Customer Complaint: {ticket.customer_name}
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
            const isStaffNote = m.is_internal;
            const isCustomer = m.sender_role === 'customer';

            if (isStaffNote) {
              return (
                <div key={m.id} className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border-2 border-dashed border-amber-300 dark:border-amber-800 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      INTERNAL STAFF NOTE (Hidden from Customer) - by {m.sender_name}
                    </span>
                    <span className="text-amber-600 dark:text-amber-400 text-[10px]">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-amber-900 dark:text-amber-100 whitespace-pre-line leading-relaxed">
                    {m.content}
                  </p>
                </div>
              );
            }

            return (
              <div key={m.id} className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}>
                <div className="flex items-center space-x-1.5 mb-1 px-1">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    {m.sender_name} {isCustomer ? '(Customer)' : '(Technician)'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div
                  className={`max-w-lg p-3.5 rounded-2xl text-xs leading-relaxed ${
                    isCustomer
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-none border border-slate-200 dark:border-slate-700'
                      : 'bg-brand-600 text-white rounded-br-none shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-line">{m.content}</p>
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* Reply Box with Tab Toggle for Public Reply vs Internal Note */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3 space-y-2">
          {/* Mode Tabs */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsInternal(false)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                !isInternal
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              <Send className="w-3 h-3" />
              <span>Reply to Customer (Public)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsInternal(true)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                isInternal
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>Internal Staff Note (Private)</span>
            </button>
          </div>

          <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
            <input
              type="text"
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder={
                isInternal
                  ? 'Write private engineering note (not visible to customer)...'
                  : 'Type public reply to send to customer...'
              }
              className={`flex-1 px-4 py-2.5 text-xs rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${
                isInternal
                  ? 'border-amber-300 focus:ring-amber-500 bg-amber-50/20'
                  : 'border-slate-200 dark:border-slate-700 focus:ring-brand-500'
              }`}
            />
            <button
              type="submit"
              disabled={isSubmitting || !replyContent.trim()}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold text-white shadow-sm transition-colors flex items-center space-x-1.5 disabled:opacity-50 ${
                isInternal ? 'bg-amber-600 hover:bg-amber-700' : 'bg-brand-600 hover:bg-brand-700'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isInternal ? 'Save Staff Note' : 'Send Reply'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Escalation Modal */}
      {showEscalateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center space-x-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Escalate Ticket to Tier 3</h3>
            </div>
            <p className="text-xs text-slate-500">
              This will elevate the ticket priority to <strong className="text-rose-600">Critical</strong>, reset the SLA timer, and dispatch an immediate alert to all Operations Administrators.
            </p>

            <form onSubmit={handleEscalate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Escalation Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  placeholder="e.g. Firmware deadlock cannot be patched via remote shell; requires emergency field hardware swap..."
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEscalateModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEscalating}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold"
                >
                  {isEscalating ? 'Escalating...' : 'Confirm Escalation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
