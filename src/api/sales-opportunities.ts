import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { generateId } from '../utils/auth';
import type { SalesOpportunity } from '../types';

const salesOpportunities = new Hono();

// GET all sales opportunities
salesOpportunities.get('/', authMiddleware, async (ctx) => {
  try {
    const db = ctx.env?.DB;
    if (!db) return ctx.json({ error: 'Database error' }, 500);

    const page = parseInt(ctx.req.query('page') || '1');
    const limit = parseInt(ctx.req.query('limit') || '20');
    const offset = (page - 1) * limit;
    const status = ctx.req.query('status');

    let query = 'SELECT * FROM sales_opportunities WHERE 1=1';
    const binds: any[] = [];

    if (status) {
      query += ' AND status = ?';
      binds.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    binds.push(limit, offset);

    const results = await db.prepare(query).bind(...binds).all();

    return ctx.json({
      data: results.results,
      pagination: { page, limit },
    });
  } catch (error) {
    console.error('Get sales opportunities error:', error);
    return ctx.json({ error: 'Satış fırsatları alınamadı' }, 500);
  }
});

// POST create sales opportunity
salesOpportunities.post('/', authMiddleware, async (ctx) => {
  try {
    const db = ctx.env?.DB;
    if (!db) return ctx.json({ error: 'Database error' }, 500);

    const data = (await ctx.req.json()) as any;
    const id = generateId('sales');

    const opportunity: SalesOpportunity = {
      id,
      institution_id: data.institution_id,
      exam_id: data.exam_id,
      staff_id: data.staff_id,
      priority: data.priority || 'MEDIUM',
      status: data.status || 'ARANACAK',
      notes: data.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.prepare(
      `INSERT INTO sales_opportunities (id, institution_id, exam_id, staff_id, priority, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        opportunity.id,
        opportunity.institution_id,
        opportunity.exam_id,
        opportunity.staff_id,
        opportunity.priority,
        opportunity.status,
        opportunity.notes,
        opportunity.created_at,
        opportunity.updated_at
      )
      .run();

    return ctx.json(opportunity, 201);
  } catch (error) {
    console.error('Create sales opportunity error:', error);
    return ctx.json({ error: 'Satış fırsatı oluşturulamadı' }, 500);
  }
});

// PUT update sales opportunity status
salesOpportunities.put('/:id/status', authMiddleware, async (ctx) => {
  try {
    const db = ctx.env?.DB;
    const id = ctx.req.param('id');
    if (!db) return ctx.json({ error: 'Database error' }, 500);

    const { status, notes } = (await ctx.req.json()) as any;

    await db.prepare(
      'UPDATE sales_opportunities SET status = ?, notes = ?, updated_at = ? WHERE id = ?'
    )
      .bind(status, notes, new Date().toISOString(), id)
      .run();

    return ctx.json({ success: true });
  } catch (error) {
    console.error('Update sales opportunity error:', error);
    return ctx.json({ error: 'Satış fırsatı güncellenemedi' }, 500);
  }
});

export default salesOpportunities;
