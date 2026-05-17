import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

function wsUrl(boardId) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const token = localStorage.getItem('access');
  const qs = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${protocol}//${window.location.host}/ws/tasks/${boardId}/${qs}`;
}

export function useBoardSocket(boardId, onEvent) {
  const { user } = useAuth();
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!boardId || !user) return undefined;

    const socket = new WebSocket(wsUrl(boardId));

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.actor_id != null && msg.actor_id === user.id) return;
        handlerRef.current(msg);
      } catch {
        /* ignore malformed payloads */
      }
    };

    return () => {
      socket.close();
    };
  }, [boardId, user]);
}
