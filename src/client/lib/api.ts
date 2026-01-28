import type { ApiResponse, Session, Task, SessionWithTasks, TaskWithFiles } from '@shared/types';

const API_BASE = '/api/v1';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const data: ApiResponse<T> = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Request failed');
  }

  return data.data as T;
}

export const api = {
  // Sessions
  listSessions: () => request<SessionWithTasks[]>('/sessions'),
  getSession: (sessionKey: string) => request<SessionWithTasks>(`/sessions/${sessionKey}`),
  deleteSession: (sessionKey: string) => 
    request<void>(`/sessions/${sessionKey}`, { method: 'DELETE' }),

  // Tasks
  listTasks: (params?: { status?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.limit) query.set('limit', String(params.limit));
    return request<Task[]>(`/tasks?${query}`);
  },
  getTask: (taskId: string) => request<TaskWithFiles>(`/tasks/${taskId}`),
  deleteTask: (sessionKey: string, taskNumber: number) =>
    request<void>(`/sessions/${sessionKey}/tasks/${taskNumber}`, { method: 'DELETE' }),

  // Search
  search: (query: string, limit = 50) =>
    request<Array<{ type: string; item: Session | Task; score: number }>>(
      `/search?q=${encodeURIComponent(query)}&limit=${limit}`
    ),
};
