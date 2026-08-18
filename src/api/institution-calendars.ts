import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import { generateId } from '../utils/auth';

const institutionCalendars = new Hono();

// GET institution calendar
institutionCalendars.get('/:institutionId', authMiddleware, async (ctx) => {
  try {
    const db = ctx.env?.DB;
    const institutionId = ctx.req.param('institutionId');
    if (!db) return ctx.json({ error: 'Database error' }, 500);

    const seasonId = ctx.req.query('season_id');

    let query = 'SELECT ic.*, e.name as exam_name, e.code as exam_code, s.name as season_name FROM institution_calendars ic JOIN exams e ON ic.exam_id = e.id JOIN seasons s ON ic.season_id = s.id WHERE ic.institution_id = ?';
    const binds: any[] = [institutionId];

    if (seasonId) {
      query += ' AND ic.season_id = ?';
      binds.push(seasonId);
    }

    query += ' ORDER BY e.name';

    const results = await db.prepare(query).bind(...binds).all();

    return ctx.json(results.results);
  } catch (error) {
    console.error('Get institution calendar error:', error);
    return ctx.json({ error: 'Kurum takvimi alınamadı' }, 500);
  }
});

// POST/UPDATE calendar entry (auto-generate or manual)
institutionCalendars.post('/:institutionId/exams/:examId', authMiddleware, async (ctx) => {
  try {
    const db = ctx.env?.DB;
    const institutionId = ctx.req.param('institutionId');
    const examId = ctx.req.param('examId');
    if (!db) return ctx.json({ error: 'Database error' }, 500);

    const { season_id, publisher_application_start, publisher_application_end, institution_application_date } = (await ctx.req.json()) as any;

    // Check if already exists
    const existing = await db.prepare(
      'SELECT id FROM institution_calendars WHERE institution_id = ? AND exam_id = ?'
    ).bind(institutionId, examId).first();

    const id = existing?.id || generateId('ical');

    if (existing) {
      // Update
      await db.prepare(
        'UPDATE institution_calendars SET publisher_application_start=?, publisher_application_end=?, institution_application_date=?, updated_at=? WHERE id=?'
      )
        .bind(publisher_application_start, publisher_application_end, institution_application_date, new Date().toISOString(), id)
        .run();
    } else {
      // Insert
      await db.prepare(
        `INSERT INTO institution_calendars (id, institution_id, season_id, exam_id, publisher_application_start, publisher_application_end, institution_application_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(id, institutionId, season_id, examId, publisher_application_start, publisher_application_end, institution_application_date, new Date().toISOString(), new Date().toISOString())
        .run();
    }

    await logAudit(ctx, existing ? 'UPDATE' : 'CREATE', 'INSTITUTION_CALENDAR', id);

    return ctx.json({ success: true, id });
  } catch (error) {
    console.error('Update calendar error:', error);
    return ctx.json({ error: 'Takvim güncellenemedi' }, 500);
  }
});

// AUTO-GENERATE calendar based on system default dates
institutionCalendars.post('/:institutionId/generate', authMiddleware, async (ctx) => {
  try {
    const db = ctx.env?.DB;
    const institutionId = ctx.req.param('institutionId');
    if (!db) return ctx.json({ error: 'Database error' }, 500);

    const { season_id } = (await ctx.req.json()) as any;

    // Get all exams for this season
    const exams = await db.prepare(
      'SELECT * FROM exams WHERE season_id = ? AND deleted_at IS NULL'
    ).bind(season_id).all();

    let created = 0;
    for (const exam of exams.results) {
      const existing = await db.prepare(
        'SELECT id FROM institution_calendars WHERE institution_id = ? AND exam_id = ?'
      ).bind(institutionId, exam.id).first();

      if (!existing) {
        const id = generateId('ical');
        // Use exam's default dates
        await db.prepare(
          `INSERT INTO institution_calendars (id, institution_id, season_id, exam_id, publisher_application_start, publisher_application_end, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(id, institutionId, season_id, exam.id, exam.application_start_date, exam.application_end_date, new Date().toISOString(), new Date().toISOString())
          .run();
        created++;
      }
    }

    return ctx.json({ success: true, created });
  } catch (error) {
    console.error('Generate calendar error:', error);
    return ctx.json({ error: 'Takvim oluşturulamadı' }, 500);
  }
});

export default institutionCalendars;
