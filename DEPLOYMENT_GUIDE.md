# CWS Mantap - Deployment Guide

Panduan lengkap untuk deploy CWS Mantap marketplace ke production menggunakan Railway (backend) dan Cloudflare Pages (frontend).

## 📋 Daftar Isi

1. [Prerequisites](#prerequisites)
2. [Deploy Backend ke Railway](#deploy-backend-ke-railway)
3. [Deploy Frontend ke Cloudflare Pages](#deploy-frontend-ke-cloudflare-pages)
4. [Setup Domain Custom](#setup-domain-custom)
5. [Environment Variables](#environment-variables)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Sebelum memulai, pastikan Anda memiliki:

- ✅ GitHub account (untuk version control)
- ✅ Railway account (https://railway.app)
- ✅ Cloudflare account (https://dash.cloudflare.com)
- ✅ MySQL database (bisa gunakan Railway MySQL atau external provider)
- ✅ Node.js v18+ (untuk local development)

---

## Deploy Backend ke Railway

### Step 1: Push Code ke GitHub

```bash
# Initialize git (jika belum)
git init
git add .
git commit -m "Initial commit: CWS Mantap marketplace"

# Create repository di GitHub dan push
git remote add origin https://github.com/YOUR_USERNAME/cws-mantap.git
git branch -M main
git push -u origin main
```

### Step 2: Setup Railway Project

1. Login ke [Railway.app](https://railway.app)
2. Klik "New Project"
3. Pilih "Deploy from GitHub"
4. Connect GitHub account dan select repository `cws-mantap`
5. Railway akan auto-detect Node.js project

### Step 3: Setup Environment Variables di Railway

Di Railway dashboard, tambahkan environment variables:

```
DATABASE_URL=mysql://user:password@host:port/database
JWT_SECRET=your_jwt_secret_here
VITE_APP_ID=your_manus_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im
OWNER_OPEN_ID=your_owner_open_id
OWNER_NAME=Your Name
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your_api_key
VITE_FRONTEND_FORGE_API_KEY=your_frontend_key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_APP_TITLE=CWS Mantap
VITE_APP_LOGO=https://your-domain.com/logo.png
VITE_ANALYTICS_ENDPOINT=https://analytics.example.com
VITE_ANALYTICS_WEBSITE_ID=your_website_id
NODE_ENV=production
```

### Step 4: Deploy

Railway akan auto-deploy setiap kali ada push ke `main` branch.

Tunggu deployment selesai dan dapatkan URL backend:
```
https://cws-mantap-prod.up.railway.app
```

---

## Deploy Frontend ke Cloudflare Pages

### Step 1: Build Frontend

```bash
cd /home/ubuntu/ecommerce_project
pnpm build
```

Output akan tersimpan di `dist/` folder.

### Step 2: Connect Cloudflare Pages ke GitHub

1. Login ke [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Pilih "Pages"
3. Klik "Connect to Git"
4. Authorize GitHub dan select `cws-mantap` repository
5. Configure build settings:
   - **Framework preset**: Vite
   - **Build command**: `pnpm build`
   - **Build output directory**: `dist`

### Step 3: Setup Environment Variables di Cloudflare

Tambahkan environment variables di Cloudflare Pages settings:

```
VITE_API_URL=https://cws-mantap-prod.up.railway.app
VITE_APP_TITLE=CWS Mantap
VITE_APP_LOGO=https://your-domain.com/logo.png
```

### Step 4: Deploy

Cloudflare Pages akan auto-deploy setiap kali ada push ke `main` branch.

Dapatkan URL frontend:
```
https://cws-mantap.pages.dev
```

---

## Setup Domain Custom

### Option 1: Gunakan Subdomain Cloudflare

1. Di Cloudflare Dashboard, tambahkan CNAME record:
   ```
   Name: app
   Type: CNAME
   Content: cws-mantap.pages.dev
   ```

2. Akses via: `https://app.yourdomain.com`

### Option 2: Gunakan Domain Terpisah

1. Beli domain di Namecheap, GoDaddy, atau provider lain
2. Setup nameservers ke Cloudflare
3. Add CNAME record di Cloudflare
4. Akses via: `https://yourdomain.com`

---

## Environment Variables

### Backend (Railway)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | MySQL connection string | `mysql://user:pass@host/db` |
| `JWT_SECRET` | Secret untuk session signing | `your_secret_key_here` |
| `NODE_ENV` | Environment | `production` |
| `VITE_APP_ID` | Manus OAuth app ID | `app_xxxxx` |
| `OAUTH_SERVER_URL` | Manus OAuth server | `https://api.manus.im` |

### Frontend (Cloudflare Pages)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://cws-mantap-prod.up.railway.app` |
| `VITE_APP_TITLE` | App title | `CWS Mantap` |
| `VITE_APP_LOGO` | Logo URL | `https://domain.com/logo.png` |

---

## Admin Fee System

Admin fee 1% sudah ter-implement di order creation logic:

```typescript
// Calculation di server/routers.ts
const adminFeePercentage = 1;
const adminFeeAmount = productAmount * (adminFeePercentage / 100);
const totalAmount = productAmount + adminFeeAmount + shippingCost;
```

**Breakdown Transaksi:**
- Total produk: Rp 100,000
- Admin fee 1%: Rp 1,000
- Shipping: Rp 25,000
- **Total pembayaran pembeli: Rp 126,000**

**Pembagian:**
- Seller terima: Rp 99,000 (100,000 - 1,000)
- Admin terima: Rp 1,000
- Kurir/Shipping: Rp 25,000

---

## Database Setup

### Create Database

```sql
CREATE DATABASE cws_mantap CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Run Migrations

```bash
# Generate migrations
pnpm drizzle-kit generate

# Apply migrations
pnpm drizzle-kit migrate
```

---

## Troubleshooting

### Frontend tidak bisa connect ke backend

**Solusi:**
1. Check `VITE_API_URL` di Cloudflare environment variables
2. Pastikan backend URL di Railway sudah correct
3. Check CORS settings di backend

### Database connection error

**Solusi:**
1. Verify `DATABASE_URL` format: `mysql://user:password@host:port/database`
2. Pastikan database accessible dari Railway
3. Check firewall/security group settings

### Build fails di Cloudflare

**Solusi:**
1. Check build logs di Cloudflare Pages
2. Pastikan `pnpm` version compatible
3. Try clear cache dan rebuild

### Admin fee tidak ter-calculate

**Solusi:**
1. Check order creation di `server/routers.ts`
2. Verify database fields: `adminFeePercentage`, `adminFeeAmount`
3. Check order detail page untuk melihat breakdown

---

## Monitoring & Maintenance

### Check Backend Logs

```bash
# Railway CLI
railway logs
```

### Check Frontend Logs

Di Cloudflare Pages dashboard → Analytics

### Monitor Database

```bash
# Connect ke database
mysql -h host -u user -p database

# Check orders dengan admin fee
SELECT id, productAmount, adminFeeAmount, totalAmount FROM orders LIMIT 10;
```

---

## Production Checklist

- [ ] Database backup strategy
- [ ] SSL/TLS certificates (auto via Cloudflare)
- [ ] Email notifications setup
- [ ] Payment gateway integration (Stripe/Midtrans)
- [ ] Admin dashboard access
- [ ] Customer support system
- [ ] Analytics tracking
- [ ] Error monitoring (Sentry)
- [ ] Performance monitoring
- [ ] Security audit

---

## Support

Untuk bantuan lebih lanjut:
- Railway Docs: https://docs.railway.app
- Cloudflare Pages Docs: https://developers.cloudflare.com/pages
- CWS Mantap Issues: GitHub Issues

---

**Happy deploying! 🚀**
