import { Hono, Context } from 'hono';
import type { User, Session } from '../types';

export interface AuthContext {
  user?: User;
  session?: Session;
}

export async function authMiddleware(
  ctx: Context,
  next: () => Promise<void>
) {
  const authHeader = ctx.req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return ctx.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const db = ctx.env?.DB;
    if (!db) {
      return ctx.json({ error: 'Database error' }, 500);
    }

    const session = await db.prepare(
      `SELECT s.*, u.* FROM sessions s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.token = ? AND s.expires_at > datetime('now')`
    ).bind(token).first();

    if (!session) {
      return ctx.json({ error: 'Invalid or expired token' }, 401);
    }

    ctx.set('user', session);
    ctx.set('session', session);

    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return ctx.json({ error: 'Authentication error' }, 500);
  }
}

export function requireRole(...roles: string[]) {
  return async (ctx: Context, next: () => Promise<void>) => {
    const user = ctx.get('user') as User | undefined;

    if (!user || !roles.includes(user.role)) {
      return ctx.json({ error: 'Forbidden' }, 403);
    }

    await next();
  };
}

export function requireTenant(ctx: Context): string | null {
  const user = ctx.get('user') as User | undefined;

  if (!user) {
    return null;
  }

  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
    // Admins can access any tenant
    return null;
  }

  if (user.role === 'KURUM') {
    return user.institution_id || null;
  }

  return null;
}
