# CWS Mantap - E-Commerce Platform Documentation

## 📋 Daftar Isi
1. [Overview](#overview)
2. [Fitur Utama](#fitur-utama)
3. [Struktur Proyek](#struktur-proyek)
4. [Setup & Installation](#setup--installation)
5. [Routing & Navigation](#routing--navigation)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [User Roles & Permissions](#user-roles--permissions)
9. [Customization Guide](#customization-guide)
10. [Deployment](#deployment)

---

## Overview

**CWS Mantap** adalah platform e-commerce multi-role yang fully functional dengan fitur-fitur lengkap untuk:
- 👥 **Pembeli (Buyer)** - Browse produk, belanja, tracking order, review
- 🏪 **Penjual (Seller)** - Manage toko, list produk, process order
- 👨‍💼 **Admin** - Manage platform, customer service, analytics

Platform ini dibangun dengan:
- **Frontend**: React 19 + Tailwind CSS 4 + shadcn/ui
- **Backend**: Express 4 + tRPC 11
- **Database**: MySQL/TiDB
- **Authentication**: Manus OAuth
- **Styling**: Orange color scheme sesuai logo CWS Mantap

---

## Fitur Utama

### ✅ Fitur yang Sudah Berfungsi

#### 1. Authentication & Authorization
- ✅ Login dengan Manus OAuth
- ✅ Register dengan informasi pendaftaran
- ✅ Role-based access control (buyer, seller, admin)
- ✅ Session management dengan cookies

#### 2. Landing Page & Product Catalog
- ✅ Hero section dengan CTA buttons
- ✅ Product showcase dengan grid layout
- ✅ Category browsing
- ✅ Product search (placeholder)
- ✅ Product detail page dengan reviews

#### 3. Shopping Experience
- ✅ Add/remove/update cart items
- ✅ Cart totals calculation
- ✅ Checkout flow dengan shipping address
- ✅ Payment method selection
- ✅ Order creation

#### 4. User Account
- ✅ Profile information display
- ✅ Order history
- ✅ Role-based navigation
- ✅ Logout functionality

#### 5. Order Management
- ✅ Buyer order tracking dengan status timeline
- ✅ Order detail page
- ✅ Order status updates (pending → processing → shipped → delivered)
- ✅ Seller order processing page

#### 6. Review & Rating System
- ✅ Review submission form
- ✅ Delivery status gating (hanya bisa review setelah delivered)
- ✅ Rating system (1-5 stars)
- ✅ Display reviews di product page

#### 7. Unified Dashboard
- ✅ Satu akun bisa berperan sebagai pembeli dan penjual
- ✅ Tabs untuk switch antara mode
- ✅ Stats dashboard
- ✅ Recent orders display

#### 8. Admin Panel
- ✅ Secure dengan role checking
- ✅ User management interface
- ✅ Product management interface
- ✅ Order management interface
- ✅ Customer service chat
- ✅ Stats dashboard dengan analytics

---

## Struktur Proyek

```
/home/ubuntu/ecommerce_project/
├── client/                          # Frontend React application
│   ├── src/
│   │   ├── pages/                   # Page components
│   │   │   ├── Home.tsx             # Landing page
│   │   │   ├── Login.tsx            # Login page
│   │   │   ├── Register.tsx         # Register page
│   │   │   ├── Dashboard.tsx        # Unified dashboard
│   │   │   ├── ProductDetail.tsx    # Product detail
│   │   │   ├── Cart.tsx             # Shopping cart
│   │   │   ├── Orders.tsx           # Orders list
│   │   │   ├── OrderDetail.tsx      # Order detail
│   │   │   ├── Review.tsx           # Review submission
│   │   │   ├── AdminPanel.tsx       # Admin panel
│   │   │   ├── SellerDashboard.tsx  # Seller dashboard
│   │   │   ├── Account.tsx          # User account
│   │   │   └── NotFound.tsx         # 404 page
│   │   ├── components/
│   │   │   ├── Header.tsx           # Reusable header
│   │   │   ├── DashboardLayout.tsx  # Dashboard layout
│   │   │   └── ui/                  # shadcn/ui components
│   │   ├── contexts/                # React contexts
│   │   ├── hooks/                   # Custom hooks
│   │   ├── lib/
│   │   │   ├── trpc.ts              # tRPC client
│   │   │   └── utils.ts             # Utility functions
│   │   ├── App.tsx                  # Main app component
│   │   ├── main.tsx                 # Entry point
│   │   └── index.css                # Global styles
│   ├── index.html                   # HTML template
│   └── public/                      # Static assets
├── server/                          # Backend Express application
│   ├── routers.ts                   # tRPC routers & procedures
│   ├── db.ts                        # Database queries
│   ├── storage.ts                   # S3 storage helpers
│   └── _core/                       # Core infrastructure
│       ├── index.ts                 # Server entry point
│       ├── context.ts               # tRPC context
│       ├── oauth.ts                 # OAuth integration
│       ├── llm.ts                   # LLM integration
│       └── ...
├── drizzle/                         # Database schema & migrations
│   ├── schema.ts                    # Drizzle ORM schema
│   └── migrations/                  # SQL migrations
├── shared/                          # Shared types & constants
│   ├── const.ts                     # Constants
│   └── types.ts                     # Shared types
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript config
├── vite.config.ts                   # Vite config
└── drizzle.config.ts                # Drizzle config
```

---

## Setup & Installation

### 1. Prerequisites
- Node.js 22+
- pnpm 10+
- MySQL/TiDB database

### 2. Installation

```bash
# Navigate to project directory
cd /home/ubuntu/ecommerce_project

# Install dependencies
pnpm install

# Generate database migrations
pnpm drizzle-kit generate

# Apply migrations to database
pnpm drizzle-kit migrate
```

### 3. Environment Variables

Semua environment variables sudah di-inject otomatis oleh Manus:
- `DATABASE_URL` - MySQL connection string
- `JWT_SECRET` - Session cookie signing secret
- `VITE_APP_ID` - Manus OAuth application ID
- `OAUTH_SERVER_URL` - Manus OAuth backend
- `VITE_OAUTH_PORTAL_URL` - Manus login portal
- `BUILT_IN_FORGE_API_URL` - Manus built-in APIs
- `BUILT_IN_FORGE_API_KEY` - API key untuk server

### 4. Development

```bash
# Start dev server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run tests
pnpm test

# Format code
pnpm format

# Type check
pnpm check
```

---

## Routing & Navigation

### Public Routes
- `/` - Home page (landing page)
- `/login` - Login page
- `/register` - Register page
- `/product/:id` - Product detail

### Protected Routes (Authenticated Users)
- `/dashboard` - Unified dashboard (seller + buyer)
- `/cart` - Shopping cart
- `/orders` - Orders list
- `/order/:id` - Order detail
- `/review/:id` - Review submission
- `/account` - User account (deprecated, gunakan dashboard)

### Admin Routes (Admin Only)
- `/admin` - Admin panel (secure, role checking)

### Seller Routes (Seller Only)
- `/seller-dashboard` - Seller dashboard

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  openId VARCHAR(64) UNIQUE NOT NULL,
  name TEXT,
  email VARCHAR(320),
  loginMethod VARCHAR(64),
  role ENUM('user', 'seller', 'admin') DEFAULT 'user',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  lastSignedIn TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Products Table
```sql
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sellerId INT NOT NULL,
  categoryId INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  stock INT DEFAULT 0,
  image VARCHAR(500),
  rating DECIMAL(3, 2) DEFAULT 0,
  reviewCount INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sellerId) REFERENCES sellers(id),
  FOREIGN KEY (categoryId) REFERENCES categories(id)
);
```

### Orders Table
```sql
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  sellerId INT NOT NULL,
  status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
  totalAmount DECIMAL(12, 2) NOT NULL,
  shippingAddress TEXT,
  paymentMethod VARCHAR(50),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (sellerId) REFERENCES sellers(id)
);
```

### Reviews Table
```sql
CREATE TABLE reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  productId INT NOT NULL,
  userId INT NOT NULL,
  orderId INT NOT NULL,
  rating INT NOT NULL,
  comment TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (productId) REFERENCES products(id),
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (orderId) REFERENCES orders(id)
);
```

Lihat `drizzle/schema.ts` untuk schema lengkap.

---

## API Endpoints

### Authentication
- `auth.me` - Get current user
- `auth.logout` - Logout user

### Products
- `products.list` - Get products list
- `products.getById` - Get product by ID
- `products.getByCategory` - Get products by category
- `products.search` - Search products
- `products.create` - Create product (seller only)
- `products.update` - Update product (seller only)
- `products.delete` - Delete product (seller only)

### Cart
- `cart.list` - Get cart items
- `cart.add` - Add to cart
- `cart.remove` - Remove from cart
- `cart.update` - Update cart item quantity

### Orders
- `orders.list` - Get user orders
- `orders.getById` - Get order by ID
- `orders.getSellerOrders` - Get seller orders
- `orders.create` - Create order
- `orders.updateStatus` - Update order status (seller/admin only)

### Reviews
- `reviews.list` - Get product reviews
- `reviews.create` - Create review (after order delivered)
- `reviews.getByOrder` - Get review by order

### Categories
- `categories.list` - Get categories
- `categories.getById` - Get category by ID
- `categories.create` - Create category (admin only)

### Sellers
- `sellers.getProfile` - Get seller profile
- `sellers.getProducts` - Get seller products
- `sellers.updateProfile` - Update seller profile

### Admin
- `admin.getAllOrders` - Get all orders (admin only)
- `admin.getAllProducts` - Get all products (admin only)
- `admin.getAllUsers` - Get all users (admin only)
- `admin.updateUserRole` - Update user role (admin only)

---

## User Roles & Permissions

### Buyer (user)
- Browse products
- Search products
- Add/remove cart items
- Create orders
- Track orders
- Submit reviews (after delivery)
- View order history
- Update profile

### Seller (seller)
- Create products
- Update products
- Delete products
- View seller orders
- Update order status
- View sales analytics
- Manage seller profile

### Admin (admin)
- Access admin panel
- Manage all users
- Manage all products
- Manage all orders
- Customer service chat
- View platform analytics
- Update user roles

---

## Customization Guide

### 1. Mengubah Logo
1. Upload logo baru ke `/home/ubuntu/webdev-static-assets/`
2. Update path di `client/src/components/Header.tsx`
3. Restart dev server

### 2. Mengubah Warna Theme
Edit `client/src/index.css` dan ubah CSS variables:
```css
:root {
  --primary: #ff6b35;      /* Orange */
  --secondary: #004e89;    /* Blue */
  --accent: #ff6b35;       /* Orange */
}
```

### 3. Menambah Fitur Baru
1. Update database schema di `drizzle/schema.ts`
2. Generate migration: `pnpm drizzle-kit generate`
3. Apply migration: `pnpm drizzle-kit migrate`
4. Add query helper di `server/db.ts`
5. Add tRPC procedure di `server/routers.ts`
6. Create UI component di `client/src/pages/`
7. Add route di `client/src/App.tsx`
8. Write tests di `server/*.test.ts`

### 4. Mengintegrasikan Payment Gateway
1. Install payment library: `pnpm add stripe`
2. Add payment procedure di `server/routers.ts`
3. Create payment UI di `client/src/components/`
4. Update checkout flow

### 5. Menambah Email Notifications
1. Setup email service (SendGrid, Mailgun, etc)
2. Create email templates
3. Add notification triggers di order/review events
4. Update `server/routers.ts` dengan email sending logic

---

## Deployment

### Manus Hosting (Recommended)
Platform ini sudah production-ready untuk Manus hosting:

1. **Create Checkpoint** (sudah ada)
2. **Click Publish** di Management UI
3. **Configure Domain** (optional)
4. **Deploy!**

### External Hosting (Railway, Render, Vercel)
Jika ingin deploy ke external hosting:

```bash
# Build
pnpm build

# Start
pnpm start
```

Requirements:
- Node.js 22+
- MySQL/TiDB database
- Environment variables (lihat `.env.example`)

---

## Fitur yang Bisa Ditambahkan

### Priority High
- [ ] Product image upload
- [ ] Advanced search dengan filtering
- [ ] Payment gateway integration (Stripe/Midtrans)
- [ ] Email notifications
- [ ] Wishlist functionality

### Priority Medium
- [ ] Real-time notifications
- [ ] Live chat support
- [ ] Advanced analytics
- [ ] Inventory management
- [ ] Seller verification system

### Priority Low
- [ ] Product recommendations
- [ ] Social features (follow, share)
- [ ] Loyalty program
- [ ] Referral system
- [ ] Mobile app

---

## Troubleshooting

### Dev Server Error
```bash
# Clear cache dan restart
rm -rf node_modules/.vite
pnpm dev
```

### Database Connection Error
```bash
# Check DATABASE_URL
echo $DATABASE_URL

# Test connection
pnpm drizzle-kit migrate
```

### Build Error
```bash
# Type check
pnpm check

# Clear build cache
rm -rf dist

# Rebuild
pnpm build
```

---

## Support & Documentation

- **tRPC Docs**: https://trpc.io
- **React Docs**: https://react.dev
- **Tailwind Docs**: https://tailwindcss.com
- **Drizzle Docs**: https://orm.drizzle.team
- **Manus Docs**: https://docs.manus.im

---

## License

MIT License - Feel free to use and modify!

---

**Last Updated**: June 12, 2026
**Platform**: CWS Mantap E-Commerce
**Version**: 1.0.0
