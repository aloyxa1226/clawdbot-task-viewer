import { Router, Request, Response } from 'express';
import { subscribeToPubSub } from '../services/pubsub.js';

export const eventsRouter = Router();

// SSE endpoint for real-time updates
eventsRouter.get('/', (req: Request, res: Response) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Send initial connection event
  res.write(`event: connected\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);

  // Heartbeat to keep connection alive
  const heartbeatInterval = setInterval(() => {
    res.write(`event: heartbeat\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
  }, 30000);

  // Subscribe to Redis pub/sub
  const unsubscribe = subscribeToPubSub((event) => {
    res.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
  });

  // Cleanup on close
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    unsubscribe();
  });
});
