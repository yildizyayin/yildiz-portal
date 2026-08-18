import { Hono } from 'hono';
import { authMiddleware, requireRole } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import { generateId } from '../utils/auth';
import type { Exam } from '../types';

const exams = new Hono();

// GET all exams with filters
exams.get('/', authMiddleware, async (ctx) => {
  try {
    const db = ctx.env?.DB;
    if (!db) return ctx.json({ error: 'Database error' }, 500);

    const page = parseInt(ctx.req.query('page') || '1');
    const limit = parseInt(ctx.req.query('limit') || '20');
    const offset = (page - 1) * limit;
    const publisherId = ctx.req.query('publisher_id');
    const seasonId = ctx.req.query('season_id');
    const gradeLevelId = ctx.req.query('grade_level_id');

    let query = 'SELECT * FROM exams WHERE deleted_at IS NULL';
    const binds: any[] = [];

    if (publisherId) {
      query += ' AND publisher_id = ?';
      binds.push(publisherId);
    }
    if (seasonId) {
      query += ' AND season_id = ?';
      binds.push(seasonId);
    }
    if (gradeLevelId) {
      query += ' AND grade_level_id = ?';
      binds.push(gradeLevelId);
    }

    query += ' ORDER BY name LIMIT ? OFFSET ?';
    binds.push(limit, offset);

    const results = await db.prepare(query).bind(...binds).all();

    return ctx.json({
      data: results.results,
      pagination: { page, limit },
    });
  } catch (error) {
    console.error('Get exams error:', error);
    return ctx.json({ error: 'Denemeler alınamadı' }, 500);
  }
});

// GET exam by ID
exams.get('/:id', authMiddleware, async (ctx) => {
  try {
    const db = ctx.env?.DB;
    const id = ctx.req.param('id');
    if (!db) return ctx.json({ error: 'Database error' }, 500);

    const exam = await db.prepare(
      'SELECT * FROM exams WHERE id = ? AND deleted_at IS NULL'
    ).bind(id).first();

    if (!exam) {
      return ctx.json({ error: 'Deneme bulunamadı' }, 404);
    }

    return ctx.json(exam);
  } catch (error) {
    console.error('Get exam error:', error);
    return ctx.json({ error: 'Deneme alınamadı' }, 500);
  }
});

// POST create exam
exams.post('/', authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), async (ctx) => {
  try {
    const db = ctx.env?.DB;
    if (!db) return ctx.json({ error: 'Database error' }, 500);

    const data = (await ctx.req.json()) as any;
    const id = generateId('exam');

    const exam: Exam = {
      id,
      publisher_id: data.publisher_id,
      season_id: data.season_id,
      grade_level_id: data.grade_level_id,
      name: data.name,
      code: data.code,
      list_price: data.list_price,
      purchase_price: data.purchase_price,
      default_sale_price: data.default_sale_price,
      minimum_order: data.minimum_order || 1,
      last_order_date: data.last_order_date,
      estimated_ship_date: data.estimated_ship_date,
      application_start_date: data.application_start_date,
      application_end_date: data.application_end_date,
      description: data.description,
      status: data.status || 'ACTIVE',
      is_active: data.is_active !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.prepare(
      `INSERT INTO exams (id, publisher_id, season_id, grade_level_id, name, code, list_price, purchase_price, default_sale_price, minimum_order, last_order_date, estimated_ship_date, application_start_date, application_end_date, description, status, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        exam.id,
        exam.publisher_id,
        exam.season_id,
        exam.grade_level_id,
        exam.name,
        exam.code,
        exam.list_price,
        exam.purchase_price,
        exam.default_sale_price,
        exam.minimum_order,
        exam.last_order_date,
        exam.estimated_ship_date,
        exam.application_start_date,
        exam.application_end_date,
        exam.description,
        exam.status,
        exam.is_active,
        exam.created_at,
        exam.updated_at
      )
      .run();

    await logAudit(ctx, 'CREATE', 'EXAM', id, undefined, JSON.stringify(exam));

    return ctx.json(exam, 201);
  } catch (error) {
    console.error('Create exam error:', error);
    return ctx.json({ error: 'Deneme oluşturulamadı' }, 500);
  }
});

// PUT update exam
exams.put('/:id', authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), async (ctx) => {
  try {
    const db = ctx.env?.DB;
    const id = ctx.req.param('id');
    if (!db) return ctx.json({ error: 'Database error' }, 500);

    const existing = await db.prepare(
      'SELECT * FROM exams WHERE id = ?'
    ).bind(id).first() as Exam | undefined;

    if (!existing) {
      return ctx.json({ error: 'Deneme bulunamadı' }, 404);
    }

    const data = (await ctx.req.json()) as any;
    const updated: Exam = {
      ...existing,
      ...data,
      id,
      created_at: existing.created_at,
      updated_at: new Date().toISOString(),
    };

    await db.prepare(
      `UPDATE exams SET publisher_id=?, season_id=?, grade_level_id=?, name=?, code=?, list_price=?, purchase_price=?, default_sale_price=?, minimum_order=?, last_order_date=?, estimated_ship_date=?, application_start_date=?, application_end_date=?, description=?, status=?, is_active=?, updated_at=? WHERE id=?`
    )
      .bind(
        updated.publisher_id,
        updated.season_id,
        updated.grade_level_id,
        updated.name,
        updated.code,
        updated.list_price,
        updated.purchase_price,
        updated.default_sale_price,
        updated.minimum_order,
        updated.last_order_date,
        updated.estimated_ship_date,
        updated.application_start_date,
        updated.application_end_date,
        updated.description,
        updated.status,
        updated.is_active,
        updated.updated_at,
        id
      )
      .run();

    await logAudit(ctx, 'UPDATE', 'EXAM', id, JSON.stringify(existing), JSON.stringify(updated));

    return ctx.json(updated);
  } catch (error) {
    console.error('Update exam error:', error);
    return ctx.json({ error: 'Deneme güncellenemedi' }, 500);
  }
});

export default exams;
