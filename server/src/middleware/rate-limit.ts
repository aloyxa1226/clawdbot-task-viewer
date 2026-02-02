import { Request, Response, NextFunction } from 'express';

const windowMs = 60_000; // 1 minute
const maxRequests = 60;

interface WindowEntry {
  timestamps: number[];
}

const store = new Map<string, WindowEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter(t => now - t < windowMs);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}, 5 * 60_000).unref();

export function rateLimit(req: Request, res: Response, next: NextFunction): void {
  const key = (req.headers['x-api-key'] as string) || req.ip || 'unknown';
  const now = Date.now();

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Sliding window: remove old timestamps
  entry.timestamps = entry.timestamps.filter(t => now - t < windowMs);

  if (entry.timestamps.length >= maxRequests) {
    res.status(429).json({ ok: false, error: 'Rate limit exceeded. 60 requests per minute.' });
    return;
  }

  entry.timestamps.push(now);
  next();
}
