'use client';

import { useEffect, useRef } from 'react';

interface BoardEvent {
  type: string;
  payload: {
    requestId?: string;
    toStageId?: string;
  };
}

export function useBoardEvents(onEvent: (event: BoardEvent) => void) {
  const callbackRef = useRef(onEvent);
  callbackRef.current = onEvent;

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout>;
    let retries = 0;

    function connect() {
      eventSource = new EventSource('/api/events/board');

      eventSource.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data) as BoardEvent;
          callbackRef.current(event);
          retries = 0;
        } catch {
          // Ignore parse errors (keepalives, etc.)
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
        // Exponential backoff, max 30 seconds
        const delay = Math.min(1000 * 2 ** retries, 30000);
        retries++;
        retryTimeout = setTimeout(connect, delay);
      };
    }

    connect();

    // Polling fallback: SSE is in-memory per Vercel container, so events from
    // other containers are missed. Poll every 30s to catch them.
    const pollInterval = setInterval(() => {
      callbackRef.current({ type: 'POLL_REFRESH', payload: {} });
    }, 30_000);

    return () => {
      eventSource?.close();
      clearTimeout(retryTimeout);
      clearInterval(pollInterval);
    };
  }, []);
}
