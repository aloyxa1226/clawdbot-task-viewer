import { Router, Request, Response } from 'express';
import { query } from '../../db/index.js';
import { Workspace, V2Task, V2Status, ApiResponse } from '../../types/v2.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true });
});

interface WorkspaceWithCounts extends Workspace {
  task_counts: Record<V2Status, number>;
}

const STATUS_LIST: V2Status[] = ['queued', 'claimed', 'in_progress', 'review', 'done', 'archived'];

// GET /api/v2/workspaces
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await query<Workspace & Record<string, string>>(`
      SELECT w.*,
        COUNT(t.id) FILTER (WHERE t.status = 'queued') AS queued_count,
        COUNT(t.id) FILTER (WHERE t.status = 'claimed') AS claimed_count,
        COUNT(t.id) FILTER (WHERE t.status = 'in_progress') AS in_progress_count,
        COUNT(t.id) FILTER (WHERE t.status = 'review') AS review_count,
        COUNT(t.id) FILTER (WHERE t.status = 'done') AS done_count,
        COUNT(t.id) FILTER (WHERE t.status = 'archived') AS archived_count
      FROM workspaces w
      LEFT JOIN tasks t ON t.workspace_id = w.id
      GROUP BY w.id
      ORDER BY w.name
    `);

    const workspaces: WorkspaceWithCounts[] = result.rows.map(row => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      color: row.color,
      icon: row.icon,
      created_at: row.created_at,
      task_counts: {
        queued: parseInt(row.queued_count, 10) || 0,
        claimed: parseInt(row.claimed_count, 10) || 0,
        in_progress: parseInt(row.in_progress_count, 10) || 0,
        review: parseInt(row.review_count, 10) || 0,
        done: parseInt(row.done_count, 10) || 0,
        archived: parseInt(row.archived_count, 10) || 0,
      },
    }));

    const response: ApiResponse<WorkspaceWithCounts[]> = { ok: true, data: workspaces };
    res.json(response);
  } catch (err) {
    console.error('Error fetching workspaces:', err);
    const response: ApiResponse = { ok: false, error: 'Internal server error' };
    res.status(500).json(response);
  }
});

// GET /api/v2/workspaces/:slug
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const result = await query<Workspace & Record<string, string>>(`
      SELECT w.*,
        COUNT(t.id) FILTER (WHERE t.status = 'queued') AS queued_count,
        COUNT(t.id) FILTER (WHERE t.status = 'claimed') AS claimed_count,
        COUNT(t.id) FILTER (WHERE t.status = 'in_progress') AS in_progress_count,
        COUNT(t.id) FILTER (WHERE t.status = 'review') AS review_count,
        COUNT(t.id) FILTER (WHERE t.status = 'done') AS done_count,
        COUNT(t.id) FILTER (WHERE t.status = 'archived') AS archived_count
      FROM workspaces w
      LEFT JOIN tasks t ON t.workspace_id = w.id
      WHERE w.slug = $1
      GROUP BY w.id
    `, [slug]);

    if (result.rows.length === 0) {
      const response: ApiResponse = { ok: false, error: 'Workspace not found' };
      res.status(404).json(response);
      return;
    }

    const row = result.rows[0];
    const workspace: WorkspaceWithCounts = {
      id: row.id,
      slug: row.slug,
      name: row.name,
      color: row.color,
      icon: row.icon,
      created_at: row.created_at,
      task_counts: {
        queued: parseInt(row.queued_count, 10) || 0,
        claimed: parseInt(row.claimed_count, 10) || 0,
        in_progress: parseInt(row.in_progress_count, 10) || 0,
        review: parseInt(row.review_count, 10) || 0,
        done: parseInt(row.done_count, 10) || 0,
        archived: parseInt(row.archived_count, 10) || 0,
      },
    };

    const response: ApiResponse<WorkspaceWithCounts> = { ok: true, data: workspace };
    res.json(response);
  } catch (err) {
    console.error('Error fetching workspace:', err);
    const response: ApiResponse = { ok: false, error: 'Internal server error' };
    res.status(500).json(response);
  }
});

// GET /api/v2/workspaces/:slug/tasks
router.get('/:slug/tasks', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const status = req.query.status as string | undefined;

    // Verify workspace exists
    const wsResult = await query<{ id: string }>('SELECT id FROM workspaces WHERE slug = $1', [slug]);
    if (wsResult.rows.length === 0) {
      const response: ApiResponse = { ok: false, error: 'Workspace not found' };
      res.status(404).json(response);
      return;
    }

    const workspaceId = wsResult.rows[0].id;

    let sql = `SELECT * FROM tasks WHERE workspace_id = $1`;
    const params: unknown[] = [workspaceId];

    if (status) {
      if (!STATUS_LIST.includes(status as V2Status)) {
        const response: ApiResponse = { ok: false, error: `Invalid status: ${status}` };
        res.status(400).json(response);
        return;
      }
      sql += ` AND status = $2`;
      params.push(status);
    }

    sql += ` ORDER BY priority DESC, created_at ASC`;

    const result = await query<V2Task>(sql, params);

    const response: ApiResponse<V2Task[]> = { ok: true, data: result.rows };
    res.json(response);
  } catch (err) {
    console.error('Error fetching workspace tasks:', err);
    const response: ApiResponse = { ok: false, error: 'Internal server error' };
    res.status(500).json(response);
  }
});

export default router;
