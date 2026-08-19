-- İlk yönetici hesabı
-- Giriş: admin@yildizyayin.com
-- Geçici şifre kullanıcıya güvenli kanaldan iletilir ve ilk girişte değiştirilmelidir.
INSERT INTO users (
  id, email, password_hash, full_name, role, status, institution_id,
  must_change_password, created_at, updated_at
) VALUES (
  'user_super_admin',
  'admin@yildizyayin.com',
  'pbkdf2$100000$fc14bf05ee4bf969424e5f9772c0381a$b58d8de85c65b67bd884301b223d30bbf7ffb4fc8d4161cae75a0294481e7cd7',
  'Yıldız Yayın Yönetici',
  'SUPER_ADMIN',
  'ACTIVE',
  NULL,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT(email) DO NOTHING;
