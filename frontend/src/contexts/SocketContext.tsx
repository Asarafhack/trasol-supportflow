import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { Notification } from '../types';
import { api } from '../services/api';

interface SocketContextType {
  isConnected: boolean;
  unreadCount: number;
  notifications: Notification[];
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  liveToast: { title: string; message: string; type?: string } | null;
  clearLiveToast: () => void;
  lastMessage: any;
  createTicketSocket: (ticketId: string, onMessage: (data: any) => void) => WebSocket | null;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [liveToast, setLiveToast] = useState<{ title: string; message: string; type?: string } | null>(null);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const refreshNotifications = async () => {
    if (!token) return;
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!token || !user) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    refreshNotifications();

    // Connect to WebSocket notification channel
    const customWs = import.meta.env.VITE_WS_URL ? String(import.meta.env.VITE_WS_URL).replace(/\/$/, '') : '';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const baseWs = customWs || `${protocol}//${host}`;
    const wsUrl = `${baseWs}/ws/notifications?token=${token}`;

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
        if (
          data.type === 'NOTIFICATION' ||
          data.type === 'TICKET_CREATED' ||
          data.type === 'TICKET_ASSIGNED' ||
          data.type === 'CUSTOMER_REGISTERED' ||
          data.type === 'TICKET_UPDATED'
        ) {
          setLiveToast({
            title:
              data.title ||
              (data.type === 'CUSTOMER_REGISTERED'
                ? 'New Customer Registered'
                : data.type === 'TICKET_CREATED'
                ? 'New Support Ticket Raised'
                : 'Real-Time Alert'),
            message: data.message || `Event: ${data.type}`,
            type: data.type,
          });
          refreshNotifications();
        }
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    // Heartbeat ping
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'PING' }));
      }
    }, 25000);

    return () => {
      clearInterval(interval);
      ws.close();
    };
  }, [token, user]);

  const markAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {
      // ignore
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // ignore
    }
  };

  const clearLiveToast = () => setLiveToast(null);

  const createTicketSocket = (ticketId: string, onMessage: (data: any) => void): WebSocket | null => {
    if (!token) return null;
    const customWs = import.meta.env.VITE_WS_URL ? String(import.meta.env.VITE_WS_URL).replace(/\/$/, '') : '';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const baseWs = customWs || `${protocol}//${host}`;
    const wsUrl = `${baseWs}/ws/tickets/${ticketId}?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch {
        // ignore
      }
    };

    return ws;
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        unreadCount,
        notifications,
        refreshNotifications,
        markAsRead,
        markAllAsRead,
        liveToast,
        clearLiveToast,
        lastMessage,
        createTicketSocket,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
