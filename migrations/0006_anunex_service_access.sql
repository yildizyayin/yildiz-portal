-- ANUNEX optional Deneme Servisi access gate
-- Existing portal features are unchanged. New institutions are denied until an admin enables the service.
CREATE TABLE IF NOT EXISTS institution_services (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  service_key TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0,
  starts_at DATE,
  ends_at DATE,
  allowed_grade_ids TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(institution_id, service_key),
  FOREIGN KEY (institution_id) REFERENCES institutions(id)
);

CREATE INDEX IF NOT EXISTS idx_institution_services_lookup
  ON institution_services(institution_id, service_key, enabled);
