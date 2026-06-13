// ============================================================
// PaymentTransfer.jsx — Transfer Manual Payment System
// Taruh di: src/pages/PaymentTransfer.jsx (atau folder pages kamu)
//
// Route yang dibutuhkan di router kamu:
//   /orders/:orderId/payment  → <UploadBuktiTransfer />
//   /seller/payments          → <SellerPaymentDashboard />
// ============================================================

import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter"; // sesuaikan jika pakai react-router

const API = "https://cws-ecommerce-api.YOUR_SUBDOMAIN.workers.dev"; // Ganti dengan URL Worker kamu

// ============================================================
// Shared: format rupiah
// ============================================================
function rupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

// ============================================================
// Badge status
// ============================================================
function StatusBadge({ status }) {
  const map = {
    waiting: { label: "Menunggu Konfirmasi", cls: "bg-yellow-100 text-yellow-800" },
    confirmed: { label: "Dikonfirmasi ✓", cls: "bg-green-100 text-green-800" },
    rejected: { label: "Ditolak ✗", cls: "bg-red-100 text-red-800" },
    unpaid: { label: "Belum Bayar", cls: "bg-gray-100 text-gray-700" },
    waiting_confirmation: { label: "Menunggu Konfirmasi", cls: "bg-yellow-100 text-yellow-800" },
    processing: { label: "Diproses", cls: "bg-blue-100 text-blue-800" },
  };
  const s = map[status] || { label: status, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

// ============================================================
// KOMPONEN 1: Upload Bukti Transfer (Pembeli)
// Route: /orders/:orderId/payment
// ============================================================
export function UploadBuktiTransfer() {
  const { orderId } = useParams();
  const [orderData, setOrderData] = useState(null);
  const [proof, setProof] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ bankFrom: "", amountTransferred: "", transferNote: "" });
  const [message, setMessage] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/payment/bank-accounts?orderId=${orderId}`, { credentials: "include" })
        .then((r) => r.json()),
      fetch(`${API}/api/payment/proof/${orderId}`, { credentials: "include" })
        .then((r) => r.json()),
    ]).then(([bankData, proofData]) => {
      setOrderData(bankData);
      setProof(proofData?.proof || null);
      if (proofData?.proof?.status !== "rejected") {
        // Pre-fill amount from order
        setForm((f) => ({ ...f, amountTransferred: bankData?.order?.totalAmount || "" }));
      }
      setLoading(false);
    });
  }, [orderId]);

  function handleFileChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return setMessage({ type: "error", text: "Pilih file bukti transfer dulu" });

    setUploading(true);
    setMessage(null);
    const fd = new FormData();
    fd.append("orderId", orderId);
    fd.append("proof", file);
    fd.append("bankFrom", form.bankFrom);
    fd.append("amountTransferred", form.amountTransferred);
    fd.append("transferNote", form.transferNote);

    const res = await fetch(`${API}/api/payment/upload-proof`, {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    const data = await res.json();
    setUploading(false);

    if (data.success) {
      setMessage({ type: "success", text: data.message });
      // Refresh proof
      const updated = await fetch(`${API}/api/payment/proof/${orderId}`, { credentials: "include" }).then((r) => r.json());
      setProof(updated?.proof || null);
    } else {
      setMessage({ type: "error", text: data.error });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-rose-500" />
      </div>
    );
  }

  if (!orderData?.order) {
    return (
      <div className="max-w-lg mx-auto p-6 mt-10 text-center">
        <p className="text-gray-500">Order tidak ditemukan.</p>
      </div>
    );
  }

  const { order, bankAccounts } = orderData;

  return (
    <div className="max-w-lg mx-auto p-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Pembayaran Transfer Manual</h1>

      {/* Info Order */}
      <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-500">Order #{order.id}</span>
          <StatusBadge status={order.paymentStatus} />
        </div>
        <div className="text-xl font-bold text-rose-600">{rupiah(order.totalAmount)}</div>
      </div>

      {/* Rekening Tujuan */}
      {bankAccounts?.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-gray-800 mb-3">Transfer ke Rekening Berikut:</h2>
          <div className="space-y-3">
            {bankAccounts.map((acc) => (
              <div key={acc.id} className="bg-white border-2 border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
                    <span className="text-rose-600 font-bold text-sm">{acc.bankName}</span>
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-lg tracking-wider">
                      {acc.accountNumber}
                    </div>
                    <div className="text-sm text-gray-500">{acc.accountName}</div>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(acc.accountNumber);
                      setMessage({ type: "success", text: "Nomor rekening disalin!" });
                      setTimeout(() => setMessage(null), 2000);
                    }}
                    className="ml-auto text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-lg text-gray-600"
                  >
                    Salin
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            * Transfer tepat <strong>{rupiah(order.totalAmount)}</strong> agar mudah diverifikasi
          </p>
        </div>
      )}

      {bankAccounts?.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <p className="text-yellow-800 text-sm">
            Seller belum menambahkan rekening. Hubungi seller untuk info pembayaran.
          </p>
        </div>
      )}

      {/* Status sudah confirmed */}
      {proof?.status === "confirmed" && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <div className="text-4xl mb-2">✅</div>
          <div className="font-semibold text-green-800">Pembayaran Dikonfirmasi!</div>
          <div className="text-sm text-green-600 mt-1">
            Seller sedang memproses pesananmu.
          </div>
        </div>
      )}

      {/* Status menunggu */}
      {proof?.status === "waiting" && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <div className="font-semibold text-yellow-800 mb-2">⏳ Menunggu Konfirmasi Seller</div>
          {proof.imageUrl && (
            <img src={proof.imageUrl} alt="Bukti transfer" className="w-full rounded-lg mt-2 max-h-48 object-cover" />
          )}
          <p className="text-xs text-yellow-700 mt-2">
            Upload: {new Date(proof.createdAt).toLocaleString("id-ID")}
          </p>
        </div>
      )}

      {/* Form upload (tampil jika belum bayar atau ditolak) */}
      {(!proof || proof.status === "rejected") && (
        <>
          {proof?.status === "rejected" && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <div className="font-semibold text-red-800">❌ Bukti Transfer Ditolak</div>
              <div className="text-sm text-red-600 mt-1">
                Alasan: {proof.rejectionReason}
              </div>
              <p className="text-xs text-gray-500 mt-2">Silakan upload ulang bukti yang benar.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="font-semibold text-gray-800">Upload Bukti Transfer</h2>

            {/* Bank pengirim */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Pengirim
              </label>
              <input
                type="text"
                placeholder="Contoh: BCA, Mandiri, GoPay, DANA..."
                value={form.bankFrom}
                onChange={(e) => setForm({ ...form, bankFrom: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>

            {/* Nominal */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nominal Transfer (Rp)
              </label>
              <input
                type="number"
                value={form.amountTransferred}
                onChange={(e) => setForm({ ...form, amountTransferred: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>

            {/* Catatan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Catatan (opsional)
              </label>
              <input
                type="text"
                placeholder="e.g. Transfer dari BCA 0812xxx"
                value={form.transferNote}
                onChange={(e) => setForm({ ...form, transferNote: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>

            {/* Upload file */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Foto Bukti Transfer *
              </label>
              <div
                onClick={() => fileRef.current.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  preview ? "border-rose-300 bg-rose-50" : "border-gray-300 hover:border-rose-300 hover:bg-rose-50"
                }`}
              >
                {preview ? (
                  <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-lg object-contain" />
                ) : (
                  <div>
                    <div className="text-4xl mb-2">📷</div>
                    <p className="text-sm text-gray-500">Klik untuk pilih foto</p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP — maks 5MB</p>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {preview && (
                <button
                  type="button"
                  onClick={() => { setFile(null); setPreview(null); fileRef.current.value = ""; }}
                  className="text-xs text-red-500 mt-1 hover:underline"
                >
                  Ganti foto
                </button>
              )}
            </div>

            {message && (
              <div className={`rounded-lg p-3 text-sm ${
                message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
              }`}>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || !file}
              className="w-full bg-rose-500 hover:bg-rose-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {uploading ? "Mengirim..." : "Kirim Bukti Transfer"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

// ============================================================
// KOMPONEN 2: Dashboard Seller — Konfirmasi Pembayaran
// Route: /seller/payments
// ============================================================
export function SellerPaymentDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // order yang dibuka
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState(null);

  // Tab filter
  const [tab, setTab] = useState("waiting");

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    setLoading(true);
    const res = await fetch(`${API}/api/seller/pending-payments`, { credentials: "include" });
    const data = await res.json();
    setOrders(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function handleAction(orderId, action) {
    if (action === "reject" && !rejectionReason.trim()) {
      return setToast({ type: "error", text: "Isi alasan penolakan dulu" });
    }
    setProcessing(true);
    const res = await fetch(`${API}/api/payment/confirm`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, action, rejectionReason }),
    });
    const data = await res.json();
    setProcessing(false);
    if (data.success) {
      setToast({ type: "success", text: data.message });
      setSelected(null);
      setRejectionReason("");
      fetchOrders();
    } else {
      setToast({ type: "error", text: data.error });
    }
    setTimeout(() => setToast(null), 4000);
  }

  const tabCounts = {
    waiting: orders.filter((o) => o.proofStatus === "waiting").length,
    confirmed: orders.filter((o) => o.proofStatus === "confirmed").length,
    rejected: orders.filter((o) => o.proofStatus === "rejected").length,
  };

  const filtered = orders.filter((o) => {
    if (tab === "waiting") return o.proofStatus === "waiting";
    if (tab === "confirmed") return o.proofStatus === "confirmed";
    if (tab === "rejected") return o.proofStatus === "rejected";
    return true;
  });

  return (
    <div className="max-w-3xl mx-auto p-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Pembayaran</h1>
      <p className="text-gray-500 text-sm mb-6">Konfirmasi bukti transfer dari pembeli</p>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          toast.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
        }`}>
          {toast.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {[
          { key: "waiting", label: "Menunggu" },
          { key: "confirmed", label: "Dikonfirmasi" },
          { key: "rejected", label: "Ditolak" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-rose-500 text-rose-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
            {tabCounts[t.key] > 0 && (
              <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
                t.key === "waiting" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"
              }`}>
                {tabCounts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-rose-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">📭</div>
          <p>Tidak ada order di tab ini</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <div
              key={order.id}
              onClick={() => setSelected(selected?.id === order.id ? null : order)}
              className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-rose-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">Order #{order.id}</span>
                    <StatusBadge status={order.proofStatus || "unpaid"} />
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5 truncate">{order.buyerName}</div>
                  <div className="text-rose-600 font-bold mt-1">{rupiah(order.totalAmount)}</div>
                  {order.proofUploadedAt && (
                    <div className="text-xs text-gray-400 mt-1">
                      Upload: {new Date(order.proofUploadedAt).toLocaleString("id-ID")}
                    </div>
                  )}
                </div>
                {order.imageUrl && (
                  <img
                    src={order.imageUrl}
                    alt="Bukti"
                    className="w-16 h-16 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                  />
                )}
              </div>

              {/* Detail expand */}
              {selected?.id === order.id && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="mt-4 pt-4 border-t border-gray-100 space-y-4"
                >
                  {/* Detail transfer */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Bank Pengirim</span>
                      <p className="font-medium">{order.bankFrom || "-"}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Nominal Transfer</span>
                      <p className="font-medium">{order.amountTransferred ? rupiah(order.amountTransferred) : "-"}</p>
                    </div>
                    {order.transferNote && (
                      <div className="col-span-2">
                        <span className="text-gray-500">Catatan</span>
                        <p className="font-medium">{order.transferNote}</p>
                      </div>
                    )}
                  </div>

                  {/* Gambar full */}
                  {order.imageUrl && (
                    <a href={order.imageUrl} target="_blank" rel="noreferrer">
                      <img
                        src={order.imageUrl}
                        alt="Bukti Transfer"
                        className="w-full max-h-64 object-contain rounded-xl border border-gray-200 cursor-zoom-in"
                      />
                      <p className="text-xs text-center text-gray-400 mt-1">Klik untuk buka full</p>
                    </a>
                  )}

                  {/* Tombol aksi (hanya untuk waiting) */}
                  {order.proofStatus === "waiting" && (
                    <div className="space-y-3">
                      <button
                        onClick={() => handleAction(order.id, "confirm")}
                        disabled={processing}
                        className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-semibold py-2.5 rounded-xl transition-colors"
                      >
                        {processing ? "Memproses..." : "✓ Konfirmasi Pembayaran"}
                      </button>

                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Alasan penolakan (wajib jika menolak)..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                        />
                        <button
                          onClick={() => handleAction(order.id, "reject")}
                          disabled={processing || !rejectionReason.trim()}
                          className="w-full bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 font-semibold py-2.5 rounded-xl border border-red-200 transition-colors"
                        >
                          ✗ Tolak Bukti Transfer
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Info jika sudah dikonfirmasi/ditolak */}
                  {order.proofStatus === "confirmed" && (
                    <div className="bg-green-50 rounded-lg p-3 text-sm text-green-700 text-center">
                      ✅ Pembayaran sudah dikonfirmasi
                    </div>
                  )}
                  {order.proofStatus === "rejected" && (
                    <div className="bg-red-50 rounded-lg p-3 text-sm text-red-700">
                      ❌ Ditolak — {order.rejectionReason || "-"}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// KOMPONEN 3: Kelola Rekening Bank (Seller)
// Bisa ditaruh di halaman profil seller
// ============================================================
export function SellerBankAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ bankName: "", accountNumber: "", accountName: "" });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const bankOptions = ["BCA", "Mandiri", "BNI", "BRI", "BSI", "CIMB", "Permata", "GoPay", "OVO", "DANA", "ShopeePay"];

  useEffect(() => {
    fetch(`${API}/api/seller/bank-accounts`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setAccounts(Array.isArray(data) ? data : []));
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.bankName || !form.accountNumber || !form.accountName) {
      return setToast({ type: "error", text: "Semua field wajib diisi" });
    }
    setLoading(true);
    const res = await fetch(`${API}/api/seller/bank-accounts`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      setToast({ type: "success", text: "Rekening berhasil ditambahkan!" });
      setForm({ bankName: "", accountNumber: "", accountName: "" });
      // Refresh
      fetch(`${API}/api/seller/bank-accounts`, { credentials: "include" })
        .then((r) => r.json())
        .then((d) => setAccounts(Array.isArray(d) ? d : []));
    } else {
      setToast({ type: "error", text: data.error });
    }
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="max-w-lg mx-auto p-4 py-8">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Rekening Bank</h2>

      {toast && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
          toast.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}>
          {toast.text}
        </div>
      )}

      {/* Daftar rekening */}
      {accounts.length > 0 && (
        <div className="space-y-3 mb-6">
          {accounts.map((acc) => (
            <div key={acc.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-rose-600 font-bold text-xs">{acc.bankName}</span>
              </div>
              <div>
                <div className="font-bold text-gray-900">{acc.accountNumber}</div>
                <div className="text-sm text-gray-500">{acc.accountName}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form tambah */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-4">Tambah Rekening</h3>
        <form onSubmit={handleAdd} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bank</label>
            <select
              value={form.bankName}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
            >
              <option value="">Pilih bank...</option>
              {bankOptions.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Rekening</label>
            <input
              type="text"
              placeholder="0123456789"
              value={form.accountNumber}
              onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pemilik Rekening</label>
            <input
              type="text"
              placeholder="Nama sesuai rekening"
              value={form.accountName}
              onChange={(e) => setForm({ ...form, accountName: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rose-500 hover:bg-rose-600 disabled:bg-gray-300 text-white font-semibold py-2.5 rounded-xl transition-colors"
          >
            {loading ? "Menyimpan..." : "+ Tambah Rekening"}
          </button>
        </form>
      </div>
    </div>
  );
}
