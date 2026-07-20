import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const SOCKET_URL = API_URL.replace(/\/api$/, '') || 'http://localhost:4000';

export default function useWebSocket(monitorIds = []) {
  const [latestResults, setLatestResults] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  // Socket is created only once
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('ping-result', (data) => {
      setLatestResults((prev) => ({
        ...prev,
        [data.monitorId]: data,
      }));
    });

    // Clean up socket on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  // Handle subscribe/unsubscribe when monitorIds change
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    if (isConnected && monitorIds.length > 0) {
      socket.emit('subscribe', monitorIds);
    }

    return () => {
      if (isConnected && monitorIds.length > 0) {
        socket.emit('unsubscribe', monitorIds);
      }
    };
  }, [isConnected, JSON.stringify(monitorIds)]);

  return { latestResults, isConnected };
}
