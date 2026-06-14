// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";

// server/db.ts
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  index
} from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
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
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
}, (table) => ({
  emailIdx: index("email_idx").on(table.email),
  roleIdx: index("role_idx").on(table.role),
  googleIdIdx: index("googleId_idx").on(table.googleId)
}));
var sellers = mysqlTable("sellers", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => ({
  userIdIdx: index("seller_userId_idx").on(table.userId)
}));
var categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  image: varchar("image", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var products = mysqlTable("products", {
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
  images: text("images").$type(),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => ({
  sellerIdIdx: index("product_sellerId_idx").on(table.sellerId),
  categoryIdIdx: index("product_categoryId_idx").on(table.categoryId),
  nameIdx: index("product_name_idx").on(table.name)
}));
var carts = mysqlTable("carts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productId: int("productId").notNull(),
  quantity: int("quantity").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => ({
  userIdIdx: index("cart_userId_idx").on(table.userId),
  productIdIdx: index("cart_productId_idx").on(table.productId)
}));
var orders = mysqlTable("orders", {
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
    "cancelled"
  ]).default("pending").notNull(),
  shippingAddress: text("shippingAddress").notNull(),
  paymentMethod: varchar("paymentMethod", { length: 100 }).notNull(),
  trackingNumber: varchar("trackingNumber", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => ({
  userIdIdx: index("order_userId_idx").on(table.userId),
  sellerIdIdx: index("order_sellerId_idx").on(table.sellerId),
  statusIdx: index("order_status_idx").on(table.status)
}));
var orderItems = mysqlTable("orderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId").notNull(),
  quantity: int("quantity").notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => ({
  orderIdIdx: index("orderItem_orderId_idx").on(table.orderId),
  productIdIdx: index("orderItem_productId_idx").on(table.productId)
}));
var reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  userId: int("userId").notNull(),
  orderId: int("orderId").notNull(),
  rating: int("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => ({
  productIdIdx: index("review_productId_idx").on(table.productId),
  userIdIdx: index("review_userId_idx").on(table.userId),
  orderIdIdx: index("review_orderId_idx").on(table.orderId)
}));
var adminFeeLogs = mysqlTable("adminFeeLogs", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  adminFeeAmount: decimal("adminFeeAmount", { precision: 12, scale: 2 }).notNull(),
  adminFeePercentage: decimal("adminFeePercentage", { precision: 5, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "collected", "transferred"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => ({
  orderIdIdx: index("adminFeeLog_orderId_idx").on(table.orderId),
  statusIdx: index("adminFeeLog_status_idx").on(table.status)
}));

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getProducts(limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).limit(limit).offset(offset);
}
async function getProductById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result[0];
}
async function getProductsByCategory(categoryId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).where(eq(products.categoryId, categoryId));
}
async function getCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories);
}
async function getCategoryById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return result[0];
}
async function getCartItems(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(carts).where(eq(carts.userId, userId));
}
async function removeFromCart(cartId) {
  const db = await getDb();
  if (!db) return;
  await db.delete(carts).where(eq(carts.id, cartId));
}
async function getUserOrders(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.userId, userId));
}
async function getSellerOrders(sellerId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.sellerId, sellerId));
}
async function getOrderById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return result[0];
}
async function getSellerByUserId(userId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(sellers).where(eq(sellers.userId, userId)).limit(1);
  return result[0];
}
async function getProductReviews(productId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reviews).where(eq(reviews.productId, productId));
}

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/_core/sdk.ts
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: "",
    passwordHash: null,
    googleId: null,
    avatar: null,
    loginMethod: null,
    isEmailVerified: false,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/storageProxy.ts
function registerStorageProxy(app) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
import { z as z2 } from "zod";
import { eq as eq2, like, or as or2, sql } from "drizzle-orm";
var adminProcedure2 = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
  return next({ ctx });
});
var sellerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "seller" && ctx.user.role !== "admin") {
    throw new Error("Unauthorized: Seller access required");
  }
  return next({ ctx });
});
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    })
  }),
  // Product routes
  products: router({
    list: publicProcedure.input(
      z2.object({
        limit: z2.number().default(20),
        offset: z2.number().default(0)
      })
    ).query(({ input }) => getProducts(input.limit, input.offset)),
    getById: publicProcedure.input(z2.object({ id: z2.number() })).query(({ input }) => getProductById(input.id)),
    getByCategory: publicProcedure.input(z2.object({ categoryId: z2.number() })).query(({ input }) => getProductsByCategory(input.categoryId)),
    search: publicProcedure.input(z2.object({ query: z2.string() })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      if (!input.query.trim()) return getProducts(20, 0);
      return db.select().from(products).where(
        or2(
          like(products.name, `%${input.query}%`),
          like(products.description, `%${input.query}%`)
        )
      ).limit(50);
    }),
    create: sellerProcedure.input(
      z2.object({
        name: z2.string(),
        description: z2.string(),
        price: z2.number(),
        categoryId: z2.number(),
        stock: z2.number(),
        image: z2.string(),
        images: z2.array(z2.string()).optional()
      })
    ).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const seller = await getSellerByUserId(ctx.user.id);
      if (!seller) throw new Error("Seller profile not found");
      const result = await db.insert(products).values({
        name: input.name,
        description: input.description,
        price: input.price,
        categoryId: input.categoryId,
        stock: input.stock,
        image: input.image,
        images: input.images,
        sellerId: seller.id,
        isActive: true
      });
      return result;
    }),
    update: sellerProcedure.input(
      z2.object({
        id: z2.number(),
        name: z2.string().optional(),
        description: z2.string().optional(),
        price: z2.number().optional(),
        stock: z2.number().optional(),
        image: z2.string().optional(),
        isActive: z2.boolean().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const product = await getProductById(input.id);
      if (!product) throw new Error("Product not found");
      const seller = await getSellerByUserId(ctx.user.id);
      if (!seller || product.sellerId !== seller.id) {
        throw new Error("Unauthorized");
      }
      const updateData = {};
      if (input.name !== void 0) updateData.name = input.name;
      if (input.description !== void 0) updateData.description = input.description;
      if (input.price !== void 0) updateData.price = input.price;
      if (input.stock !== void 0) updateData.stock = input.stock;
      if (input.image !== void 0) updateData.image = input.image;
      if (input.isActive !== void 0) updateData.isActive = input.isActive;
      await db.update(products).set(updateData).where(eq2(products.id, input.id));
      return { success: true };
    })
  }),
  // Category routes
  categories: router({
    list: publicProcedure.query(() => getCategories()),
    getById: publicProcedure.input(z2.object({ id: z2.number() })).query(({ input }) => getCategoryById(input.id)),
    create: adminProcedure2.input(
      z2.object({
        name: z2.string(),
        description: z2.string().optional(),
        image: z2.string().optional()
      })
    ).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await db.insert(categories).values({
        name: input.name,
        description: input.description,
        image: input.image
      });
      return result;
    })
  }),
  // Cart routes
  cart: router({
    list: protectedProcedure.query(({ ctx }) => getCartItems(ctx.user.id)),
    add: protectedProcedure.input(
      z2.object({
        productId: z2.number(),
        quantity: z2.number().default(1)
      })
    ).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const product = await getProductById(input.productId);
      if (!product) throw new Error("Product not found");
      if (product.stock < input.quantity) {
        throw new Error("Insufficient stock");
      }
      const existingCart = await db.select().from(carts).where(
        eq2(carts.userId, ctx.user.id)
      );
      const existingItem = existingCart.find((c) => c.productId === input.productId);
      if (existingItem) {
        await db.update(carts).set({ quantity: existingItem.quantity + input.quantity }).where(eq2(carts.id, existingItem.id));
      } else {
        await db.insert(carts).values({
          userId: ctx.user.id,
          productId: input.productId,
          quantity: input.quantity
        });
      }
      return { success: true };
    }),
    remove: protectedProcedure.input(z2.object({ cartId: z2.number() })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const cartItem = await db.select().from(carts).where(eq2(carts.id, input.cartId));
      if (!cartItem.length || cartItem[0].userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }
      await removeFromCart(input.cartId);
      return { success: true };
    }),
    update: protectedProcedure.input(
      z2.object({
        cartId: z2.number(),
        quantity: z2.number()
      })
    ).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const cartItem = await db.select().from(carts).where(eq2(carts.id, input.cartId));
      if (!cartItem.length || cartItem[0].userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }
      if (input.quantity <= 0) {
        await removeFromCart(input.cartId);
      } else {
        await db.update(carts).set({ quantity: input.quantity }).where(eq2(carts.id, input.cartId));
      }
      return { success: true };
    }),
    clear: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(carts).where(eq2(carts.userId, ctx.user.id));
      return { success: true };
    })
  }),
  // Order routes
  orders: router({
    list: protectedProcedure.query(({ ctx }) => getUserOrders(ctx.user.id)),
    getById: protectedProcedure.input(z2.object({ id: z2.number() })).query(async ({ input, ctx }) => {
      const order = await getOrderById(input.id);
      if (!order || order.userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }
      return order;
    }),
    create: protectedProcedure.input(
      z2.object({
        shippingAddress: z2.string(),
        paymentMethod: z2.string(),
        shippingCost: z2.number().default(0)
      })
    ).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const cartItems = await getCartItems(ctx.user.id);
      if (!cartItems.length) throw new Error("Cart is empty");
      let productAmount = 0;
      for (const item of cartItems) {
        const product = await getProductById(item.productId);
        if (!product) throw new Error("Product not found");
        productAmount += Number(product.price) * item.quantity;
      }
      const adminFeePercentage = 1;
      const adminFeeAmount = productAmount * (adminFeePercentage / 100);
      const totalAmount = productAmount + adminFeeAmount + input.shippingCost;
      const firstProduct = await getProductById(cartItems[0].productId);
      if (!firstProduct) throw new Error("Product not found");
      const orderResult = await db.insert(orders).values({
        userId: ctx.user.id,
        sellerId: firstProduct.sellerId,
        totalAmount: totalAmount.toString(),
        productAmount: productAmount.toString(),
        adminFeePercentage: adminFeePercentage.toString(),
        adminFeeAmount: adminFeeAmount.toString(),
        shippingCost: input.shippingCost.toString(),
        status: "pending",
        shippingAddress: input.shippingAddress,
        paymentMethod: input.paymentMethod
      });
      for (const item of cartItems) {
        const product = await getProductById(item.productId);
        if (!product) throw new Error("Product not found");
        await db.insert(orderItems).values({
          orderId: orderResult.insertId,
          productId: item.productId,
          quantity: item.quantity,
          price: product.price
        });
      }
      await db.delete(carts).where(eq2(carts.userId, ctx.user.id));
      return { success: true, orderId: orderResult.insertId };
    }),
    updateStatus: sellerProcedure.input(
      z2.object({
        orderId: z2.number(),
        status: z2.enum(["pending", "processing", "shipped", "delivered", "cancelled"])
      })
    ).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const order = await getOrderById(input.orderId);
      if (!order) throw new Error("Order not found");
      const seller = await getSellerByUserId(ctx.user.id);
      if (!seller || order.sellerId !== seller.id) {
        throw new Error("Unauthorized");
      }
      await db.update(orders).set({ status: input.status }).where(eq2(orders.id, input.orderId));
      return { success: true };
    }),
    getSellerOrders: sellerProcedure.query(async ({ ctx }) => {
      const seller = await getSellerByUserId(ctx.user.id);
      if (!seller) throw new Error("Seller profile not found");
      return getSellerOrders(seller.id);
    })
  }),
  // Review routes
  reviews: router({
    getByProduct: publicProcedure.input(z2.object({ productId: z2.number() })).query(({ input }) => getProductReviews(input.productId)),
    create: protectedProcedure.input(
      z2.object({
        productId: z2.number(),
        orderId: z2.number(),
        rating: z2.number().min(1).max(5),
        comment: z2.string().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const order = await getOrderById(input.orderId);
      if (!order || order.userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }
      if (order.status !== "delivered") {
        throw new Error("Can only review delivered orders");
      }
      const existingReview = await db.select().from(reviews).where(
        eq2(reviews.orderId, input.orderId) && eq2(reviews.userId, ctx.user.id)
      );
      if (existingReview.length) {
        throw new Error("Already reviewed this order");
      }
      const result = await db.insert(reviews).values({
        productId: input.productId,
        userId: ctx.user.id,
        orderId: input.orderId,
        rating: input.rating,
        comment: input.comment
      });
      return { success: true };
    })
  }),
  // Seller routes
  sellers: router({
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      return getSellerByUserId(ctx.user.id);
    }),
    updateProfile: sellerProcedure.input(
      z2.object({
        shopName: z2.string().optional(),
        shopDescription: z2.string().optional(),
        shopImage: z2.string().optional(),
        address: z2.string().optional(),
        phone: z2.string().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const seller = await getSellerByUserId(ctx.user.id);
      if (!seller) throw new Error("Seller profile not found");
      const updateData = {};
      if (input.shopName !== void 0) updateData.shopName = input.shopName;
      if (input.shopDescription !== void 0) updateData.shopDescription = input.shopDescription;
      if (input.shopImage !== void 0) updateData.shopImage = input.shopImage;
      if (input.address !== void 0) updateData.address = input.address;
      if (input.phone !== void 0) updateData.phone = input.phone;
      await db.update(sellers).set(updateData).where(eq2(sellers.id, seller.id));
      return { success: true };
    }),
    getProducts: sellerProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const seller = await getSellerByUserId(ctx.user.id);
      if (!seller) throw new Error("Seller profile not found");
      return db.select().from(products).where(eq2(products.sellerId, seller.id));
    })
  }),
  // Admin routes
  admin: router({
    getAllUsers: adminProcedure2.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt
      }).from(users).limit(100);
    }),
    updateUserRole: adminProcedure2.input(
      z2.object({
        userId: z2.number(),
        role: z2.enum(["user", "seller", "admin"])
      })
    ).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(users).set({ role: input.role }).where(eq2(users.id, input.userId));
      return { success: true };
    }),
    getAllOrders: adminProcedure2.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(orders).limit(100);
    }),
    getAllProducts: adminProcedure2.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(products).limit(100);
    }),
    getStats: adminProcedure2.query(async () => {
      const db = await getDb();
      if (!db) return { totalUsers: 0, totalProducts: 0, totalOrders: 0, totalRevenue: 0 };
      const [userCount] = await db.select({ count: sql`count(*)` }).from(users);
      const [productCount] = await db.select({ count: sql`count(*)` }).from(products);
      const [orderCount] = await db.select({ count: sql`count(*)` }).from(orders);
      const [revenueResult] = await db.select({ total: sql`COALESCE(SUM(totalAmount), 0)` }).from(orders).where(eq2(orders.status, "delivered"));
      return {
        totalUsers: Number(userCount?.count ?? 0),
        totalProducts: Number(productCount?.count ?? 0),
        totalOrders: Number(orderCount?.count ?? 0),
        totalRevenue: Number(revenueResult?.total ?? 0)
      };
    })
  })
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs2 from "fs";
import { nanoid } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
var PROJECT_ROOT = import.meta.dirname;
var LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
var MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024;
var TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6);
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}
function trimLogFile(logPath, maxSize) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }
    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines = [];
    let keptBytes = 0;
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}
`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }
    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
  }
}
function writeToLogFile(source, entries) {
  if (entries.length === 0) return;
  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);
  const lines = entries.map((entry) => {
    const ts = (/* @__PURE__ */ new Date()).toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });
  fs.appendFileSync(logPath, `${lines.join("\n")}
`, "utf-8");
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}
function vitePluginManusDebugCollector() {
  return {
    name: "manus-debug-collector",
    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true
            },
            injectTo: "head"
          }
        ]
      };
    },
    configureServer(server) {
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }
        const handlePayload = (payload) => {
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };
        const reqBody = req.body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    }
  };
}
var plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime(), vitePluginManusDebugCollector()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path2.resolve(import.meta.dirname, "../..", "dist", "public") : path2.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = express2();
  const server = createServer(app);
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
startServer().catch(console.error);
