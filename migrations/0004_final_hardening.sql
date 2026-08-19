-- Final product hardening additions
ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0;
ALTER TABLE institution_exam_plans ADD COLUMN planned_quantity INTEGER;
ALTER TABLE institution_exam_plans ADD COLUMN notes TEXT;
ALTER TABLE sales_opportunities ADD COLUMN loss_reason TEXT;

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT,
  created_by TEXT NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'OPEN',
  related_type TEXT,
  related_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_to) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status_due ON tasks(status, due_date);
CREATE INDEX IF NOT EXISTS idx_plans_grade_status ON institution_exam_plans(grade_level_id, status);
CREATE INDEX IF NOT EXISTS idx_calendar_application_date ON institution_calendars(institution_application_date);
CREATE INDEX IF NOT EXISTS idx_exams_dates ON exams(last_order_date, application_start_date, application_end_date);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_opportunities_priority ON sales_opportunities(priority, status);

UPDATE system_settings SET value = '0', updated_at = CURRENT_TIMESTAMP WHERE key = 'enable_erp_sync';
