/**
 * CWS Mantap - Cloudflare Worker API
 * Backend lengkap dengan D1 SQLite database + TRPC handler
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

// TRPC response format
function trpcOk(data) {
  return [{ result: { data: { json: data } } }];
}

function trpcError(message, code = "INTERNAL_SERVER_ERROR") {
  return [{ error: { message, code, data: { code } } }];
}

// ============================================================
// Auth Helper
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
// DB Helpers
// ============================================================
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

async function getCategories(env) {
  const { results } = await env.DB.prepare("SELECT * FROM categories ORDER BY name").all();
  return results;
}

async function getCategoryById(env, id) {
  return env.DB.prepare("SELECT * FROM categories WHERE id = ?").bind(id).first();
}

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
    await env.DB.prepare("UPDATE carts SET quantity = quantity + ? WHERE id = ?")
      .bind(quantity, existing.id).run();
  } else {
    await env.DB.prepare("INSERT INTO carts (userId, productId, quantity) VALUES (?, ?, ?)")
      .bind(userId, productId, quantity).run();
  }
  return { success: true };
}

async function getUserOrders(env, userId) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM orders WHERE userId = ? ORDER BY createdAt DESC"
  ).bind(userId).all();
  return results;
}

async function getOrderById(env, id) {
  return env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(id).first();
}

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
// PAYMENT TRANSFER MANUAL
// ============================================================
async function sendEmail(env, { to, subject, html }) {
  if (!env.RESEND_API_KEY) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "CWS Mantap <noreply@cws-mantap.pages.dev>", to: [to], subject, html }),
    });
  } catch (e) { console.error("Email failed:", e); }
}

async function saveImageToKV(env, orderId, arrayBuffer, contentType) {
  if (!env.PAYMENT_IMAGES) throw new Error("KV binding PAYMENT_IMAGES tidak ditemukan");
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  await env.PAYMENT_IMAGES.put(`proof:${orderId}`, JSON.stringify({ base64, contentType, uploadedAt: new Date().toISOString() }), { expirationTtl: 31536000 });
}

async function getImageFromKV(env, orderId) {
  if (!env.PAYMENT_IMAGES) return null;
  const data = await env.PAYMENT_IMAGES.get(`proof:${orderId}`);
  return data ? JSON.parse(data) : null;
}

async function getPaymentBankAccounts(env, orderId) {
  const order = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first();
  if (!order) return { error: "Order tidak ditemukan" };
  const { results } = await env.DB.prepare("SELECT * FROM bankAccounts WHERE sellerId = ? AND isActive = 1").bind(order.sellerId).all();
  return { order, bankAccounts: results };
}

async function getPaymentImage(env, orderId, user) {
  const order = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first();
  if (!order) return null;
  const seller = await env.DB.prepare("SELECT * FROM sellers WHERE userId = ?").bind(user.id).first();
  const ok = order.userId === user.id || (seller && seller.id === order.sellerId) || user.role === "admin";
  if (!ok) return null;
  return getImageFromKV(env, orderId);
}

async function uploadPaymentProof(request, env, user) {
  const formData = await request.formData();
  const orderId = parseInt(formData.get("orderId"));
  const file = formData.get("proof");
  const bankFrom = formData.get("bankFrom") || "";
  const amountTransferred = parseFloat(formData.get("amountTransferred") || "0");
  const transferNote = formData.get("transferNote") || "";

  if (!orderId || !file) return { error: "orderId dan file wajib diisi" };

  const order = await env.DB.prepare(
    `SELECT o.*, u.name as buyerName, u.email as buyerEmail, s.userId as sellerUserId
     FROM orders o JOIN users u ON o.userId = u.id JOIN sellers s ON o.sellerId = s.id
     WHERE o.id = ? AND o.userId = ?`
  ).bind(orderId, user.id).first();
  if (!order) return { error: "Order tidak ditemukan atau bukan milikmu" };

  const existing = await env.DB.prepare("SELECT * FROM paymentProofs WHERE orderId = ?").bind(orderId).first();
  if (existing?.status === "waiting") return { error: "Sudah diupload, menunggu konfirmasi seller" };
  if (existing?.status === "confirmed") return { error: "Pembayaran sudah dikonfirmasi" };

  if (!["image/jpeg","image/png","image/webp"].includes(file.type)) return { error: "Format file tidak valid. Gunakan JPG, PNG, atau WEBP" };
  if (file.size > 3 * 1024 * 1024) return { error: "Ukuran file maksimal 3MB" };

  const arrayBuffer = await file.arrayBuffer();
  await saveImageToKV(env, orderId, arrayBuffer, file.type);

  if (existing?.status === "rejected") {
    await env.DB.prepare(`UPDATE paymentProofs SET bankFrom=?, amountTransferred=?, transferNote=?, status='waiting', rejectionReason=NULL, updatedAt=datetime('now') WHERE id=?`).bind(bankFrom, amountTransferred, transferNote, existing.id).run();
  } else {
    await env.DB.prepare(`INSERT INTO paymentProofs (orderId, userId, imageUrl, imageKey, bankFrom, amountTransferred, transferNote) VALUES (?,?,?,?,?,?,?)`).bind(orderId, user.id, `kv:proof:${orderId}`, `proof:${orderId}`, bankFrom, amountTransferred, transferNote).run();
  }

  await env.DB.prepare("UPDATE orders SET paymentStatus='waiting_confirmation', updatedAt=datetime('now') WHERE id=?").bind(orderId).run();

  const seller = await env.DB.prepare("SELECT u.email, u.name FROM users u WHERE u.id = ?").bind(order.sellerUserId).first();
  if (seller) await sendEmail(env, { to: seller.email, subject: `[CWS Mantap] Bukti Transfer Baru - Order #${orderId}`, html: `<p>Ada bukti transfer baru dari ${order.buyerName} untuk Order #${orderId}</p>` });

  return { success: true, message: "Bukti transfer berhasil diupload. Menunggu konfirmasi seller." };
}

async function getPaymentProof(env, orderId, user) {
  const order = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first();
  if (!order) return { error: "Order tidak ditemukan" };
  const seller = await env.DB.prepare("SELECT * FROM sellers WHERE userId = ?").bind(user.id).first();
  const ok = order.userId === user.id || (seller && seller.id === order.sellerId) || user.role === "admin";
  if (!ok) return { error: "Unauthorized" };
  const proof = await env.DB.prepare("SELECT * FROM paymentProofs WHERE orderId = ?").bind(orderId).first();
  return { order, proof: proof || null };
}

async function confirmPayment(request, env, user) {
  const body = await request.json();
  const { orderId, action, rejectionReason } = body;
  if (!orderId || !action) return { error: "orderId dan action wajib" };
  if (!["confirm","reject"].includes(action)) return { error: "Action tidak valid" };
  if (action === "reject" && !rejectionReason) return { error: "Alasan penolakan wajib diisi" };

  const seller = await env.DB.prepare("SELECT * FROM sellers WHERE userId = ?").bind(user.id).first();
  if (!seller && user.role !== "admin") return { error: "Bukan seller" };

  const order = await env.DB.prepare(`SELECT o.*, u.name as buyerName, u.email as buyerEmail FROM orders o JOIN users u ON o.userId = u.id WHERE o.id = ?`).bind(orderId).first();
  if (!order) return { error: "Order tidak ditemukan" };

  const proof = await env.DB.prepare("SELECT * FROM paymentProofs WHERE orderId = ?").bind(orderId).first();
  if (!proof) return { error: "Bukti transfer tidak ditemukan" };
  if (proof.status !== "waiting") return { error: "Status sudah diproses" };

  if (action === "confirm") {
    await env.DB.prepare(`UPDATE paymentProofs SET status='confirmed', confirmedAt=datetime('now'), confirmedBy=?, updatedAt=datetime('now') WHERE orderId=?`).bind(user.id, orderId).run();
    await env.DB.prepare("UPDATE orders SET paymentStatus='confirmed', status='processing', updatedAt=datetime('now') WHERE id=?").bind(orderId).run();
    return { success: true, message: "Pembayaran dikonfirmasi!" };
  } else {
    await env.DB.prepare(`UPDATE paymentProofs SET status='rejected', rejectionReason=?, updatedAt=datetime('now') WHERE orderId=?`).bind(rejectionReason, orderId).run();
    await env.DB.prepare("UPDATE orders SET paymentStatus='rejected', updatedAt=datetime('now') WHERE id=?").bind(orderId).run();
    return { success: true, message: "Bukti transfer ditolak." };
  }
}

async function getSellerPendingPayments(env, user) {
  const seller = await env.DB.prepare("SELECT * FROM sellers WHERE userId = ?").bind(user.id).first();
  if (!seller) return { error: "Bukan seller" };
  const { results } = await env.DB.prepare(
    `SELECT o.*, u.name as buyerName, u.email as buyerEmail,
            pp.bankFrom, pp.amountTransferred, pp.transferNote,
            pp.status as proofStatus, pp.createdAt as proofUploadedAt, pp.id as proofId,
            pp.rejectionReason
     FROM orders o JOIN users u ON o.userId = u.id
     LEFT JOIN paymentProofs pp ON o.id = pp.orderId
     WHERE o.sellerId = ? AND o.paymentStatus IN ('waiting_confirmation','confirmed','rejected')
     ORDER BY pp.createdAt DESC`
  ).bind(seller.id).all();
  return results;
}

async function getSellerBankAccounts(env, user) {
  const seller = await env.DB.prepare("SELECT * FROM sellers WHERE userId = ?").bind(user.id).first();
  if (!seller) return { error: "Bukan seller" };
  const { results } = await env.DB.prepare("SELECT * FROM bankAccounts WHERE sellerId = ? AND isActive = 1").bind(seller.id).all();
  return results;
}

async function addBankAccount(request, env, user) {
  const seller = await env.DB.prepare("SELECT * FROM sellers WHERE userId = ?").bind(user.id).first();
  if (!seller) return { error: "Bukan seller" };
  const { bankName, accountNumber, accountName } = await request.json();
  if (!bankName || !accountNumber || !accountName) return { error: "Semua field wajib diisi" };
  const result = await env.DB.prepare("INSERT INTO bankAccounts (sellerId, bankName, accountNumber, accountName) VALUES (?,?,?,?)").bind(seller.id, bankName, accountNumber, accountName).run();
  return { success: true, id: result.meta.last_row_id };
}

// ============================================================
// TRPC Handler — handle semua /api/trpc/* requests
// ============================================================
async function handleTrpc(procedures, request, env, origin) {
  // procedures = "auth.me,products.list,categories.list" atau single "categories.list"
  const url = new URL(request.url);
  const isBatch = procedures.includes(",");
  const procList = procedures.split(",").map(p => p.trim());

  // Parse input dari query string (GET) atau body (POST)
  let inputs = {};
  if (request.method === "GET") {
    const inputParam = url.searchParams.get("input");
    if (inputParam) {
      try { inputs = JSON.parse(decodeURIComponent(inputParam)); } catch {}
    }
    // Batch: input adalah object {"0": ..., "1": ...}
  } else if (request.method === "POST") {
    try {
      const body = await request.json();
      if (isBatch) {
        inputs = body; // {"0": {json: ...}, "1": {json: ...}}
      } else {
        inputs = { "0": body };
      }
    } catch {}
  }

  const user = await getUser(request, env);

  const results = [];
  for (let i = 0; i < procList.length; i++) {
    const proc = procList[i];
    // input untuk procedure ini
    let input = null;
    if (inputs[String(i)] !== undefined) {
      input = inputs[String(i)];
      if (input && input.json !== undefined) input = input.json;
    } else if (!isBatch && inputs["0"] !== undefined) {
      input = inputs["0"];
      if (input && input.json !== undefined) input = input.json;
    }

    try {
      const data = await executeTrpcProcedure(proc, input, user, env, request);
      results.push({ result: { data: { json: data } } });
    } catch (err) {
      results.push({ error: { message: err.message, code: err.code || "INTERNAL_SERVER_ERROR", data: { code: err.code || "INTERNAL_SERVER_ERROR" } } });
    }
  }

  return new Response(JSON.stringify(isBatch ? results : results[0] ? [results[0]] : results), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

function requireAuth(user) {
  if (!user) {
    const err = new Error("Unauthorized");
    err.code = "UNAUTHORIZED";
    throw err;
  }
}

async function executeTrpcProcedure(proc, input, user, env, request) {
  // ---- AUTH ----
  if (proc === "auth.me" || proc.startsWith("auth.me?")) {
    return user ? { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar || null } : null;
  }

  if (proc === "auth.logout" || proc.startsWith("auth.logout?")) {
    // handled separately with cookie clearing
    return { success: true };
  }

  // ---- PRODUCTS ----
  if (proc === "products.list" || proc.startsWith("products.list?")) {
    const limit = input?.limit ?? 20;
    const offset = input?.offset ?? 0;
    return getProducts(env, limit, offset);
  }

  if (proc === "products.getById" || proc.startsWith("products.getById?")) {
    if (!input?.id) throw new Error("id diperlukan");
    return getProductById(env, input.id);
  }

  if (proc === "products.getByCategory" || proc.startsWith("products.getByCategory?")) {
    if (!input?.categoryId) throw new Error("categoryId diperlukan");
    return getProductsByCategory(env, input.categoryId);
  }

  if (proc === "products.search" || proc.startsWith("products.search?")) {
    const query = input?.query ?? "";
    if (!query.trim()) return getProducts(env, 20, 0);
    return searchProducts(env, query);
  }

  if (proc === "products.create" || proc.startsWith("products.create?")) {
    requireAuth(user);
    if (user.role !== "seller" && user.role !== "admin") throw new Error("Hanya seller yang bisa membuat produk");
    const seller = await env.DB.prepare("SELECT * FROM sellers WHERE userId = ?").bind(user.id).first();
    if (!seller) throw new Error("Profil seller tidak ditemukan");
    const { name, description, price, categoryId, stock, image, images } = input;
    const result = await env.DB.prepare(
      "INSERT INTO products (name, description, price, categoryId, stock, image, images, sellerId, isActive) VALUES (?,?,?,?,?,?,?,?,1)"
    ).bind(name, description, price, categoryId, stock, image, JSON.stringify(images || []), seller.id).run();
    return { success: true, id: result.meta.last_row_id };
  }

  if (proc === "products.update" || proc.startsWith("products.update?")) {
    requireAuth(user);
    const product = await getProductById(env, input.id);
    if (!product) throw new Error("Produk tidak ditemukan");
    const seller = await env.DB.prepare("SELECT * FROM sellers WHERE userId = ?").bind(user.id).first();
    if (!seller || product.sellerId !== seller.id) throw new Error("Unauthorized");
    const fields = [];
    const vals = [];
    if (input.name !== undefined) { fields.push("name=?"); vals.push(input.name); }
    if (input.description !== undefined) { fields.push("description=?"); vals.push(input.description); }
    if (input.price !== undefined) { fields.push("price=?"); vals.push(input.price); }
    if (input.stock !== undefined) { fields.push("stock=?"); vals.push(input.stock); }
    if (input.image !== undefined) { fields.push("image=?"); vals.push(input.image); }
    if (input.isActive !== undefined) { fields.push("isActive=?"); vals.push(input.isActive ? 1 : 0); }
    if (fields.length) {
      vals.push(input.id);
      await env.DB.prepare(`UPDATE products SET ${fields.join(",")} WHERE id=?`).bind(...vals).run();
    }
    return { success: true };
  }

  // ---- CATEGORIES ----
  if (proc === "categories.list" || proc.startsWith("categories.list?")) {
    return getCategories(env);
  }

  if (proc === "categories.getById" || proc.startsWith("categories.getById?")) {
    if (!input?.id) throw new Error("id diperlukan");
    return getCategoryById(env, input.id);
  }

  if (proc === "categories.create" || proc.startsWith("categories.create?")) {
    requireAuth(user);
    if (user.role !== "admin") throw new Error("Hanya admin");
    const { name, description, image } = input;
    const result = await env.DB.prepare("INSERT INTO categories (name, description, image) VALUES (?,?,?)").bind(name, description || null, image || null).run();
    return { success: true, id: result.meta.last_row_id };
  }

  // ---- CART ----
  if (proc === "cart.list" || proc.startsWith("cart.list?")) {
    requireAuth(user);
    return getCart(env, user.id);
  }

  if (proc === "cart.add" || proc.startsWith("cart.add?")) {
    requireAuth(user);
    const product = await getProductById(env, input.productId);
    if (!product) throw new Error("Produk tidak ditemukan");
    if (product.stock < (input.quantity || 1)) throw new Error("Stok tidak cukup");
    return addToCart(env, user.id, input.productId, input.quantity || 1);
  }

  if (proc === "cart.remove" || proc.startsWith("cart.remove?")) {
    requireAuth(user);
    await env.DB.prepare("DELETE FROM carts WHERE id = ? AND userId = ?").bind(input.cartId, user.id).run();
    return { success: true };
  }

  // ---- ORDERS ----
  if (proc === "orders.list" || proc.startsWith("orders.list?")) {
    requireAuth(user);
    return getUserOrders(env, user.id);
  }

  if (proc === "orders.getById" || proc.startsWith("orders.getById?")) {
    requireAuth(user);
    const order = await getOrderById(env, input.id);
    if (!order || (order.userId !== user.id && user.role !== "admin")) throw new Error("Unauthorized");
    const { results: items } = await env.DB.prepare(
      "SELECT oi.*, p.name, p.image FROM orderItems oi JOIN products p ON oi.productId = p.id WHERE oi.orderId = ?"
    ).bind(input.id).all();
    return { ...order, items };
  }

  if (proc === "orders.create" || proc.startsWith("orders.create?")) {
    requireAuth(user);
    const cartItems = await getCart(env, user.id);
    if (!cartItems.length) throw new Error("Keranjang kosong");
    let productAmount = 0;
    for (const item of cartItems) productAmount += item.price * item.quantity;
    const adminFeeAmount = productAmount * 0.01;
    const totalAmount = productAmount + adminFeeAmount + (input?.shippingCost || 0);
    const orderResult = await env.DB.prepare(
      `INSERT INTO orders (userId, sellerId, totalAmount, productAmount, adminFeePercentage, adminFeeAmount, shippingCost, status, shippingAddress, paymentMethod)
       VALUES (?, ?, ?, ?, 1, ?, ?, 'pending', ?, ?)`
    ).bind(user.id, cartItems[0].sellerId || 1, totalAmount, productAmount, adminFeeAmount, input?.shippingCost || 0, input?.shippingAddress, input?.paymentMethod).run();
    const orderId = orderResult.meta.last_row_id;
    for (const item of cartItems) {
      await env.DB.prepare("INSERT INTO orderItems (orderId, productId, quantity, price) VALUES (?,?,?,?)")
        .bind(orderId, item.productId, item.quantity, item.price).run();
    }
    await env.DB.prepare("DELETE FROM carts WHERE userId = ?").bind(user.id).run();
    return { success: true, orderId };
  }

  if (proc === "orders.updateStatus" || proc.startsWith("orders.updateStatus?")) {
    requireAuth(user);
    const order = await getOrderById(env, input.orderId);
    if (!order) throw new Error("Order tidak ditemukan");
    const seller = await env.DB.prepare("SELECT * FROM sellers WHERE userId = ?").bind(user.id).first();
    if (!seller || order.sellerId !== seller.id) throw new Error("Unauthorized");
    await env.DB.prepare("UPDATE orders SET status = ? WHERE id = ?").bind(input.status, input.orderId).run();
    return { success: true };
  }

  if (proc === "orders.getSellerOrders" || proc.startsWith("orders.getSellerOrders?")) {
    requireAuth(user);
    const seller = await env.DB.prepare("SELECT * FROM sellers WHERE userId = ?").bind(user.id).first();
    if (!seller) throw new Error("Profil seller tidak ditemukan");
    const { results } = await env.DB.prepare("SELECT * FROM orders WHERE sellerId = ? ORDER BY createdAt DESC").bind(seller.id).all();
    return results;
  }

  // ---- REVIEWS ----
  if (proc === "reviews.getByProduct" || proc.startsWith("reviews.getByProduct?")) {
    const { results } = await env.DB.prepare("SELECT * FROM reviews WHERE productId = ?").bind(input.productId).all();
    return results;
  }

  if (proc === "reviews.create" || proc.startsWith("reviews.create?")) {
    requireAuth(user);
    const order = await getOrderById(env, input.orderId);
    if (!order || order.userId !== user.id) throw new Error("Unauthorized");
    if (order.status !== "delivered") throw new Error("Hanya bisa review order yang sudah delivered");
    const result = await env.DB.prepare(
      "INSERT INTO reviews (productId, userId, orderId, rating, comment) VALUES (?,?,?,?,?)"
    ).bind(input.productId, user.id, input.orderId, input.rating, input.comment || null).run();
    return { success: true };
  }

  // ---- SELLERS ----
  if (proc === "sellers.getProfile" || proc.startsWith("sellers.getProfile?")) {
    requireAuth(user);
    return env.DB.prepare("SELECT * FROM sellers WHERE userId = ?").bind(user.id).first();
  }

  if (proc === "sellers.updateProfile" || proc.startsWith("sellers.updateProfile?")) {
    requireAuth(user);
    const seller = await env.DB.prepare("SELECT * FROM sellers WHERE userId = ?").bind(user.id).first();
    if (!seller) throw new Error("Profil seller tidak ditemukan");
    const fields = [];
    const vals = [];
    if (input.shopName !== undefined) { fields.push("shopName=?"); vals.push(input.shopName); }
    if (input.shopDescription !== undefined) { fields.push("shopDescription=?"); vals.push(input.shopDescription); }
    if (input.shopImage !== undefined) { fields.push("shopImage=?"); vals.push(input.shopImage); }
    if (input.address !== undefined) { fields.push("address=?"); vals.push(input.address); }
    if (input.phone !== undefined) { fields.push("phone=?"); vals.push(input.phone); }
    if (fields.length) {
      vals.push(seller.id);
      await env.DB.prepare(`UPDATE sellers SET ${fields.join(",")} WHERE id=?`).bind(...vals).run();
    }
    return { success: true };
  }

  if (proc === "sellers.getProducts" || proc.startsWith("sellers.getProducts?")) {
    requireAuth(user);
    const seller = await env.DB.prepare("SELECT * FROM sellers WHERE userId = ?").bind(user.id).first();
    if (!seller) throw new Error("Profil seller tidak ditemukan");
    const { results } = await env.DB.prepare("SELECT * FROM products WHERE sellerId = ?").bind(seller.id).all();
    return results;
  }

  // ---- ADMIN ----
  if (proc === "admin.getAllUsers" || proc.startsWith("admin.getAllUsers?")) {
    requireAuth(user);
    if (user.role !== "admin") throw new Error("Unauthorized");
    const { results } = await env.DB.prepare("SELECT id, name, email, role, createdAt FROM users LIMIT 100").all();
    return results;
  }

  if (proc === "admin.updateUserRole" || proc.startsWith("admin.updateUserRole?")) {
    requireAuth(user);
    if (user.role !== "admin") throw new Error("Unauthorized");
    await env.DB.prepare("UPDATE users SET role = ? WHERE id = ?").bind(input.role, input.userId).run();
    return { success: true };
  }

  if (proc === "admin.getAllOrders" || proc.startsWith("admin.getAllOrders?")) {
    requireAuth(user);
    if (user.role !== "admin") throw new Error("Unauthorized");
    const { results } = await env.DB.prepare("SELECT * FROM orders ORDER BY createdAt DESC LIMIT 100").all();
    return results;
  }

  if (proc === "admin.getAllProducts" || proc.startsWith("admin.getAllProducts?")) {
    requireAuth(user);
    if (user.role !== "admin") throw new Error("Unauthorized");
    const { results } = await env.DB.prepare("SELECT * FROM products ORDER BY createdAt DESC LIMIT 100").all();
    return results;
  }

  if (proc === "admin.getStats" || proc.startsWith("admin.getStats?")) {
    requireAuth(user);
    if (user.role !== "admin") throw new Error("Unauthorized");
    return getAdminStats(env);
  }

  // ---- SYSTEM ----
  if (proc.startsWith("system.")) {
    return { status: "ok" };
  }

  const err = new Error(`Procedure tidak ditemukan: ${proc}`);
  err.code = "NOT_FOUND";
  throw err;
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
      // ======================================================
      // TRPC routes — /api/trpc/{procedures}
      // ======================================================
      if (path.startsWith("/api/trpc/")) {
        const procedures = path.replace("/api/trpc/", "");
        return handleTrpc(procedures, request, env, origin);
      }

      // ======================================================
      // AUTH routes
      // ======================================================
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

      // ======================================================
      // PRODUCT routes
      // ======================================================
      if (path === "/api/products" && method === "GET") {
        const limit = parseInt(url.searchParams.get("limit") || "20");
        const offset = parseInt(url.searchParams.get("offset") || "0");
        return jsonResponse(await getProducts(env, limit, offset), 200, origin);
      }

      if (path === "/api/products/search" && method === "GET") {
        const query = url.searchParams.get("q") || "";
        return jsonResponse(await searchProducts(env, query), 200, origin);
      }

      if (path.match(/^\/api\/products\/\d+$/) && method === "GET") {
        const id = parseInt(path.split("/").pop());
        const data = await getProductById(env, id);
        if (!data) return jsonResponse({ error: "Produk tidak ditemukan" }, 404, origin);
        return jsonResponse(data, 200, origin);
      }

      if (path === "/api/products/by-category" && method === "GET") {
        const categoryId = parseInt(url.searchParams.get("categoryId") || "0");
        return jsonResponse(await getProductsByCategory(env, categoryId), 200, origin);
      }

      // ======================================================
      // CATEGORY routes
      // ======================================================
      if (path === "/api/categories" && method === "GET") {
        return jsonResponse(await getCategories(env), 200, origin);
      }

      // ======================================================
      // CART routes
      // ======================================================
      if (path === "/api/cart") {
        const user = await getUser(request, env);
        if (!user) return jsonResponse({ error: "Unauthorized" }, 401, origin);

        if (method === "GET") return jsonResponse(await getCart(env, user.id), 200, origin);

        if (method === "POST") {
          const body = await request.json();
          return jsonResponse(await addToCart(env, user.id, body.productId, body.quantity || 1), 200, origin);
        }

        if (method === "DELETE") {
          const cartId = url.searchParams.get("id");
          if (cartId) {
            await env.DB.prepare("DELETE FROM carts WHERE id = ? AND userId = ?").bind(parseInt(cartId), user.id).run();
          } else {
            await env.DB.prepare("DELETE FROM carts WHERE userId = ?").bind(user.id).run();
          }
          return jsonResponse({ success: true }, 200, origin);
        }

        if (method === "PUT") {
          const body = await request.json();
          if (body.quantity <= 0) {
            await env.DB.prepare("DELETE FROM carts WHERE id = ? AND userId = ?").bind(body.cartId, user.id).run();
          } else {
            await env.DB.prepare("UPDATE carts SET quantity = ? WHERE id = ? AND userId = ?").bind(body.quantity, body.cartId, user.id).run();
          }
          return jsonResponse({ success: true }, 200, origin);
        }
      }

      // ======================================================
      // ORDER routes
      // ======================================================
      if (path === "/api/orders") {
        const user = await getUser(request, env);
        if (!user) return jsonResponse({ error: "Unauthorized" }, 401, origin);

        if (method === "GET") return jsonResponse(await getUserOrders(env, user.id), 200, origin);

        if (method === "POST") {
          const body = await request.json();
          const cartItems = await getCart(env, user.id);
          if (!cartItems.length) return jsonResponse({ error: "Keranjang kosong" }, 400, origin);
          let productAmount = 0;
          for (const item of cartItems) productAmount += item.price * item.quantity;
          const adminFeeAmount = productAmount * 0.01;
          const totalAmount = productAmount + adminFeeAmount + (body.shippingCost || 0);
          const orderResult = await env.DB.prepare(
            `INSERT INTO orders (userId, sellerId, totalAmount, productAmount, adminFeePercentage, adminFeeAmount, shippingCost, status, shippingAddress, paymentMethod)
             VALUES (?, ?, ?, ?, 1, ?, ?, 'pending', ?, ?)`
          ).bind(user.id, cartItems[0].sellerId || 1, totalAmount, productAmount, adminFeeAmount, body.shippingCost || 0, body.shippingAddress, body.paymentMethod).run();
          const orderId = orderResult.meta.last_row_id;
          for (const item of cartItems) {
            await env.DB.prepare("INSERT INTO orderItems (orderId, productId, quantity, price) VALUES (?,?,?,?)").bind(orderId, item.productId, item.quantity, item.price).run();
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

      // ======================================================
      // ADMIN routes
      // ======================================================
      if (path.startsWith("/api/admin")) {
        const user = await getUser(request, env);
        if (!user || user.role !== "admin") return jsonResponse({ error: "Unauthorized" }, 403, origin);

        if (path === "/api/admin/stats") return jsonResponse(await getAdminStats(env), 200, origin);
        if (path === "/api/admin/users") {
          const { results } = await env.DB.prepare("SELECT id, name, email, role, createdAt FROM users LIMIT 100").all();
          return jsonResponse(results, 200, origin);
        }
        if (path === "/api/admin/users/role" && method === "PUT") {
          const body = await request.json();
          await env.DB.prepare("UPDATE users SET role = ? WHERE id = ?").bind(body.role, body.userId).run();
          return jsonResponse({ success: true }, 200, origin);
        }
        if (path === "/api/admin/orders") {
          const { results } = await env.DB.prepare("SELECT * FROM orders ORDER BY createdAt DESC LIMIT 100").all();
          return jsonResponse(results, 200, origin);
        }
        if (path === "/api/admin/products") {
          const { results } = await env.DB.prepare("SELECT * FROM products ORDER BY createdAt DESC LIMIT 100").all();
          return jsonResponse(results, 200, origin);
        }
      }

      // ======================================================
      // SELLER routes
      // ======================================================
      if (path === "/api/seller/profile") {
        const user = await getUser(request, env);
        if (!user) return jsonResponse({ error: "Unauthorized" }, 401, origin);
        return jsonResponse(await env.DB.prepare("SELECT * FROM sellers WHERE userId = ?").bind(user.id).first() || null, 200, origin);
      }

      if (path === "/api/seller/orders") {
        const user = await getUser(request, env);
        if (!user) return jsonResponse({ error: "Unauthorized" }, 401, origin);
        const seller = await env.DB.prepare("SELECT * FROM sellers WHERE userId = ?").bind(user.id).first();
        if (!seller) return jsonResponse([], 200, origin);
        const { results } = await env.DB.prepare("SELECT * FROM orders WHERE sellerId = ? ORDER BY createdAt DESC").bind(seller.id).all();
        return jsonResponse(results, 200, origin);
      }

      // ======================================================
      // PAYMENT routes
      // ======================================================
      if (path === "/api/payment/bank-accounts" && method === "GET") {
        const orderId = parseInt(url.searchParams.get("orderId") || "0");
        return jsonResponse(await getPaymentBankAccounts(env, orderId), 200, origin);
      }

      if (path === "/api/payment/upload-proof" && method === "POST") {
        const user = await getUser(request, env);
        if (!user) return jsonResponse({ error: "Unauthorized" }, 401, origin);
        return jsonResponse(await uploadPaymentProof(request, env, user), 200, origin);
      }

      if (path.match(/^\/api\/payment\/proof\/\d+$/) && method === "GET") {
        const user = await getUser(request, env);
        if (!user) return jsonResponse({ error: "Unauthorized" }, 401, origin);
        const orderId = parseInt(path.split("/").pop());
        return jsonResponse(await getPaymentProof(env, orderId, user), 200, origin);
      }

      if (path.match(/^\/api\/payment\/image\/\d+$/) && method === "GET") {
        const user = await getUser(request, env);
        if (!user) return jsonResponse({ error: "Unauthorized" }, 401, origin);
        const orderId = parseInt(path.split("/").pop());
        const img = await getPaymentImage(env, orderId, user);
        if (!img) return jsonResponse({ error: "Gambar tidak ditemukan" }, 404, origin);
        return jsonResponse(img, 200, origin);
      }

      if (path === "/api/payment/confirm" && method === "POST") {
        const user = await getUser(request, env);
        if (!user) return jsonResponse({ error: "Unauthorized" }, 401, origin);
        return jsonResponse(await confirmPayment(request, env, user), 200, origin);
      }

      if (path === "/api/seller/pending-payments" && method === "GET") {
        const user = await getUser(request, env);
        if (!user) return jsonResponse({ error: "Unauthorized" }, 401, origin);
        return jsonResponse(await getSellerPendingPayments(env, user), 200, origin);
      }

      if (path === "/api/seller/bank-accounts") {
        const user = await getUser(request, env);
        if (!user) return jsonResponse({ error: "Unauthorized" }, 401, origin);
        if (method === "GET") return jsonResponse(await getSellerBankAccounts(env, user), 200, origin);
        if (method === "POST") return jsonResponse(await addBankAccount(request, env, user), 200, origin);
      }

      // Health check
      if (path === "/api/health" || path === "/" || path === "/health") {
        return jsonResponse({ status: "ok", service: "CWS Mantap API", timestamp: new Date().toISOString() }, 200, origin);
      }

      return jsonResponse({ error: "Route tidak ditemukan" }, 404, origin);

    } catch (err) {
      console.error("Worker error:", err);
      return jsonResponse({ error: "Internal server error", message: err.message }, 500, origin);
    }
  },
};

// ============================================================
// Auth handlers (dipakai di route /api/auth/*)
// ============================================================
async function handleRegister(request, env) {
  const body = await request.json();
  const { email, password, name } = body;
  if (!email || !password) return { error: "Email dan password diperlukan" };
  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (existing) return { error: "Email sudah terdaftar" };
  const passwordHash = await hashPassword(password);
  const result = await env.DB.prepare(
    "INSERT INTO users (email, passwordHash, name, role) VALUES (?, ?, ?, 'user')"
  ).bind(email, passwordHash, name || email.split("@")[0]).run();
  return { success: true, userId: result.meta.last_row_id };
}

async function handleLogin(request, env) {
  const body = await request.json();
  const { email, password } = body;
  if (!email || !password) return { error: "Email dan password diperlukan" };
  const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
  if (!user) return { error: "Email atau password salah" };
  const passwordHash = await hashPassword(password);
  if (user.passwordHash !== passwordHash) return { error: "Email atau password salah" };
  const token = await signToken(
    { userId: user.id, role: user.role },
    env.SESSION_SECRET || "default-secret-change-me"
  );
  return { success: true, token, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
}
