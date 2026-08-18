-- INSERT SYSTEM ROLES
INSERT INTO roles (id, name, description) VALUES
  ('role_super_admin', 'SUPER_ADMIN', 'Sistem yöneticisi - tüm erişim'),
  ('role_admin', 'ADMIN', 'İşletme yöneticisi'),
  ('role_personel', 'PERSONEL', 'Satış personeli'),
  ('role_operasyon', 'OPERASYON', 'Operasyon ve tedarik'),
  ('role_kurum', 'KURUM', 'Eğitim kurumu')
ON CONFLICT DO NOTHING;

-- INSERT PERMISSIONS
INSERT INTO permissions (id, name, description, resource, action) VALUES
  ('perm_view_all', 'VIEW_ALL', 'Tüm verileri görüntüle', 'system', 'view'),
  ('perm_manage_publishers', 'MANAGE_PUBLISHERS', 'Yayınevlerini yönet', 'publishers', 'manage'),
  ('perm_manage_exams', 'MANAGE_EXAMS', 'Denemeleri yönet', 'exams', 'manage'),
  ('perm_manage_institutions', 'MANAGE_INSTITUTIONS', 'Kurumları yönet', 'institutions', 'manage'),
  ('perm_manage_orders', 'MANAGE_ORDERS', 'Siparişleri yönet', 'orders', 'manage'),
  ('perm_manage_users', 'MANAGE_USERS', 'Kullanıcıları yönet', 'users', 'manage'),
  ('perm_view_reports', 'VIEW_REPORTS', 'Raporları görüntüle', 'reports', 'view'),
  ('perm_manage_deliveries', 'MANAGE_DELIVERIES', 'Teslimatları yönet', 'deliveries', 'manage'),
  ('perm_manage_own_institution', 'MANAGE_OWN_INSTITUTION', 'Kendi kurumunu yönet', 'institutions', 'manage_own'),
  ('perm_create_orders', 'CREATE_ORDERS', 'Sipariş oluştur', 'orders', 'create'),
  ('perm_view_own_orders', 'VIEW_OWN_ORDERS', 'Kendi siparişlerini görüntüle', 'orders', 'view_own')
ON CONFLICT DO NOTHING;

-- INSERT GRADE LEVELS
INSERT INTO grade_levels (id, name, code, sort_order, is_active) VALUES
  ('grade_5', '5. Sınıf', '5', 1, 1),
  ('grade_6', '6. Sınıf', '6', 2, 1),
  ('grade_7', '7. Sınıf', '7', 3, 1),
  ('grade_8', '8. Sınıf', '8', 4, 1),
  ('grade_9', '9. Sınıf', '9', 5, 1),
  ('grade_10', '10. Sınıf', '10', 6, 1),
  ('grade_11', '11. Sınıf', '11', 7, 1),
  ('grade_tyt', 'TYT', 'TYT', 8, 1),
  ('grade_ayt', 'AYT', 'AYT', 9, 1)
ON CONFLICT DO NOTHING;

-- INSERT INITIAL SEASON
INSERT INTO seasons (id, name, year_start, year_end, is_active) VALUES
  ('season_2026_2027', '2026-2027', 2026, 2027, 1),
  ('season_2025_2026', '2025-2026', 2025, 2026, 0)
ON CONFLICT DO NOTHING;

-- INSERT SYSTEM SETTINGS
INSERT INTO system_settings (key, value, data_type) VALUES
  ('app_name', 'Yıldız Deneme Platformu', 'TEXT'),
  ('app_version', '1.0.0', 'TEXT'),
  ('default_timezone', 'Europe/Istanbul', 'TEXT'),
  ('currency', 'TRY', 'TEXT'),
  ('date_format', 'dd/MM/yyyy', 'TEXT'),
  ('enable_erp_sync', '1', 'BOOLEAN'),
  ('erp_sync_interval', '3600', 'INTEGER'),
  ('allow_drag_drop_outside_range', '0', 'BOOLEAN')
ON CONFLICT DO NOTHING;
