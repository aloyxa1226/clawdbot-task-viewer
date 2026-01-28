import Fuse from 'fuse.js';
import { getPool } from '../db/connection.js';
import type { Task, Session } from '@shared/types.js';

interface SearchResult {
  type: 'session' | 'task';
  item: Session | Task;
  score: number;
}

export class SearchService {
  static async search(query: string, limit: number = 50): Promise<SearchResult[]> {
    const pool = getPool();

    // Fetch all sessions and tasks for fuzzy search
    const [sessionsResult, tasksResult] = await Promise.all([
      pool.query('SELECT * FROM sessions ORDER BY last_activity_at DESC LIMIT 1000'),
      pool.query(`
        SELECT t.*, s.session_key 
        FROM tasks t 
        JOIN sessions s ON s.id = t.session_id 
        ORDER BY t.updated_at DESC 
        LIMIT 1000
      `),
    ]);

    const sessions: Session[] = sessionsResult.rows.map((row) => ({
      id: row.id,
      sessionKey: row.session_key,
      name: row.name,
      projectPath: row.project_path,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastActivityAt: row.last_activity_at,
    }));

    const tasks: Task[] = tasksResult.rows.map((row) => ({
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
    }));

    // Fuzzy search sessions
    const sessionFuse = new Fuse(sessions, {
      keys: ['sessionKey', 'name', 'projectPath'],
      threshold: 0.4,
      includeScore: true,
    });

    const sessionResults = sessionFuse.search(query).map((result) => ({
      type: 'session' as const,
      item: result.item,
      score: result.score || 0,
    }));

    // Fuzzy search tasks
    const taskFuse = new Fuse(tasks, {
      keys: ['subject', 'description', 'activeForm'],
      threshold: 0.4,
      includeScore: true,
    });

    const taskResults = taskFuse.search(query).map((result) => ({
      type: 'task' as const,
      item: result.item,
      score: result.score || 0,
    }));

    // Combine and sort by score
    const combined = [...sessionResults, ...taskResults]
      .sort((a, b) => a.score - b.score)
      .slice(0, limit);

    return combined;
  }
}
