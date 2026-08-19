import { Hono } from 'hono';

interface Env {
  DB?: D1Database;
  APP_ENV?: string;
  APP_NAME?: string;
}
interface UserRow {
  id: string; email: string; full_name: string; role: string; status: string;
  institution_id?: string | null; must_change_password?: number;
}
interface Vars { user: UserRow }
const app = new Hono<{ Bindings: Env; Variables: Vars }>();

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const fail = (c: any, message: string, status = 400, details?: unknown) => c.json({ ok: false, error: message, details }, status);
const dbOf = (c: any): D1Database | null => c.env.DB || null;

function hexToBytes(hex: string) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}
function bytesToHex(bytes: ArrayBuffer | Uint8Array) {
  return Array.from(new Uint8Array(bytes instanceof ArrayBuffer ? bytes : bytes.buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}
async function pbkdf2(password: string, saltHex: string, iterations = 100000) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: hexToBytes(saltHex), iterations }, key, 256);
  return bytesToHex(bits);
}
async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = bytesToHex(salt);
  return `pbkdf2$100000$${saltHex}$${await pbkdf2(password, saltHex, 100000)}`;
}
async function verifyPassword(password: string, stored: string) {
  const [kind, it, salt, expected] = stored.split('$');
  if (kind !== 'pbkdf2' || !it || !salt || !expected) return false;
  const actual = await pbkdf2(password, salt, Number(it));
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function audit(db: D1Database, user: UserRow | undefined, action: string, type: string, resourceId: string, oldValue?: unknown, newValue?: unknown) {
  try {
    await db.prepare(`INSERT INTO audit_logs (id,user_id,action,resource_type,resource_id,old_value,new_value,created_at) VALUES (?,?,?,?,?,?,?,?)`)
      .bind(id('audit'), user?.id || null, action, type, resourceId, oldValue ? JSON.stringify(oldValue) : null, newValue ? JSON.stringify(newValue) : null, now()).run();
  } catch (e) { console.error('audit', e); }
}

app.get('/api/health', c => c.json({ ok: true, service: c.env.APP_NAME || 'Yıldız Deneme Platformu', time: now(), database: !!c.env.DB }));
app.get('/api/setup/status', async c => {
  const db = dbOf(c);
  if (!db) return c.json({ ok: true, database: false, ready: false, message: 'D1 binding DB gerekli' });
  try {
    const row = await db.prepare(`SELECT COUNT(*) count FROM users`).first<{ count: number }>();
    return c.json({ ok: true, database: true, ready: true, users: row?.count || 0 });
  } catch (e) { return c.json({ ok: true, database: true, ready: false, message: String(e) }); }
});

app.post('/api/auth/login', async c => {
  const db = dbOf(c); if (!db) return fail(c, 'Veritabanı henüz bağlanmadı.', 503);
  const body = await c.req.json<{ email?: string; password?: string }>().catch(() => ({} as { email?: string; password?: string }));
  const email = body.email?.trim().toLowerCase();
  if (!email || !body.password) return fail(c, 'E-posta ve şifre gerekli.');
  const user = await db.prepare(`SELECT * FROM users WHERE lower(email)=? AND deleted_at IS NULL`).bind(email).first<UserRow & { password_hash: string }>();
  if (!user || !(await verifyPassword(body.password, user.password_hash))) return fail(c, 'E-posta veya şifre hatalı.', 401);
  if (user.status !== 'ACTIVE') return fail(c, 'Bu hesap pasif.', 403);
  const token = randomToken();
  const expires = new Date(Date.now() + 7 * 86400000).toISOString();
  await db.prepare(`INSERT INTO sessions (id,user_id,token,expires_at,ip_address,user_agent,created_at) VALUES (?,?,?,?,?,?,?)`)
    .bind(id('sess'), user.id, token, expires, c.req.header('CF-Connecting-IP') || '', c.req.header('User-Agent') || '', now()).run();
  const secure = c.env.APP_ENV === 'production' ? '; Secure' : '';
  c.header('Set-Cookie', `yd_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800${secure}`);
  const { password_hash: _, ...safe } = user;
  return c.json({ ok: true, expires_at: expires, user: safe });
});

const auth = async (c: any, next: () => Promise<void>) => {
  const db = dbOf(c); if (!db) return fail(c, 'Veritabanı henüz bağlanmadı.', 503);
  const bearer = c.req.header('Authorization')?.replace(/^Bearer\s+/i, '').trim();
  const cookie = c.req.header('Cookie')?.split(';').map((x:string)=>x.trim()).find((x:string)=>x.startsWith('yd_session='))?.slice('yd_session='.length);
  const token = bearer || cookie;
  if (!token) return fail(c, 'Oturum gerekli.', 401);
  const row = await db.prepare(`SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires_at>datetime('now') AND u.status='ACTIVE' AND u.deleted_at IS NULL`)
    .bind(token).first<UserRow>();
  if (!row) return fail(c, 'Oturum süresi dolmuş.', 401);
  c.set('user', row); await next();
};
const roles = (...allowed: string[]) => async (c: any, next: () => Promise<void>) => {
  const u = c.get('user') as UserRow;
  if (!allowed.includes(u.role)) return fail(c, 'Bu işlem için yetkiniz yok.', 403);
  await next();
};
app.use('/api/*', async (c, next) => {
  if (['POST','PATCH','PUT','DELETE'].includes(c.req.method)) {
    const origin = c.req.header('Origin');
    if (origin) { try { if (new URL(origin).host !== new URL(c.req.url).host) return fail(c, 'Geçersiz istek kaynağı.', 403); } catch { return fail(c, 'Geçersiz istek kaynağı.', 403); } }
  }
  if (['/api/health','/api/setup/status','/api/auth/login'].includes(c.req.path)) return next();
  return auth(c, next);
});

app.get('/api/auth/me', c => c.json({ ok: true, user: c.get('user') }));
app.post('/api/auth/logout', async c => {
  const db = dbOf(c)!; const bearer = c.req.header('Authorization')?.replace(/^Bearer\s+/i, '') || '';
  const cookie = c.req.header('Cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('yd_session='))?.slice('yd_session='.length) || '';
  await db.prepare(`DELETE FROM sessions WHERE token=?`).bind(bearer || cookie).run();
  c.header('Set-Cookie', 'yd_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'); return c.json({ ok: true });
});
app.post('/api/auth/change-password', async c => {
  const db = dbOf(c)!; const user = c.get('user');
  const b = await c.req.json<{ current_password?: string; new_password?: string }>().catch(() => ({} as { current_password?: string; new_password?: string }));
  if (!b.current_password || !b.new_password || b.new_password.length < 10) return fail(c, 'Yeni şifre en az 10 karakter olmalı.');
  const row = await db.prepare(`SELECT password_hash FROM users WHERE id=?`).bind(user.id).first<{ password_hash: string }>();
  if (!row || !(await verifyPassword(b.current_password, row.password_hash))) return fail(c, 'Mevcut şifre hatalı.', 401);
  await db.prepare(`UPDATE users SET password_hash=?, must_change_password=0, updated_at=? WHERE id=?`).bind(await hashPassword(b.new_password), now(), user.id).run();
  await audit(db, user, 'PASSWORD_CHANGE', 'user', user.id); return c.json({ ok: true });
});

function scopeInstitution(user: UserRow, requested?: string | null) {
  if (user.role === 'KURUM') return user.institution_id || '__none__';
  return requested || null;
}
function parseBool(v: unknown) { return v === true || v === 1 || v === '1'; }

app.get('/api/bootstrap', async c => {
  const db = dbOf(c)!; const user = c.get('user');
  const [seasons, grades, publishers] = await Promise.all([
    db.prepare(`SELECT * FROM seasons ORDER BY year_start DESC`).all(),
    db.prepare(`SELECT * FROM grade_levels WHERE is_active=1 ORDER BY sort_order`).all(),
    db.prepare(`SELECT * FROM publishers WHERE deleted_at IS NULL AND is_active=1 ORDER BY name`).all(),
  ]);
  let institutions: any = { results: [] };
  if (user.role === 'KURUM') institutions = await db.prepare(`SELECT * FROM institutions WHERE id=? AND deleted_at IS NULL`).bind(user.institution_id).all();
  else if (user.role === 'PERSONEL') institutions = await db.prepare(`SELECT * FROM institutions WHERE staff_id=? AND deleted_at IS NULL ORDER BY name`).bind(user.id).all();
  else institutions = await db.prepare(`SELECT * FROM institutions WHERE deleted_at IS NULL ORDER BY name`).all();
  return c.json({ ok: true, user, seasons: seasons.results, grades: grades.results, publishers: publishers.results, institutions: institutions.results });
});

app.get('/api/dashboard', async c => {
  const db = dbOf(c)!; const u = c.get('user');
  const inst = u.role === 'KURUM' ? u.institution_id : null;
  const staff = u.role === 'PERSONEL' ? u.id : null;
  const whereOrder = inst ? `WHERE institution_id=?` : staff ? `WHERE staff_id=?` : '';
  const bind = inst || staff;
  const one = async (sql: string, value?: string | null) => (value ? db.prepare(sql).bind(value).first<any>() : db.prepare(sql).first<any>());
  const orders = await one(`SELECT COUNT(*) total, COALESCE(SUM(quantity),0) quantity, COALESCE(SUM(total_price),0) revenue, SUM(CASE WHEN status NOT IN ('TESLIM_EDILDI','IPTAL') THEN 1 ELSE 0 END) pending FROM orders ${whereOrder}`, bind);
  let opp: any = { active: 0 };
  if (u.role !== 'KURUM') opp = await one(`SELECT COUNT(*) active FROM sales_opportunities ${staff ? 'WHERE staff_id=? AND' : 'WHERE'} status NOT IN ('SIPARIS_VERDI','ILGILENMIYOR','BASKA_YAYINEVI_ALDI','KATILMAYACAK')`, staff);
  const upcoming = inst
    ? await one(`SELECT COUNT(*) count FROM institution_exam_plans p JOIN exams e ON e.id=p.exam_id WHERE p.institution_id=? AND e.application_start_date>=date('now') AND e.application_start_date<=date('now','+30 day')`, inst)
    : await one(`SELECT COUNT(*) count FROM exams WHERE is_active=1 AND application_start_date>=date('now') AND application_start_date<=date('now','+30 day')`);
  const delivery = inst
    ? await one(`SELECT COUNT(*) count FROM deliveries d JOIN orders o ON o.id=d.order_id WHERE o.institution_id=? AND d.status!='TESLIM_EDILDI'`, inst)
    : await one(`SELECT COUNT(*) count FROM deliveries WHERE status!='TESLIM_EDILDI'`);
  const planPending = inst
    ? await one(`SELECT COUNT(*) count FROM institution_exam_plans WHERE institution_id=? AND status IN ('PLANLANDI','SIPARIS_BEKLIYOR')`, inst)
    : await one(`SELECT COUNT(*) count FROM institution_exam_plans WHERE status IN ('PLANLANDI','SIPARIS_BEKLIYOR')`);
  const deadlines = await db.prepare(`SELECT e.id,e.name,e.last_order_date,g.name grade,p.name publisher FROM exams e JOIN grade_levels g ON g.id=e.grade_level_id JOIN publishers p ON p.id=e.publisher_id WHERE e.is_active=1 AND e.last_order_date BETWEEN date('now') AND date('now','+15 day') ORDER BY e.last_order_date LIMIT 8`).all();
  return c.json({ ok: true, orders, opportunities: opp.active || 0, upcoming: upcoming?.count || 0, pending_deliveries: delivery?.count || 0, plan_pending: planPending?.count || 0, deadlines: deadlines.results });
});

app.get('/api/publishers', async c => { const db=dbOf(c)!; const r=await db.prepare(`SELECT * FROM publishers WHERE deleted_at IS NULL ORDER BY name`).all(); return c.json({ok:true,items:r.results}); });
app.post('/api/publishers', roles('SUPER_ADMIN','ADMIN'), async c => {
  const db=dbOf(c)!; const u=c.get('user'); const b=await c.req.json<any>();
  if(!b.name) return fail(c,'Yayınevi adı gerekli.'); const rid=id('pub');
  await db.prepare(`INSERT INTO publishers (id,name,short_name,contact_person,phone,email,sales_representative,order_contact_info,minimum_order,default_discount,payment_terms,delivery_days,notes,is_active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
   .bind(rid,b.name,b.short_name||b.name,b.contact_person||null,b.phone||null,b.email||null,b.sales_representative||null,b.order_contact_info||null,Number(b.minimum_order||1),Number(b.default_discount||0),b.payment_terms||null,Number(b.delivery_days||14),b.notes||null,1,now(),now()).run();
  await audit(db,u,'CREATE','publisher',rid,undefined,b); return c.json({ok:true,id:rid},201);
});
app.patch('/api/publishers/:id', roles('SUPER_ADMIN','ADMIN'), async c => {
  const db=dbOf(c)!; const u=c.get('user'); const b=await c.req.json<any>(); const rid=c.req.param('id');
  await db.prepare(`UPDATE publishers SET name=COALESCE(?,name),short_name=COALESCE(?,short_name),contact_person=?,phone=?,email=?,sales_representative=?,minimum_order=COALESCE(?,minimum_order),default_discount=COALESCE(?,default_discount),payment_terms=?,delivery_days=COALESCE(?,delivery_days),notes=?,is_active=COALESCE(?,is_active),updated_at=? WHERE id=?`)
   .bind(b.name??null,b.short_name??null,b.contact_person??null,b.phone??null,b.email??null,b.sales_representative??null,b.minimum_order??null,b.default_discount??null,b.payment_terms??null,b.delivery_days??null,b.notes??null,b.is_active===undefined?null:(parseBool(b.is_active)?1:0),now(),rid).run();
  await audit(db,u,'UPDATE','publisher',rid,undefined,b); return c.json({ok:true});
});

app.get('/api/exams', async c => {
  const db=dbOf(c)!; const season=c.req.query('season_id'); const grade=c.req.query('grade_level_id'); const pub=c.req.query('publisher_id'); const q=c.req.query('q')?.trim();
  const parts=[`e.deleted_at IS NULL`]; const vals:any[]=[];
  if(season){parts.push('e.season_id=?');vals.push(season)} if(grade){parts.push('e.grade_level_id=?');vals.push(grade)} if(pub){parts.push('e.publisher_id=?');vals.push(pub)} if(q){parts.push('(e.name LIKE ? OR e.code LIKE ?)');vals.push(`%${q}%`,`%${q}%`)}
  const r=await db.prepare(`SELECT e.*,p.name publisher_name,p.short_name publisher_short,g.name grade_name,g.code grade_code,s.name season_name FROM exams e JOIN publishers p ON p.id=e.publisher_id JOIN grade_levels g ON g.id=e.grade_level_id JOIN seasons s ON s.id=e.season_id WHERE ${parts.join(' AND ')} ORDER BY COALESCE(e.application_start_date,'9999-12-31'),g.sort_order,p.name,e.name`).bind(...vals).all();
  return c.json({ok:true,items:r.results});
});
app.post('/api/exams', roles('SUPER_ADMIN','ADMIN'), async c => {
  const db=dbOf(c)!; const u=c.get('user'); const b=await c.req.json<any>();
  for(const k of ['publisher_id','season_id','grade_level_id','name','code']) if(!b[k]) return fail(c,`${k} gerekli.`);
  const rid=id('exam'); await db.prepare(`INSERT INTO exams (id,publisher_id,season_id,grade_level_id,name,code,list_price,purchase_price,default_sale_price,minimum_order,last_order_date,estimated_ship_date,application_start_date,application_end_date,description,status,is_active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
   .bind(rid,b.publisher_id,b.season_id,b.grade_level_id,b.name,b.code,Number(b.list_price||0),Number(b.purchase_price||0),Number(b.default_sale_price||0),Number(b.minimum_order||1),b.last_order_date||null,b.estimated_ship_date||null,b.application_start_date||null,b.application_end_date||null,b.description||null,'ACTIVE',1,now(),now()).run();
  await audit(db,u,'CREATE','exam',rid,undefined,b); return c.json({ok:true,id:rid},201);
});
app.patch('/api/exams/:id', roles('SUPER_ADMIN','ADMIN'), async c => {
  const db=dbOf(c)!; const u=c.get('user'); const b=await c.req.json<any>(); const rid=c.req.param('id');
  await db.prepare(`UPDATE exams SET publisher_id=COALESCE(?,publisher_id),season_id=COALESCE(?,season_id),grade_level_id=COALESCE(?,grade_level_id),name=COALESCE(?,name),code=COALESCE(?,code),list_price=COALESCE(?,list_price),purchase_price=COALESCE(?,purchase_price),default_sale_price=COALESCE(?,default_sale_price),minimum_order=COALESCE(?,minimum_order),last_order_date=?,estimated_ship_date=?,application_start_date=?,application_end_date=?,description=?,is_active=COALESCE(?,is_active),updated_at=? WHERE id=?`)
   .bind(b.publisher_id??null,b.season_id??null,b.grade_level_id??null,b.name??null,b.code??null,b.list_price??null,b.purchase_price??null,b.default_sale_price??null,b.minimum_order??null,b.last_order_date??null,b.estimated_ship_date??null,b.application_start_date??null,b.application_end_date??null,b.description??null,b.is_active===undefined?null:(parseBool(b.is_active)?1:0),now(),rid).run();
  const affected=await db.prepare(`SELECT institution_id,institution_application_date,publisher_application_start,publisher_application_end FROM institution_calendars WHERE exam_id=?`).bind(rid).all<any>();
  for(const cal of affected.results){ if(cal.institution_application_date && b.application_start_date && b.application_end_date && (cal.institution_application_date<b.application_start_date || cal.institution_application_date>b.application_end_date)) await db.prepare(`INSERT INTO notifications (id,user_id,type,title,message,related_id,is_read,created_at) SELECT ?,iu.user_id,'DATE_CHANGE','Deneme tarihi güncellendi','Planladığınız uygulama günü yeni yayınevi tarih aralığının dışında kaldı.',?,0,? FROM institution_users iu WHERE iu.institution_id=?`).bind(id('not'),rid,now(),cal.institution_id).run(); }
  await db.prepare(`UPDATE institution_calendars SET publisher_application_start=COALESCE(?,publisher_application_start),publisher_application_end=COALESCE(?,publisher_application_end),updated_at=? WHERE exam_id=?`).bind(b.application_start_date??null,b.application_end_date??null,now(),rid).run();
  await audit(db,u,'UPDATE','exam',rid,undefined,b); return c.json({ok:true});
});

app.get('/api/institutions', async c => {
  const db=dbOf(c)!; const u=c.get('user'); const q=c.req.query('q')?.trim(); let sql=`SELECT i.*,u.full_name staff_name FROM institutions i LEFT JOIN users u ON u.id=i.staff_id WHERE i.deleted_at IS NULL`; const vals:any[]=[];
  if(u.role==='KURUM'){sql+=' AND i.id=?';vals.push(u.institution_id)} else if(u.role==='PERSONEL'){sql+=' AND i.staff_id=?';vals.push(u.id)} if(q){sql+=' AND (i.name LIKE ? OR i.code LIKE ? OR i.district LIKE ?)';vals.push(`%${q}%`,`%${q}%`,`%${q}%`)} sql+=' ORDER BY i.name';
  const r=await db.prepare(sql).bind(...vals).all(); return c.json({ok:true,items:r.results});
});
app.post('/api/institutions', roles('SUPER_ADMIN','ADMIN'), async c => {
  const db=dbOf(c)!; const u=c.get('user'); const b=await c.req.json<any>(); if(!b.name||!b.code)return fail(c,'Kurum adı ve kodu gerekli.'); const rid=id('inst');
  await db.prepare(`INSERT INTO institutions (id,erp_external_id,name,code,type,is_private,province,district,phone,email,contact_person,staff_id,estimated_capacity,is_active,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
   .bind(rid,b.erp_external_id||null,b.name,b.code,b.type||null,parseBool(b.is_private)?1:0,b.province||'İstanbul',b.district||null,b.phone||null,b.email||null,b.contact_person||null,b.staff_id||null,Number(b.estimated_capacity||0),1,b.notes||null,now(),now()).run();
  if(Array.isArray(b.grade_level_ids)) for(const g of b.grade_level_ids) await db.prepare(`INSERT OR IGNORE INTO institution_grade_levels (id,institution_id,grade_level_id,created_at) VALUES (?,?,?,?)`).bind(id('igl'),rid,g,now()).run();
  await audit(db,u,'CREATE','institution',rid,undefined,b); return c.json({ok:true,id:rid},201);
});
app.patch('/api/institutions/:id', roles('SUPER_ADMIN','ADMIN'), async c => {
  const db=dbOf(c)!; const u=c.get('user'); const b=await c.req.json<any>(); const rid=c.req.param('id');
  await db.prepare(`UPDATE institutions SET name=COALESCE(?,name),code=COALESCE(?,code),type=?,is_private=COALESCE(?,is_private),province=?,district=?,phone=?,email=?,contact_person=?,staff_id=?,estimated_capacity=COALESCE(?,estimated_capacity),notes=?,is_active=COALESCE(?,is_active),updated_at=? WHERE id=?`).bind(b.name??null,b.code??null,b.type??null,b.is_private===undefined?null:(parseBool(b.is_private)?1:0),b.province??null,b.district??null,b.phone??null,b.email??null,b.contact_person??null,b.staff_id??null,b.estimated_capacity??null,b.notes??null,b.is_active===undefined?null:(parseBool(b.is_active)?1:0),now(),rid).run();
  if(Array.isArray(b.grade_level_ids)){await db.prepare(`DELETE FROM institution_grade_levels WHERE institution_id=?`).bind(rid).run(); for(const g of b.grade_level_ids) await db.prepare(`INSERT OR IGNORE INTO institution_grade_levels (id,institution_id,grade_level_id,created_at) VALUES (?,?,?,?)`).bind(id('igl'),rid,g,now()).run();}
  await audit(db,u,'UPDATE','institution',rid,undefined,b); return c.json({ok:true});
});
app.get('/api/institutions/:id/history', async c => {
  const db=dbOf(c)!; const u=c.get('user'); const rid=scopeInstitution(u,c.req.param('id')); if(!rid)return fail(c,'Kurum gerekli.');
  const r=await db.prepare(`SELECT o.*,e.name exam_name,e.code exam_code,p.name publisher_name,g.name grade_name,s.name season_name FROM orders o JOIN exams e ON e.id=o.exam_id JOIN publishers p ON p.id=e.publisher_id JOIN grade_levels g ON g.id=o.grade_level_id JOIN seasons s ON s.id=o.season_id WHERE o.institution_id=? ORDER BY o.created_at DESC`).bind(rid).all(); return c.json({ok:true,items:r.results});
});

app.get('/api/seasons', async c=>{const r=await dbOf(c)!.prepare(`SELECT * FROM seasons ORDER BY year_start DESC`).all();return c.json({ok:true,items:r.results})});
app.post('/api/seasons', roles('SUPER_ADMIN','ADMIN'), async c=>{const db=dbOf(c)!;const b=await c.req.json<any>();if(!b.name||!b.year_start||!b.year_end)return fail(c,'Sezon bilgileri eksik.');const rid=id('season');if(parseBool(b.is_active))await db.prepare(`UPDATE seasons SET is_active=0`).run();await db.prepare(`INSERT INTO seasons(id,name,year_start,year_end,is_active,created_at,updated_at) VALUES(?,?,?,?,?,?,?)`).bind(rid,b.name,Number(b.year_start),Number(b.year_end),parseBool(b.is_active)?1:0,now(),now()).run();return c.json({ok:true,id:rid},201)});
app.get('/api/grade-levels', async c=>{const r=await dbOf(c)!.prepare(`SELECT * FROM grade_levels WHERE is_active=1 ORDER BY sort_order`).all();return c.json({ok:true,items:r.results})});
app.post('/api/grade-levels', roles('SUPER_ADMIN'), async c=>{const db=dbOf(c)!;const b=await c.req.json<any>();if(!b.name||!b.code)return fail(c,'Ad ve kod gerekli.');const rid=id('grade');await db.prepare(`INSERT INTO grade_levels(id,name,code,sort_order,is_active,created_at,updated_at) VALUES(?,?,?,?,1,?,?)`).bind(rid,b.name,b.code,Number(b.sort_order||99),now(),now()).run();return c.json({ok:true,id:rid},201)});

app.get('/api/plans', async c => {
  const db=dbOf(c)!; const u=c.get('user'); const inst=scopeInstitution(u,c.req.query('institution_id')); if(!inst)return fail(c,'Kurum seçiniz.');
  const season=c.req.query('season_id'); const grade=c.req.query('grade_level_id'); const month=c.req.query('month'); const vals:any[]=[inst]; let w=`p.institution_id=?`;
  if(season){w+=' AND p.season_id=?';vals.push(season)} if(grade){w+=' AND p.grade_level_id=?';vals.push(grade)}
  if(month){w+=` AND strftime('%m',COALESCE(c.institution_application_date,e.application_start_date))=?`;vals.push(month.padStart(2,'0'))}
  const r=await db.prepare(`SELECT p.*,e.name exam_name,e.code exam_code,e.last_order_date,e.estimated_ship_date,e.application_start_date,e.application_end_date,e.default_sale_price,pub.name publisher_name,pub.short_name publisher_short,g.name grade_name,g.code grade_code,g.sort_order,c.institution_application_date,c.publisher_application_start,c.publisher_application_end,o.id order_id,o.quantity order_quantity,o.status order_status FROM institution_exam_plans p JOIN exams e ON e.id=p.exam_id JOIN publishers pub ON pub.id=e.publisher_id JOIN grade_levels g ON g.id=p.grade_level_id LEFT JOIN institution_calendars c ON c.institution_id=p.institution_id AND c.exam_id=p.exam_id LEFT JOIN orders o ON o.institution_id=p.institution_id AND o.exam_id=p.exam_id AND o.status!='IPTAL' WHERE ${w} ORDER BY COALESCE(c.institution_application_date,e.application_start_date),g.sort_order,pub.name`).bind(...vals).all();
  return c.json({ok:true,items:r.results});
});
app.post('/api/plans', async c => {
  const db=dbOf(c)!; const u=c.get('user'); const b=await c.req.json<any>(); const inst=scopeInstitution(u,b.institution_id); if(!inst)return fail(c,'Kurum seçiniz.');
  if(u.role==='PERSONEL'){const own=await db.prepare(`SELECT id FROM institutions WHERE id=? AND staff_id=?`).bind(inst,u.id).first();if(!own)return fail(c,'Bu kurum sizin portföyünüzde değil.',403)}
  const examIds:Array<string>=Array.isArray(b.exam_ids)?b.exam_ids:[]; if(!examIds.length)return fail(c,'En az bir deneme seçiniz.');
  let added=0; for(const examId of examIds){const ex=await db.prepare(`SELECT id,season_id,grade_level_id,application_start_date,application_end_date FROM exams WHERE id=? AND is_active=1`).bind(examId).first<any>();if(!ex)continue;const pid=id('plan');const res=await db.prepare(`INSERT OR IGNORE INTO institution_exam_plans(id,institution_id,season_id,exam_id,grade_level_id,status,planned_quantity,created_at,updated_at) VALUES(?,?,?,?,?,'PLANLANDI',?,?,?)`).bind(pid,inst,ex.season_id,ex.id,ex.grade_level_id,b.planned_quantity||null,now(),now()).run();if((res.meta?.changes||0)>0){added++;await db.prepare(`INSERT OR IGNORE INTO institution_calendars(id,institution_id,season_id,exam_id,publisher_application_start,publisher_application_end,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)`).bind(id('cal'),inst,ex.season_id,ex.id,ex.application_start_date,ex.application_end_date,now(),now()).run();const staff=await db.prepare(`SELECT staff_id FROM institutions WHERE id=?`).bind(inst).first<any>();if(staff?.staff_id)await db.prepare(`INSERT OR IGNORE INTO sales_opportunities(id,institution_id,exam_id,staff_id,priority,status,notes,created_at,updated_at) VALUES(?,?,?,?,?,'ARANACAK','Kurum sezon planına ekledi',?,?)`).bind(id('opp'),inst,ex.id,staff.staff_id,'HIGH',now(),now()).run();}}
  return c.json({ok:true,added});
});
app.patch('/api/plans/:id', async c => {
  const db=dbOf(c)!; const u=c.get('user'); const b=await c.req.json<any>(); const rid=c.req.param('id'); const row=await db.prepare(`SELECT * FROM institution_exam_plans WHERE id=?`).bind(rid).first<any>();if(!row)return fail(c,'Plan bulunamadı.',404);if(u.role==='KURUM'&&row.institution_id!==u.institution_id)return fail(c,'Yetkisiz.',403);
  if(b.institution_application_date!==undefined){const ex=await db.prepare(`SELECT application_start_date,application_end_date FROM exams WHERE id=?`).bind(row.exam_id).first<any>();const outside=b.institution_application_date&&ex?.application_start_date&&ex?.application_end_date&&(b.institution_application_date<ex.application_start_date||b.institution_application_date>ex.application_end_date);if(outside){const setting=await db.prepare(`SELECT value FROM system_settings WHERE key='allow_drag_drop_outside_range'`).first<any>();if(setting?.value!=='1')return fail(c,`Seçilen tarih yayınevinin ${ex.application_start_date} – ${ex.application_end_date} aralığının dışında.`)}await db.prepare(`UPDATE institution_calendars SET institution_application_date=?,updated_at=? WHERE institution_id=? AND exam_id=?`).bind(b.institution_application_date||null,now(),row.institution_id,row.exam_id).run();}
  if(b.status||b.planned_quantity!==undefined||b.notes!==undefined){await db.prepare(`UPDATE institution_exam_plans SET status=COALESCE(?,status),planned_quantity=COALESCE(?,planned_quantity),notes=COALESCE(?,notes),updated_at=? WHERE id=?`).bind(b.status??null,b.planned_quantity??null,b.notes??null,now(),rid).run();}
  await audit(db,u,'UPDATE','institution_exam_plan',rid,row,b);return c.json({ok:true});
});
app.delete('/api/plans/:id', async c => {
  const db=dbOf(c)!; const u=c.get('user'); const rid=c.req.param('id'); const row=await db.prepare(`SELECT * FROM institution_exam_plans WHERE id=?`).bind(rid).first<any>();if(!row)return fail(c,'Plan bulunamadı.',404);if(u.role==='KURUM'&&row.institution_id!==u.institution_id)return fail(c,'Yetkisiz.',403);const order=await db.prepare(`SELECT id FROM orders WHERE institution_id=? AND exam_id=? AND status!='IPTAL'`).bind(row.institution_id,row.exam_id).first();if(order)return fail(c,'Bu deneme için aktif sipariş var; takvimden kaldırılamaz.');await db.prepare(`DELETE FROM institution_calendars WHERE institution_id=? AND exam_id=?`).bind(row.institution_id,row.exam_id).run();await db.prepare(`DELETE FROM institution_exam_plans WHERE id=?`).bind(rid).run();return c.json({ok:true});
});

app.get('/api/opportunities', async c=>{const db=dbOf(c)!;const u=c.get('user');let sql=`SELECT so.*,i.name institution_name,i.district,e.name exam_name,e.last_order_date,p.name publisher_name,g.name grade_name FROM sales_opportunities so JOIN institutions i ON i.id=so.institution_id JOIN exams e ON e.id=so.exam_id JOIN publishers p ON p.id=e.publisher_id JOIN grade_levels g ON g.id=e.grade_level_id WHERE 1=1`;const vals:any[]=[];if(u.role==='PERSONEL'){sql+=' AND so.staff_id=?';vals.push(u.id)}const status=c.req.query('status');if(status){sql+=' AND so.status=?';vals.push(status)}sql+=` ORDER BY CASE so.priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,e.last_order_date`;const r=await db.prepare(sql).bind(...vals).all();return c.json({ok:true,items:r.results})});
app.patch('/api/opportunities/:id', roles('SUPER_ADMIN','ADMIN','PERSONEL'), async c=>{const db=dbOf(c)!;const u=c.get('user');const b=await c.req.json<any>();const rid=c.req.param('id');const row=await db.prepare(`SELECT * FROM sales_opportunities WHERE id=?`).bind(rid).first<any>();if(!row)return fail(c,'Kayıt yok.',404);if(u.role==='PERSONEL'&&row.staff_id!==u.id)return fail(c,'Yetkisiz.',403);await db.prepare(`UPDATE sales_opportunities SET status=COALESCE(?,status),priority=COALESCE(?,priority),notes=COALESCE(?,notes),loss_reason=COALESCE(?,loss_reason),updated_at=? WHERE id=?`).bind(b.status??null,b.priority??null,b.notes??null,b.loss_reason??null,now(),rid).run();await db.prepare(`INSERT INTO sales_opportunity_history(id,opportunity_id,old_status,new_status,changed_by,notes,created_at) VALUES(?,?,?,?,?,?,?)`).bind(id('oh'),rid,row.status,b.status||row.status,u.id,b.notes||null,now()).run();return c.json({ok:true})});
app.post('/api/opportunities/generate', roles('SUPER_ADMIN','ADMIN'), async c=>{const db=dbOf(c)!;const r=await db.prepare(`SELECT p.institution_id,p.exam_id,i.staff_id,e.last_order_date FROM institution_exam_plans p JOIN institutions i ON i.id=p.institution_id JOIN exams e ON e.id=p.exam_id LEFT JOIN orders o ON o.institution_id=p.institution_id AND o.exam_id=p.exam_id AND o.status!='IPTAL' WHERE o.id IS NULL AND i.staff_id IS NOT NULL`).all<any>();let added=0;for(const x of r.results){const days=x.last_order_date?Math.ceil((new Date(x.last_order_date).getTime()-Date.now())/86400000):99;const priority=days<=7?'HIGH':days<=15?'MEDIUM':'LOW';const rr=await db.prepare(`INSERT OR IGNORE INTO sales_opportunities(id,institution_id,exam_id,staff_id,priority,status,notes,created_at,updated_at) VALUES(?,?,?,?,?,'ARANACAK','Planlandı fakat siparişe dönüşmedi',?,?)`).bind(id('opp'),x.institution_id,x.exam_id,x.staff_id,priority,now(),now()).run();added+=rr.meta?.changes||0;}return c.json({ok:true,added})});

app.get('/api/orders', async c=>{const db=dbOf(c)!;const u=c.get('user');let sql=`SELECT o.*,i.name institution_name,e.name exam_name,e.code exam_code,p.name publisher_name,g.name grade_name,u.full_name staff_name FROM orders o JOIN institutions i ON i.id=o.institution_id JOIN exams e ON e.id=o.exam_id JOIN publishers p ON p.id=e.publisher_id JOIN grade_levels g ON g.id=o.grade_level_id LEFT JOIN users u ON u.id=o.staff_id WHERE 1=1`;const vals:any[]=[];if(u.role==='KURUM'){sql+=' AND o.institution_id=?';vals.push(u.institution_id)}else if(u.role==='PERSONEL'){sql+=' AND o.staff_id=?';vals.push(u.id)}const status=c.req.query('status');if(status){sql+=' AND o.status=?';vals.push(status)}sql+=' ORDER BY o.created_at DESC';const r=await db.prepare(sql).bind(...vals).all();return c.json({ok:true,items:r.results})});
app.post('/api/orders', async c=>{const db=dbOf(c)!;const u=c.get('user');const b=await c.req.json<any>();const inst=scopeInstitution(u,b.institution_id);if(!inst||!b.exam_id||!Number(b.quantity))return fail(c,'Kurum, deneme ve adet gerekli.');const ex=await db.prepare(`SELECT * FROM exams WHERE id=?`).bind(b.exam_id).first<any>();if(!ex)return fail(c,'Deneme bulunamadı.',404);const qty=Number(b.quantity),unit=Number(b.unit_price??ex.default_sale_price);if(qty<=0)return fail(c,'Adet 0’dan büyük olmalı.');const rid=id('ord');const staff=u.role==='PERSONEL'?u.id:(b.staff_id||((await db.prepare(`SELECT staff_id FROM institutions WHERE id=?`).bind(inst).first<any>())?.staff_id)||null);await db.prepare(`INSERT INTO orders(id,institution_id,exam_id,season_id,grade_level_id,quantity,unit_price,total_price,staff_id,status,notes,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,'SIPARIS_ALINDI',?,?,?)`).bind(rid,inst,ex.id,ex.season_id,ex.grade_level_id,qty,unit,qty*unit,staff,b.notes||null,now(),now()).run();await db.prepare(`UPDATE institution_exam_plans SET status='SIPARIS_VERILDI',updated_at=? WHERE institution_id=? AND exam_id=?`).bind(now(),inst,ex.id).run();await db.prepare(`UPDATE sales_opportunities SET status='SIPARIS_VERDI',updated_at=? WHERE institution_id=? AND exam_id=?`).bind(now(),inst,ex.id).run();await audit(db,u,'CREATE','order',rid,undefined,b);return c.json({ok:true,id:rid},201)});
app.patch('/api/orders/:id', roles('SUPER_ADMIN','ADMIN','PERSONEL','OPERASYON'), async c=>{const db=dbOf(c)!;const u=c.get('user');const rid=c.req.param('id');const b=await c.req.json<any>();const row=await db.prepare(`SELECT * FROM orders WHERE id=?`).bind(rid).first<any>();if(!row)return fail(c,'Sipariş yok.',404);if(u.role==='PERSONEL'&&row.staff_id!==u.id)return fail(c,'Yetkisiz.',403);const qty=b.quantity===undefined?row.quantity:Number(b.quantity);const unit=b.unit_price===undefined?row.unit_price:Number(b.unit_price);await db.prepare(`UPDATE orders SET quantity=?,unit_price=?,total_price=?,status=COALESCE(?,status),notes=COALESCE(?,notes),updated_at=? WHERE id=?`).bind(qty,unit,qty*unit,b.status??null,b.notes??null,now(),rid).run();await audit(db,u,'UPDATE','order',rid,row,b);return c.json({ok:true})});

app.get('/api/publisher-orders', roles('SUPER_ADMIN','ADMIN','OPERASYON'), async c=>{const r=await dbOf(c)!.prepare(`SELECT po.*,p.name publisher_name,e.name exam_name,e.code exam_code,g.name grade_name FROM publisher_orders po JOIN publishers p ON p.id=po.publisher_id JOIN exams e ON e.id=po.exam_id JOIN grade_levels g ON g.id=e.grade_level_id ORDER BY po.created_at DESC`).all();return c.json({ok:true,items:r.results})});
app.post('/api/publisher-orders', roles('SUPER_ADMIN','ADMIN','OPERASYON'), async c=>{const db=dbOf(c)!;const u=c.get('user');const b=await c.req.json<any>();const orderIds:Array<string>=b.order_ids||[];if(!orderIds.length)return fail(c,'En az bir kurum siparişi seçiniz.');const placeholders=orderIds.map(()=>'?').join(',');const rows=await db.prepare(`SELECT o.*,e.publisher_id FROM orders o JOIN exams e ON e.id=o.exam_id WHERE o.id IN (${placeholders}) AND o.status!='IPTAL'`).bind(...orderIds).all<any>();if(!rows.results.length)return fail(c,'Uygun sipariş bulunamadı.');const examId=rows.results[0].exam_id;if(rows.results.some(x=>x.exam_id!==examId))return fail(c,'Toplu siparişte tüm kayıtlar aynı denemeye ait olmalı.');const total=rows.results.reduce((s,x)=>s+Number(x.quantity),0);const rid=id('po');await db.prepare(`INSERT INTO publisher_orders(id,publisher_id,exam_id,total_quantity,order_date,received_quantity,missing_quantity,status,created_at,updated_at) VALUES(?,?,?,?,?,0,?,'GONDERILDI',?,?)`).bind(rid,rows.results[0].publisher_id,examId,total,b.order_date||new Date().toISOString().slice(0,10),total,now(),now()).run();for(const x of rows.results){await db.prepare(`INSERT INTO publisher_order_allocations(id,publisher_order_id,order_id,quantity,created_at) VALUES(?,?,?,?,?)`).bind(id('poa'),rid,x.id,x.quantity,now()).run();await db.prepare(`UPDATE orders SET status='YAYINEVINE_GECILDI',updated_at=? WHERE id=?`).bind(now(),x.id).run();}await audit(db,u,'CREATE','publisher_order',rid,undefined,{total,orderIds});return c.json({ok:true,id:rid,total},201)});
app.patch('/api/publisher-orders/:id', roles('SUPER_ADMIN','ADMIN','OPERASYON'), async c=>{const db=dbOf(c)!;const rid=c.req.param('id');const b=await c.req.json<any>();await db.prepare(`UPDATE publisher_orders SET status=COALESCE(?,status),order_number=COALESCE(?,order_number),invoice_number=COALESCE(?,invoice_number),courier=COALESCE(?,courier),tracking_number=COALESCE(?,tracking_number),updated_at=? WHERE id=?`).bind(b.status??null,b.order_number??null,b.invoice_number??null,b.courier??null,b.tracking_number??null,now(),rid).run();return c.json({ok:true})});
app.post('/api/goods-receipts', roles('SUPER_ADMIN','ADMIN','OPERASYON'), async c=>{const db=dbOf(c)!;const b=await c.req.json<any>();if(!b.publisher_order_id||!Number(b.received_quantity))return fail(c,'Sipariş ve gelen adet gerekli.');const po=await db.prepare(`SELECT * FROM publisher_orders WHERE id=?`).bind(b.publisher_order_id).first<any>();if(!po)return fail(c,'Toplu sipariş bulunamadı.',404);const incoming=Number(b.received_quantity);const newReceived=Number(po.received_quantity||0)+incoming;const missing=Math.max(0,Number(po.total_quantity)-newReceived);const status=missing===0?'TAM_GELDI':'KISMI_GELDI';await db.prepare(`INSERT INTO goods_receipts(id,publisher_order_id,received_date,received_quantity,missing_quantity,notes,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?, ?,?)`).bind(id('gr'),po.id,b.received_date||new Date().toISOString().slice(0,10),incoming,missing,b.notes||null,status,now(),now()).run();await db.prepare(`UPDATE publisher_orders SET received_quantity=?,missing_quantity=?,status=?,updated_at=? WHERE id=?`).bind(newReceived,missing,status,now(),po.id).run();if(missing===0){const alloc=await db.prepare(`SELECT order_id FROM publisher_order_allocations WHERE publisher_order_id=?`).bind(po.id).all<any>();for(const a of alloc.results)await db.prepare(`UPDATE orders SET status='URUN_GELDI',updated_at=? WHERE id=?`).bind(now(),a.order_id).run();}return c.json({ok:true,received:newReceived,missing,status})});

app.get('/api/deliveries', async c=>{const db=dbOf(c)!;const u=c.get('user');let sql=`SELECT d.*,o.institution_id,o.exam_id,i.name institution_name,e.name exam_name,g.name grade_name FROM deliveries d JOIN orders o ON o.id=d.order_id JOIN institutions i ON i.id=o.institution_id JOIN exams e ON e.id=o.exam_id JOIN grade_levels g ON g.id=o.grade_level_id WHERE 1=1`;const vals:any[]=[];if(u.role==='KURUM'){sql+=' AND o.institution_id=?';vals.push(u.institution_id)}else if(u.role==='PERSONEL'){sql+=' AND o.staff_id=?';vals.push(u.id)}sql+=' ORDER BY d.created_at DESC';const r=await db.prepare(sql).bind(...vals).all();return c.json({ok:true,items:r.results})});
app.post('/api/deliveries', roles('SUPER_ADMIN','ADMIN','OPERASYON'), async c=>{const db=dbOf(c)!;const b=await c.req.json<any>();if(!b.order_id||!Number(b.quantity))return fail(c,'Sipariş ve adet gerekli.');const rid=id('del');await db.prepare(`INSERT INTO deliveries(id,order_id,quantity,delivery_method,carrier,tracking_number,delivery_date,delivered_by,status,notes,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).bind(rid,b.order_id,Number(b.quantity),b.delivery_method||null,b.carrier||null,b.tracking_number||null,b.delivery_date||null,b.delivered_by||null,b.status||'HAZIRLANIYOR',b.notes||null,now(),now()).run();return c.json({ok:true,id:rid},201)});
app.patch('/api/deliveries/:id', roles('SUPER_ADMIN','ADMIN','OPERASYON'), async c=>{const db=dbOf(c)!;const b=await c.req.json<any>();const rid=c.req.param('id');await db.prepare(`UPDATE deliveries SET quantity=COALESCE(?,quantity),delivery_method=COALESCE(?,delivery_method),carrier=COALESCE(?,carrier),tracking_number=COALESCE(?,tracking_number),delivery_date=COALESCE(?,delivery_date),delivered_by=COALESCE(?,delivered_by),status=COALESCE(?,status),notes=COALESCE(?,notes),updated_at=? WHERE id=?`).bind(b.quantity??null,b.delivery_method??null,b.carrier??null,b.tracking_number??null,b.delivery_date??null,b.delivered_by??null,b.status??null,b.notes??null,now(),rid).run();if(b.status==='TESLIM_EDILDI'){const row=await db.prepare(`SELECT order_id FROM deliveries WHERE id=?`).bind(rid).first<any>();if(row){await db.prepare(`UPDATE orders SET status='TESLIM_EDILDI',updated_at=? WHERE id=?`).bind(now(),row.order_id).run();const o=await db.prepare(`SELECT institution_id,exam_id FROM orders WHERE id=?`).bind(row.order_id).first<any>();if(o)await db.prepare(`UPDATE institution_exam_plans SET status='TESLIM_EDILDI',updated_at=? WHERE institution_id=? AND exam_id=?`).bind(now(),o.institution_id,o.exam_id).run();}}return c.json({ok:true})});

app.get('/api/reports/summary', roles('SUPER_ADMIN','ADMIN','PERSONEL'), async c=>{const db=dbOf(c)!;const u=c.get('user');const staff=u.role==='PERSONEL'?u.id:null;const where=staff?'WHERE o.staff_id=?':'';const byPublisher=staff?await db.prepare(`SELECT p.name label,SUM(o.quantity) quantity,SUM(o.total_price) revenue,COUNT(*) orders FROM orders o JOIN exams e ON e.id=o.exam_id JOIN publishers p ON p.id=e.publisher_id ${where} GROUP BY p.id ORDER BY revenue DESC`).bind(staff).all():await db.prepare(`SELECT p.name label,SUM(o.quantity) quantity,SUM(o.total_price) revenue,COUNT(*) orders FROM orders o JOIN exams e ON e.id=o.exam_id JOIN publishers p ON p.id=e.publisher_id GROUP BY p.id ORDER BY revenue DESC`).all();const byGrade=staff?await db.prepare(`SELECT g.name label,SUM(o.quantity) quantity,SUM(o.total_price) revenue,COUNT(*) orders FROM orders o JOIN grade_levels g ON g.id=o.grade_level_id ${where} GROUP BY g.id ORDER BY g.sort_order`).bind(staff).all():await db.prepare(`SELECT g.name label,SUM(o.quantity) quantity,SUM(o.total_price) revenue,COUNT(*) orders FROM orders o JOIN grade_levels g ON g.id=o.grade_level_id GROUP BY g.id ORDER BY g.sort_order`).all();const losses=staff?await db.prepare(`SELECT COALESCE(loss_reason,'Belirtilmedi') label,COUNT(*) count FROM sales_opportunities WHERE staff_id=? AND status IN ('ILGILENMIYOR','BASKA_YAYINEVI_ALDI','KATILMAYACAK','ULASILAMADI') GROUP BY loss_reason ORDER BY count DESC`).bind(staff).all():await db.prepare(`SELECT COALESCE(loss_reason,'Belirtilmedi') label,COUNT(*) count FROM sales_opportunities WHERE status IN ('ILGILENMIYOR','BASKA_YAYINEVI_ALDI','KATILMAYACAK','ULASILAMADI') GROUP BY loss_reason ORDER BY count DESC`).all();const planned=await db.prepare(`SELECT COUNT(*) total,SUM(CASE WHEN status IN ('SIPARIS_VERILDI','ONAYLANDI','TEDARIK','TESLIM_EDILDI') THEN 1 ELSE 0 END) converted FROM institution_exam_plans`).first<any>();return c.json({ok:true,by_publisher:byPublisher.results,by_grade:byGrade.results,losses:losses.results,planned})});

app.get('/api/users', roles('SUPER_ADMIN','ADMIN'), async c=>{const r=await dbOf(c)!.prepare(`SELECT id,email,full_name,role,status,institution_id,must_change_password,created_at FROM users WHERE deleted_at IS NULL ORDER BY full_name`).all();return c.json({ok:true,items:r.results})});
app.post('/api/users', roles('SUPER_ADMIN'), async c=>{const db=dbOf(c)!;const b=await c.req.json<any>();if(!b.email||!b.full_name||!b.password)return fail(c,'E-posta, ad ve geçici şifre gerekli.');const rid=id('user');await db.prepare(`INSERT INTO users(id,email,password_hash,full_name,role,status,institution_id,must_change_password,created_at,updated_at) VALUES(?,?,?,?,?,'ACTIVE',?,1,?,?)`).bind(rid,String(b.email).toLowerCase(),await hashPassword(b.password),b.full_name,b.role||'PERSONEL',b.institution_id||null,now(),now()).run();if(b.institution_id)await db.prepare(`INSERT OR IGNORE INTO institution_users(id,institution_id,user_id,role,created_at) VALUES(?,?,?,?,?)`).bind(id('iu'),b.institution_id,rid,b.role||'KURUM',now()).run();return c.json({ok:true,id:rid},201)});
app.patch('/api/users/:id', roles('SUPER_ADMIN'), async c=>{const db=dbOf(c)!;const b=await c.req.json<any>();const rid=c.req.param('id');await db.prepare(`UPDATE users SET full_name=COALESCE(?,full_name),role=COALESCE(?,role),status=COALESCE(?,status),institution_id=?,updated_at=? WHERE id=?`).bind(b.full_name??null,b.role??null,b.status??null,b.institution_id??null,now(),rid).run();return c.json({ok:true})});

app.onError((err,c)=>{console.error(err);return c.json({ok:false,error:'Sunucu hatası',details:c.env.APP_ENV==='production'?undefined:String(err)},500)});
app.notFound(c=>c.json({ok:false,error:'API bulunamadı'},404));

export default app;
