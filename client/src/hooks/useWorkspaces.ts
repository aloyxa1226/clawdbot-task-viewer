import { useState, useEffect, useCallback } from 'react';
import type { Workspace } from '../types/v2';
import { fetchWorkspaces } from '../lib/api';

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchWorkspaces();
      setWorkspaces(data.workspaces || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch workspaces');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { workspaces, loading, error, refresh };
}
