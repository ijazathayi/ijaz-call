import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

// Dynamically construct server URL using the same hostname/IP/protocol the page was loaded from
// Works for: local (http://192.168.x.x:5000) and DevTunnel (https://tunnel-url:5000)
const SERVER_URL = `${window.location.protocol}//${window.location.hostname}:5000`;

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
