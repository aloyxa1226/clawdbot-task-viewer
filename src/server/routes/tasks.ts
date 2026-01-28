import { Router } from 'express';
import { TaskService } from '../services/task.service.js';

export const tasksRouter = Router();

// List all tasks
tasksRouter.get('/', async (req, res, next) => {
  try {
    const status = req.query.status as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    
    const tasks = await TaskService.listTasks({ status, limit, offset });
    res.json({ success: true, data: tasks });
  } catch (err) {
    next(err);
  }
});

// Get task by ID
tasksRouter.get('/:taskId', async (req, res, next) => {
  try {
    const task = await TaskService.getTaskById(req.params.taskId);
    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
});
