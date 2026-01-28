import { getPool } from '../db/connection.js';
import { publishEvent } from './pubsub.js';
import { AppError } from '../middleware/error.js';
import type { Session, SessionWithTasks, CreateSessionRequest } from '@shared/types.js';

export class SessionService {
  static async listSessions(): Promise<SessionWithTasks[]> {
    const pool = getPool();
    const result = await pool.query(`
      SELECT 
        s.*,
        COUNT(t.id) as task_count,
        COUNT(t.id) FILTER (WHERE t.status = 'in_progress') as active_task_count
      FROM sessions s
      LEFT JOIN tasks t ON t.session_id = s.id
      GROUP BY s.id
      ORDER BY s.last_activity_at DESC
    `);

    return result.rows.map(this.mapSession);
  }

  static async upsertSession(data: CreateSessionRequest): Promise<Session> {
    const pool = getPool();
    const result = await pool.query(
      `
      INSERT INTO sessions (session_key, name, project_path)
      VALUES ($1, $2, $3)
      ON CONFLICT (session_key) 
      DO UPDATE SET 
        name = COALESCE($2, sessions.name),
        project_path = COALESCE($3, sessions.project_path),
        updated_at = NOW(),
        last_activity_at = NOW()
      RETURNING *
    `,
      [data.sessionKey, data.name, data.projectPath]
    );

    const session = this.mapSession(result.rows[0]);
    
    await publishEvent('session_created', session);
    
    return session;
  }

  static async getSessionWithTasks(sessionKey: string): Promise<SessionWithTasks | null> {
    const pool = getPool();
    const sessionResult = await pool.query(
      'SELECT * FROM sessions WHERE session_key = $1',
      [sessionKey]
    );

    if (sessionResult.rows.length === 0) {
      return null;
    }

    const session = this.mapSession(sessionResult.rows[0]);

    const tasksResult = await pool.query(
      `SELECT * FROM tasks WHERE session_id = $1 ORDER BY task_number`,
      [session.id]
    );

    return {
      ...session,
      tasks: tasksResult.rows.map((row) => ({
        id: row.id,
        sessionId: row.session_id,
        taskNumber: row.task_number,
        subject: row.subject,
        description: row.description,
        activeForm: row.active_form,
        status: row.status,
        priority: row.priority,
        blocks: row.blocks || [],
        blockedBy: row.blocked_by || [],
        metadata: row.metadata || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        completedAt: row.completed_at,
      })),
      taskCount: tasksResult.rows.length,
      activeTaskCount: tasksResult.rows.filter((t) => t.status === 'in_progress').length,
    };
  }

  static async deleteSession(sessionKey: string): Promise<void> {
    const pool = getPool();
    const result = await pool.query(
      'DELETE FROM sessions WHERE session_key = $1 RETURNING id',
      [sessionKey]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'Session not found');
    }

    await publishEvent('session_deleted', { sessionKey });
  }

  static async updateActivity(sessionKey: string): Promise<void> {
    const pool = getPool();
    await pool.query(
      'UPDATE sessions SET last_activity_at = NOW() WHERE session_key = $1',
      [sessionKey]
    );
    
    await publishEvent('session_activity', { 
      sessionKey, 
      lastActivity: new Date().toISOString() 
    });
  }

  private static mapSession(row: Record<string, unknown>): SessionWithTasks {
    return {
      id: row.id as string,
      sessionKey: row.session_key as string,
      name: row.name as string | undefined,
      projectPath: row.project_path as string | undefined,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
      lastActivityAt: row.last_activity_at as Date,
      tasks: [],
      taskCount: parseInt(row.task_count as string) || 0,
      activeTaskCount: parseInt(row.active_task_count as string) || 0,
    };
  }
}
