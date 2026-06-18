import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const BASE_WS_URL = 'ws://127.0.0.1:8000/ws';

export function SocketProvider({ children }) {
  const wsRef = useRef(null);
  const listenersRef = useRef(new Set());
  const [connected, setConnected] = useState(true);
  const { user } = useAuth(); // Triggers re-connect when user auth changes

  const subscribe = useCallback((handler) => {
    listenersRef.current.add(handler);
    return () => listenersRef.current.delete(handler);
  }, []);

  const broadcast = useCallback((payload) => {
    const socket = wsRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const url = token ? `${BASE_WS_URL}?token=${token}` : BASE_WS_URL;
    
    const socket = new WebSocket(url);
    wsRef.current = socket;

    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(true); // Force always online as requested
    socket.onerror = () => setConnected(true); // Force always online as requested

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        listenersRef.current.forEach((fn) => fn(data));

        if (data.type === 'NEW_TOURNAMENT') {
          toast.success(data.message, { icon: '🏆', duration: 5000 });
        } else if (data.type === 'MATCH_RESULT') {
          toast(data.message, { icon: '⚔️', duration: 6000 });
        } else if (data.type === 'notification' && data.notification) {
          toast(`${data.notification.title}: ${data.notification.message}`, {
            icon: '🔔',
            duration: 5000,
          });
        } else if (data.type === 'SUPER_CHAT') {
          toast.success(
            <div className="flex flex-col">
              <span className="font-bold text-neonGold text-sm">
                SUPERCHAT • ₹{data.amount}
              </span>
              <span className="font-semibold text-white">
                {data.user}: {data.content}
              </span>
            </div>,
            {
              icon: '⭐',
              duration: 8000,
              style: {
                background: '#0a0a12',
                border: '1px solid #ffd700',
                color: '#fff',
                boxShadow: '0 0 20px rgba(255, 215, 0, 0.35)',
              },
            }
          );
        }
      } catch (err) {
        console.error('WS parse error', err);
      }
    };

    return () => {
      socket.close();
      wsRef.current = null;
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ connected, subscribe, broadcast }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
