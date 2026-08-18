import { Hono } from 'hono';
import { authMiddleware, requireRole } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import { generateId } from '../utils/auth';
import type { Institution } from '../types';

const institutions = new Hono();

// GET all institutions
institutions.get('/', authMiddleware, async (ctx) => {
  try {
    const db = ctx.env?.DB;
    if (!db) return ctx.json({ error: 'Database error' }, 500);

    const page = parseInt(ctx.req.query('page') || '1');
    const limit = parseInt(ctx.req.query('limit') || '20');
    const offset = (page - 1) * limit;

    const results = await db.prepare(
      'SELECT * FROM institutions WHERE deleted_at IS NULL ORDER BY name LIMIT ? OFFSET ?'
    ).bind(limit, offset).all();

    const total = await db.prepare(
      'SELECT COUNT(*) as count FROM institutions WHERE deleted_at IS NULL'
    ).first() as any;

    return ctx.json({
      data: results.results,
      pagination: { page, limit, total: total.count },
    });
  } catch (error) {
    console.error('Get institutions error:', error);
    return ctx.json({ error: 'Kurumlar alınamadı' }, 500);
  }
});

// GET institution by ID
institutions.get('/:id', authMiddleware, async (ctx) => {
  try {
    const db = ctx.env?.DB;
    const id = ctx.req.param('id');
    if (!db) return ctx.json({ error: 'Database error' }, 500);

    const institution = await db.prepare(
      'SELECT * FROM institutions WHERE id = ? AND deleted_at IS NULL'
    ).bind(id).first();

    if (!institution) {
      return ctx.json({ error: 'Kurum bulunamadı' }, 404);
    }

    return ctx.json(institution);
  } catch (error) {
    console.error('Get institution error:', error);
    return ctx.json({ error: 'Kurum alınamadı' }, 500);
  }
});

// POST create institution
institutions.post('/', authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), async (ctx) => {
  try {
    const db = ctx.env?.DB;
    if (!db) return ctx.json({ error: 'Database error' }, 500);

    const data = (await ctx.req.json()) as any;
    const id = generateId('inst');

    const institution: Institution = {
      id,
      erp_external_id: data.erp_external_id,
      name: data.name,
      code: data.code,
      type: data.type,
      is_private: data.is_private,
      province: data.province,
      district: data.district,
      phone: data.phone,
      email: data.email,
      contact_person: data.contact_person,
      staff_id: data.staff_id,
      estimated_capacity: data.estimated_capacity,
      is_active: data.is_active !== false,
      notes: data.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.prepare(
      `INSERT INTO institutions (id, erp_external_id, name, code, type, is_private, province, district, phone, email, contact_person, staff_id, estimated_capacity, is_active, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        institution.id,
        institution.erp_external_id,
        institution.name,
        institution.code,
        institution.type,
        institution.is_private,
        institution.province,
        institution.district,
        institution.phone,
        institution.email,
        institution.contact_person,
        institution.staff_id,
        institution.estimated_capacity,
        institution.is_active,
        institution.notes,
        institution.created_at,
        institution.updated_at
      )
      .run();

    await logAudit(ctx, 'CREATE', 'INSTITUTION', id, undefined, JSON.stringify(institution));

    return ctx.json(institution, 201);
  } catch (error) {
    console.error('Create institution error:', error);
    return ctx.json({ error: 'Kurum oluşturulamadı' }, 500);
  }
});

// PUT update institution
institutions.put('/:id', authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), async (ctx) => {
  try {
    const db = ctx.env?.DB;
    const id = ctx.req.param('id');
    if (!db) return ctx.json({ error: 'Database error' }, 500);

    const existing = await db.prepare(
      'SELECT * FROM institutions WHERE id = ?'
    ).bind(id).first() as Institution | undefined;

    if (!existing) {
      return ctx.json({ error: 'Kurum bulunamadı' }, 404);
    }

    const data = (await ctx.req.json()) as any;
    const updated: Institution = {
      ...existing,
      ...data,
      id,
      created_at: existing.created_at,
      updated_at: new Date().toISOString(),
    };

    await db.prepare(
      `UPDATE institutions SET erp_external_id=?, name=?, code=?, type=?, is_private=?, province=?, district=?, phone=?, email=?, contact_person=?, staff_id=?, estimated_capacity=?, is_active=?, notes=?, updated_at=? WHERE id=?`
    )
      .bind(
        updated.erp_external_id,
        updated.name,
        updated.code,
        updated.type,
        updated.is_private,
        updated.province,
        updated.district,
        updated.phone,
        updated.email,
        updated.contact_person,
        updated.staff_id,
        updated.estimated_capacity,
        updated.is_active,
        updated.notes,
        updated.updated_at,
        id
      )
      .run();

    await logAudit(ctx, 'UPDATE', 'INSTITUTION', id, JSON.stringify(existing), JSON.stringify(updated));

    return ctx.json(updated);
  } catch (error) {
    console.error('Update institution error:', error);
    return ctx.json({ error: 'Kurum güncellenemedi' }, 500);
  }
});

export default institutions;
