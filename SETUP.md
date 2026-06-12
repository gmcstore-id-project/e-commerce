# ShopHub E-Commerce Platform - Setup Guide

## Daftar Isi
1. [Overview](#overview)
2. [Struktur Proyek](#struktur-proyek)
3. [Instalasi](#instalasi)
4. [Konfigurasi](#konfigurasi)
5. [Menjalankan Proyek](#menjalankan-proyek)
6. [Fitur yang Tersedia](#fitur-yang-tersedia)
7. [Database Schema](#database-schema)
8. [API Endpoints](#api-endpoints)

## Overview

ShopHub adalah platform e-commerce multi-role yang fully functional dengan fitur:
- **Pembeli (User)**: Belanja produk, keranjang, checkout, order tracking, review
- **Penjual (Seller)**: Kelola toko, produk, pesanan, penjualan
- **Admin**: Kelola pengguna, produk, kategori, pesanan, analytics

Teknologi yang digunakan:
- **Frontend**: React 19, Tailwind CSS 4, TypeScript
- **Backend**: Express 4, tRPC 11, Node.js
- **Database**: MySQL/TiDB
- **Auth**: Manus OAuth
- **UI Components**: shadcn/ui

## Struktur Proyek

```
ecommerce_project/
├── client/                      # Frontend React
│   ├── src/
│   │   ├── pages/              # Page components
│   │   │   ├── Home.tsx        # Landing page
│   │   │   ├── Login.tsx       # Login page
│   │   │   ├── Register.tsx    # Register page
│   │   │   ├── ProductDetail.tsx
│   │   │   ├── Cart.tsx
│   │   │   ├── Account.tsx
│   │   │   ├── Orders.tsx
│   │   │   ├── OrderDetail.tsx
│   │   │   ├── Review.tsx
│   │   │   ├── SellerDashboard.tsx
│   │   │   └── AdminPanel.tsx
│   │   ├── components/         # Reusable components
│   │   ├── lib/               # Utilities
│   │   ├── App.tsx            # Main router
│   │   └── main.tsx
│   ├── index.html
│   └── package.json
├── server/                      # Backend Express
│   ├── routers.ts             # tRPC routers
│   ├── db.ts                  # Database queries
│   └── _core/                 # Framework
├── drizzle/                     # Database
│   ├── schema.ts              # Database schema
│   └── migrations/            # SQL migrations
├── shared/                      # Shared types
├── todo.md                      # Task tracking
└── package.json
```

## Instalasi

### Prasyarat
- Node.js 22.13.0+
- npm atau pnpm
- Database MySQL/TiDB

### Langkah-langkah

1. **Clone/Copy Proyek**
   ```bash
   cd ecommerce_project
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Setup Database**
   - Pastikan DATABASE_URL sudah dikonfigurasi di environment
   - Jalankan migrasi:
   ```bash
   pnpm drizzle-kit generate
   pnpm drizzle-kit migrate
   ```

4. **Setup Environment Variables**
   Pastikan semua environment variables sudah tersedia:
   - `DATABASE_URL`: Connection string ke database
   - `JWT_SECRET`: Secret untuk session cookie
   - `VITE_APP_ID`: Manus OAuth app ID
   - `OAUTH_SERVER_URL`: Manus OAuth server URL
   - `VITE_OAUTH_PORTAL_URL`: Manus login portal URL

## Konfigurasi

### Database Schema
Database sudah dikonfigurasi dengan tabel-tabel berikut:

**Users Table**
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  openId VARCHAR(64) UNIQUE NOT NULL,
  name TEXT,
  email VARCHAR(320),
  loginMethod VARCHAR(64),
  role ENUM('user', 'admin') DEFAULT 'user',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  lastSignedIn TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Products Table**
```sql
CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description LONGTEXT,
  price DECIMAL(12, 2) NOT NULL,
  stock INT DEFAULT 0,
  image VARCHAR(500),
  images JSON,
  categoryId INT,
  sellerId INT,
  rating DECIMAL(3, 2) DEFAULT 0,
  reviewCount INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

Lihat `drizzle/schema.ts` untuk schema lengkap.

### OAuth Configuration
Platform menggunakan Manus OAuth untuk autentikasi:

1. Login: User diklik "Masuk" → Redirect ke Manus OAuth Portal
2. Callback: Setelah login → Redirect ke `/api/oauth/callback`
3. Session: Cookie session dibuat otomatis
4. Protected Routes: Gunakan `useAuth()` hook untuk cek auth state

## Menjalankan Proyek

### Development Mode
```bash
pnpm dev
```
Server akan berjalan di `http://localhost:3000`

### Build untuk Production
```bash
pnpm build
```

### Run Production Build
```bash
pnpm start
```

## Fitur yang Tersedia

### 1. Landing Page (Home)
- **URL**: `/`
- **Fitur**:
  - Hero section dengan CTA
  - Product showcase
  - Category browsing
  - Feature highlights
  - Footer dengan links

### 2. Authentication
- **Login**: `/login` - OAuth redirect
- **Register**: `/register` - Informasi benefits + OAuth
- **Logout**: Button di Account page

### 3. Product Browsing
- **Product List**: `/` (home page)
- **Product Detail**: `/product/:id`
  - Deskripsi lengkap
  - Rating dan reviews
  - Add to cart button
  - Stock availability

### 4. Shopping Cart
- **URL**: `/cart`
- **Fitur**:
  - Add/remove/update items
  - Checkout flow
  - Shipping address entry
  - Payment method selection
  - Order creation

### 5. User Account
- **URL**: `/account`
- **Fitur**:
  - Profile information
  - Order history
  - Role-based navigation
  - Logout button

### 6. Order Management
- **Orders List**: `/orders`
  - Daftar semua pesanan
  - Status tracking
  - Review button (jika delivered)
- **Order Detail**: `/order/:id`
  - Status timeline
  - Order items
  - Shipping address
  - Payment info

### 7. Review System
- **URL**: `/review/:id`
- **Fitur**:
  - Rating selector (1-5 stars)
  - Comment textarea
  - Delivery status gating
  - Submit review

### 8. Seller Dashboard
- **URL**: `/seller-dashboard`
- **Fitur** (placeholder):
  - Store information
  - Sales stats
  - Recent orders
  - Product management

### 9. Admin Panel
- **URL**: `/admin`
- **Fitur** (placeholder):
  - User management
  - Product management
  - Order management
  - System settings

## Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts dengan role |
| `products` | Product catalog |
| `categories` | Product categories |
| `cart_items` | Shopping cart items |
| `orders` | Customer orders |
| `order_items` | Items dalam order |
| `reviews` | Product reviews |
| `sellers` | Seller profiles |
| `seller_products` | Seller's products |

Lihat `drizzle/schema.ts` untuk detail lengkap.

## API Endpoints

Semua API menggunakan tRPC dan tersedia di `/api/trpc`.

### Auth Endpoints
- `auth.me` - Get current user
- `auth.logout` - Logout user

### Product Endpoints
- `products.list` - Get products list
- `products.getById` - Get product detail
- `products.search` - Search products
- `categories.list` - Get categories

### Cart Endpoints
- `cart.list` - Get cart items
- `cart.add` - Add item to cart
- `cart.remove` - Remove item from cart
- `cart.update` - Update item quantity

### Order Endpoints
- `orders.list` - Get user orders
- `orders.getById` - Get order detail
- `orders.create` - Create order
- `orders.getSellerOrders` - Get seller orders

### Review Endpoints
- `reviews.create` - Create review
- `reviews.getByProduct` - Get product reviews

### Seller Endpoints
- `sellers.getProfile` - Get seller profile
- `sellers.getProducts` - Get seller products

### Admin Endpoints
- `admin.getAllOrders` - Get all orders
- `admin.getAllProducts` - Get all products

## Development Tips

### Adding New Pages
1. Create file di `client/src/pages/YourPage.tsx`
2. Add route di `client/src/App.tsx`
3. Use `trpc` hooks untuk data fetching
4. Use `useLocation()` untuk navigation

### Adding New API Endpoints
1. Add procedure di `server/routers.ts`
2. Add query helper di `server/db.ts` jika perlu
3. Update schema di `drizzle/schema.ts` jika perlu
4. Generate migration: `pnpm drizzle-kit generate`
5. Apply migration via webdev_execute_sql

### Styling
- Gunakan Tailwind CSS classes
- Gunakan shadcn/ui components
- Custom colors di `client/src/index.css`

### Testing
```bash
pnpm test
```

## Troubleshooting

### Database Connection Error
- Check `DATABASE_URL` environment variable
- Verify database server is running
- Check credentials

### OAuth Not Working
- Verify `VITE_APP_ID` and `OAUTH_SERVER_URL`
- Check redirect URL configuration
- Check browser console for errors

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

## Next Steps

1. **Customize Branding**
   - Update logo dan colors di `client/src/index.css`
   - Update app title di environment

2. **Add More Features**
   - Product images upload
   - Search functionality
   - Category filtering
   - Payment integration
   - Email notifications

3. **Deploy**
   - Build: `pnpm build`
   - Deploy to production server
   - Setup SSL certificate
   - Configure domain

## Support

Untuk bantuan lebih lanjut, lihat:
- Template README.md
- tRPC documentation: https://trpc.io
- Tailwind CSS: https://tailwindcss.com
- shadcn/ui: https://ui.shadcn.com
