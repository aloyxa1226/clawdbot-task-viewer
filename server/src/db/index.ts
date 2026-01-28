import pg from "pg";

const { Pool } = pg;

export interface DatabaseConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
}

let pool: pg.Pool | null = null;

export function createPool(config?: DatabaseConfig): pg.Pool {
  const connectionString =
    config?.connectionString || process.env.DATABASE_URL;

  if (connectionString) {
    pool = new Pool({ connectionString });
  } else {
    pool = new Pool({
      host: config?.host || process.env.DB_HOST || "localhost",
      port: config?.port || parseInt(process.env.DB_PORT || "5432", 10),
      database: config?.database || process.env.DB_NAME || "taskviewer",
      user: config?.user || process.env.DB_USER || "postgres",
      password: config?.password || process.env.DB_PASSWORD || "postgres",
    });
  }

  return pool;
}

export function getPool(): pg.Pool {
  if (!pool) {
    pool = createPool();
  }
  return pool;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const client = getPool();
  return client.query<T>(text, params);
}

export async function getClient(): Promise<pg.PoolClient> {
  const client = getPool();
  return client.connect();
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    const result = await query("SELECT NOW()");
    return result.rows.length > 0;
  } catch (error) {
    console.error("Database connection test failed:", error);
    return false;
  }
}
