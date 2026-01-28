import cron from 'node-cron';
import fs from 'fs/promises';
import path from 'path';
import { getPool } from '../db/connection.js';
import { config } from '../config.js';

export function startCleanupJob(): void {
  cron.schedule(config.cleanup.cronSchedule, async () => {
    console.log('🧹 Starting cleanup job...');
    await runCleanup();
  });
}

export async function runCleanup(): Promise<{ 
  tasksDeleted: number; 
  sessionsDeleted: number; 
  filesDeleted: number 
}> {
  const pool = getPool();
  const retentionDays = config.cleanup.retentionDays;

  // Get file paths before deleting tasks
  const filesResult = await pool.query(`
    SELECT tf.file_path 
    FROM task_files tf
    JOIN tasks t ON t.id = tf.task_id
    WHERE t.created_at < NOW() - INTERVAL '${retentionDays} days'
  `);

  // Delete old tasks (cascade deletes task_files records)
  const tasksResult = await pool.query(`
    DELETE FROM tasks 
    WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
    RETURNING id
  `);

  // Delete orphaned sessions
  const sessionsResult = await pool.query(`
    DELETE FROM sessions 
    WHERE id NOT IN (SELECT DISTINCT session_id FROM tasks WHERE session_id IS NOT NULL)
    RETURNING id
  `);

  // Delete physical files
  let filesDeleted = 0;
  for (const row of filesResult.rows) {
    try {
      await fs.unlink(row.file_path);
      filesDeleted++;

      // Try to remove empty parent directories
      const dir = path.dirname(row.file_path);
      await fs.rmdir(dir).catch(() => {});
      await fs.rmdir(path.dirname(dir)).catch(() => {});
    } catch {
      // Ignore errors if file doesn't exist
    }
  }

  const stats = {
    tasksDeleted: tasksResult.rowCount || 0,
    sessionsDeleted: sessionsResult.rowCount || 0,
    filesDeleted,
  };

  console.log(`🧹 Cleanup complete:`, stats);

  return stats;
}
