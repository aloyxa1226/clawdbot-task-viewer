import { Router, Request, Response } from 'express';
import { query } from '../../db/index.js';
import { V2Task, V2Status, Actor, AssignedTo } from '../../types/v2.js';
import { isValidTransition, getAllowedTransitions } from '../../lib/status-transitions.js';

const router = Router();

// Helper: derive assigned_to from status
function deriveAssignedTo(status: V2Status): AssignedTo {
  switch (status) {
    case 'claimed':
    case 'in_progress':
      return 'ai';
    case 'review':
      return 'al';
    case 'queued':
      return 'unassigned';
    default:
      return 'unassigned';
  }
}

// Helper: log activity directly into task_activity
async function logStatusChange(taskId: string, actor: Actor, action: string, details: Record<string, unknown>): Promise<void> {
  await query(
    `INSERT INTO task_activity (id, task_id, actor, action, details, created_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())`,
    [taskId, actor, action, JSON.stringify(details)]
  );
}

// POST /api/v2/tasks — create task
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      workspace_id,
      subject,
      description,
      priority,
      template_type,
      template_data,
    } = req.body;

    if (!workspace_id || !subject) {
      res.status(400).json({ ok: false, error: 'workspace_id and subject are required' });
      return;
    }

    const status: V2Status = 'queued';
    const assigned_to: AssignedTo = 'ai';

    const result = await query<V2Task>(
      `INSERT INTO tasks (workspace_id, subject, description, priority, status, assigned_to, template_type, template_data, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW(), NOW())
       RETURNING *`,
      [
        workspace_id,
        subject,
        description || null,
        priority || 0,
        status,
        assigned_to,
        template_type || null,
        JSON.stringify(template_data || {}),
      ]
    );

    const task = result.rows[0];

    await logStatusChange(task.id, 'system', 'created', { status: 'queued' });

    res.status(201).json({ ok: true, data: task });
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ ok: false, error: 'Failed to create task' });
  }
});

// GET /api/v2/tasks/:id — get task
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query<V2Task>(
      'SELECT * FROM tasks WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ ok: false, error: 'Task not found' });
      return;
    }

    res.json({ ok: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error fetching task:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch task' });
  }
});

// PATCH /api/v2/tasks/:id — update task fields
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const allowedFields = ['subject', 'description', 'priority', 'template_type', 'template_data', 'review_notes', 'metadata'];
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'template_data' || field === 'metadata') {
          updates.push(`${field} = $${paramIdx}::jsonb`);
          values.push(JSON.stringify(req.body[field]));
        } else {
          updates.push(`${field} = $${paramIdx}`);
          values.push(req.body[field]);
        }
        paramIdx++;
      }
    }

    if (updates.length === 0) {
      res.status(400).json({ ok: false, error: 'No valid fields to update' });
      return;
    }

    updates.push(`updated_at = NOW()`);
    values.push(req.params.id);

    const result = await query<V2Task>(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      res.status(404).json({ ok: false, error: 'Task not found' });
      return;
    }

    res.json({ ok: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ ok: false, error: 'Failed to update task' });
  }
});

// PATCH /api/v2/tasks/:id/status — validated status transition
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status: newStatus, actor } = req.body as { status: V2Status; actor: Actor };

    if (!newStatus || !actor) {
      res.status(400).json({ ok: false, error: 'status and actor are required' });
      return;
    }

    if (!['al', 'ai', 'system'].includes(actor)) {
      res.status(400).json({ ok: false, error: 'actor must be al, ai, or system' });
      return;
    }

    // Get current task
    const current = await query<V2Task>(
      'SELECT * FROM tasks WHERE id = $1',
      [req.params.id]
    );

    if (current.rows.length === 0) {
      res.status(404).json({ ok: false, error: 'Task not found' });
      return;
    }

    const task = current.rows[0];
    const fromStatus = task.status;

    if (!isValidTransition(fromStatus, newStatus, actor)) {
      const allowed = getAllowedTransitions(fromStatus, actor);
      res.status(422).json({
        ok: false,
        error: `Invalid transition: ${fromStatus} → ${newStatus} for actor ${actor}. Allowed transitions from ${fromStatus}: [${allowed.join(', ')}]`,
      });
      return;
    }

    const assigned_to = deriveAssignedTo(newStatus);
    const completedAt = newStatus === 'done' ? 'NOW()' : 'completed_at';

    const result = await query<V2Task>(
      `UPDATE tasks SET status = $1, assigned_to = $2, completed_at = ${completedAt}, updated_at = NOW() WHERE id = $3 RETURNING *`,
      [newStatus, assigned_to, req.params.id]
    );

    await logStatusChange(task.id, actor, 'status_changed', {
      from: fromStatus,
      to: newStatus,
    });

    res.json({ ok: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error updating task status:', err);
    res.status(500).json({ ok: false, error: 'Failed to update task status' });
  }
});

// DELETE /api/v2/tasks/:id — soft-delete (archive)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const current = await query<V2Task>(
      'SELECT * FROM tasks WHERE id = $1',
      [req.params.id]
    );

    if (current.rows.length === 0) {
      res.status(404).json({ ok: false, error: 'Task not found' });
      return;
    }

    const task = current.rows[0];

    const result = await query<V2Task>(
      `UPDATE tasks SET status = 'archived', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    await logStatusChange(task.id, 'system', 'status_changed', {
      from: task.status,
      to: 'archived',
    });

    res.json({ ok: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ ok: false, error: 'Failed to delete task' });
  }
});

export default router;
