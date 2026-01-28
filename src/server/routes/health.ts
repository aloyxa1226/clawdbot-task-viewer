import { Router } from 'express';
import { getPool } from '../db/connection.js';
import { getRedisClient } from '../services/redis.js';

export const healthRouter = Router();

healthRouter.get('/', async (req, res) => {
  const checks = {
    server: 'ok',
    database: 'unknown',
    redis: 'unknown',
  };

  try {
    const pool = getPool();
    await pool.query('SELECT 1');
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }

  try {
    const redis = getRedisClient();
    await redis.ping();
    checks.redis = 'ok';
  } catch {
    checks.redis = 'error';
  }

  const allOk = Object.values(checks).every((v) => v === 'ok');

  res.status(allOk ? 200 : 503).json({
    success: allOk,
    checks,
    timestamp: new Date().toISOString(),
  });
});
