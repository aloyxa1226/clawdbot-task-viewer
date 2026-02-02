import { Router } from 'express';
import { query } from '../../db/index.js';
import { logActivity } from '../../lib/activity.js';
import { validateTemplateData } from '../../lib/template-validation.js';
import type { TaskActivity, V2Task, Actor, ActivityAction, TemplateType, AssignedTo, ApiResponse } from '../../types/v2.js';

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
      assigned_to = 'unassigned',
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
