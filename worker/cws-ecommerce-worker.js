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
      if (path === "/api/health" || path === "/" || path === "/health") {
        return jsonResponse({ status: "ok", service: "CWS Mantap API", timestamp: new Date().toISOString() }, 200, origin);
      }

      // /app-auth — halaman login HTML untuk OAuth-style redirect dari Pages
      if (path === "/app-auth") {
        const appId = url.searchParams.get("appId") || "";
        const redirectUri = url.searchParams.get("redirectUri") || "";
        const state = url.searchParams.get("state") || "";
        const type = url.searchParams.get("type") || "signIn";

        // Jika sudah ada session, redirect langsung
        const user = await getUser(request, env);
        if (user && redirectUri) {
          const token = await signToken(
            { userId: user.id, role: user.role },
            env.SESSION_SECRET || "default-secret-change-me"
          );
          const redirect = new URL(redirectUri);
          redirect.searchParams.set("token", token);
          redirect.searchParams.set("state", state);
          return Response.redirect(redirect.toString(), 302);
        }

        // Tampilkan halaman login HTML
        const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login - CWS Mantap</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f1f5f9; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .card { background: white; border-radius: 16px; padding: 40px; width: 100%; max-width: 400px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .logo { text-align: center; margin-bottom: 28px; }
    .logo h1 { font-size: 28px; font-weight: 800; color: #e11d48; }
    .logo p { color: #64748b; font-size: 14px; margin-top: 4px; }
    .tabs { display: flex; gap: 4px; background: #f1f5f9; border-radius: 8px; padding: 4px; margin-bottom: 24px; }
    .tab { flex: 1; padding: 8px; text-align: center; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; color: #64748b; border: none; background: transparent; }
    .tab.active { background: white; color: #e11d48; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
    .form-group { margin-bottom: 16px; }
    label { display: block; font-size: 13px; font-weight: 500; color: #374151; margin-bottom: 6px; }
    input { width: 100%; padding: 10px 14px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 14px; outline: none; transition: border-color 0.2s; }
    input:focus { border-color: #e11d48; }
    .btn { width: 100%; padding: 12px; background: #e11d48; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    .btn:hover { background: #be123c; }
    .btn:disabled { background: #94a3b8; cursor: not-allowed; }
    .error { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; border-radius: 8px; padding: 10px 14px; font-size: 13px; margin-bottom: 16px; display: none; }
    .success { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px; font-size: 13px; margin-bottom: 16px; display: none; }
    #form-register { display: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <h1>CWS Mantap</h1>
      <p>Platform E-Commerce Terpercaya</p>
    </div>

    <div class="tabs">
      <button class="tab active" onclick="switchTab('login')">Masuk</button>
      <button class="tab" onclick="switchTab('register')">Daftar</button>
    </div>

    <div id="error-msg" class="error"></div>
    <div id="success-msg" class="success"></div>

    <!-- Form Login -->
    <div id="form-login">
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="login-email" placeholder="email@contoh.com" />
      </div>
      <div class="form-group">
        <label>Password</label>
        <input type="password" id="login-password" placeholder="Password" />
      </div>
      <button class="btn" id="btn-login" onclick="doLogin()">Masuk</button>
    </div>

    <!-- Form Register -->
    <div id="form-register">
      <div class="form-group">
        <label>Nama Lengkap</label>
        <input type="text" id="reg-name" placeholder="Nama kamu" />
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="reg-email" placeholder="email@contoh.com" />
      </div>
      <div class="form-group">
        <label>Password</label>
        <input type="password" id="reg-password" placeholder="Minimal 6 karakter" />
      </div>
      <button class="btn" id="btn-register" onclick="doRegister()">Daftar Sekarang</button>
    </div>
  </div>

  <script>
    const REDIRECT_URI = ${JSON.stringify(redirectUri)};
    const STATE = ${JSON.stringify(state)};
    const API = ${JSON.stringify(new URL(request.url).origin)};

    function switchTab(tab) {
      document.querySelectorAll('.tab').forEach((t, i) => {
        t.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'register'));
      });
      document.getElementById('form-login').style.display = tab === 'login' ? 'block' : 'none';
      document.getElementById('form-register').style.display = tab === 'register' ? 'block' : 'none';
      document.getElementById('error-msg').style.display = 'none';
    }

    function showError(msg) {
      const el = document.getElementById('error-msg');
      el.textContent = msg; el.style.display = 'block';
      document.getElementById('success-msg').style.display = 'none';
    }

    function showSuccess(msg) {
      const el = document.getElementById('success-msg');
      el.textContent = msg; el.style.display = 'block';
      document.getElementById('error-msg').style.display = 'none';
    }

    async function doLogin() {
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      if (!email || !password) return showError('Email dan password wajib diisi');
      const btn = document.getElementById('btn-login');
      btn.disabled = true; btn.textContent = 'Memproses...';
      try {
        const res = await fetch(API + '/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
          credentials: 'include'
        });
        const data = await res.json();
        if (data.error) { showError(data.error); btn.disabled = false; btn.textContent = 'Masuk'; return; }
        showSuccess('Login berhasil! Mengalihkan...');
        if (REDIRECT_URI) {
          const url = new URL(REDIRECT_URI);
          url.searchParams.set('token', data.token);
          url.searchParams.set('state', STATE);
          setTimeout(() => window.location.href = url.toString(), 800);
        } else {
          setTimeout(() => window.location.href = '/', 800);
        }
      } catch(e) { showError('Gagal terhubung ke server'); btn.disabled = false; btn.textContent = 'Masuk'; }
    }

    async function doRegister() {
      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      if (!name || !email || !password) return showError('Semua field wajib diisi');
      if (password.length < 6) return showError('Password minimal 6 karakter');
      const btn = document.getElementById('btn-register');
      btn.disabled = true; btn.textContent = 'Mendaftar...';
      try {
        const res = await fetch(API + '/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
          credentials: 'include'
        });
        const data = await res.json();
        if (data.error) { showError(data.error); btn.disabled = false; btn.textContent = 'Daftar Sekarang'; return; }
        showSuccess('Akun berhasil dibuat! Silakan login.');
        setTimeout(() => switchTab('login'), 1500);
        btn.disabled = false; btn.textContent = 'Daftar Sekarang';
      } catch(e) { showError('Gagal terhubung ke server'); btn.disabled = false; btn.textContent = 'Daftar Sekarang'; }
    }

    // Enter key support
    document.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const loginVisible = document.getElementById('form-login').style.display !== 'none';
        if (loginVisible) doLogin(); else doRegister();
      }
    });
  </script>
</body>
</html>`;

        return new Response(html, {
          headers: { "Content-Type": "text/html;charset=UTF-8" },
        });
      }

      return jsonResponse({ error: "Route tidak ditemukan" }, 404, origin);

    } catch (err) {
      console.error("Worker error:", err);
      return jsonResponse({ error: "Internal server error", message: err.message }, 500, origin);
    }
  },
};
