import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';

const seasons = new Hono();

// GET all seasons
seasons.get('/', authMiddleware, async (ctx) => {
  try {
    const db = ctx.env?.DB;
    if (!db) return ctx.json({ error: 'Database error' }, 500);

    const results = await db.prepare(
      'SELECT * FROM seasons ORDER BY year_start DESC'
    ).all();

    return ctx.json(results.results);
  } catch (error) {
    console.error('Get seasons error:', error);
    return ctx.json({ error: 'Sezonlar alınamadı' }, 500);
  }
});

// GET active season
seasons.get('/active/current', authMiddleware, async (ctx) => {
  try {
    const db = ctx.env?.DB;
    if (!db) return ctx.json({ error: 'Database error' }, 500);

    const season = await db.prepare(
      'SELECT * FROM seasons WHERE is_active = 1 LIMIT 1'
    ).first();

    if (!season) {
      return ctx.json({ error: 'Aktif sezon bulunamadı' }, 404);
    }

    return ctx.json(season);
  } catch (error) {
    console.error('Get active season error:', error);
    return ctx.json({ error: 'Aktif sezon alınamadı' }, 500);
  }
});

export default seasons;
