// Task status
export type TaskStatus = 'pending' | 'in_progress' | 'completed';

// Session
export interface Session {
  id: string;
  sessionKey: string;
  name?: string;
  projectPath?: string;
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
}

// Task
export interface Task {
  id: string;
  sessionId: string;
  taskNumber: number;
  subject: string;
  description?: string;
  activeForm?: string;
  status: TaskStatus;
  priority: number;
  blocks: string[];
  blockedBy: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// Task file
export interface TaskFile {
  id: string;
  taskId: string;
  filename: string;
  contentType?: string;
  sizeBytes?: number;
  filePath: string;
  createdAt: Date;
}

// API request/response types
export interface CreateSessionRequest {
  sessionKey: string;
  name?: string;
  projectPath?: string;
}

export interface CreateTaskRequest {
  taskNumber: number;
  subject: string;
  description?: string;
  activeForm?: string;
  status?: TaskStatus;
  priority?: number;
  blocks?: number[];
  blockedBy?: number[];
  metadata?: Record<string, unknown>;
}

export interface UpdateTaskRequest {
  subject?: string;
  description?: string;
  activeForm?: string;
  status?: TaskStatus;
  priority?: number;
  blocks?: number[];
  blockedBy?: number[];
  metadata?: Record<string, unknown>;
}

// SSE event types
export type SSEEventType = 
  | 'task_created'
  | 'task_updated'
  | 'task_deleted'
  | 'session_created'
  | 'session_updated'
  | 'session_deleted'
  | 'session_activity'
  | 'heartbeat';

export interface SSEEvent<T = unknown> {
  type: SSEEventType;
  data: T;
  timestamp: Date;
}

// API responses
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SessionWithTasks extends Session {
  tasks: Task[];
  taskCount: number;
  activeTaskCount: number;
}

export interface TaskWithFiles extends Task {
  files: TaskFile[];
  session: Session;
}
