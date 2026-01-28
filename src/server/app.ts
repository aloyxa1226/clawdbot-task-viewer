import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { errorHandler } from './middleware/error.js';
import { healthRouter } from './routes/health.js';
import { sessionsRouter } from './routes/sessions.js';
import { tasksRouter } from './routes/tasks.js';
import { eventsRouter } from './routes/events.js';
import { searchRouter } from './routes/search.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Allow inline scripts for React
  }));
  app.use(cors({ origin: config.cors.origin }));
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // API routes
  app.use('/api/v1/health', healthRouter);
  app.use('/api/v1/sessions', sessionsRouter);
  app.use('/api/v1/tasks', tasksRouter);
  app.use('/api/v1/events', eventsRouter);
  app.use('/api/v1/search', searchRouter);

  // Serve static files in production
  const clientPath = path.join(__dirname, '../../client');
  app.use(express.static(clientPath));
  
  // SPA fallback
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientPath, 'index.html'));
  });

  // Error handling
  app.use(errorHandler);

  return app;
}
