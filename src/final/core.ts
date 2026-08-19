export interface Env {
  DB: D1Database;
  ASSETS?: Fetcher;
  MEDIA?: R2Bucket;
  APP_ENV?: string;
  APP_NAME?: string;
  ERP_BASE_URL?: string;
  ERP_CUSTOMERS_PATH?: string;
}

export interface UserRow {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  institution_id?: string | null;
  must_change_password?: number;
  login_code?: string | null;
}

export const now = () => new Date().toISOString();
export const uid = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
export const today = () => new Date().toISOString().slice(0, 10);

export function fail(c: any, error: string, status = 400, details?: unknown) {
  return c.json({ ok: false, error, details }, status as any);
}

export function bytesToHex(bytes: ArrayBuffer | Uint8Array) {
  const view = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  return Array.from(view).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function hexToBytes(hex: string) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export async function pbkdf2(password: string, saltHex: string, iterations = 100000) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: hexToBytes(saltHex), iterations }, key, 256);
  return bytesToHex(bits);
}

export async function hashPassword(password: string) {
  const saltHex = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
  return `pbkdf2$100000$${saltHex}$${await pbkdf2(password, saltHex, 100000)}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [kind, it, salt, expected] = (stored || '').split('$');
  if (kind !== 'pbkdf2' || !it || !salt || !expected) return false;
  const actual = await pbkdf2(password, salt, Number(it));
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function audit(db: D1Database, user: UserRow | undefined, action: string, type: string, resourceId: string, oldValue?: unknown, newValue?: unknown) {
  try {
    await db.prepare(`INSERT INTO audit_logs (id,user_id,action,resource_type,resource_id,old_value,new_value,created_at) VALUES (?,?,?,?,?,?,?,?)`)
      .bind(uid('audit'), user?.id || null, action, type, resourceId, oldValue === undefined ? null : JSON.stringify(oldValue), newValue === undefined ? null : JSON.stringify(newValue), now()).run();
  } catch (e) {
    console.error('audit', e);
  }
}

export function isAdmin(user: UserRow) {
  return user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
}

export function roleAllowed(user: UserRow, roles: string[]) {
  return roles.includes(user.role);
}

export async function fallbackOwner(db: D1Database, institutionId: string) {
  const inst = await db.prepare(`SELECT staff_id FROM institutions WHERE id=?`).bind(institutionId).first<{ staff_id?: string | null }>();
  if (inst?.staff_id) return inst.staff_id;
  const admin = await db.prepare(`SELECT id FROM users WHERE role='SUPER_ADMIN' AND status='ACTIVE' AND deleted_at IS NULL ORDER BY created_at LIMIT 1`).first<{ id: string }>();
  return admin?.id || null;
}

export function normalizeCode(v: string | undefined | null) {
  return (v || '').trim().toUpperCase().replace(/\s+/g, '');
}
