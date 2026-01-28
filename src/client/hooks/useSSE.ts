import { useEffect, useRef, useState, useCallback } from 'react';
import type { SSEEventType } from '@shared/types';

interface SSEEvent {
  type: SSEEventType;
  data: unknown;
}

type EventHandler = (event: SSEEvent) => void;

export function useSSE(handlers: Partial<Record<SSEEventType, EventHandler>>) {
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const handlersRef = useRef(handlers);

  // Update handlers ref when they change
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      return;
    }

    const eventSource = new EventSource('/api/v1/events');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
      eventSourceRef.current = null;
      // Reconnect after 3 seconds
      setTimeout(connect, 3000);
    };

    // Handle all event types
    const eventTypes: SSEEventType[] = [
      'task_created',
      'task_updated',
      'task_deleted',
      'session_created',
      'session_updated',
      'session_deleted',
      'session_activity',
      'heartbeat',
    ];

    eventTypes.forEach((type) => {
      eventSource.addEventListener(type, (event) => {
        try {
          const data = JSON.parse(event.data);
          const handler = handlersRef.current[type];
          if (handler) {
            handler({ type, data });
          }
        } catch (err) {
          console.error('Failed to parse SSE event:', err);
        }
      });
    });

    eventSource.addEventListener('connected', () => {
      setIsConnected(true);
    });
  }, []);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  return { isConnected, connect, disconnect };
}
