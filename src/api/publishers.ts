import { Hono } from 'hono';
import { authMiddleware, requireRole } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import { generateId } from '../utils/auth';
import type { Publisher } from '../types';

const publishers = new Hono();

// GET all publishers
publishers.get('/', authMiddleware, async (ctx) => {
  try {
    const db = ctx.env?.DB;
    if (!db) return ctx.json({ error: 'Database error' }, 500);

    const page = parseInt(ctx.req.query('page') || '1');
    const limit = parseInt(ctx.req.query('limit') || '20');
    const offset = (page - 1) * limit;

    const results = await db.prepare(
      'SELECT * FROM publishers WHERE deleted_at IS NULL ORDER BY name LIMIT ? OFFSET ?'
    ).bind(limit, offset).all();

    const total = await db.prepare(
      'SELECT COUNT(*) as count FROM publishers WHERE deleted_at IS NULL'
    ).first() as any;

    return ctx.json({
      data: results.results,
      pagination: { page, limit, total: total.count },
    });
  } catch (error) {
    console.error('Get publishers error:', error);
    return ctx.json({ error: 'Yayınevleri alınamadı' }, 500);
  }
});

// GET publisher by ID
publishers.get('/:id', authMiddleware, async (ctx) => {
  try {
    const db = ctx.env?.DB;
    const id = ctx.req.param('id');

    if (!db) return ctx.json({ error: 'Database error' }, 500);

    const publisher = await db.prepare(
      'SELECT * FROM publishers WHERE id = ? AND deleted_at IS NULL'
    ).bind(id).first();

    if (!publisher) {
      return ctx.json({ error: 'Yayınevi bulunamadı' }, 404);
    }

    return ctx.json(publisher);
  } catch (error) {
    console.error('Get publisher error:', error);
    return ctx.json({ error: 'Yayınevi alınamadı' }, 500);
  }
});

// POST create publisher
publishers.post('/', authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), async (ctx) => {
  try {
    const db = ctx.env?.DB;
    if (!db) return ctx.json({ error: 'Database error' }, 500);

    const data = (await ctx.req.json()) as any;
    const id = generateId('pub');

    const publisher: Publisher = {
      id,
      name: data.name,
      short_name: data.short_name,
      logo_url: data.logo_url,
      contact_person: data.contact_person,
      phone: data.phone,
      email: data.email,
      sales_representative: data.sales_representative,
      order_contact_info: data.order_contact_info,
      minimum_order: data.minimum_order || 1,
      default_discount: data.default_discount || 0,
      payment_terms: data.payment_terms,
      delivery_days: data.delivery_days || 14,
      notes: data.notes,
      is_active: data.is_active !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.prepare(
      `INSERT INTO publishers (id, name, short_name, logo_url, contact_person, phone, email, sales_representative, order_contact_info, minimum_order, default_discount, payment_terms, delivery_days, notes, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        publisher.id,
        publisher.name,
        publisher.short_name,
        publisher.logo_url,
        publisher.contact_person,
        publisher.phone,
        publisher.email,
        publisher.sales_representative,
        publisher.order_contact_info,
        publisher.minimum_order,
        publisher.default_discount,
        publisher.payment_terms,
        publisher.delivery_days,
        publisher.notes,
        publisher.is_active,
        publisher.created_at,
        publisher.updated_at
      )
      .run();

    await logAudit(ctx, 'CREATE', 'PUBLISHER', id, undefined, JSON.stringify(publisher));

    return ctx.json(publisher, 201);
  } catch (error) {
    console.error('Create publisher error:', error);
    return ctx.json({ error: 'Yayınevi oluşturulamadı' }, 500);
  }
});

// PUT update publisher
publishers.put('/:id', authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), async (ctx) => {
  try {
    const db = ctx.env?.DB;
    const id = ctx.req.param('id');
    if (!db) return ctx.json({ error: 'Database error' }, 500);

    const existing = await db.prepare(
      'SELECT * FROM publishers WHERE id = ?'
    ).bind(id).first() as Publisher | undefined;

    if (!existing) {
      return ctx.json({ error: 'Yayınevi bulunamadı' }, 404);
    }

    const data = (await ctx.req.json()) as any;
    const updated: Publisher = {
      ...existing,
      ...data,
      id,
      created_at: existing.created_at,
      updated_at: new Date().toISOString(),
    };

    await db.prepare(
      `UPDATE publishers SET name=?, short_name=?, logo_url=?, contact_person=?, phone=?, email=?, sales_representative=?, order_contact_info=?, minimum_order=?, default_discount=?, payment_terms=?, delivery_days=?, notes=?, is_active=?, updated_at=? WHERE id=?`
    )
      .bind(
        updated.name,
        updated.short_name,
        updated.logo_url,
        updated.contact_person,
        updated.phone,
        updated.email,
        updated.sales_representative,
        updated.order_contact_info,
        updated.minimum_order,
        updated.default_discount,
        updated.payment_terms,
        updated.delivery_days,
        updated.notes,
        updated.is_active,
        updated.updated_at,
        id
      )
      .run();

    await logAudit(ctx, 'UPDATE', 'PUBLISHER', id, JSON.stringify(existing), JSON.stringify(updated));

    return ctx.json(updated);
  } catch (error) {
    console.error('Update publisher error:', error);
    return ctx.json({ error: 'Yayınevi güncellenemedi' }, 500);
  }
});

// DELETE publisher (soft delete)
publishers.delete('/:id', authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), async (ctx) => {
  try {
    const db = ctx.env?.DB;
    const id = ctx.req.param('id');
    if (!db) return ctx.json({ error: 'Database error' }, 500);

    await db.prepare(
      'UPDATE publishers SET deleted_at = ? WHERE id = ?'
    ).bind(new Date().toISOString(), id).run();

    await logAudit(ctx, 'DELETE', 'PUBLISHER', id);

    return ctx.json({ success: true });
  } catch (error) {
    console.error('Delete publisher error:', error);
    return ctx.json({ error: 'Yayınevi silinemedi' }, 500);
  }
});

export default publishers;
