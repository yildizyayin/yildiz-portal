import { Hono } from 'hono';
import { authMiddleware, requireRole } from '../middleware/auth';
import { generateId } from '../utils/auth';

const dashboardAPI = new Hono();

// GET dashboard KPIs
dashboardAPI.get('/kpis', authMiddleware, async (ctx) => {
  try {
    const db = ctx.env?.DB;
    if (!db) return ctx.json({ error: 'Database error' }, 500);

    // Total orders
    const totalOrders = await db.prepare(
      'SELECT COUNT(*) as count FROM orders'
    ).first() as any;

    // Total revenue
    const totalRevenue = await db.prepare(
      'SELECT SUM(total_price) as amount FROM orders WHERE status IN ("ONAYLANDI", "TESLIM_EDILDI")'
    ).first() as any;

    // Pending orders
    const pendingOrders = await db.prepare(
      'SELECT COUNT(*) as count FROM orders WHERE status IN ("TASLAK", "SIPARIS_ALINDI")'
    ).first() as any;

    // Active opportunities
    const activeOpportunities = await db.prepare(
      'SELECT COUNT(*) as count FROM sales_opportunities WHERE status IN ("ARANACAK", "DEVAM_EDIYOR")'
    ).first() as any;

    // Pending deliveries
    const pendingDeliveries = await db.prepare(
      'SELECT COUNT(*) as count FROM deliveries WHERE status IN ("HAZIRLANIYOR", "SEVK_EDILDI")'
    ).first() as any;

    // Top publishers
    const topPublishers = await db.prepare(
      `SELECT p.name, COUNT(o.id) as order_count, SUM(o.total_price) as total_amount 
       FROM publishers p LEFT JOIN exams e ON p.id = e.publisher_id LEFT JOIN orders o ON e.id = o.exam_id 
       GROUP BY p.id 
       ORDER BY total_amount DESC LIMIT 10`
    ).all();

    return ctx.json({
      orders: {
        total: totalOrders.count || 0,
        pending: pendingOrders.count || 0,
      },
      revenue: {
        total: totalRevenue.amount || 0,
      },
      sales: {
        active_opportunities: activeOpportunities.count || 0,
      },
      deliveries: {
        pending: pendingDeliveries.count || 0,
      },
      top_publishers: topPublishers.results || [],
    });
  } catch (error) {
    console.error('Get KPIs error:', error);
    return ctx.json({ error: 'KPI verileri alınamadı' }, 500);
  }
});

// GET institution dashboard KPIs
dashboardAPI.get('/institution/:institutionId', authMiddleware, async (ctx) => {
  try {
    const db = ctx.env?.DB;
    const institutionId = ctx.req.param('institutionId');
    if (!db) return ctx.json({ error: 'Database error' }, 500);

    // Institution orders
    const orders = await db.prepare(
      'SELECT COUNT(*) as count FROM orders WHERE institution_id = ?'
    ).bind(institutionId).first() as any;

    // Planned exams
    const plannedExams = await db.prepare(
      'SELECT COUNT(*) as count FROM institution_exam_plans WHERE institution_id = ? AND status = "PLANLANDI"'
    ).bind(institutionId).first() as any;

    // Enrolled exams
    const enrolledExams = await db.prepare(
      'SELECT COUNT(*) as count FROM institution_exam_plans WHERE institution_id = ? AND status = "BASLATILDI"'
    ).bind(institutionId).first() as any;

    // Pending deliveries
    const pendingDeliveries = await db.prepare(
      `SELECT COUNT(*) as count FROM deliveries d 
       JOIN orders o ON d.order_id = o.id 
       WHERE o.institution_id = ? AND d.status IN ("HAZIRLANIYOR", "SEVK_EDILDI")`
    ).bind(institutionId).first() as any;

    return ctx.json({
      orders: orders.count || 0,
      planned_exams: plannedExams.count || 0,
      enrolled_exams: enrolledExams.count || 0,
      pending_deliveries: pendingDeliveries.count || 0,
    });
  } catch (error) {
    console.error('Get institution dashboard error:', error);
    return ctx.json({ error: 'Kurum dashboard verileri alınamadı' }, 500);
  }
});

export default dashboardAPI;
