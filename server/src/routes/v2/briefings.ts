import { Router } from 'express';
import { query } from '../../db/index.js';
import type { Briefing, BriefingContent, BriefingWorkspace } from '../../types/v2.js';

const router = Router();

/**
 * POST /api/v2/briefings/generate
 * Generates a briefing from real activity + task data.
 */
router.post('/generate', async (_req, res) => {
  try {
    // Determine period: since last briefing or 24h ago
    const lastBriefing = await query<{ created_at: Date }>(
      `SELECT created_at FROM briefings ORDER BY created_at DESC LIMIT 1`
    );
    const now = new Date();
    const periodFrom = lastBriefing.rows.length > 0
      ? lastBriefing.rows[0].created_at
      : new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const periodTo = now;

    // Get all workspaces
    const workspacesResult = await query<{ id: string; slug: string; name: string; color: string }>(
      `SELECT id, slug, name, color FROM workspaces ORDER BY name`
    );

    const workspaces: BriefingWorkspace[] = [];

    for (const ws of workspacesResult.rows) {
      // Completed: tasks that moved to 'done' in the period
      const completed = await query<{ task_id: string; subject: string; summary: string }>(
        `SELECT DISTINCT t.id as task_id, t.subject,
                COALESCE(t.review_notes, t.description, '') as summary
         FROM tasks t
         JOIN task_activity ta ON ta.task_id = t.id
         WHERE t.workspace_id = $1
           AND ta.action = 'status_changed'
           AND (ta.details->>'to') = 'done'
           AND ta.created_at >= $2
           AND ta.created_at <= $3`,
        [ws.id, periodFrom.toISOString(), periodTo.toISOString()]
      );

      // Needs review: tasks currently in 'review' status
      const needsReview = await query<{ task_id: string; subject: string; review_notes: string }>(
        `SELECT t.id as task_id, t.subject,
                COALESCE(t.review_notes, '') as review_notes
         FROM tasks t
         WHERE t.workspace_id = $1
           AND t.status = 'review'`,
        [ws.id]
      );

      // In progress: tasks currently in 'claimed' or 'in_progress'
      const inProgress = await query<{ task_id: string; subject: string; last_activity: string }>(
        `SELECT t.id as task_id, t.subject,
                COALESCE(
                  (SELECT ta.created_at::text FROM task_activity ta WHERE ta.task_id = t.id ORDER BY ta.created_at DESC LIMIT 1),
                  t.updated_at::text
                ) as last_activity
         FROM tasks t
         WHERE t.workspace_id = $1
           AND t.status IN ('claimed', 'in_progress')`,
        [ws.id]
      );

      // Blockers: tasks in 'queued' with no activity for >24h
      const blockers = await query<{ task_id: string; subject: string; reason: string }>(
        `SELECT t.id as task_id, t.subject,
                'No activity for over 24 hours' as reason
         FROM tasks t
         WHERE t.workspace_id = $1
           AND t.status = 'queued'
           AND NOT EXISTS (
             SELECT 1 FROM task_activity ta
             WHERE ta.task_id = t.id
               AND ta.created_at > NOW() - INTERVAL '24 hours'
           )
           AND t.created_at < NOW() - INTERVAL '24 hours'`,
        [ws.id]
      );

      // Only include workspace if it has any data
      if (completed.rows.length || needsReview.rows.length || inProgress.rows.length || blockers.rows.length) {
        workspaces.push({
          slug: ws.slug,
          name: ws.name,
          color: ws.color,
          completed: completed.rows,
          needs_review: needsReview.rows,
          in_progress: inProgress.rows,
          blockers: blockers.rows,
        });
      }
    }

    const content: BriefingContent = {
      period: {
        from: periodFrom.toISOString(),
        to: periodTo.toISOString(),
      },
      workspaces,
    };

    const today = now.toISOString().split('T')[0];

    // Upsert briefing for today
    const result = await query<Briefing>(
      `INSERT INTO briefings (date, content)
       VALUES ($1, $2)
       ON CONFLICT (date) DO UPDATE SET content = $2, created_at = NOW()
       RETURNING *`,
      [today, JSON.stringify(content)]
    );

    res.json({ ok: true, briefing: result.rows[0] });
  } catch (err) {
    console.error('Briefing generation error:', err);
    res.status(500).json({ ok: false, error: 'Failed to generate briefing' });
  }
});

/**
 * GET /api/v2/briefings/latest
 */
router.get('/latest', async (_req, res) => {
  try {
    const result = await query<Briefing>(
      `SELECT * FROM briefings ORDER BY date DESC LIMIT 1`
    );
    if (result.rows.length === 0) {
      res.status(404).json({ ok: false, error: 'No briefings found' });
      return;
    }
    res.json({ ok: true, briefing: result.rows[0] });
  } catch (err) {
    console.error('Briefing fetch error:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch briefing' });
  }
});

/**
 * GET /api/v2/briefings/:date
 */
router.get('/:date', async (req, res) => {
  try {
    const { date } = req.params;
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ ok: false, error: 'Invalid date format. Use YYYY-MM-DD' });
      return;
    }
    const result = await query<Briefing>(
      `SELECT * FROM briefings WHERE date = $1`,
      [date]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ ok: false, error: 'No briefing found for this date' });
      return;
    }
    res.json({ ok: true, briefing: result.rows[0] });
  } catch (err) {
    console.error('Briefing fetch error:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch briefing' });
  }
});

export default router;
