import { create } from 'zustand';
import type { Task, SessionWithTasks } from '@shared/types';
import { api } from '../lib/api';

interface TaskStore {
  sessions: SessionWithTasks[];
  tasks: Task[];
  selectedSession: string | null;
  selectedTaskId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchSessions: () => Promise<void>;
  fetchTasks: (status?: string) => Promise<void>;
  selectSession: (sessionKey: string | null) => void;
  selectTask: (taskId: string | null) => void;
  deleteTask: (sessionKey: string, taskNumber: number) => Promise<void>;
  
  // Real-time updates
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  removeTask: (sessionKey: string, taskNumber: number) => void;
  updateSession: (session: SessionWithTasks) => void;
  removeSession: (sessionKey: string) => void;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  sessions: [],
  tasks: [],
  selectedSession: null,
  selectedTaskId: null,
  isLoading: false,
  error: null,

  fetchSessions: async () => {
    set({ isLoading: true, error: null });
    try {
      const sessions = await api.listSessions();
      set({ sessions, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  fetchTasks: async (status?: string) => {
    set({ isLoading: true, error: null });
    try {
      const tasks = await api.listTasks({ status, limit: 500 });
      set({ tasks, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  selectSession: (sessionKey) => {
    set({ selectedSession: sessionKey });
  },

  selectTask: (taskId) => {
    set({ selectedTaskId: taskId });
  },

  deleteTask: async (sessionKey, taskNumber) => {
    try {
      await api.deleteTask(sessionKey, taskNumber);
      get().removeTask(sessionKey, taskNumber);
    } catch (err) {
      set({ error: (err as Error).message });
      throw err;
    }
  },

  addTask: (task) => {
    set((state) => ({
      tasks: [task, ...state.tasks.filter((t) => t.id !== task.id)],
    }));
  },

  updateTask: (task) => {
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === task.id ? task : t)),
    }));
  },

  removeTask: (sessionKey, taskNumber) => {
    set((state) => ({
      tasks: state.tasks.filter(
        (t) => !(t.sessionId === sessionKey && t.taskNumber === taskNumber)
      ),
    }));
  },

  updateSession: (session) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.sessionKey === session.sessionKey ? session : s
      ),
    }));
  },

  removeSession: (sessionKey) => {
    set((state) => ({
      sessions: state.sessions.filter((s) => s.sessionKey !== sessionKey),
      tasks: state.tasks.filter((t) => t.sessionId !== sessionKey),
    }));
  },
}));
