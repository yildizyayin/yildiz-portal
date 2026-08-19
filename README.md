# Yıldız Deneme Platformu

Cloudflare Workers + D1 + React tabanlı deneme takip, kurum planlama, satış, sipariş, tedarik, teslimat ve ticari raporlama platformu.

## Kapsam

- Merkezi deneme takvimi
- Sınıf düzeyine göre kurum planlama
- Kuruma özel aylık ve sezonluk takvim
- PDF / Excel / yazdırma çıktıları
- Satış fırsatları ve sipariş yönetimi
- Toplu yayınevi siparişleri
- Tedarik ve eksik ürün takibi
- Kurum teslimatları
- Ticari raporlama
- Rol bazlı erişim

Öğrenci, optik okuma, sınav sonucu veya ölçme-değerlendirme modülleri bu ürünün kapsamında değildir.

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run type-check
npm test
```

## Deploy

Production deploy Cloudflare Workers Git integration üzerinden `main` branch push'larında otomatik çalışır. Worker yapılandırması `wrangler.jsonc` dosyasındadır.

## Database

Production D1 binding adı: `DB`

Migration dosyaları `migrations/` klasöründedir.

## Roller

- SUPER_ADMIN
- ADMIN
- PERSONEL
- OPERASYON
- KURUM

## License

Proprietary - Yıldız Yayın
