import { Router, Request, Response } from 'express';
import { aiAuth } from '../../middleware/ai-auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { query } from '../../db/index.js';
import { logActivity } from '../../lib/activity.js';
import { isValidTransition } from '../../lib/status-transitions.js';
import type { V2Task, V2Status } from '../../types/v2.js';

const router = Router();

router.use(aiAuth);
router.use(rateLimit);

router.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// GET /api/v2/ai/queue?workspace=SLUG
router.get('/queue', async (req: Request, res: Response) => {
  try {
    const workspace = req.query.workspace as string | undefined;
    if (!workspace) {
      res.status(400).json({ ok: false, error: 'workspace query parameter required' });
      return;
    }

    const result = await query<V2Task>(
      `SELECT t.* FROM v2_tasks t
       JOIN workspaces w ON w.id = t.workspace_id
       WHERE w.slug = $1 AND t.status = 'queued'
       ORDER BY t.priority DESC, t.created_at ASC`,
      [workspace]
    );

    res.json({ ok: true, data: result.rows });
  } catch (err) {
    console.error('GET /queue error:', err);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// POST /api/v2/ai/claim
router.post('/claim', async (req: Request, res: Response) => {
  try {
    const { task_id } = req.body;
    if (!task_id) {
      res.status(400).json({ ok: false, error: 'task_id required' });
      return;
    }

    const taskResult = await query<V2Task>(
      'SELECT * FROM v2_tasks WHERE id = $1',
      [task_id]
    );

    if (taskResult.rows.length === 0) {
      res.status(404).json({ ok: false, error: 'Task not found' });
      return;
    }

    const task = taskResult.rows[0];

    if (task.status === 'claimed' || task.status === 'in_progress') {
      res.status(409).json({ ok: false, error: 'Task already claimed' });
      return;
    }

    if (task.status !== 'queued') {
      res.status(422).json({ ok: false, error: 'Task is not queued' });
      return;
    }

    if (!isValidTransition('queued', 'claimed', 'ai')) {
      res.status(422).json({ ok: false, error: 'Invalid transition' });
      return;
    }

    const updated = await query<V2Task>(
      `UPDATE v2_tasks SET status = 'claimed', assigned_to = 'ai', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [task_id]
    );

    await logActivity(task_id, 'ai', 'status_changed', { from: 'queued', to: 'claimed' });
    await logActivity(task_id, 'ai', 'assigned', { assigned_to: 'ai' });

    res.json({ ok: true, data: updated.rows[0] });
  } catch (err) {
    console.error('POST /claim error:', err);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// PATCH /api/v2/ai/tasks/:id/progress
router.patch('/tasks/:id/progress', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes, review_notes } = req.body;

    const taskResult = await query<V2Task>(
      'SELECT * FROM v2_tasks WHERE id = $1',
      [id]
    );

    if (taskResult.rows.length === 0) {
      res.status(404).json({ ok: false, error: 'Task not found' });
      return;
    }

    const task = taskResult.rows[0];
    const updates: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (status) {
      if (!isValidTransition(task.status, status as V2Status, 'ai')) {
        res.status(422).json({
          ok: false,
          error: `Invalid transition from '${task.status}' to '${status}' for AI`
        });
        return;
      }
      updates.push(`status = $${paramIdx++}`);
      params.push(status);
    }

    if (notes !== undefined) {
      updates.push(`description = $${paramIdx++}`);
      params.push(notes);
    }

    if (review_notes !== undefined) {
      updates.push(`review_notes = $${paramIdx++}`);
      params.push(review_notes);
    }

    params.push(id);
    const updated = await query<V2Task>(
      `UPDATE v2_tasks SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      params
    );

    if (status) {
      await logActivity(id, 'ai', 'status_changed', { from: task.status, to: status });
    }
    if (notes !== undefined) {
      await logActivity(id, 'ai', 'commented', { notes });
    }

    res.json({ ok: true, data: updated.rows[0] });
  } catch (err) {
    console.error('PATCH /tasks/:id/progress error:', err);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// POST /api/v2/ai/tasks/:id/complete
router.post('/tasks/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { review_notes, artifacts } = req.body;

    if (!review_notes) {
      res.status(400).json({ ok: false, error: 'review_notes required' });
      return;
    }

    const taskResult = await query<V2Task>(
      'SELECT * FROM v2_tasks WHERE id = $1',
      [id]
    );

    if (taskResult.rows.length === 0) {
      res.status(404).json({ ok: false, error: 'Task not found' });
      return;
    }

    const task = taskResult.rows[0];

    if (task.status !== 'in_progress') {
      res.status(422).json({ ok: false, error: 'Task is not in_progress' });
      return;
    }

    if (!isValidTransition('in_progress', 'review', 'ai')) {
      res.status(422).json({ ok: false, error: 'Invalid transition' });
      return;
    }

    const metadata = { ...((task.metadata as Record<string, unknown>) || {}) };
    if (artifacts) {
      metadata.artifacts = artifacts;
    }

    const updated = await query<V2Task>(
      `UPDATE v2_tasks SET status = 'review', review_notes = $1, metadata = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [review_notes, JSON.stringify(metadata), id]
    );

    await logActivity(id, 'ai', 'status_changed', {
      from: 'in_progress',
      to: 'review',
      review_notes,
      ...(artifacts ? { artifacts } : {})
    });

    res.json({ ok: true, data: updated.rows[0] });
  } catch (err) {
    console.error('POST /tasks/:id/complete error:', err);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

export default router;
