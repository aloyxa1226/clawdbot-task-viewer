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
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `API error ${res.status}`);
  }
  return res.json();
}

export async function fetchWorkspaces() {
  return apiFetch<{ workspaces: import('../types/v2').Workspace[] }>('/workspaces');
}

export async function fetchWorkspace(slug: string) {
  return apiFetch<{ workspace: import('../types/v2').Workspace }>(`/workspaces/${slug}`);
}

export async function fetchWorkspaceTasks(slug: string, status?: string) {
  const params = status ? `?status=${status}` : '';
  return apiFetch<{ tasks: import('../types/v2').V2Task[] }>(`/workspaces/${slug}/tasks${params}`);
}

export async function updateTaskStatus(taskId: string, status: string, actor: string = 'al') {
  return apiFetch<{ task: import('../types/v2').V2Task }>(`/tasks/${taskId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, actor }),
  });
}
