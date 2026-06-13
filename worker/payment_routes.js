// ============================================================
// PAYMENT TRANSFER MANUAL - Tambahan untuk worker/index.js
// ============================================================
// Cara pakai:
// 1. Jalankan schema_payment.sql dulu
// 2. Set secret: wrangler secret put RESEND_API_KEY
// 3. Set secret: wrangler secret put R2_ACCOUNT_ID
// 4. Tambah binding R2 di wrangler.toml (lihat komentar di bawah)
// 5. Copy semua fungsi + route ini ke index.js kamu
//
// wrangler.toml tambahan:
// [[r2_buckets]]
// binding = "BUCKET"
// bucket_name = "cws-payment-proofs"
// ============================================================

// ============================================================
// EMAIL via Resend (gratis 3.000/bulan)
// ============================================================
async function sendEmail(env, { to, subject, html }) {
  if (!env.RESEND_API_KEY) {
    console.log("RESEND_API_KEY tidak di-set, skip email");
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "CWS Mantap <noreply@cws-mantap.pages.dev>",
        to: [to],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("Resend error:", err);
    }
  } catch (e) {
    console.error("Email send failed:", e);
  }
}

function emailBuyerWaitingConfirmation(buyerName, orderId, amount) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h2 style="color:#e11d48">CWS Mantap</h2>
      <p>Halo <strong>${buyerName}</strong>,</p>
      <p>Bukti transfer kamu untuk <strong>Order #${orderId}</strong> sudah kami terima.</p>
      <p>Total: <strong>Rp ${Number(amount).toLocaleString("id-ID")}</strong></p>
      <p>Seller sedang memverifikasi pembayaran kamu. Kami akan kirim notifikasi setelah dikonfirmasi.</p>
      <p style="color:#6b7280;font-size:12px">Biasanya dikonfirmasi dalam 1–2 jam kerja.</p>
      <hr>
      <p style="color:#6b7280;font-size:12px">CWS Mantap — Belanja Mudah, Aman, Terpercaya</p>
    </div>
  `;
}

function emailSellerNewPayment(sellerName, orderId, buyerName, amount) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h2 style="color:#e11d48">CWS Mantap</h2>
      <p>Halo <strong>${sellerName}</strong>,</p>
      <p>Ada bukti transfer baru masuk dari pembeli <strong>${buyerName}</strong>.</p>
      <p>Order: <strong>#${orderId}</strong> | Total: <strong>Rp ${Number(amount).toLocaleString("id-ID")}</strong></p>
      <p>Silakan login ke dashboard seller untuk mengkonfirmasi atau menolak pembayaran.</p>
      <a href="https://cws-mantap.pages.dev/seller/orders"
         style="display:inline-block;padding:10px 20px;background:#e11d48;color:white;text-decoration:none;border-radius:6px;margin-top:10px">
        Buka Dashboard Seller
      </a>
      <hr>
      <p style="color:#6b7280;font-size:12px">CWS Mantap — Belanja Mudah, Aman, Terpercaya</p>
    </div>
  `;
}

function emailBuyerConfirmed(buyerName, orderId) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h2 style="color:#e11d48">CWS Mantap</h2>
      <p>Halo <strong>${buyerName}</strong>,</p>
      <p>🎉 Pembayaran untuk <strong>Order #${orderId}</strong> telah <strong style="color:#16a34a">DIKONFIRMASI</strong>!</p>
      <p>Seller sedang memproses pesananmu. Kamu akan mendapat notifikasi saat barang dikirim.</p>
      <a href="https://cws-mantap.pages.dev/orders"
         style="display:inline-block;padding:10px 20px;background:#16a34a;color:white;text-decoration:none;border-radius:6px;margin-top:10px">
        Cek Status Pesanan
      </a>
      <hr>
      <p style="color:#6b7280;font-size:12px">CWS Mantap — Belanja Mudah, Aman, Terpercaya</p>
    </div>
  `;
}

function emailBuyerRejected(buyerName, orderId, reason) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h2 style="color:#e11d48">CWS Mantap</h2>
      <p>Halo <strong>${buyerName}</strong>,</p>
      <p>Maaf, bukti transfer untuk <strong>Order #${orderId}</strong> <strong style="color:#dc2626">DITOLAK</strong>.</p>
      <p><strong>Alasan:</strong> ${reason || "Bukti transfer tidak valid"}</p>
      <p>Silakan upload ulang bukti transfer yang benar.</p>
      <a href="https://cws-mantap.pages.dev/orders/${orderId}/payment"
         style="display:inline-block;padding:10px 20px;background:#e11d48;color:white;text-decoration:none;border-radius:6px;margin-top:10px">
        Upload Ulang Bukti Transfer
      </a>
      <hr>
      <p style="color:#6b7280;font-size:12px">CWS Mantap — Belanja Mudah, Aman, Terpercaya</p>
    </div>
  `;
}

// ============================================================
// R2 Helper — Upload gambar ke Cloudflare R2
// ============================================================
async function uploadToR2(env, file, fileName) {
  // file = ArrayBuffer dari request
  // Cloudflare R2 binding: env.BUCKET
  const key = `payment-proofs/${Date.now()}-${fileName}`;
  await env.BUCKET.put(key, file, {
    httpMetadata: { contentType: "image/jpeg" },
  });
  // Public URL (aktifkan R2 public domain di dashboard Cloudflare)
  const publicUrl = `https://pub-${env.R2_PUBLIC_DOMAIN || "YOUR_HASH"}.r2.dev/${key}`;
  return { key, url: publicUrl };
}

// ============================================================
// PAYMENT PROOF HANDLERS
// ============================================================

// GET /api/payment/bank-accounts?orderId=xxx
// Pembeli lihat rekening tujuan transfer
async function getPaymentBankAccounts(env, orderId) {
  const order = await env.DB.prepare("SELECT * FROM orders WHERE id = ?")
    .bind(orderId).first();
  if (!order) return { error: "Order tidak ditemukan" };

  const { results } = await env.DB.prepare(
    "SELECT * FROM bankAccounts WHERE sellerId = ? AND isActive = 1"
  ).bind(order.sellerId).all();

  return { order, bankAccounts: results };
}

// POST /api/payment/upload-proof (multipart/form-data)
// Pembeli upload bukti transfer
async function uploadPaymentProof(request, env, user) {
  const formData = await request.formData();
  const orderId = parseInt(formData.get("orderId"));
  const file = formData.get("proof"); // File object
  const bankFrom = formData.get("bankFrom") || "";
  const amountTransferred = parseFloat(formData.get("amountTransferred") || "0");
  const transferNote = formData.get("transferNote") || "";

  if (!orderId || !file) return { error: "orderId dan file bukti wajib diisi" };

  // Cek order milik user
  const order = await env.DB.prepare(
    "SELECT o.*, u.name as buyerName, u.email as buyerEmail, s.userId as sellerUserId FROM orders o JOIN users u ON o.userId = u.id JOIN sellers s ON o.sellerId = s.id WHERE o.id = ? AND o.userId = ?"
  ).bind(orderId, user.id).first();
  if (!order) return { error: "Order tidak ditemukan atau bukan milikmu" };

  // Cek belum ada proof / ditolak sebelumnya
  const existingProof = await env.DB.prepare(
    "SELECT * FROM paymentProofs WHERE orderId = ?"
  ).bind(orderId).first();
  if (existingProof && existingProof.status === "waiting") {
    return { error: "Bukti transfer sudah diupload, menunggu konfirmasi seller" };
  }
  if (existingProof && existingProof.status === "confirmed") {
    return { error: "Pembayaran sudah dikonfirmasi" };
  }

  // Validasi file
  const validTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
  if (!validTypes.includes(file.type)) {
    return { error: "Format file tidak valid. Gunakan JPG, PNG, atau WEBP" };
  }
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return { error: "Ukuran file maksimal 5MB" };
  }

  // Upload ke R2
  const arrayBuffer = await file.arrayBuffer();
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const { key, url } = await uploadToR2(env, arrayBuffer, safeFileName);

  // Simpan atau update di database
  if (existingProof && existingProof.status === "rejected") {
    // Update jika sebelumnya ditolak
    await env.DB.prepare(
      `UPDATE paymentProofs SET imageUrl=?, imageKey=?, bankFrom=?, amountTransferred=?, transferNote=?, status='waiting', rejectionReason=NULL, updatedAt=datetime('now') WHERE id=?`
    ).bind(url, key, bankFrom, amountTransferred, transferNote, existingProof.id).run();
  } else {
    // Insert baru
    await env.DB.prepare(
      `INSERT INTO paymentProofs (orderId, userId, imageUrl, imageKey, bankFrom, amountTransferred, transferNote) VALUES (?,?,?,?,?,?,?)`
    ).bind(orderId, user.id, url, key, bankFrom, amountTransferred, transferNote).run();
  }

  // Update order paymentStatus
  await env.DB.prepare(
    "UPDATE orders SET paymentStatus='waiting_confirmation', updatedAt=datetime('now') WHERE id=?"
  ).bind(orderId).run();

  // Kirim email ke pembeli
  await sendEmail(env, {
    to: order.buyerEmail,
    subject: `[CWS Mantap] Bukti Transfer Diterima - Order #${orderId}`,
    html: emailBuyerWaitingConfirmation(order.buyerName, orderId, order.totalAmount),
  });

  // Kirim email ke seller
  const seller = await env.DB.prepare(
    "SELECT u.email, u.name FROM users u WHERE u.id = ?"
  ).bind(order.sellerUserId).first();
  if (seller) {
    await sendEmail(env, {
      to: seller.email,
      subject: `[CWS Mantap] Bukti Transfer Baru - Order #${orderId}`,
      html: emailSellerNewPayment(seller.name, orderId, order.buyerName, order.totalAmount),
    });
  }

  return { success: true, message: "Bukti transfer berhasil diupload. Menunggu konfirmasi seller." };
}

// GET /api/payment/proof/:orderId
// Lihat status proof (pembeli/seller/admin)
async function getPaymentProof(env, orderId, user) {
  const order = await env.DB.prepare("SELECT * FROM orders WHERE id = ?")
    .bind(orderId).first();
  if (!order) return { error: "Order tidak ditemukan" };

  // Hanya buyer, seller terkait, atau admin yang bisa lihat
  const seller = await env.DB.prepare("SELECT * FROM sellers WHERE userId = ?")
    .bind(user.id).first();
  const isBuyer = order.userId === user.id;
  const isSeller = seller && seller.id === order.sellerId;
  const isAdmin = user.role === "admin";
  if (!isBuyer && !isSeller && !isAdmin) return { error: "Unauthorized" };

  const proof = await env.DB.prepare("SELECT * FROM paymentProofs WHERE orderId = ?")
    .bind(orderId).first();

  return { order, proof: proof || null };
}

// POST /api/payment/confirm (Seller konfirmasi/tolak)
async function confirmPayment(request, env, user) {
  const body = await request.json();
  const { orderId, action, rejectionReason } = body;
  // action: "confirm" | "reject"

  if (!orderId || !action) return { error: "orderId dan action wajib diisi" };
  if (!["confirm", "reject"].includes(action)) return { error: "Action tidak valid" };
  if (action === "reject" && !rejectionReason) return { error: "Alasan penolakan wajib diisi" };

  // Cek seller/admin
  const seller = await env.DB.prepare("SELECT * FROM sellers WHERE userId = ?")
    .bind(user.id).first();
  const isAdmin = user.role === "admin";
  if (!seller && !isAdmin) return { error: "Bukan seller" };

  const order = await env.DB.prepare(
    "SELECT o.*, u.name as buyerName, u.email as buyerEmail FROM orders o JOIN users u ON o.userId = u.id WHERE o.id = ?"
  ).bind(orderId).first();
  if (!order) return { error: "Order tidak ditemukan" };

  // Seller hanya bisa konfirmasi order miliknya
  if (seller && order.sellerId !== seller.id && !isAdmin) {
    return { error: "Bukan order kamu" };
  }

  const proof = await env.DB.prepare("SELECT * FROM paymentProofs WHERE orderId = ?")
    .bind(orderId).first();
  if (!proof) return { error: "Bukti transfer tidak ditemukan" };
  if (proof.status !== "waiting") return { error: "Status sudah diproses" };

  if (action === "confirm") {
    await env.DB.prepare(
      `UPDATE paymentProofs SET status='confirmed', confirmedAt=datetime('now'), confirmedBy=?, updatedAt=datetime('now') WHERE orderId=?`
    ).bind(user.id, orderId).run();
    await env.DB.prepare(
      "UPDATE orders SET paymentStatus='confirmed', status='processing', updatedAt=datetime('now') WHERE id=?"
    ).bind(orderId).run();

    // Email ke pembeli
    await sendEmail(env, {
      to: order.buyerEmail,
      subject: `[CWS Mantap] Pembayaran Dikonfirmasi - Order #${orderId}`,
      html: emailBuyerConfirmed(order.buyerName, orderId),
    });

    return { success: true, message: "Pembayaran dikonfirmasi. Order status → processing." };
  } else {
    await env.DB.prepare(
      `UPDATE paymentProofs SET status='rejected', rejectionReason=?, updatedAt=datetime('now') WHERE orderId=?`
    ).bind(rejectionReason, orderId).run();
    await env.DB.prepare(
      "UPDATE orders SET paymentStatus='rejected', updatedAt=datetime('now') WHERE id=?"
    ).bind(orderId).run();

    // Email ke pembeli
    await sendEmail(env, {
      to: order.buyerEmail,
      subject: `[CWS Mantap] Bukti Transfer Ditolak - Order #${orderId}`,
      html: emailBuyerRejected(order.buyerName, orderId, rejectionReason),
    });

    return { success: true, message: "Bukti transfer ditolak. Pembeli dapat upload ulang." };
  }
}

// GET /api/seller/pending-payments — daftar order menunggu konfirmasi
async function getSellerPendingPayments(env, user) {
  const seller = await env.DB.prepare("SELECT * FROM sellers WHERE userId = ?")
    .bind(user.id).first();
  if (!seller) return { error: "Bukan seller" };

  const { results } = await env.DB.prepare(
    `SELECT o.*, u.name as buyerName, u.email as buyerEmail,
            pp.imageUrl, pp.bankFrom, pp.amountTransferred, pp.transferNote,
            pp.status as proofStatus, pp.createdAt as proofUploadedAt, pp.id as proofId
     FROM orders o
     JOIN users u ON o.userId = u.id
     LEFT JOIN paymentProofs pp ON o.id = pp.orderId
     WHERE o.sellerId = ? AND o.paymentStatus IN ('waiting_confirmation','confirmed','rejected')
     ORDER BY pp.createdAt DESC`
  ).bind(seller.id).all();

  return results;
}

// POST /api/seller/bank-accounts — tambah rekening seller
async function addBankAccount(request, env, user) {
  const seller = await env.DB.prepare("SELECT * FROM sellers WHERE userId = ?")
    .bind(user.id).first();
  if (!seller) return { error: "Bukan seller" };

  const body = await request.json();
  const { bankName, accountNumber, accountName } = body;
  if (!bankName || !accountNumber || !accountName) {
    return { error: "bankName, accountNumber, accountName wajib diisi" };
  }

  const result = await env.DB.prepare(
    "INSERT INTO bankAccounts (sellerId, bankName, accountNumber, accountName) VALUES (?,?,?,?)"
  ).bind(seller.id, bankName, accountNumber, accountName).run();

  return { success: true, id: result.meta.last_row_id };
}

// GET /api/seller/bank-accounts — lihat rekening seller sendiri
async function getSellerBankAccounts(env, user) {
  const seller = await env.DB.prepare("SELECT * FROM sellers WHERE userId = ?")
    .bind(user.id).first();
  if (!seller) return { error: "Bukan seller" };

  const { results } = await env.DB.prepare(
    "SELECT * FROM bankAccounts WHERE sellerId = ? AND isActive = 1"
  ).bind(seller.id).all();

  return results;
}

// ============================================================
// ROUTE ENTRIES — tambahkan ini di dalam fetch handler index.js
// Di dalam blok try{}, setelah route /api/seller/orders
// ============================================================
/*

      // PAYMENT TRANSFER MANUAL routes

      // Lihat rekening tujuan + detail order
      if (path === "/api/payment/bank-accounts" && method === "GET") {
        const orderId = parseInt(url.searchParams.get("orderId") || "0");
        return jsonResponse(await getPaymentBankAccounts(env, orderId), 200, origin);
      }

      // Upload bukti transfer (multipart)
      if (path === "/api/payment/upload-proof" && method === "POST") {
        const user = await getUser(request, env);
        if (!user) return jsonResponse({ error: "Unauthorized" }, 401, origin);
        return jsonResponse(await uploadPaymentProof(request, env, user), 200, origin);
      }

      // Lihat status proof
      if (path.match(/^\/api\/payment\/proof\/\d+$/) && method === "GET") {
        const user = await getUser(request, env);
        if (!user) return jsonResponse({ error: "Unauthorized" }, 401, origin);
        const orderId = parseInt(path.split("/").pop());
        return jsonResponse(await getPaymentProof(env, orderId, user), 200, origin);
      }

      // Konfirmasi/tolak (seller)
      if (path === "/api/payment/confirm" && method === "POST") {
        const user = await getUser(request, env);
        if (!user) return jsonResponse({ error: "Unauthorized" }, 401, origin);
        return jsonResponse(await confirmPayment(request, env, user), 200, origin);
      }

      // Seller: daftar order dengan bukti transfer
      if (path === "/api/seller/pending-payments" && method === "GET") {
        const user = await getUser(request, env);
        if (!user) return jsonResponse({ error: "Unauthorized" }, 401, origin);
        return jsonResponse(await getSellerPendingPayments(env, user), 200, origin);
      }

      // Seller: kelola rekening bank
      if (path === "/api/seller/bank-accounts") {
        const user = await getUser(request, env);
        if (!user) return jsonResponse({ error: "Unauthorized" }, 401, origin);
        if (method === "GET") return jsonResponse(await getSellerBankAccounts(env, user), 200, origin);
        if (method === "POST") return jsonResponse(await addBankAccount(request, env, user), 200, origin);
      }

*/
