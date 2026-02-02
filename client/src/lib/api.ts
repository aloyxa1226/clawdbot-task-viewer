// V2 API client helpers

const API_BASE = '/api/v2';

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || `API error ${res.status}`);
  }
  // API wraps responses in { ok, data } — unwrap
  return body.data !== undefined ? body.data : body;
}

export async function fetchWorkspaces(): Promise<import('../types/v2').Workspace[]> {
  return apiFetch<import('../types/v2').Workspace[]>('/workspaces');
}

export async function fetchWorkspace(slug: string): Promise<import('../types/v2').Workspace> {
  return apiFetch<import('../types/v2').Workspace>(`/workspaces/${slug}`);
}

export async function fetchWorkspaceTasks(slug: string, status?: string): Promise<import('../types/v2').V2Task[]> {
  const params = status ? `?status=${status}` : '';
  return apiFetch<import('../types/v2').V2Task[]>(`/workspaces/${slug}/tasks${params}`);
}

export async function updateTaskStatus(taskId: string, status: string, actor: string = 'al') {
  return apiFetch<import('../types/v2').V2Task>(`/tasks/${taskId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, actor }),
  });
}
