import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

function getServerUrl() {
  const configuredUrl =
    import.meta.env.VITE_SERVER_URL ||
    import.meta.env.VITE_SOCKET_URL ||
    import.meta.env.VITE_API_URL ||
    '';

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }

  console.warn('[Socket] No backend URL configured. Set VITE_SERVER_URL to your deployed Socket.IO server URL so online users can be seen across devices.');
  return window.location.origin;
}

const SERVER_URL = getServerUrl();

// One socket per browser context (tab/window)
let socketInstance = null;

function getSocket() {
  if (!socketInstance) {
    socketInstance = io(SERVER_URL, {
      autoConnect: false,
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });
  }
  return socketInstance;
}

export function useSocket() {
  const socketRef = useRef(getSocket());

  // If singleton was reset after logout, grab the fresh one
  useEffect(() => {
    if (!socketInstance) {
      socketInstance = getSocket();
    }
    socketRef.current = socketInstance;
  }, []);

  /**
   * Connect and authenticate in one shot.
   * If already connected, fires onConnected immediately.
   * Uses socket's own 'connect' event — no blind timeouts.
   */
  const connect = useCallback((onConnected) => {
    const s = socketRef.current;
    if (!s) return;
    if (s.connected) {
      onConnected?.();
    } else {
      if (onConnected) s.once('connect', onConnected);
      s.connect();
    }
  }, []);

  const disconnect = useCallback(() => {
    const s = socketRef.current;
    if (s) {
      s.removeAllListeners();
      s.disconnect();
      socketInstance = null;
      // Pre-create fresh socket so next login's on() calls attach to the right instance
      socketRef.current = getSocket();
    }
  }, []);

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  const on = useCallback((event, handler) => {
    const s = socketRef.current;
    if (s) {
      s.on(event, handler);
      return () => s.off(event, handler);
    }
    return () => {};
  }, []);

  const off = useCallback((event, handler) => {
    socketRef.current?.off(event, handler);
  }, []);

  return { socketRef, connect, disconnect, emit, on, off };
}
