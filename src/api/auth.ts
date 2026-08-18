import { Hono } from 'hono';
import { authMiddleware, requireRole } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import { hashPassword, verifyPassword, generateToken, generateSessionId, generateId } from '../utils/auth';
import type { User, AuthRequest, AuthResponse } from '../types';

const auth = new Hono();

auth.post('/login', async (ctx) => {
  try {
    const { email, password } = (await ctx.req.json()) as AuthRequest;
    const db = ctx.env?.DB;

    if (!db) {
      return ctx.json({ error: 'Database error' }, 500);
    }

    if (!email || !password) {
      return ctx.json({ error: 'Email ve şifre gerekli' }, 400);
    }

    const user = await db.prepare(
      'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL'
    ).bind(email).first() as User | undefined;

    if (!user) {
      return ctx.json({ error: 'Kullanıcı bulunamadı' }, 401);
    }

    const isPasswordValid = await verifyPassword(password, user.password_hash || '');
    if (!isPasswordValid) {
      return ctx.json({ error: 'Hatalı şifre' }, 401);
    }

    if (user.status !== 'ACTIVE') {
      return ctx.json({ error: 'Hesap pasif' }, 403);
    }

    const token = generateToken(user.id);
    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await db.prepare(
      `INSERT INTO sessions (id, user_id, token, expires_at, ip_address, user_agent, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        sessionId,
        user.id,
        token,
        expiresAt,
        ctx.req.header('x-forwarded-for') || 'unknown',
        ctx.req.header('user-agent') || 'unknown',
        new Date().toISOString()
      )
      .run();

    const response: AuthResponse = {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        status: user.status,
        institution_id: user.institution_id,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      token,
      expires_at: expiresAt,
    };

    return ctx.json(response);
  } catch (error) {
    console.error('Login error:', error);
    return ctx.json({ error: 'Giriş yapılırken hata oluştu' }, 500);
  }
});

auth.post('/logout', authMiddleware, async (ctx) => {
  try {
    const db = ctx.env?.DB;
    const authHeader = ctx.req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (db && token) {
      await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    }

    return ctx.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return ctx.json({ error: 'Çıkış yapılırken hata oluştu' }, 500);
  }
});

auth.get('/me', authMiddleware, async (ctx) => {
  try {
    const user = ctx.get('user') as User | undefined;
    if (!user) {
      return ctx.json({ error: 'Unauthorized' }, 401);
    }

    return ctx.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    return ctx.json({ error: 'Kullanıcı bilgisi alınamadı' }, 500);
  }
});

auth.post('/register', async (ctx) => {
  try {
    const { email, password, full_name } = await ctx.req.json() as any;
    const db = ctx.env?.DB;

    if (!db) {
      return ctx.json({ error: 'Database error' }, 500);
    }

    if (!email || !password || !full_name) {
      return ctx.json({ error: 'Tüm alanlar gerekli' }, 400);
    }

    const existing = await db.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first();

    if (existing) {
      return ctx.json({ error: 'Email zaten kullanılıyor' }, 409);
    }

    const userId = generateId('user');
    const passwordHash = await hashPassword(password);

    await db.prepare(
      `INSERT INTO users (id, email, password_hash, full_name, role, status, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        userId,
        email,
        passwordHash,
        full_name,
        'PERSONEL',
        'ACTIVE',
        new Date().toISOString(),
        new Date().toISOString()
      )
      .run();

    return ctx.json({ success: true, user_id: userId });
  } catch (error) {
    console.error('Register error:', error);
    return ctx.json({ error: 'Kayıt yapılırken hata oluştu' }, 500);
  }
});

export default auth;
