import { Router } from 'express';
import { query } from '../../db/index.js';
import { logActivity } from '../../lib/activity.js';
import type { TaskActivity, Actor, ActivityAction, ApiResponse } from '../../types/v2.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true });
});

/**
 * GET /api/v2/tasks/:id/activity
 * Paginated activity for a single task.
 */
router.get('/:id/activity', async (req, res) => {
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

/**
 * POST /api/v2/tasks/:id/activity
 * Add a manual activity entry (comment/note).
 */
router.post('/:id/activity', async (req, res) => {
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
