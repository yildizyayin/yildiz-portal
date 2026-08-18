-- USER INDEXES
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_institution_id ON users(institution_id);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

-- SESSION INDEXES
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- SEASON INDEXES
CREATE INDEX IF NOT EXISTS idx_seasons_is_active ON seasons(is_active);

-- EXAM INDEXES
CREATE INDEX IF NOT EXISTS idx_exams_publisher_id ON exams(publisher_id);
CREATE INDEX IF NOT EXISTS idx_exams_season_id ON exams(season_id);
CREATE INDEX IF NOT EXISTS idx_exams_grade_level_id ON exams(grade_level_id);
CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status);
CREATE INDEX IF NOT EXISTS idx_exams_deleted_at ON exams(deleted_at);

-- INSTITUTION INDEXES
CREATE INDEX IF NOT EXISTS idx_institutions_erp_external_id ON institutions(erp_external_id);
CREATE INDEX IF NOT EXISTS idx_institutions_code ON institutions(code);
CREATE INDEX IF NOT EXISTS idx_institutions_staff_id ON institutions(staff_id);
CREATE INDEX IF NOT EXISTS idx_institutions_is_active ON institutions(is_active);
CREATE INDEX IF NOT EXISTS idx_institutions_deleted_at ON institutions(deleted_at);

-- INSTITUTION USERS INDEXES
CREATE INDEX IF NOT EXISTS idx_institution_users_institution_id ON institution_users(institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_users_user_id ON institution_users(user_id);

-- INSTITUTION GRADE LEVELS INDEXES
CREATE INDEX IF NOT EXISTS idx_institution_grade_levels_institution_id ON institution_grade_levels(institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_grade_levels_grade_level_id ON institution_grade_levels(grade_level_id);

-- EXAM PLANS INDEXES
CREATE INDEX IF NOT EXISTS idx_institution_exam_plans_institution_id ON institution_exam_plans(institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_exam_plans_season_id ON institution_exam_plans(season_id);
CREATE INDEX IF NOT EXISTS idx_institution_exam_plans_exam_id ON institution_exam_plans(exam_id);
CREATE INDEX IF NOT EXISTS idx_institution_exam_plans_status ON institution_exam_plans(status);

-- CALENDAR INDEXES
CREATE INDEX IF NOT EXISTS idx_institution_calendars_institution_id ON institution_calendars(institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_calendars_season_id ON institution_calendars(season_id);
CREATE INDEX IF NOT EXISTS idx_institution_calendars_exam_id ON institution_calendars(exam_id);

-- SALES OPPORTUNITIES INDEXES
CREATE INDEX IF NOT EXISTS idx_sales_opportunities_institution_id ON sales_opportunities(institution_id);
CREATE INDEX IF NOT EXISTS idx_sales_opportunities_exam_id ON sales_opportunities(exam_id);
CREATE INDEX IF NOT EXISTS idx_sales_opportunities_staff_id ON sales_opportunities(staff_id);
CREATE INDEX IF NOT EXISTS idx_sales_opportunities_status ON sales_opportunities(status);

-- ORDERS INDEXES
CREATE INDEX IF NOT EXISTS idx_orders_institution_id ON orders(institution_id);
CREATE INDEX IF NOT EXISTS idx_orders_exam_id ON orders(exam_id);
CREATE INDEX IF NOT EXISTS idx_orders_season_id ON orders(season_id);
CREATE INDEX IF NOT EXISTS idx_orders_staff_id ON orders(staff_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- PUBLISHER ORDERS INDEXES
CREATE INDEX IF NOT EXISTS idx_publisher_orders_publisher_id ON publisher_orders(publisher_id);
CREATE INDEX IF NOT EXISTS idx_publisher_orders_exam_id ON publisher_orders(exam_id);
CREATE INDEX IF NOT EXISTS idx_publisher_orders_status ON publisher_orders(status);

-- DELIVERIES INDEXES
CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);

-- AUDIT LOG INDEXES
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- NOTIFICATIONS INDEXES
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- INTEGRATION EVENTS INDEXES
CREATE INDEX IF NOT EXISTS idx_integration_events_status ON integration_events(status);
CREATE INDEX IF NOT EXISTS idx_integration_events_entity_type ON integration_events(entity_type);
CREATE INDEX IF NOT EXISTS idx_integration_events_created_at ON integration_events(created_at);
