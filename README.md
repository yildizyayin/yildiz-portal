# Yıldız Deneme Platformu

Production-ready deneme sınavı yönetim sistemi. Cloudflare Workers + D1 + React.

## Özellikler

- 📅 Merkezi deneme takvimi
- 🏫 Kurum planlama ve yönetimi
- 💼 Satış fırsatı ve sipariş sistemi
- 📦 Tedarik ve teslimat takibi
- 📊 Ticari raporlama
- 📄 PDF/Excel export
- 🔐 Role-based access control
- 📈 Premium dashboard

## Kurulum

```bash
npm install
```

## Development

```bash
npm run dev
```

## Database

### Migrations

```bash
npm run migrate:dev
npm run seed:dev
```

## Build & Deploy

```bash
npm run build
npm run deploy:dev  # Development
npm run deploy      # Production
```

## Testing

```bash
npm test
npm test:watch
npm test:e2e
```

## Teknoloji Stack

- **Backend**: Cloudflare Workers + Hono
- **Frontend**: React 18 + Vite
- **Database**: Cloudflare D1 (SQLite)
- **Cache**: Cloudflare KV
- **Storage**: Cloudflare R2
- **Export**: Browser Rendering API
- **Language**: TypeScript

## Roller

- **SUPER_ADMIN**: Sistem yönetimi
- **ADMIN**: İş yönetimi
- **PERSONEL**: Satış ve kurum yönetimi
- **OPERASYON**: Tedarik ve teslimat
- **KURUM**: Kendi deneme yönetimi

## API

API endpoint'leri `/api/` altında.

Detaylar: [API Documentation](./API.md)

## Kontribüsyon

Yıldız Yayın iç geliştirme.

## License

Proprietary - Yıldız Yayın
