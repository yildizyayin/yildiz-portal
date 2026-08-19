-- İlk yönetici hesabı
-- Giriş: admin@yildizyayin.com
-- Geçici şifre kullanıcıya güvenli kanaldan iletilir ve ilk girişte değiştirilmelidir.
INSERT INTO users (
  id, email, password_hash, full_name, role, status, institution_id,
  must_change_password, created_at, updated_at
) VALUES (
  'user_super_admin',
  'admin@yildizyayin.com',
  'pbkdf2$100000$d203b3883702c9ab5d9917972badfdfd$9f9234429bd6579a70093be471f343075b7c979888b260b7ada2c6c8d606ad23',
  'Yıldız Yayın Yönetici',
  'SUPER_ADMIN',
  'ACTIVE',
  NULL,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT(email) DO NOTHING;
