import { Router } from 'express';
import { SearchService } from '../services/search.service.js';

export const searchRouter = Router();

// Search tasks and sessions
searchRouter.get('/', async (req, res, next) => {
  try {
    const q = req.query.q as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    
    if (!q || q.length === 0) {
      res.status(400).json({ success: false, error: 'Query parameter q is required' });
      return;
    }
    
    const results = await SearchService.search(q, limit);
    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
});
