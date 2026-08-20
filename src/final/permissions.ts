import type { UserRow } from './core';

export const PERMISSION_CATALOG = [
  { code: 'CATALOG_VIEW', group: 'Denemeler', label: 'Deneme kataloğunu görüntüle' },
  { code: 'EXAMS_MANAGE', group: 'Denemeler', label: 'Deneme ekle / düzenle / pasife al' },
  { code: 'DIGITAL_VIEW', group: 'Denemeler', label: 'Cevap anahtarları ve dijital dosyaları görüntüle' },
  { code: 'DIGITAL_MANAGE', group: 'Denemeler', label: 'Cevap anahtarı / dijital dosya yönet' },
  { code: 'INSTITUTIONS_VIEW', group: 'Kurumlar', label: 'Kurumları ve planları görüntüle' },
  { code: 'INSTITUTIONS_MANAGE', group: 'Kurumlar', label: 'Kurum ekle / düzenle / personel ata' },
  { code: 'OPPORTUNITIES_VIEW', group: 'Satış', label: 'Satış fırsatlarını görüntüle ve takip et' },
  { code: 'ORDERS_VIEW', group: 'Sipariş', label: 'Siparişleri görüntüle' },
  { code: 'ORDERS_CREATE', group: 'Sipariş', label: 'Kurum için sipariş oluştur' },
  { code: 'ORDERS_EDIT', group: 'Sipariş', label: 'Sipariş düzenle' },
  { code: 'ORDERS_DELETE', group: 'Sipariş', label: 'Sipariş sil / iptal et' },
  { code: 'PUBLISHERS_VIEW', group: 'Yayınevleri', label: 'Yayınevlerini ve denemelerini görüntüle' },
  { code: 'PUBLISHERS_MANAGE', group: 'Yayınevleri', label: 'Yayınevi yönet' },
  { code: 'OPERATIONS_VIEW', group: 'Operasyon', label: 'Tedarik ve teslimatları görüntüle' },
  { code: 'OPERATIONS_MANAGE', group: 'Operasyon', label: 'Tedarik / teslimat işlemi yap' },
  { code: 'REPORTS_VIEW', group: 'Raporlar', label: 'Ticari raporları görüntüle' },
  { code: 'TASKS_VIEW', group: 'Görevler', label: 'Kendine atanan görevleri görüntüle ve tamamla' }
] as const;

export type PermissionCode = typeof PERMISSION_CATALOG[number]['code'];

const ALL = PERMISSION_CATALOG.map(x => x.code);

export const ROLE_DEFAULTS: Record<string, string[]> = {
  SUPER_ADMIN: ALL,
  ADMIN: ALL.filter(x => x !== 'DIGITAL_MANAGE'),
  PERSONEL: ['CATALOG_VIEW','DIGITAL_VIEW','INSTITUTIONS_VIEW','OPPORTUNITIES_VIEW','ORDERS_VIEW','ORDERS_CREATE','ORDERS_EDIT','PUBLISHERS_VIEW','TASKS_VIEW'],
  OPERASYON: ['CATALOG_VIEW','DIGITAL_VIEW','ORDERS_VIEW','PUBLISHERS_VIEW','OPERATIONS_VIEW','OPERATIONS_MANAGE','TASKS_VIEW'],
  KURUM: ['DIGITAL_VIEW','ORDERS_VIEW','ORDERS_CREATE','ORDERS_EDIT']
};

export async function effectivePermissions(db: D1Database, user: UserRow) {
  if (user.role === 'SUPER_ADMIN') return new Set(ALL);
  const set = new Set(ROLE_DEFAULTS[user.role] || []);
  const rows = await db.prepare(`SELECT permission_code,is_allowed FROM user_permission_overrides WHERE user_id=?`).bind(user.id).all<any>();
  for (const row of rows.results || []) {
    if (row.is_allowed) set.add(String(row.permission_code));
    else set.delete(String(row.permission_code));
  }
  return set;
}

export async function hasPermission(db: D1Database, user: UserRow, code: string) {
  if (user.role === 'SUPER_ADMIN') return true;
  const set = await effectivePermissions(db, user);
  return set.has(code);
}
