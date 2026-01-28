import { getPool } from '../db/connection.js';
import { publishEvent } from './pubsub.js';
import { SessionService } from './session.service.js';
import { AppError } from '../middleware/error.js';
import type { Task, CreateTaskRequest, TaskWithFiles } from '@shared/types.js';

export class TaskService {
  static async listTasks(options: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<Task[]> {
    const pool = getPool();
    const params: unknown[] = [];
    let query = `
      SELECT t.*, s.session_key 
      FROM tasks t
      JOIN sessions s ON s.id = t.session_id
    `;

    if (options.status) {
      params.push(options.status);
      query += ` WHERE t.status = $${params.length}`;
    }

    query += ` ORDER BY t.updated_at DESC`;
    
    params.push(options.limit || 100);
    query += ` LIMIT $${params.length}`;
    
    params.push(options.offset || 0);
    query += ` OFFSET $${params.length}`;

    const result = await pool.query(query, params);
    return result.rows.map(this.mapTask);
  }

  static async getTaskById(taskId: string): Promise<TaskWithFiles | null> {
    const pool = getPool();
    const taskResult = await pool.query(
      `SELECT t.*, s.session_key, s.name as session_name, s.project_path
       FROM tasks t
       JOIN sessions s ON s.id = t.session_id
       WHERE t.id = $1`,
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      return null;
    }

    const task = this.mapTask(taskResult.rows[0]);
    
    const filesResult = await pool.query(
      'SELECT * FROM task_files WHERE task_id = $1',
      [taskId]
    );

    const row = taskResult.rows[0];
    return {
      ...task,
      files: filesResult.rows.map((f) => ({
        id: f.id,
        taskId: f.task_id,
        filename: f.filename,
        contentType: f.content_type,
        sizeBytes: f.size_bytes,
        filePath: f.file_path,
        createdAt: f.created_at,
      })),
      session: {
        id: row.session_id,
        sessionKey: row.session_key,
        name: row.session_name,
        projectPath: row.project_path,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastActivityAt: row.last_activity_at,
      },
    };
  }

  static async getTasksBySession(sessionKey: string): Promise<Task[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT t.* FROM tasks t
       JOIN sessions s ON s.id = t.session_id
       WHERE s.session_key = $1
       ORDER BY t.task_number`,
      [sessionKey]
    );

    return result.rows.map(this.mapTask);
  }

  static async upsertTask(sessionKey: string, data: CreateTaskRequest): Promise<Task> {
    const pool = getPool();

    // Ensure session exists
    let sessionResult = await pool.query(
      'SELECT id FROM sessions WHERE session_key = $1',
      [sessionKey]
    );

    if (sessionResult.rows.length === 0) {
      // Auto-create session
      sessionResult = await pool.query(
        'INSERT INTO sessions (session_key) VALUES ($1) RETURNING id',
        [sessionKey]
      );
    }

    const sessionId = sessionResult.rows[0].id;

    // Check if task exists
    const existingTask = await pool.query(
      'SELECT id, status FROM tasks WHERE session_id = $1 AND task_number = $2',
      [sessionId, data.taskNumber]
    );

    let result;
    let eventType: 'task_created' | 'task_updated';

    if (existingTask.rows.length === 0) {
      // Create new task
      result = await pool.query(
        `INSERT INTO tasks (
          session_id, task_number, subject, description, active_form,
          status, priority, blocks, blocked_by, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          sessionId,
          data.taskNumber,
          data.subject,
          data.description,
          data.activeForm,
          data.status || 'pending',
          data.priority || 0,
          data.blocks || [],
          data.blockedBy || [],
          data.metadata || {},
        ]
      );
      eventType = 'task_created';
    } else {
      // Update existing task
      const completedAt = data.status === 'completed' && existingTask.rows[0].status !== 'completed'
        ? 'NOW()'
        : 'completed_at';

      result = await pool.query(
        `UPDATE tasks SET
          subject = COALESCE($3, subject),
          description = COALESCE($4, description),
          active_form = COALESCE($5, active_form),
          status = COALESCE($6, status),
          priority = COALESCE($7, priority),
          blocks = COALESCE($8, blocks),
          blocked_by = COALESCE($9, blocked_by),
          metadata = COALESCE($10, metadata),
          updated_at = NOW(),
          completed_at = ${completedAt}
        WHERE session_id = $1 AND task_number = $2
        RETURNING *`,
        [
          sessionId,
          data.taskNumber,
          data.subject,
          data.description,
          data.activeForm,
          data.status,
          data.priority,
          data.blocks,
          data.blockedBy,
          data.metadata,
        ]
      );
      eventType = 'task_updated';
    }

    const task = this.mapTask(result.rows[0]);
    
    // Update session activity
    await SessionService.updateActivity(sessionKey);
    
    // Publish event
    await publishEvent(eventType, { sessionKey, task });

    return task;
  }

  static async deleteTask(sessionKey: string, taskNumber: number): Promise<void> {
    const pool = getPool();

    // Check task status first
    const taskResult = await pool.query(
      `SELECT t.id, t.status FROM tasks t
       JOIN sessions s ON s.id = t.session_id
       WHERE s.session_key = $1 AND t.task_number = $2`,
      [sessionKey, taskNumber]
    );

    if (taskResult.rows.length === 0) {
      throw new AppError(404, 'Task not found');
    }

    if (taskResult.rows[0].status !== 'pending') {
      throw new AppError(400, 'Can only delete pending tasks');
    }

    await pool.query('DELETE FROM tasks WHERE id = $1', [taskResult.rows[0].id]);

    await publishEvent('task_deleted', { sessionKey, taskNumber });
  }

  private static mapTask(row: Record<string, unknown>): Task {
    return {
      id: row.id as string,
      sessionId: row.session_id as string,
      taskNumber: row.task_number as number,
      subject: row.subject as string,
      description: row.description as string | undefined,
      activeForm: row.active_form as string | undefined,
      status: row.status as Task['status'],
      priority: row.priority as number,
      blocks: (row.blocks as string[]) || [],
      blockedBy: (row.blocked_by as string[]) || [],
      metadata: (row.metadata as Record<string, unknown>) || {},
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
      completedAt: row.completed_at as Date | undefined,
    };
  }
}
