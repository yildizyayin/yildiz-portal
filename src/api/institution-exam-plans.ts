import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import { generateId } from '../utils/auth';

const institutionExamPlans = new Hono();

// GET all exam plans for institution
institutionExamPlans.get('/:institutionId', authMiddleware, async (ctx) => {
  try {
    const db = ctx.env?.DB;
    const institutionId = ctx.req.param('institutionId');
    if (!db) return ctx.json({ error: 'Database error' }, 500);

    const seasonId = ctx.req.query('season_id');

    let query = 'SELECT iep.*, e.name as exam_name, e.code as exam_code, gl.name as grade_level_name FROM institution_exam_plans iep JOIN exams e ON iep.exam_id = e.id JOIN grade_levels gl ON iep.grade_level_id = gl.id WHERE iep.institution_id = ?';
    const binds: any[] = [institutionId];

    if (seasonId) {
      query += ' AND iep.season_id = ?';
      binds.push(seasonId);
    }

    query += ' ORDER BY e.name';

    const results = await db.prepare(query).bind(...binds).all();

    return ctx.json(results.results);
  } catch (error) {
    console.error('Get exam plans error:', error);
    return ctx.json({ error: 'Deneme planları alınamadı' }, 500);
  }
});

// POST create exam plan
institutionExamPlans.post('/:institutionId', authMiddleware, async (ctx) => {
  try {
    const db = ctx.env?.DB;
    const institutionId = ctx.req.param('institutionId');
    if (!db) return ctx.json({ error: 'Database error' }, 500);

    const { exam_id, season_id, grade_level_id, status } = (await ctx.req.json()) as any;
    const id = generateId('plan');

    // Check unique constraint
    const existing = await db.prepare(
      'SELECT id FROM institution_exam_plans WHERE institution_id = ? AND exam_id = ?'
    ).bind(institutionId, exam_id).first();

    if (existing) {
      return ctx.json({ error: 'Bu deneme zaten planlandı' }, 409);
    }

    await db.prepare(
      `INSERT INTO institution_exam_plans (id, institution_id, season_id, exam_id, grade_level_id, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(id, institutionId, season_id, exam_id, grade_level_id, status || 'PLANLANDI', new Date().toISOString(), new Date().toISOString())
      .run();

    await logAudit(ctx, 'CREATE', 'INSTITUTION_EXAM_PLAN', id);

    return ctx.json({ success: true, id }, 201);
  } catch (error) {
    console.error('Create exam plan error:', error);
    return ctx.json({ error: 'Deneme planı oluşturulamadı' }, 500);
  }
});

// PUT update exam plan status
institutionExamPlans.put('/:planId/status', authMiddleware, async (ctx) => {
  try {
    const db = ctx.env?.DB;
    const planId = ctx.req.param('planId');
    if (!db) return ctx.json({ error: 'Database error' }, 500);

    const { status, notes } = (await ctx.req.json()) as any;

    const existing = await db.prepare(
      'SELECT * FROM institution_exam_plans WHERE id = ?'
    ).bind(planId).first() as any;

    if (!existing) {
      return ctx.json({ error: 'Plan bulunamadı' }, 404);
    }

    // Update plan status
    await db.prepare(
      'UPDATE institution_exam_plans SET status = ?, updated_at = ? WHERE id = ?'
    )
      .bind(status, new Date().toISOString(), planId)
      .run();

    // Add history record
    const historyId = generateId('hist');
    const user = ctx.get('user') as any;
    await db.prepare(
      `INSERT INTO institution_exam_status_history (id, plan_id, old_status, new_status, changed_by, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(historyId, planId, existing.status, status, user?.id, notes, new Date().toISOString())
      .run();

    await logAudit(ctx, 'STATUS_CHANGE', 'INSTITUTION_EXAM_PLAN', planId, existing.status, status);

    return ctx.json({ success: true });
  } catch (error) {
    console.error('Update exam plan status error:', error);
    return ctx.json({ error: 'Deneme planı durumu güncellenemedi' }, 500);
  }
});

// GET status history
institutionExamPlans.get('/:planId/history', authMiddleware, async (ctx) => {
  try {
    const db = ctx.env?.DB;
    const planId = ctx.req.param('planId');
    if (!db) return ctx.json({ error: 'Database error' }, 500);

    const results = await db.prepare(
      'SELECT * FROM institution_exam_status_history WHERE plan_id = ? ORDER BY created_at DESC'
    ).bind(planId).all();

    return ctx.json(results.results);
  } catch (error) {
    console.error('Get history error:', error);
    return ctx.json({ error: 'Geçmiş alınamadı' }, 500);
  }
});

export default institutionExamPlans;
