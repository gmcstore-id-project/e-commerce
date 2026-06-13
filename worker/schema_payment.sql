-- ============================================================
-- MIGRATION: Transfer Manual Payment System
-- Jalankan: wrangler d1 execute cws-db --file=worker/schema_payment.sql
-- ============================================================

-- Tabel info rekening bank seller
CREATE TABLE IF NOT EXISTS bankAccounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sellerId INTEGER NOT NULL,
  bankName TEXT NOT NULL,         -- e.g. "BCA", "Mandiri", "BNI"
  accountNumber TEXT NOT NULL,
  accountName TEXT NOT NULL,
  isActive INTEGER DEFAULT 1,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tabel bukti transfer dari pembeli
CREATE TABLE IF NOT EXISTS paymentProofs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orderId INTEGER NOT NULL UNIQUE,
  userId INTEGER NOT NULL,
  imageUrl TEXT NOT NULL,          -- URL gambar bukti transfer (Cloudflare R2)
  imageKey TEXT NOT NULL,          -- R2 object key untuk delete
  bankFrom TEXT,                   -- Bank pengirim
  amountTransferred REAL,          -- Nominal yang ditransfer
  transferNote TEXT,               -- Catatan dari pembeli
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK(status IN ('waiting','confirmed','rejected')),
  rejectionReason TEXT,            -- Alasan jika ditolak
  confirmedAt TEXT,
  confirmedBy INTEGER,             -- userId seller/admin yang konfirmasi
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Update tabel orders: tambah kolom payment_status
ALTER TABLE orders ADD COLUMN paymentStatus TEXT NOT NULL DEFAULT 'unpaid'
  CHECK(paymentStatus IN ('unpaid','waiting_confirmation','confirmed','rejected'));

-- Indexes
CREATE INDEX IF NOT EXISTS pp_orderId_idx ON paymentProofs(orderId);
CREATE INDEX IF NOT EXISTS pp_userId_idx ON paymentProofs(userId);
CREATE INDEX IF NOT EXISTS pp_status_idx ON paymentProofs(status);
CREATE INDEX IF NOT EXISTS ba_sellerId_idx ON bankAccounts(sellerId);

-- Seed contoh rekening (ganti dengan data asli seller)
-- INSERT INTO bankAccounts (sellerId, bankName, accountNumber, accountName)
-- VALUES (1, 'BCA', '1234567890', 'Toko CWS Mantap');
