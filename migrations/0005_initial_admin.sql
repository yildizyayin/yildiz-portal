-- İlk yönetici hesabı
-- Giriş: admin@yildizyayin.com
-- Geçici şifre repository içinde tutulmaz; ilk girişte değiştirilmelidir.
INSERT INTO users (
  id, email, password_hash, full_name, role, status, institution_id,
  must_change_password, created_at, updated_at
) VALUES (
  'user_super_admin',
  'admin@yildizyayin.com',
  'pbkdf2$100000$cf98e9615d2b47d86edafd5adb3cc2d3$b0281eb8d34e30f8874919f021515eff75b7c9850681b9ec1c87479de7c35a21',
  'Yıldız Yayın Yönetici',
  'SUPER_ADMIN',
  'ACTIVE',
  NULL,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT(email) DO NOTHING;
