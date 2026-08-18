import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { generateId } from '../utils/auth';
import type { Delivery } from '../types';

const deliveries = new Hono();

// GET all deliveries
deliveries.get('/', authMiddleware, async (ctx) => {
  try {
    const db = ctx.env?.DB;
    if (!db) return ctx.json({ error: 'Database error' }, 500);

    const page = parseInt(ctx.req.query('page') || '1');
    const limit = parseInt(ctx.req.query('limit') || '20');
    const offset = (page - 1) * limit;
    const status = ctx.req.query('status');

    let query = 'SELECT * FROM deliveries WHERE 1=1';
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
    console.error('Get deliveries error:', error);
    return ctx.json({ error: 'Teslimatlar alınamadı' }, 500);
  }
});

// POST create delivery
deliveries.post('/', authMiddleware, async (ctx) => {
  try {
    const db = ctx.env?.DB;
    if (!db) return ctx.json({ error: 'Database error' }, 500);

    const data = (await ctx.req.json()) as any;
    const id = generateId('dlv');

    const delivery: Delivery = {
      id,
      order_id: data.order_id,
      quantity: data.quantity,
      delivery_method: data.delivery_method,
      carrier: data.carrier,
      tracking_number: data.tracking_number,
      delivery_date: data.delivery_date,
      delivered_by: data.delivered_by,
      status: data.status || 'HAZIRLANIYOR',
      notes: data.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.prepare(
      `INSERT INTO deliveries (id, order_id, quantity, delivery_method, carrier, tracking_number, delivery_date, delivered_by, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        delivery.id,
        delivery.order_id,
        delivery.quantity,
        delivery.delivery_method,
        delivery.carrier,
        delivery.tracking_number,
        delivery.delivery_date,
        delivery.delivered_by,
        delivery.status,
        delivery.notes,
        delivery.created_at,
        delivery.updated_at
      )
      .run();

    return ctx.json(delivery, 201);
  } catch (error) {
    console.error('Create delivery error:', error);
    return ctx.json({ error: 'Teslimat oluşturulamadı' }, 500);
  }
});

// PUT update delivery status
deliveries.put('/:id/status', authMiddleware, async (ctx) => {
  try {
    const db = ctx.env?.DB;
    const id = ctx.req.param('id');
    if (!db) return ctx.json({ error: 'Database error' }, 500);

    const { status } = (await ctx.req.json()) as any;

    await db.prepare(
      'UPDATE deliveries SET status = ?, updated_at = ? WHERE id = ?'
    )
      .bind(status, new Date().toISOString(), id)
      .run();

    return ctx.json({ success: true });
  } catch (error) {
    console.error('Update delivery status error:', error);
    return ctx.json({ error: 'Teslimat durumu güncellenemedi' }, 500);
  }
});

export default deliveries;
