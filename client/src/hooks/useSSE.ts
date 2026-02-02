import { useEffect, useRef } from 'react';

/**
 * SSE hook for auto-refresh. Falls back to polling if no SSE endpoint available.
 */
export function useSSE(onRefresh: () => void, intervalMs: number = 10000) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Poll-based refresh as fallback (no SSE infrastructure yet)
    timerRef.current = setInterval(() => {
      onRefresh();
    }, intervalMs);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [onRefresh, intervalMs]);
}
