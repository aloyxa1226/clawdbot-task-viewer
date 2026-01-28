import rateLimit from 'express-rate-limit';
import { config } from '../config.js';

export const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use session key if available, otherwise use IP
    const sessionKey = req.params.sessionKey;
    if (typeof sessionKey === 'string') {
      return sessionKey;
    }
    return req.ip || 'unknown';
  },
});
