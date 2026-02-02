import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api';

export interface DashboardWorkspace {
  workspace_id: string;
  slug: string;
  name: string;
  color: string;
  counts: Record<string, number>;
}

export interface DashboardReviewItem {
  id: string;
  task_number: number;
  subject: string;
  assigned_to: string;
  review_notes: string | null;
  updated_at: string;
  workspace_id: string;
  workspace_slug: string;
  workspace_name: string;
  workspace_color: string;
}

export interface DashboardActiveItem {
  id: string;
  task_number: number;
  subject: string;
  status: string;
  assigned_to: string;
  updated_at: string;
  workspace_id: string;
  workspace_slug: string;
  workspace_name: string;
  workspace_color: string;
}

export interface DashboardActivity {
  id: string;
  task_id: string;
  actor: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
  task_subject: string;
  task_number: number;
  workspace_slug: string;
  workspace_name: string;
  workspace_color: string;
}

export interface DashboardData {
  workspaces: DashboardWorkspace[];
  global: { review: number; in_progress: number; queued: number };
  review_items: DashboardReviewItem[];
  active_items: DashboardActiveItem[];
  recent_activity: DashboardActivity[];
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch<DashboardData>('/dashboard');
      setData(res);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
