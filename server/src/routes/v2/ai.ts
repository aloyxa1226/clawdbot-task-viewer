import { Router } from 'express';
import { aiAuth } from '../../middleware/ai-auth.js';

const router = Router();

router.use(aiAuth);

router.get('/health', (_req, res) => {
  res.json({ ok: true });
});

export default router;
