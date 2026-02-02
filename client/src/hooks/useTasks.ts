import { useState, useEffect, useCallback } from 'react';
import type { V2Task } from '../types/v2';
import { fetchWorkspaceTasks } from '../lib/api';

export function useTasks(slug: string | undefined) {
  const [tasks, setTasks] = useState<V2Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!slug) return;
    try {
      setLoading(true);
      const data = await fetchWorkspaceTasks(slug);
      setTasks(data.tasks || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll every 5 seconds
  useEffect(() => {
    if (!slug) return;
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [slug, refresh]);

  return { tasks, setTasks, loading, error, refresh };
}
