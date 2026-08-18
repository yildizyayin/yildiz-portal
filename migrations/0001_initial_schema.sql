-- USERS & AUTHENTICATION
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'PERSONEL',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  institution_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME
);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id TEXT NOT NULL,
  permission_id TEXT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (permission_id) REFERENCES permissions(id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- SYSTEM CONFIGURATION
CREATE TABLE IF NOT EXISTS seasons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  year_start INTEGER NOT NULL,
  year_end INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(year_start, year_end)
);

CREATE TABLE IF NOT EXISTS grade_levels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  sort_order INTEGER,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  data_type TEXT DEFAULT 'TEXT',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- PUBLISHERS
CREATE TABLE IF NOT EXISTS publishers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  logo_url TEXT,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  sales_representative TEXT,
  order_contact_info TEXT,
  minimum_order INTEGER DEFAULT 1,
  default_discount REAL DEFAULT 0,
  payment_terms TEXT,
  delivery_days INTEGER DEFAULT 14,
  notes TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME
);

-- EXAMS (DENEMELER)
CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  publisher_id TEXT NOT NULL,
  season_id TEXT NOT NULL,
  grade_level_id TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  list_price INTEGER NOT NULL,
  purchase_price INTEGER NOT NULL,
  default_sale_price INTEGER NOT NULL,
  minimum_order INTEGER DEFAULT 1,
  last_order_date DATE,
  estimated_ship_date DATE,
  application_start_date DATE,
  application_end_date DATE,
  description TEXT,
  status TEXT DEFAULT 'ACTIVE',
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  FOREIGN KEY (publisher_id) REFERENCES publishers(id),
  FOREIGN KEY (season_id) REFERENCES seasons(id),
  FOREIGN KEY (grade_level_id) REFERENCES grade_levels(id),
  UNIQUE(code, season_id)
);

-- INSTITUTIONS (KURUMLAR)
CREATE TABLE IF NOT EXISTS institutions (
  id TEXT PRIMARY KEY,
  erp_external_id TEXT,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT,
  is_private BOOLEAN,
  province TEXT,
  district TEXT,
  phone TEXT,
  email TEXT,
  contact_person TEXT,
  staff_id TEXT,
  estimated_capacity INTEGER,
  is_active BOOLEAN DEFAULT 1,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  UNIQUE(code),
  UNIQUE(erp_external_id)
);

CREATE TABLE IF NOT EXISTS institution_users (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'KURUM',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(institution_id, user_id)
);

CREATE TABLE IF NOT EXISTS institution_grade_levels (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  grade_level_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id),
  FOREIGN KEY (grade_level_id) REFERENCES grade_levels(id),
  UNIQUE(institution_id, grade_level_id)
);

-- DENEME PLANLAMA
CREATE TABLE IF NOT EXISTS institution_exam_plans (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  season_id TEXT NOT NULL,
  exam_id TEXT NOT NULL,
  grade_level_id TEXT NOT NULL,
  status TEXT DEFAULT 'PLANLANDI',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id),
  FOREIGN KEY (season_id) REFERENCES seasons(id),
  FOREIGN KEY (exam_id) REFERENCES exams(id),
  FOREIGN KEY (grade_level_id) REFERENCES grade_levels(id),
  UNIQUE(institution_id, exam_id)
);

CREATE TABLE IF NOT EXISTS institution_exam_status_history (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES institution_exam_plans(id),
  FOREIGN KEY (changed_by) REFERENCES users(id)
);

-- KURUMA ÖZEL TAKVIM
CREATE TABLE IF NOT EXISTS institution_calendars (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  season_id TEXT NOT NULL,
  exam_id TEXT NOT NULL,
  publisher_application_start DATE,
  publisher_application_end DATE,
  institution_application_date DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id),
  FOREIGN KEY (season_id) REFERENCES seasons(id),
  FOREIGN KEY (exam_id) REFERENCES exams(id),
  UNIQUE(institution_id, exam_id)
);

-- SATIŞLAR
CREATE TABLE IF NOT EXISTS sales_opportunities (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  exam_id TEXT NOT NULL,
  staff_id TEXT NOT NULL,
  priority TEXT DEFAULT 'MEDIUM',
  status TEXT DEFAULT 'ARANACAK',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id),
  FOREIGN KEY (exam_id) REFERENCES exams(id),
  FOREIGN KEY (staff_id) REFERENCES users(id),
  UNIQUE(institution_id, exam_id)
);

CREATE TABLE IF NOT EXISTS sales_opportunity_history (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (opportunity_id) REFERENCES sales_opportunities(id),
  FOREIGN KEY (changed_by) REFERENCES users(id)
);

-- ORDERS (SİPARİŞLER)
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  exam_id TEXT NOT NULL,
  season_id TEXT NOT NULL,
  grade_level_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  total_price INTEGER NOT NULL,
  staff_id TEXT,
  status TEXT DEFAULT 'TASLAK',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id),
  FOREIGN KEY (exam_id) REFERENCES exams(id),
  FOREIGN KEY (season_id) REFERENCES seasons(id),
  FOREIGN KEY (grade_level_id) REFERENCES grade_levels(id),
  FOREIGN KEY (staff_id) REFERENCES users(id)
);

-- PUBLISHER ORDERS (TOPLU YAYINEVI SİPARİŞLERİ)
CREATE TABLE IF NOT EXISTS publisher_orders (
  id TEXT PRIMARY KEY,
  publisher_id TEXT NOT NULL,
  exam_id TEXT NOT NULL,
  total_quantity INTEGER NOT NULL,
  order_date DATE,
  order_number TEXT,
  invoice_number TEXT,
  courier TEXT,
  tracking_number TEXT,
  received_quantity INTEGER,
  missing_quantity INTEGER,
  status TEXT DEFAULT 'HAZIRLANIYOR',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (publisher_id) REFERENCES publishers(id),
  FOREIGN KEY (exam_id) REFERENCES exams(id)
);

CREATE TABLE IF NOT EXISTS publisher_order_allocations (
  id TEXT PRIMARY KEY,
  publisher_order_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (publisher_order_id) REFERENCES publisher_orders(id),
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- GOODS RECEIPTS (TEDARİK)
CREATE TABLE IF NOT EXISTS goods_receipts (
  id TEXT PRIMARY KEY,
  publisher_order_id TEXT NOT NULL,
  received_date DATE,
  received_quantity INTEGER NOT NULL,
  missing_quantity INTEGER DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'COMPLETE',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (publisher_order_id) REFERENCES publisher_orders(id)
);

-- DELIVERIES (TESLİMATLAR)
CREATE TABLE IF NOT EXISTS deliveries (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  delivery_method TEXT,
  carrier TEXT,
  tracking_number TEXT,
  delivery_date DATE,
  delivered_by TEXT,
  status TEXT DEFAULT 'HAZIRLANIYOR',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (delivered_by) REFERENCES users(id)
);

-- AUDIT LOG
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  related_id TEXT,
  is_read BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ERP INTEGRATION
CREATE TABLE IF NOT EXISTS integration_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  payload TEXT,
  status TEXT DEFAULT 'PENDING',
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
