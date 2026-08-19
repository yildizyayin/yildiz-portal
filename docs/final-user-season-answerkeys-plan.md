# Final User / Season / Answer Key Plan

- SUPER_ADMIN account is immutable in user management; only the signed-in SUPER_ADMIN can change its own password.
- Other users can be edited, activated/passivated, password-reset and deleted.
- Seasons can be manually created from the application; existing seasons can be edited/activated.
- Denemeler includes Cevap Anahtarları.
- Cevap Anahtarları follows publisher → grade → exam and supports PDF answer key, kazanımlı Excel, Sekonic, Bicom, exam PDF, other digital-reading format and video URL.
- Files are stored under the existing R2 MEDIA bucket with a deneme/cevap-anahtarlari prefix; D1 stores metadata only.
