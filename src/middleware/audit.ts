import { Hono, Context } from 'hono';
import type { User, AuditLog } from '../types';
import { generateId } from '../utils/auth';

export async function logAudit(
  ctx: Context,
  action: string,
  resourceType: string,
  resourceId: string,
  oldValue?: string,
  newValue?: string
): Promise<void> {
  try {
    const db = ctx.env?.DB;
    const user = ctx.get('user') as User | undefined;

    if (!db) return;

    const auditLog: AuditLog = {
      id: generateId('audit'),
      user_id: user?.id,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      old_value: oldValue,
      new_value: newValue,
      ip_address: ctx.req.header('x-forwarded-for') || 'unknown',
      user_agent: ctx.req.header('user-agent') || 'unknown',
      created_at: new Date().toISOString(),
    };

    await db.prepare(
      `INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, old_value, new_value, ip_address, user_agent, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        auditLog.id,
        auditLog.user_id,
        auditLog.action,
        auditLog.resource_type,
        auditLog.resource_id,
        auditLog.old_value,
        auditLog.new_value,
        auditLog.ip_address,
        auditLog.user_agent,
        auditLog.created_at
      )
      .run();
  } catch (error) {
    console.error('Audit log error:', error);
  }
}
