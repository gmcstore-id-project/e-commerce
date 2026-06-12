# 🚀 Panduan Deploy CWS Mantap ke Cloudflare

## Arsitektur
- **Frontend** → Cloudflare Pages
- **Backend API** → Cloudflare Workers  
- **Database** → Cloudflare D1 (SQLite gratis)

---

## STEP 1: Install Wrangler CLI

```bash
npm install -g wrangler
wrangler login
```

Browser akan terbuka → login ke akun Cloudflare.

---

## STEP 2: Buat Database D1

```bash
wrangler d1 create cws-db
```

Copy `database_id` yang muncul, lalu update file `wrangler.toml`:
```toml
database_id = "PASTE_ID_DI_SINI"
```

---

## STEP 3: Jalankan Migration Database

```bash
wrangler d1 execute cws-db --file=worker/schema.sql
```

Cek isi database:
```bash
wrangler d1 execute cws-db --command="SELECT * FROM categories"
```

---

## STEP 4: Set Secret Key

```bash
wrangler secret put SESSION_SECRET
# Ketik random string panjang, contoh: CWSmantap2024SuperSecretKey!
```

---

## STEP 5: Deploy Backend (Workers)

```bash
wrangler deploy
```

Setelah selesai akan dapat URL seperti:
```
https://cws-ecommerce-api.NAMA_KAMU.workers.dev
```

Test API:
```bash
curl https://cws-ecommerce-api.NAMA_KAMU.workers.dev/api/health
```

---

## STEP 6: Update Frontend - URL API

Buat file `.env.production` di folder `client/`:
```
VITE_API_URL=https://cws-ecommerce-api.NAMA_KAMU.workers.dev
```

---

## STEP 7: Deploy Frontend (Pages)

### Cara A: Via GitHub (Recommended)
1. Buka https://dash.cloudflare.com
2. Workers & Pages → Create → Pages → Connect to Git
3. Pilih repo `gmcstore-id-project/cws-ecommerce`
4. Build settings:
   - **Build command:** `npm install && npm run build`
   - **Build output:** `dist/public`
5. Environment variables:
   - `VITE_API_URL` = URL Workers dari Step 5
   - `NODE_VERSION` = `18`
6. Save and Deploy

### Cara B: Via CLI
```bash
npm run build
wrangler pages deploy dist/public --project-name=cws-ecommerce
```

---

## STEP 8: Buat Admin User Pertama

```bash
wrangler d1 execute cws-db --command="UPDATE users SET role='admin' WHERE email='EMAIL_KAMU@gmail.com'"
```

(Daftar akun dulu via aplikasi, baru jalankan command ini)

---

## ✅ Selesai!

| Komponen | URL |
|---|---|
| Frontend | https://cws-ecommerce.pages.dev |
| Backend API | https://cws-ecommerce-api.workers.dev |
| D1 Database | Dashboard Cloudflare → D1 |

---

## Troubleshooting

**CORS error:** Pastikan `VITE_API_URL` di Pages sama persis dengan URL Workers

**Login gagal:** Pastikan `SESSION_SECRET` sudah di-set via `wrangler secret put`

**Database kosong:** Jalankan ulang `wrangler d1 execute cws-db --file=worker/schema.sql`
