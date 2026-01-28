import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return pool;
}

export async function initDatabase(): Promise<void> {
  pool = new Pool({
    connectionString: config.database.url,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // Test connection
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }

  // Run migrations
  await runMigrations();
}

async function runMigrations(): Promise<void> {
  const client = await pool!.connect();
  try {
    // Create migrations table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Check if initial migration has been applied
    const result = await client.query(
      'SELECT 1 FROM migrations WHERE name = $1',
      ['001_initial']
    );

    if (result.rows.length === 0) {
      // Apply initial migration
      await client.query(`
        -- Sessions table
        CREATE TABLE IF NOT EXISTS sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_key VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255),
          project_path TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Tasks table
        CREATE TABLE IF NOT EXISTS tasks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
          task_number INTEGER NOT NULL,
          subject VARCHAR(500) NOT NULL,
          description TEXT,
          active_form TEXT,
          status VARCHAR(50) DEFAULT 'pending',
          priority INTEGER DEFAULT 0,
          blocks UUID[],
          blocked_by UUID[],
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          completed_at TIMESTAMP WITH TIME ZONE,
          UNIQUE(session_id, task_number)
        );

        CREATE INDEX IF NOT EXISTS idx_tasks_session ON tasks(session_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
        CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at);

        -- Task files table
        CREATE TABLE IF NOT EXISTS task_files (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
          filename VARCHAR(255) NOT NULL,
          content_type VARCHAR(100),
          size_bytes BIGINT,
          file_path TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_task_files_task ON task_files(task_id);
      `);

      await client.query(
        'INSERT INTO migrations (name) VALUES ($1)',
        ['001_initial']
      );

      console.log('✅ Applied migration: 001_initial');
    }
  } finally {
    client.release();
  }
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
