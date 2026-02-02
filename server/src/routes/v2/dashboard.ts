import { Router } from 'express';
import { query } from '../../db/index.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    // Per-workspace task counts by status
    const countsResult = await query<{
      workspace_id: string;
      slug: string;
      name: string;
      color: string;
      status: string;
      count: string;
    }>(`
      SELECT w.id AS workspace_id, w.slug, w.name, w.color, t.status, COUNT(*)::text AS count
      FROM workspaces w
      LEFT JOIN tasks t ON t.workspace_id = w.id AND t.status != 'archived'
      GROUP BY w.id, w.slug, w.name, w.color, t.status
      ORDER BY w.name, t.status
    `);

    // Review items
    const reviewResult = await query<{
      id: string;
      task_number: number;
      subject: string;
      assigned_to: string;
      review_notes: string | null;
      updated_at: string;
      workspace_id: string;
      workspace_slug: string;
      workspace_name: string;
      workspace_color: string;
    }>(`
      SELECT t.id, t.task_number, t.subject, t.assigned_to, t.review_notes, t.updated_at,
             w.id AS workspace_id, w.slug AS workspace_slug, w.name AS workspace_name, w.color AS workspace_color
      FROM tasks t
      JOIN workspaces w ON w.id = t.workspace_id
      WHERE t.status = 'review'
      ORDER BY t.updated_at DESC
    `);

    // Active work (claimed + in_progress)
    const activeResult = await query<{
      id: string;
      task_number: number;
      subject: string;
      status: string;
      assigned_to: string;
      updated_at: string;
      workspace_id: string;
      workspace_slug: string;
      workspace_name: string;
      workspace_color: string;
    }>(`
      SELECT t.id, t.task_number, t.subject, t.status, t.assigned_to, t.updated_at,
             w.id AS workspace_id, w.slug AS workspace_slug, w.name AS workspace_name, w.color AS workspace_color
      FROM tasks t
      JOIN workspaces w ON w.id = t.workspace_id
      WHERE t.status IN ('claimed', 'in_progress')
      ORDER BY t.updated_at DESC
    `);

    // Recent activity (last 10)
    const activityResult = await query<{
      id: string;
      task_id: string;
      actor: string;
      action: string;
      details: Record<string, unknown>;
      created_at: string;
      task_subject: string;
      task_number: number;
      workspace_slug: string;
      workspace_name: string;
      workspace_color: string;
    }>(`
      SELECT a.id, a.task_id, a.actor, a.action, a.details, a.created_at,
             t.subject AS task_subject, t.task_number,
             w.slug AS workspace_slug, w.name AS workspace_name, w.color AS workspace_color
      FROM task_activity a
      JOIN tasks t ON t.id = a.task_id
      JOIN workspaces w ON w.id = t.workspace_id
      ORDER BY a.created_at DESC
      LIMIT 10
    `);

    // Build per-workspace stats
    interface WorkspaceStats {
      workspace_id: string;
      slug: string;
      name: string;
      color: string;
      counts: Record<string, number>;
    }
    const workspaceMap = new Map<string, WorkspaceStats>();
    for (const row of countsResult.rows) {
      if (!workspaceMap.has(row.workspace_id)) {
        workspaceMap.set(row.workspace_id, {
          workspace_id: row.workspace_id,
          slug: row.slug,
          name: row.name,
          color: row.color,
          counts: {},
        });
      }
      if (row.status) {
        workspaceMap.get(row.workspace_id)!.counts[row.status] = parseInt(row.count, 10);
      }
    }

    // Global totals
    let totalReview = 0;
    let totalInProgress = 0;
    let totalQueued = 0;
    for (const ws of workspaceMap.values()) {
      totalReview += ws.counts.review || 0;
      totalInProgress += (ws.counts.in_progress || 0) + (ws.counts.claimed || 0);
      totalQueued += ws.counts.queued || 0;
    }

    res.json({
      ok: true,
      data: {
        workspaces: Array.from(workspaceMap.values()),
        global: {
          review: totalReview,
          in_progress: totalInProgress,
          queued: totalQueued,
        },
        review_items: reviewResult.rows,
        active_items: activeResult.rows,
        recent_activity: activityResult.rows,
      },
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ ok: false, error: 'Failed to load dashboard data' });
  }
});

export default router;
