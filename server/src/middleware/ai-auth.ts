import { Request, Response, NextFunction } from 'express';

export function aiAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string | undefined;
  const expectedKey = process.env.AI_API_KEY;

  if (!apiKey || !expectedKey || apiKey !== expectedKey) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return;
  }

  next();
}
