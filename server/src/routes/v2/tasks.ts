import { Router } from 'express';
import { query } from '../../db/index.js';
import { logActivity } from '../../lib/activity.js';
import { isValidTransition } from '../../lib/status-transitions.js';
import { validateTemplateData } from '../../lib/template-validation.js';
import type { TaskActivity, V2Task, V2Status, Actor, ActivityAction, TemplateType, AssignedTo, ApiResponse } from '../../types/v2.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true });
});

/**
 * POST /api/v2/tasks
 * Create a new v2 task with optional template data.
 */
router.post('/', async (req, res) => {
  try {
    const {
      workspace_id,
      subject,
      description,
      priority = 0,
      template_type = null,
      template_data = {},
      assigned_to = 'ai',
      blocks = [],
      blocked_by = [],
      metadata = {},
    } = req.body as {
      workspace_id: string;
      subject: string;
      description?: string | null;
      priority?: number;
      template_type?: TemplateType | null;
      template_data?: unknown;
      assigned_to?: AssignedTo;
      blocks?: string[];
      blocked_by?: string[];
      metadata?: Record<string, unknown>;
    };

    // Basic validation
    if (!workspace_id) {
      const response: ApiResponse = { ok: false, error: 'workspace_id is required' };
      res.status(400).json(response);
      return;
    }
    if (!subject || (typeof subject === 'string' && subject.trim() === '')) {
      const response: ApiResponse = { ok: false, error: 'subject is required' };
      res.status(400).json(response);
      return;
    }

    // Template validation
    const validation = validateTemplateData(template_type, template_data);
    if (!validation.valid) {
      const response: ApiResponse = {
        ok: false,
        error: `Invalid template data: ${validation.errors.map(e => `${e.field}: ${e.message}`).join('; ')}`,
      };
      res.status(400).json(response);
      return;
    }

    // Get next task number
    const maxResult = await query<{ max: number | null }>(
      'SELECT MAX(task_number) as max FROM tasks'
    );
    const taskNumber = (maxResult.rows[0]?.max ?? 0) + 1;

    const result = await query<V2Task>(
      `INSERT INTO tasks (workspace_id, task_number, subject, description, priority, status, template_type, template_data, assigned_to, blocks, blocked_by, metadata)
       VALUES ($1, $2, $3, $4, $5, 'queued', $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        workspace_id,
        taskNumber,
        subject.trim(),
        description?.trim() || null,
        priority,
        template_type || null,
        JSON.stringify(template_data || {}),
        assigned_to,
        blocks.length > 0 ? blocks : null,
        blocked_by.length > 0 ? blocked_by : null,
        JSON.stringify(metadata),
      ]
    );

    const task = result.rows[0];

    // Log activity
    await logActivity(task.id, 'system', 'created', {
      subject: task.subject,
      template_type: template_type || 'freeform',
    });

    const response: ApiResponse<V2Task> = { ok: true, data: task };
    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating v2 task:', error);
    const response: ApiResponse = { ok: false, error: 'Failed to create task' };
    res.status(500).json(response);
  }
});

/**
 * GET /api/v2/tasks/:id
 * Get a single task by ID.
 */
router.get('/:id', async (req, res) => {
  try {
    const result = await query<V2Task>(
      'SELECT * FROM tasks WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      const response: ApiResponse = { ok: false, error: 'Task not found' };
      res.status(404).json(response);
      return;
    }
    const response: ApiResponse<V2Task> = { ok: true, data: result.rows[0] };
    res.json(response);
  } catch (error) {
    console.error('Error fetching task:', error);
    const response: ApiResponse = { ok: false, error: 'Failed to fetch task' };
    res.status(500).json(response);
  }
});

/**
 * PATCH /api/v2/tasks/:id
 * Update task fields (subject, description, priority, metadata, etc.)
 */
router.patch('/:id', async (req, res) => {
  try {
    const taskId = req.params.id;
    const { subject, description, priority, template_data, metadata, blocks, blocked_by } = req.body;

    const existing = await query<V2Task>('SELECT * FROM tasks WHERE id = $1', [taskId]);
    if (existing.rows.length === 0) {
      const response: ApiResponse = { ok: false, error: 'Task not found' };
      res.status(404).json(response);
      return;
    }

    const updates: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [];
    let idx = 1;

    if (subject !== undefined) { updates.push(`subject = $${idx++}`); params.push(subject.trim()); }
    if (description !== undefined) { updates.push(`description = $${idx++}`); params.push(description?.trim() || null); }
    if (priority !== undefined) { updates.push(`priority = $${idx++}`); params.push(priority); }
    if (template_data !== undefined) { updates.push(`template_data = $${idx++}`); params.push(JSON.stringify(template_data)); }
    if (metadata !== undefined) { updates.push(`metadata = $${idx++}`); params.push(JSON.stringify(metadata)); }
    if (blocks !== undefined) { updates.push(`blocks = $${idx++}`); params.push(blocks.length > 0 ? blocks : null); }
    if (blocked_by !== undefined) { updates.push(`blocked_by = $${idx++}`); params.push(blocked_by.length > 0 ? blocked_by : null); }

    if (params.length === 0) {
      const response: ApiResponse = { ok: false, error: 'No fields to update' };
      res.status(400).json(response);
      return;
    }

    params.push(taskId);
    const result = await query<V2Task>(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    await logActivity(taskId, 'al', 'updated', { fields: Object.keys(req.body) });

    const response: ApiResponse<V2Task> = { ok: true, data: result.rows[0] };
    res.json(response);
  } catch (error) {
    console.error('Error updating task:', error);
    const response: ApiResponse = { ok: false, error: 'Failed to update task' };
    res.status(500).json(response);
  }
});

/**
 * Helper: determine assigned_to based on status
 */
function assignedToForStatus(status: V2Status): AssignedTo | null {
  switch (status) {
    case 'claimed':
    case 'in_progress':
      return 'ai';
    case 'review':
      return 'al';
    case 'queued':
      return 'unassigned';
    default:
      return null;
  }
}

/**
 * PATCH /api/v2/tasks/:id/status
 * Change task status with transition validation.
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const taskId = req.params.id;
    const { status, actor = 'al' } = req.body as { status: V2Status; actor?: Actor };

    if (!status) {
      const response: ApiResponse = { ok: false, error: 'status is required' };
      res.status(400).json(response);
      return;
    }

    const existing = await query<V2Task>('SELECT * FROM tasks WHERE id = $1', [taskId]);
    if (existing.rows.length === 0) {
      const response: ApiResponse = { ok: false, error: 'Task not found' };
      res.status(404).json(response);
      return;
    }

    const task = existing.rows[0];

    if (!isValidTransition(task.status as V2Status, status, actor)) {
      const response: ApiResponse = {
        ok: false,
        error: `Invalid transition from '${task.status}' to '${status}' for actor '${actor}'`,
      };
      res.status(422).json(response);
      return;
    }

    const updates: string[] = [`status = $1`, `updated_at = NOW()`];
    const params: unknown[] = [status];
    let idx = 2;

    const newAssignee = assignedToForStatus(status);
    if (newAssignee) {
      updates.push(`assigned_to = $${idx++}`);
      params.push(newAssignee);
    }

    params.push(taskId);
    const result = await query<V2Task>(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    await logActivity(taskId, actor, 'status_changed', { from: task.status, to: status });
    if (newAssignee) {
      await logActivity(taskId, actor, 'assigned', { assigned_to: newAssignee });
    }

    const response: ApiResponse<V2Task> = { ok: true, data: result.rows[0] };
    res.json(response);
  } catch (error) {
    console.error('Error updating task status:', error);
    const response: ApiResponse = { ok: false, error: 'Failed to update task status' };
    res.status(500).json(response);
  }
});

/**
 * DELETE /api/v2/tasks/:id
 * Delete a task.
 */
router.delete('/:id', async (req, res) => {
  try {
    const taskId = req.params.id;

    const existing = await query<V2Task>('SELECT * FROM tasks WHERE id = $1', [taskId]);
    if (existing.rows.length === 0) {
      const response: ApiResponse = { ok: false, error: 'Task not found' };
      res.status(404).json(response);
      return;
    }

    await query('DELETE FROM tasks WHERE id = $1', [taskId]);

    const response: ApiResponse = { ok: true };
    res.json(response);
  } catch (error) {
    console.error('Error deleting task:', error);
    const response: ApiResponse = { ok: false, error: 'Failed to delete task' };
    res.status(500).json(response);
  }
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
