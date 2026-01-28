import { Router } from 'express';
import { z } from 'zod';
import { SessionService } from '../services/session.service.js';
import { TaskService } from '../services/task.service.js';
import { FileService } from '../services/file.service.js';
import { validateBody } from '../middleware/validate.js';
import { rateLimiter } from '../middleware/rateLimit.js';

export const sessionsRouter = Router();

const createSessionSchema = z.object({
  sessionKey: z.string().min(1).max(255),
  name: z.string().max(255).optional(),
  projectPath: z.string().max(1000).optional(),
});

const createTaskSchema = z.object({
  taskNumber: z.number().int().positive(),
  subject: z.string().min(1).max(500),
  description: z.string().max(10000).optional(),
  activeForm: z.string().max(1000).optional(),
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
  priority: z.number().int().min(0).max(100).optional(),
  blocks: z.array(z.number().int().positive()).optional(),
  blockedBy: z.array(z.number().int().positive()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// List all sessions
sessionsRouter.get('/', async (req, res, next) => {
  try {
    const sessions = await SessionService.listSessions();
    res.json({ success: true, data: sessions });
  } catch (err) {
    next(err);
  }
});

// Create or update session
sessionsRouter.post(
  '/',
  rateLimiter,
  validateBody(createSessionSchema),
  async (req, res, next) => {
    try {
      const session = await SessionService.upsertSession(req.body);
      res.json({ success: true, data: session });
    } catch (err) {
      next(err);
    }
  }
);

// Get session by key
sessionsRouter.get('/:sessionKey', async (req, res, next) => {
  try {
    const sessionKey = String(req.params.sessionKey);
    const session = await SessionService.getSessionWithTasks(sessionKey);
    res.json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
});

// Delete session
sessionsRouter.delete('/:sessionKey', rateLimiter, async (req, res, next) => {
  try {
    const sessionKey = String(req.params.sessionKey);
    await SessionService.deleteSession(sessionKey);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Create or update task
sessionsRouter.post(
  '/:sessionKey/tasks',
  rateLimiter,
  validateBody(createTaskSchema),
  async (req, res, next) => {
    try {
      const sessionKey = String(req.params.sessionKey);
      const task = await TaskService.upsertTask(sessionKey, req.body);
      res.json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  }
);

// Get tasks for session
sessionsRouter.get('/:sessionKey/tasks', async (req, res, next) => {
  try {
    const sessionKey = String(req.params.sessionKey);
    const tasks = await TaskService.getTasksBySession(sessionKey);
    res.json({ success: true, data: tasks });
  } catch (err) {
    next(err);
  }
});

// Delete task (pending only)
sessionsRouter.delete('/:sessionKey/tasks/:taskNumber', rateLimiter, async (req, res, next) => {
  try {
    const sessionKey = String(req.params.sessionKey);
    const taskNumber = parseInt(String(req.params.taskNumber), 10);
    await TaskService.deleteTask(sessionKey, taskNumber);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Upload file to task
sessionsRouter.post(
  '/:sessionKey/tasks/:taskNumber/files',
  rateLimiter,
  FileService.uploadMiddleware(),
  async (req, res, next) => {
    try {
      const sessionKey = String(req.params.sessionKey);
      const taskNumber = parseInt(String(req.params.taskNumber), 10);
      const file = await FileService.saveFile(sessionKey, taskNumber, req.file!);
      res.json({ success: true, data: file });
    } catch (err) {
      next(err);
    }
  }
);
