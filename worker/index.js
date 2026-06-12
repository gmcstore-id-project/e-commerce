/**
 * CWS Mantap - Cloudflare Worker API
 * Backend lengkap dengan D1 SQLite database
 */

// ============================================================
// CORS Helper
// ============================================================
function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie",
    "Access-Control-Allow-Credentials": "true",
  };
}

function jsonResponse(data, status = 200, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

// ============================================================
// Auth Helper (Simple JWT-like session via cookie)
// ============================================================
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function signToken(payload, secret) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${header}.${body}`)
  );
  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return `${header}.${body}.${sig}`;
}

async function verifyToken(token, secret) {
  try {
    const [header, body, sig] = token.split(".");
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const sigBuf = Uint8Array.from(atob(sig), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBuf,
      encoder.encode(`${header}.${body}`)
    );
    if (!valid) return null;
    return JSON.parse(atob(body));
  } catch {
    return null;
  }
}

function getCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function getUser(request, env) {
  const token = getCookie(request, "session");
  if (!token) return null;
  const payload = await verifyToken(token, env.SESSION_SECRET || "default-secret-change-me");
  if (!payload || !payload.userId) return null;
  const result = await env.DB.prepare("SELECT * FROM users WHERE id = ?")
    .bind(payload.userId)
    .first();
  return result || null;
}

// ============================================================
// Route Handlers
// ============================================================

// --- AUTH ---
async function handleRegister(request, env) {
  const body = await request.json();
  const { email, password, name } = body;
  if (!email || !password) return { error: "Email dan password diperlukan" };

  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?")
    .bind(email)
    .first();
  if (existing) return { error: "Email sudah terdaftar" };

  const passwordHash = await hashPassword(password);
  const result = await env.DB.prepare(
    "INSERT INTO users (email, passwordHash, name, role) VALUES (?, ?, ?, 'user')"
  )
    .bind(email, passwordHash, name || email.split("@")[0])
    .run();

  return { success: true, userId: result.meta.last_row_id };
}

async function handleLogin(request, env) {
  const body = await request.json();
  const { email, password } = body;
  if (!email || !password) return { error: "Email dan password diperlukan" };

  const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?")
    .bind(email)
    .first();
  if (!user) return { error: "Email atau password salah" };

  const passwordHash = await hashPassword(password);
  if (user.passwordHash !== passwordHash) return { error: "Email atau password salah" };

  const token = await signToken(
    { userId: user.id, role: user.role },
    env.SESSION_SECRET || "default-secret-change-me"
  );

  return { success: true, token, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
}

// --- PRODUCTS ---
async function getProducts(env, limit = 20, offset = 0) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM products WHERE isActive = 1 ORDER BY createdAt DESC LIMIT ? OFFSET ?"
  ).bind(limit, offset).all();
  return results;
}

async function searchProducts(env, query) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM products WHERE isActive = 1 AND (name LIKE ? OR description LIKE ?) LIMIT 50"
  ).bind(`%${query}%`, `%${query}%`).all();
  return results;
}

async function getProductById(env, id) {
  return env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(id).first();
}

async function getProductsByCategory(env, categoryId) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM products WHERE categoryId = ? AND isActive = 1"
  ).bind(categoryId).all();
  return results;
}

// --- CATEGORIES ---
async function getCategories(env) {
  const { results } = await env.DB.prepare("SELECT * FROM categories ORDER BY name").all();
  return results;
}

// --- CART ---
async function getCart(env, userId) {
  const { results } = await env.DB.prepare(
    `SELECT c.*, p.name, p.price, p.image, p.stock 
     FROM carts c JOIN products p ON c.productId = p.id 
     WHERE c.userId = ?`
  ).bind(userId).all();
  return results;
}

async function addToCart(env, userId, productId, quantity) {
  const existing = await env.DB.prepare(
    "SELECT * FROM carts WHERE userId = ? AND productId = ?"
  ).bind(userId, productId).first();

  if (existing) {
    await env.DB.prepare(
      "UPDATE carts SET quantity = quantity + ? WHERE id = ?"
    ).bind(quantity, existing.id).run();
  } else {
    await env.DB.prepare(
      "INSERT INTO carts (userId, productId, quantity) VALUES (?, ?, ?)"
    ).bind(userId, productId, quantity).run();
  }
  return { success: true };
}

// --- ORDERS ---
async function getUserOrders(env, userId) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM orders WHERE userId = ? ORDER BY createdAt DESC"
  ).bind(userId).all();
  return results;
}

async function getOrderById(env, id) {
  return env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(id).first();
}

// --- ADMIN ---
async function getAdminStats(env) {
  const [userCount, productCount, orderCount, revenueResult] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) as count FROM users").first(),
    env.DB.prepare("SELECT COUNT(*) as count FROM products").first(),
    env.DB.prepare("SELECT COUNT(*) as count FROM orders").first(),
    env.DB.prepare("SELECT COALESCE(SUM(totalAmount),0) as total FROM orders WHERE status='delivered'").first(),
  ]);
  return {
    totalUsers: userCount?.count || 0,
    totalProducts: productCount?.count || 0,
    totalOrders: orderCount?.count || 0,
    totalRevenue: revenueResult?.total || 0,
  };
}

// ============================================================
// Main Router
// ============================================================
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const origin = request.headers.get("Origin");

    // Handle CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    try {
      // AUTH routes
      if (path === "/api/auth/register" && method === "POST") {
        const result = await handleRegister(request, env);
        return jsonResponse(result, result.error ? 400 : 200, origin);
      }

      if (path === "/api/auth/login" && method === "POST") {
        const result = await handleLogin(request, env);
        if (result.error) return jsonResponse(result, 401, origin);
        const response = jsonResponse(result, 200, origin);
        const res = new Response(response.body, response);
        res.headers.append(
          "Set-Cookie",
          `session=${result.token}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=604800`
        );
        return res;
      }

      if (path === "/api/auth/logout" && method === "POST") {
        const response = jsonResponse({ success: true }, 200, origin);
        const res = new Response(response.body, response);
        res.headers.append("Set-Cookie", "session=; HttpOnly; Path=/; Max-Age=0");
        return res;
      }

      if (path === "/api/auth/me") {
        const user = await getUser(request, env);
        if (!user) return jsonResponse(null, 200, origin);
        return jsonResponse({ id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar }, 200, origin);
      }

      // PRODUCT routes
      if (path === "/api/products" && method === "GET") {
        const limit = parseInt(url.searchParams.get("limit") || "20");
        const offset = parseInt(url.searchParams.get("offset") || "0");
        const data = await getProducts(env, limit, offset);
        return jsonResponse(data, 200, origin);
      }

      if (path === "/api/products/search" && method === "GET") {
        const query = url.searchParams.get("q") || "";
        const data = await searchProducts(env, query);
        return jsonResponse(data, 200, origin);
      }

      if (path.match(/^\/api\/products\/\d+$/) && method === "GET") {
        const id = parseInt(path.split("/").pop());
        const data = await getProductById(env, id);
        if (!data) return jsonResponse({ error: "Produk tidak ditemukan" }, 404, origin);
        return jsonResponse(data, 200, origin);
      }

      if (path === "/api/products/by-category" && method === "GET") {
        const categoryId = parseInt(url.searchParams.get("categoryId") || "0");
        const data = await getProductsByCategory(env, categoryId);
        return jsonResponse(data, 200, origin);
      }

      // CATEGORY routes
      if (path === "/api/categories" && method === "GET") {
        const data = await getCategories(env);
        return jsonResponse(data, 200, origin);
      }

      // CART routes (protected)
      if (path === "/api/cart") {
        const user = await getUser(request, env);
        if (!user) return jsonResponse({ error: "Unauthorized" }, 401, origin);

        if (method === "GET") {
          const data = await getCart(env, user.id);
          return jsonResponse(data, 200, origin);
        }

        if (method === "POST") {
          const body = await request.json();
          const result = await addToCart(env, user.id, body.productId, body.quantity || 1);
          return jsonResponse(result, 200, origin);
        }

        if (method === "DELETE") {
          const cartId = url.searchParams.get("id");
          if (cartId) {
            await env.DB.prepare("DELETE FROM carts WHERE id = ? AND userId = ?")
              .bind(parseInt(cartId), user.id).run();
          } else {
            await env.DB.prepare("DELETE FROM carts WHERE userId = ?").bind(user.id).run();
          }
          return jsonResponse({ success: true }, 200, origin);
        }

        if (method === "PUT") {
          const body = await request.json();
          if (body.quantity <= 0) {
            await env.DB.prepare("DELETE FROM carts WHERE id = ? AND userId = ?")
              .bind(body.cartId, user.id).run();
          } else {
            await env.DB.prepare("UPDATE carts SET quantity = ? WHERE id = ? AND userId = ?")
              .bind(body.quantity, body.cartId, user.id).run();
          }
          return jsonResponse({ success: true }, 200, origin);
        }
      }

      // ORDER routes (protected)
      if (path === "/api/orders") {
        const user = await getUser(request, env);
        if (!user) return jsonResponse({ error: "Unauthorized" }, 401, origin);

        if (method === "GET") {
          const data = await getUserOrders(env, user.id);
          return jsonResponse(data, 200, origin);
        }

        if (method === "POST") {
          const body = await request.json();
          const cartItems = await getCart(env, user.id);
          if (!cartItems.length) return jsonResponse({ error: "Keranjang kosong" }, 400, origin);

          let productAmount = 0;
          for (const item of cartItems) {
            productAmount += item.price * item.quantity;
          }
          const adminFeeAmount = productAmount * 0.01;
          const totalAmount = productAmount + adminFeeAmount + (body.shippingCost || 0);

          const orderResult = await env.DB.prepare(
            `INSERT INTO orders (userId, sellerId, totalAmount, productAmount, adminFeePercentage, adminFeeAmount, shippingCost, status, shippingAddress, paymentMethod)
             VALUES (?, ?, ?, ?, 1, ?, ?, 'pending', ?, ?)`
          ).bind(user.id, cartItems[0].sellerId || 1, totalAmount, productAmount, adminFeeAmount, body.shippingCost || 0, body.shippingAddress, body.paymentMethod).run();

          const orderId = orderResult.meta.last_row_id;

          for (const item of cartItems) {
            await env.DB.prepare(
              "INSERT INTO orderItems (orderId, productId, quantity, price) VALUES (?, ?, ?, ?)"
            ).bind(orderId, item.productId, item.quantity, item.price).run();
          }

          await env.DB.prepare("DELETE FROM carts WHERE userId = ?").bind(user.id).run();

          return jsonResponse({ success: true, orderId }, 200, origin);
        }
      }

      if (path.match(/^\/api\/orders\/\d+$/) && method === "GET") {
        const user = await getUser(request, env);
        if (!user) return jsonResponse({ error: "Unauthorized" }, 401, origin);
        const id = parseInt(path.split("/").pop());
        const order = await getOrderById(env, id);
        if (!order || (order.userId !== user.id && user.role !== "admin")) {
          return jsonResponse({ error: "Unauthorized" }, 403, origin);
        }
        const { results: items } = await env.DB.prepare(
          "SELECT oi.*, p.name, p.image FROM orderItems oi JOIN products p ON oi.productId = p.id WHERE oi.orderId = ?"
        ).bind(id).all();
        return jsonResponse({ ...order, items }, 200, origin);
      }

      // ADMIN routes
      if (path.startsWith("/api/admin")) {
        const user = await getUser(request, env);
        if (!user || user.role !== "admin") return jsonResponse({ error: "Unauthorized" }, 403, origin);

        if (path === "/api/admin/stats") {
          return jsonResponse(await getAdminStats(env), 200, origin);
        }

        if (path === "/api/admin/users") {
          const { results } = await env.DB.prepare(
            "SELECT id, name, email, role, createdAt FROM users LIMIT 100"
          ).all();
          return jsonResponse(results, 200, origin);
        }

        if (path === "/api/admin/users/role" && method === "PUT") {
          const body = await request.json();
          await env.DB.prepare("UPDATE users SET role = ? WHERE id = ?")
            .bind(body.role, body.userId).run();
          return jsonResponse({ success: true }, 200, origin);
        }

        if (path === "/api/admin/orders") {
          const { results } = await env.DB.prepare(
            "SELECT * FROM orders ORDER BY createdAt DESC LIMIT 100"
          ).all();
          return jsonResponse(results, 200, origin);
        }

        if (path === "/api/admin/products") {
          const { results } = await env.DB.prepare(
            "SELECT * FROM products ORDER BY createdAt DESC LIMIT 100"
          ).all();
          return jsonResponse(results, 200, origin);
        }
      }

      // SELLER routes
      if (path === "/api/seller/profile") {
        const user = await getUser(request, env);
        if (!user) return jsonResponse({ error: "Unauthorized" }, 401, origin);
        const seller = await env.DB.prepare("SELECT * FROM sellers WHERE userId = ?").bind(user.id).first();
        return jsonResponse(seller || null, 200, origin);
      }

      if (path === "/api/seller/orders") {
        const user = await getUser(request, env);
        if (!user) return jsonResponse({ error: "Unauthorized" }, 401, origin);
        const seller = await env.DB.prepare("SELECT * FROM sellers WHERE userId = ?").bind(user.id).first();
        if (!seller) return jsonResponse([], 200, origin);
        const { results } = await env.DB.prepare(
          "SELECT * FROM orders WHERE sellerId = ? ORDER BY createdAt DESC"
        ).bind(seller.id).all();
        return jsonResponse(results, 200, origin);
      }

      // Health check
      if (path === "/api/health") {
        return jsonResponse({ status: "ok", timestamp: new Date().toISOString() }, 200, origin);
      }

      return jsonResponse({ error: "Route tidak ditemukan" }, 404, origin);

    } catch (err) {
      console.error("Worker error:", err);
      return jsonResponse({ error: "Internal server error", message: err.message }, 500, origin);
    }
  },
};
