import { Router } from 'express';
import workspacesRouter from './workspaces.js';
import tasksRouter from './tasks.js';
import activityRouter from './activity.js';
import aiRouter from './ai.js';
import dashboardRouter from './dashboard.js';
import briefingsRouter from './briefings.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true, version: 'v2' });
});

router.use('/workspaces', workspacesRouter);
router.use('/tasks', tasksRouter);
router.use('/activity', activityRouter);
router.use('/ai', aiRouter);
router.use('/dashboard', dashboardRouter);
router.use('/briefings', briefingsRouter);

export default router;
