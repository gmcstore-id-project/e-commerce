-- CWS Mantap - D1 SQLite Schema
-- Jalankan: wrangler d1 execute cws-db --file=worker/schema.sql

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  passwordHash TEXT,
  googleId TEXT UNIQUE,
  openId TEXT UNIQUE,
  name TEXT,
  avatar TEXT,
  loginMethod TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','seller','admin')),
  isEmailVerified INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  lastSignedIn TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sellers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL UNIQUE,
  shopName TEXT NOT NULL,
  shopDescription TEXT,
  shopImage TEXT,
  address TEXT,
  phone TEXT,
  rating REAL DEFAULT 0,
  totalSales INTEGER DEFAULT 0,
  totalRevenue REAL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  image TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sellerId INTEGER NOT NULL,
  categoryId INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price REAL NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  rating REAL DEFAULT 0,
  totalReviews INTEGER DEFAULT 0,
  image TEXT NOT NULL,
  images TEXT,
  isActive INTEGER DEFAULT 1,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS carts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  productId INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  sellerId INTEGER NOT NULL,
  totalAmount REAL NOT NULL,
  productAmount REAL NOT NULL,
  adminFeePercentage REAL NOT NULL DEFAULT 1,
  adminFeeAmount REAL NOT NULL DEFAULT 0,
  shippingCost REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','shipped','delivered','cancelled')),
  shippingAddress TEXT NOT NULL,
  paymentMethod TEXT NOT NULL,
  trackingNumber TEXT,
  notes TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orderItems (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orderId INTEGER NOT NULL,
  productId INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  price REAL NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  productId INTEGER NOT NULL,
  userId INTEGER NOT NULL,
  orderId INTEGER NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS adminFeeLogs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orderId INTEGER NOT NULL,
  adminFeeAmount REAL NOT NULL,
  adminFeePercentage REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','collected','transferred')),
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS email_idx ON users(email);
CREATE INDEX IF NOT EXISTS role_idx ON users(role);
CREATE INDEX IF NOT EXISTS seller_userId_idx ON sellers(userId);
CREATE INDEX IF NOT EXISTS product_sellerId_idx ON products(sellerId);
CREATE INDEX IF NOT EXISTS product_categoryId_idx ON products(categoryId);
CREATE INDEX IF NOT EXISTS product_name_idx ON products(name);
CREATE INDEX IF NOT EXISTS cart_userId_idx ON carts(userId);
CREATE INDEX IF NOT EXISTS order_userId_idx ON orders(userId);
CREATE INDEX IF NOT EXISTS order_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS review_productId_idx ON reviews(productId);

-- Seed data kategori
INSERT OR IGNORE INTO categories (name, description) VALUES
  ('Fashion Pria', 'Pakaian dan aksesoris pria'),
  ('Fashion Wanita', 'Pakaian dan aksesoris wanita'),
  ('Elektronik', 'Gadget dan perangkat elektronik'),
  ('Olahraga', 'Perlengkapan olahraga dan outdoor');
