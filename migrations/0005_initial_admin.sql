-- İlk yönetici hesabı
-- Giriş: admin@yildizyayin.com
-- Geçici şifre ilk girişte değiştirilmelidir.
INSERT INTO users (
  id, email, password_hash, full_name, role, status, institution_id,
  must_change_password, created_at, updated_at
) VALUES (
  'user_super_admin',
  'admin@yildizyayin.com',
  'pbkdf2$100000$a98f42cef01b1d0717675becff95a138$b6b56e069346f4e5db2d72c9bba2085e23553b4f6313498a65aa832deaf68687',
  'Yıldız Yayın Yönetici',
  'SUPER_ADMIN',
  'ACTIVE',
  NULL,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT(email) DO NOTHING;
