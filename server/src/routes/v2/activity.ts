import { Router } from 'express';
import { query } from '../../db/index.js';
import { logActivity } from '../../lib/activity.js';
import type { TaskActivity, Actor, ActivityAction, ApiResponse } from '../../types/v2.js';

const router = Router();

/**
 * GET /api/v2/activity?workspace_id=X&since=TIMESTAMP&limit=50&offset=0
 * Cross-task activity feed for briefing generation.
 */
router.get('/', async (req, res) => {
  try {
    const workspaceId = req.query.workspace_id as string | undefined;
    const since = req.query.since as string | undefined;
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 0;

    if (workspaceId) {
      paramIdx++;
      conditions.push(`t.workspace_id = $${paramIdx}`);
      params.push(workspaceId);
    }

    if (since) {
      paramIdx++;
      conditions.push(`a.created_at >= $${paramIdx}`);
      params.push(since);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    paramIdx++;
    const limitParam = paramIdx;
    params.push(limit);
    paramIdx++;
    const offsetParam = paramIdx;
    params.push(offset);

    const result = await query<TaskActivity>(
      `SELECT a.*
       FROM task_activity a
       JOIN tasks t ON t.id = a.task_id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      params
    );

    const response: ApiResponse<TaskActivity[]> = { ok: true, data: result.rows };
    res.json(response);
  } catch (error) {
    console.error('Error fetching cross-task activity:', error);
    const response: ApiResponse = { ok: false, error: 'Failed to fetch activity' };
    res.status(500).json(response);
  }
});

/**
 * GET /api/v2/activity/tasks/:id
 * Paginated activity for a single task. Aliased from task routes.
 */

/**
 * POST /api/v2/activity/tasks/:id
 * Add a manual activity entry (comment/note).
 */

// Task-scoped activity routes (mounted under /api/v2/activity but scoped to tasks/:id)
// These are also accessible via the tasks router forwarding here.

router.get('/tasks/:id', async (req, res) => {
  try {
    const taskId = req.params.id;
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

    const result = await query<TaskActivity>(
      `SELECT * FROM task_activity
       WHERE task_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [taskId, limit, offset]
    );

    const response: ApiResponse<TaskActivity[]> = { ok: true, data: result.rows };
    res.json(response);
  } catch (error) {
    console.error('Error fetching task activity:', error);
    const response: ApiResponse = { ok: false, error: 'Failed to fetch activity' };
    res.status(500).json(response);
  }
});

router.post('/tasks/:id', async (req, res) => {
  try {
    const taskId = req.params.id;
    const { actor, action, details } = req.body as {
      actor: Actor;
      action: ActivityAction;
      details?: Record<string, unknown>;
    };

    if (!actor || !action) {
      const response: ApiResponse = { ok: false, error: 'actor and action are required' };
      res.status(400).json(response);
      return;
    }

    const entry = await logActivity(taskId, actor, action, details || {});

    const response: ApiResponse<TaskActivity> = { ok: true, data: entry };
    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating activity entry:', error);
    const response: ApiResponse = { ok: false, error: 'Failed to create activity entry' };
    res.status(500).json(response);
  }
});

export default router;
