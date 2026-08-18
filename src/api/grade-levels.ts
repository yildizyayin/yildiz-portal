import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';

const gradeLevels = new Hono();

// GET all grade levels
gradeLevels.get('/', authMiddleware, async (ctx) => {
  try {
    const db = ctx.env?.DB;
    if (!db) return ctx.json({ error: 'Database error' }, 500);

    const results = await db.prepare(
      'SELECT * FROM grade_levels WHERE is_active = 1 ORDER BY sort_order'
    ).all();

    return ctx.json(results.results);
  } catch (error) {
    console.error('Get grade levels error:', error);
    return ctx.json({ error: 'Sınıf seviyeleri alınamadı' }, 500);
  }
});

export default gradeLevels;
