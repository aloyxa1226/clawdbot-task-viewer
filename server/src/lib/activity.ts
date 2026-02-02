import { query } from '../db/index.js';
import { publish } from '../redis/index.js';
import type { Actor, ActivityAction, TaskActivity } from '../types/v2.js';

/**
 * Single entry point for all activity logging.
 * Inserts into task_activity and publishes an SSE event via Redis.
 */
export async function logActivity(
  taskId: string,
  actor: Actor,
  action: ActivityAction,
  details: Record<string, unknown> = {}
): Promise<TaskActivity> {
  const result = await query<TaskActivity>(
    `INSERT INTO task_activity (task_id, actor, action, details)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [taskId, actor, action, JSON.stringify(details)]
  );

  const entry = result.rows[0];

  // Publish SSE event (best-effort, don't fail if Redis is down)
  try {
    await publish(
      'task_activity',
      JSON.stringify({ type: 'activity', taskId, entry })
    );
  } catch {
    // Redis publish failure is non-fatal
  }

  return entry;
}
