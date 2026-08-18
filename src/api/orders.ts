import { Hono } from 'hono';
import { authMiddleware, requireRole } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import { generateId } from '../utils/auth';
import type { Order } from '../types';

const orders = new Hono();

// GET all orders with filters
orders.get('/', authMiddleware, async (ctx) => {
  try {
    const db = ctx.env?.DB;
    if (!db) return ctx.json({ error: 'Database error' }, 500);

    const page = parseInt(ctx.req.query('page') || '1');
    const limit = parseInt(ctx.req.query('limit') || '20');
    const offset = (page - 1) * limit;
    const institutionId = ctx.req.query('institution_id');
    const status = ctx.req.query('status');

    let query = 'SELECT * FROM orders WHERE 1=1';
    const binds: any[] = [];

    if (institutionId) {
      query += ' AND institution_id = ?';
      binds.push(institutionId);
    }
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
    console.error('Get orders error:', error);
    return ctx.json({ error: 'Siparişler alınamadı' }, 500);
  }
});

// GET order by ID
orders.get('/:id', authMiddleware, async (ctx) => {
  try {
    const db = ctx.env?.DB;
    const id = ctx.req.param('id');
    if (!db) return ctx.json({ error: 'Database error' }, 500);

    const order = await db.prepare(
      'SELECT * FROM orders WHERE id = ?'
    ).bind(id).first();

    if (!order) {
      return ctx.json({ error: 'Sipariş bulunamadı' }, 404);
    }

    return ctx.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    return ctx.json({ error: 'Sipariş alınamadı' }, 500);
  }
});

// POST create order
orders.post('/', authMiddleware, async (ctx) => {
  try {
    const db = ctx.env?.DB;
    if (!db) return ctx.json({ error: 'Database error' }, 500);

    const data = (await ctx.req.json()) as any;
    const id = generateId('ord');

    const order: Order = {
      id,
      institution_id: data.institution_id,
      exam_id: data.exam_id,
      season_id: data.season_id,
      grade_level_id: data.grade_level_id,
      quantity: data.quantity,
      unit_price: data.unit_price,
      total_price: data.quantity * data.unit_price,
      staff_id: data.staff_id,
      status: data.status || 'TASLAK',
      notes: data.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.prepare(
      `INSERT INTO orders (id, institution_id, exam_id, season_id, grade_level_id, quantity, unit_price, total_price, staff_id, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        order.id,
        order.institution_id,
        order.exam_id,
        order.season_id,
        order.grade_level_id,
        order.quantity,
        order.unit_price,
        order.total_price,
        order.staff_id,
        order.status,
        order.notes,
        order.created_at,
        order.updated_at
      )
      .run();

    await logAudit(ctx, 'CREATE', 'ORDER', id, undefined, JSON.stringify(order));

    return ctx.json(order, 201);
  } catch (error) {
    console.error('Create order error:', error);
    return ctx.json({ error: 'Sipariş oluşturulamadı' }, 500);
  }
});

// PUT update order status
orders.put('/:id/status', authMiddleware, async (ctx) => {
  try {
    const db = ctx.env?.DB;
    const id = ctx.req.param('id');
    if (!db) return ctx.json({ error: 'Database error' }, 500);

    const { status, notes } = (await ctx.req.json()) as any;

    const existing = await db.prepare(
      'SELECT * FROM orders WHERE id = ?'
    ).bind(id).first() as Order | undefined;

    if (!existing) {
      return ctx.json({ error: 'Sipariş bulunamadı' }, 404);
    }

    await db.prepare(
      'UPDATE orders SET status = ?, notes = ?, updated_at = ? WHERE id = ?'
    )
      .bind(status, notes, new Date().toISOString(), id)
      .run();

    await logAudit(ctx, 'STATUS_CHANGE', 'ORDER', id, existing.status, status);

    return ctx.json({ success: true });
  } catch (error) {
    console.error('Update order status error:', error);
    return ctx.json({ error: 'Sipariş durumu güncellenemedi' }, 500);
  }
});

export default orders;
