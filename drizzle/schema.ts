import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  json,
  boolean,
  index,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Email untuk login */
  email: varchar("email", { length: 320 }).notNull().unique(),
  /** Hashed password untuk email/password login */
  passwordHash: varchar("passwordHash", { length: 255 }),
  /** Google OAuth identifier */
  googleId: varchar("googleId", { length: 255 }).unique(),
  /** Legacy Manus OAuth identifier (untuk backward compatibility) */
  openId: varchar("openId", { length: 64 }).unique(),
  name: text("name"),
  avatar: varchar("avatar", { length: 512 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "seller", "admin"]).default("user").notNull(),
  isEmailVerified: boolean("isEmailVerified").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("email_idx").on(table.email),
  roleIdx: index("role_idx").on(table.role),
  googleIdIdx: index("googleId_idx").on(table.googleId),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Sellers table - Profil seller dengan informasi toko
 */
export const sellers = mysqlTable("sellers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  shopName: varchar("shopName", { length: 255 }).notNull(),
  shopDescription: text("shopDescription"),
  shopImage: varchar("shopImage", { length: 512 }),
  address: text("address"),
  phone: varchar("phone", { length: 20 }),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  totalSales: int("totalSales").default(0),
  totalRevenue: decimal("totalRevenue", { precision: 15, scale: 2 }).default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("seller_userId_idx").on(table.userId),
}));

export type Seller = typeof sellers.$inferSelect;
export type InsertSeller = typeof sellers.$inferInsert;

/**
 * Categories table - Kategori produk
 */
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  image: varchar("image", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

/**
 * Products table - Produk yang dijual
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  sellerId: int("sellerId").notNull(),
  categoryId: int("categoryId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  stock: int("stock").notNull().default(0),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  totalReviews: int("totalReviews").default(0),
  image: varchar("image", { length: 512 }).notNull(),
  images: text("images").$type<string[]>(),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  sellerIdIdx: index("product_sellerId_idx").on(table.sellerId),
  categoryIdIdx: index("product_categoryId_idx").on(table.categoryId),
  nameIdx: index("product_name_idx").on(table.name),
}));

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Carts table - Keranjang belanja pembeli
 */
export const carts = mysqlTable("carts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productId: int("productId").notNull(),
  quantity: int("quantity").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("cart_userId_idx").on(table.userId),
  productIdIdx: index("cart_productId_idx").on(table.productId),
}));

export type Cart = typeof carts.$inferSelect;
export type InsertCart = typeof carts.$inferInsert;

/**
 * Orders table - Pesanan pembeli
 */
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sellerId: int("sellerId").notNull(),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull(),
  productAmount: decimal("productAmount", { precision: 12, scale: 2 }).notNull(),
  adminFeePercentage: decimal("adminFeePercentage", { precision: 5, scale: 2 }).default("1").notNull(),
  adminFeeAmount: decimal("adminFeeAmount", { precision: 12, scale: 2 }).default("0").notNull(),
  shippingCost: decimal("shippingCost", { precision: 12, scale: 2 }).default("0").notNull(),
  status: mysqlEnum("status", [
    "pending",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ])
    .default("pending")
    .notNull(),
  shippingAddress: text("shippingAddress").notNull(),
  paymentMethod: varchar("paymentMethod", { length: 100 }).notNull(),
  trackingNumber: varchar("trackingNumber", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("order_userId_idx").on(table.userId),
  sellerIdIdx: index("order_sellerId_idx").on(table.sellerId),
  statusIdx: index("order_status_idx").on(table.status),
}));

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * OrderItems table - Item dalam pesanan
 */
export const orderItems = mysqlTable("orderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId").notNull(),
  quantity: int("quantity").notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  orderIdIdx: index("orderItem_orderId_idx").on(table.orderId),
  productIdIdx: index("orderItem_productId_idx").on(table.productId),
}));

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

/**
 * Reviews table - Review dan rating produk
 */
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  userId: int("userId").notNull(),
  orderId: int("orderId").notNull(),
  rating: int("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  productIdIdx: index("review_productId_idx").on(table.productId),
  userIdIdx: index("review_userId_idx").on(table.userId),
  orderIdIdx: index("review_orderId_idx").on(table.orderId),
}));

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

/**
 * AdminFeeLog table - Tracking admin fee yang dikumpulkan
 */
export const adminFeeLogs = mysqlTable("adminFeeLogs", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  adminFeeAmount: decimal("adminFeeAmount", { precision: 12, scale: 2 }).notNull(),
  adminFeePercentage: decimal("adminFeePercentage", { precision: 5, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "collected", "transferred"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orderIdIdx: index("adminFeeLog_orderId_idx").on(table.orderId),
  statusIdx: index("adminFeeLog_status_idx").on(table.status),
}));

export type AdminFeeLog = typeof adminFeeLogs.$inferSelect;
export type InsertAdminFeeLog = typeof adminFeeLogs.$inferInsert;
