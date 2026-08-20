import { now } from './core';

async function columns(db: D1Database, table: string) {
  const r = await db.prepare(`PRAGMA table_info(${table})`).all<any>();
  return new Set((r.results || []).map((x: any) => String(x.name)));
}

async function addColumn(db: D1Database, table: string, name: string, sqlType: string) {
  const cols = await columns(db, table);
  if (!cols.has(name)) await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${name} ${sqlType}`).run();
}

export async function ensureFinalSchema(db: D1Database) {
  await addColumn(db, 'users', 'login_code', 'TEXT');
  await addColumn(db, 'users', 'phone', 'TEXT');
  await addColumn(db, 'users', 'notification_enabled', 'INTEGER DEFAULT 0');
  await addColumn(db, 'exams', 'exam_type', "TEXT DEFAULT 'DENEME'");
  await addColumn(db, 'exams', 'subject', 'TEXT');
  await addColumn(db, 'exams', 'difficulty_level', 'TEXT');
  await addColumn(db, 'orders', 'confirmed_at', 'DATETIME');
  await addColumn(db, 'orders', 'sent_to_institution_at', 'DATETIME');
  await addColumn(db, 'orders', 'delivered_at', 'DATETIME');
  await addColumn(db, 'orders', 'exam_applied_at', 'DATETIME');
  await addColumn(db, 'orders', 'exam_applied_by', 'TEXT');
  await addColumn(db, 'orders', 'deleted_at', 'DATETIME');
  await addColumn(db, 'publisher_orders', 'b2b_ordered_at', 'DATETIME');
  await addColumn(db, 'publisher_orders', 'b2b_notes', 'TEXT');
  await addColumn(db, 'tasks', 'priority', "TEXT DEFAULT 'MEDIUM'");
  await addColumn(db, 'tasks', 'completed_at', 'DATETIME');

  await db.prepare(`CREATE TABLE IF NOT EXISTS digital_exam_assets (
    id TEXT PRIMARY KEY,
    exam_id TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    title TEXT,
    format_name TEXT,
    form_code TEXT,
    file_name TEXT,
    content_type TEXT,
    file_size INTEGER DEFAULT 0,
    storage_key TEXT,
    external_url TEXT,
    is_active INTEGER DEFAULT 1,
    created_by TEXT,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (exam_id) REFERENCES exams(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`).run();
  await addColumn(db, 'digital_exam_assets', 'form_code', 'TEXT');

  await db.prepare(`CREATE TABLE IF NOT EXISTS user_permission_overrides (
    user_id TEXT NOT NULL,
    permission_code TEXT NOT NULL,
    is_allowed INTEGER NOT NULL DEFAULT 1,
    updated_by TEXT,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (user_id, permission_code),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id)
  )`).run();

  await db.prepare(`CREATE TABLE IF NOT EXISTS reminder_delivery_log (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    exam_id TEXT NOT NULL,
    reminder_type TEXT NOT NULL,
    reminder_date DATE NOT NULL,
    channel TEXT NOT NULL DEFAULT 'IN_APP',
    status TEXT NOT NULL DEFAULT 'CREATED',
    provider_response TEXT,
    created_at DATETIME NOT NULL,
    UNIQUE(user_id, exam_id, reminder_type, reminder_date, channel),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (exam_id) REFERENCES exams(id)
  )`).run();

  await db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_login_code ON users(login_code) WHERE login_code IS NOT NULL`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_exams_exam_type ON exams(exam_type)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_exams_difficulty ON exams(difficulty_level)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_orders_exam_applied ON orders(exam_applied_at)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON orders(deleted_at)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_digital_exam_assets_exam ON digital_exam_assets(exam_id,is_active)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_digital_exam_assets_type ON digital_exam_assets(asset_type)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_digital_exam_assets_form ON digital_exam_assets(exam_id,form_code,asset_type)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_user_permission_user ON user_permission_overrides(user_id)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_reminder_delivery_user_date ON reminder_delivery_log(user_id,reminder_date)`).run();

  const grades = [
    ['grade_1','1. Sınıf','1',1],['grade_2','2. Sınıf','2',2],['grade_3','3. Sınıf','3',3],['grade_4','4. Sınıf','4',4],
    ['grade_5','5. Sınıf','5',5],['grade_6','6. Sınıf','6',6],['grade_7','7. Sınıf','7',7],['grade_8','8. Sınıf','8',8],
    ['grade_9','9. Sınıf','9',9],['grade_10','10. Sınıf','10',10],['grade_11','11. Sınıf','11',11],
    ['grade_tyt','TYT','TYT',12],['grade_ayt','AYT','AYT',13],['grade_ydt','YDT','YDT',14]
  ];
  for (const [id,name,code,sort] of grades) {
    await db.prepare(`INSERT INTO grade_levels(id,name,code,sort_order,is_active,created_at,updated_at) VALUES(?,?,?,?,1,?,?) ON CONFLICT(code) DO UPDATE SET name=excluded.name, sort_order=excluded.sort_order, is_active=1, updated_at=excluded.updated_at`)
      .bind(id,name,code,sort,now(),now()).run();
  }

  await db.prepare(`INSERT INTO system_settings(key,value,data_type,updated_at) VALUES('final_schema_version','2026-08-21-permissions-reminders-orders','TEXT',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`).bind(now()).run();
}

export const subjectOptions = [
  'İngilizce','Matematik','Türkçe','Fen Bilimleri','Sosyal Bilgiler','Fizik','Kimya','Biyoloji',
  'Türk Dili ve Edebiyatı','Tarih','Coğrafya','Din Kültürü','Yabancı Dil','Diğer'
];
