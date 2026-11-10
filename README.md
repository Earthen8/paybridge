# PayBridge — Invoice QRIS Dinamis & Verifikasi Pembayaran Multi-Layer

**PayBridge** adalah aplikasi manajemen invoice untuk freelancer dan penyedia jasa mahasiswa yang menghasilkan kode **QRIS Dinamis** melalui payment gateway (**Midtrans Core API** + **Sandbox Simulator**) serta memverifikasi status pembayaran menggunakan **tiga lapisan verifikasi**:
1. **Webhook Notification** (dilengkapi validasi signature `SHA-512` dan **Idempotency Guard**).
2. **Active Polling** (pengecekan berkala & on-demand ke API status transaksi payment gateway).
3. **Transaction Reconciliation** (sinkronisasi terjadwal/manual untuk mendeteksi dan memperbaiki selisih status transaksi).

Selain itu, nominal invoice dalam Rupiah (**IDR**) dikonversi secara real-time ke **Bitcoin (BTC)** dan **Ethereum (ETH)** berdasarkan harga pasar dari **CoinGecko API**.

---

## Rumusan Masalah Riset
> *"Seberapa efektif kombinasi webhook, polling, dan rekonsiliasi dalam menjaga keakuratan status pembayaran dibandingkan hanya menggunakan webhook? Pengujian dilakukan dengan simulasi webhook terlambat, gagal, dan terkirim berulang."*

---

## Struktur Workspace (Monorepo)

```text
paybridge/
├── docker-compose.yml          # Container PostgreSQL 16 (port 5432)
├── package.json                # Root workspace scripts (backend + frontend)
├── backend/                    # Node.js + Express + TypeScript + Prisma ORM
│   ├── prisma/
│   │   ├── schema.prisma       # Skema DB: User, Invoice, PaymentTransaction, WebhookEvent, AuditLog, SimulationRun
│   │   └── seed.ts             # Data awal akun demo, invoice sampel, dan benchmark simulasi
│   └── src/
│       ├── config/             # Konfigurasi environment (Zod) & koneksi Prisma
│       ├── middleware/         # JWT Authentication & Global Error Handler
│       ├── routes/             # Endpoint REST API (Auth, Invoice, Verification, Crypto)
│       ├── services/           # Business logic (Midtrans QRIS, Webhook/Polling/Reconciliation, Simulasi, CoinGecko)
│       └── workers/            # Background Active Polling & Cron Reconciliation
└── frontend/                   # React 19 + TypeScript + Vite + Tailwind CSS
    └── src/
        ├── components/         # Layout navigasi & badge status
        ├── pages/              # Auth, Dashboard, Invoices CRUD, Public Payment QRIS, Reliability Lab, Audit Logs
        ├── services/           # Fetch API wrapper
        └── utils/              # Formatter IDR, BTC/ETH, dan tanggal
```

---

## Cara Menjalankan Project

### Menggunakan `make` (Makefile)

Jika kamu memiliki tool `make` terinstall (Git Bash, WSL, MinGW, atau Chocolatey):

```bash
# 1. Menjalankan Docker PostgreSQL & inisialisasi schema + seed data
make setup

# Atau perintah spesifik Docker:
make up       # Jalankan Docker container PostgreSQL di background
make down     # Hentikan container
make logs     # Lihat log container PostgreSQL
make restart  # Restart container

# 2. Jalankan Backend & Frontend (di terminal terpisah)
make dev-backend   # Port 4000
make dev-frontend  # Port 5173
```

---

### Menggunakan `npm` Script (PowerShell / Windows CMD)

Jika lingkungan Windows kamu belum memiliki binary `make`, kamu bisa langsung menggunakan skrip `npm`:

```bash
# 1. Jalankan PostgreSQL dan lakukan setup database
npm run db:up
npm run db:push
npm run db:seed
# Atau shortcut all-in-one:
npm run db:setup

# Perintah Docker lainnya:
npm run db:logs
npm run db:restart
npm run db:down

# 2. Jalankan Backend & Frontend (di terminal terpisah)
npm run dev:backend   # Port 4000
npm run dev:frontend  # Port 5173
```

Buka `http://localhost:5173` di browser.
- **Email Akun Demo:** `freelancer@paybridge.id`
- **Password Akun Demo:** `Password123!`

---

## Integrasi Webhook dengan ngrok / Cloudflare Tunnel

Jika ingin menguji webhook langsung dari **Midtrans Sandbox / Production**:
1. Ubah `PAYMENT_GATEWAY_MODE="MIDTRANS_SANDBOX"` dan isi `MIDTRANS_SERVER_KEY` di `backend/.env`.
2. Ekspos port `4000` menggunakan **ngrok** atau **Cloudflare Tunnel**:
   ```bash
   # Menggunakan ngrok
   ngrok http 4000

   # Atau menggunakan Cloudflare Tunnel
   cloudflared tunnel --url http://localhost:4000
   ```
3. Masukkan URL publik ke **Midtrans Dashboard → Settings → Payment Notification URL**:
   ```text
   https://<domain-tunnel-kamu>/api/webhooks/midtrans
   ```

---

## Panduan Pengujian Simulasi Riset
1. **Simulasi pada Transaksi Tunggal (`/pay/:publicToken`)**:
   - Buka menu **Invoice & QRIS**, klik **Halaman Bayar** pada salah satu invoice `PENDING`, lalu generate kode QRIS.
   - Gunakan **Panel Pengujian Simulasi Riset** untuk menguji:
     - **Bayar Normal (Webhook Instan)**
     - **Simulasi Webhook Terlambat (5 detik)**
     - **Simulasi Webhook Gagal / Drop** (lalu pulihkan dengan tombol **Active Polling** atau **Rekonsiliasi**)
     - **Webhook Terkirim Berulang 4x** (menguji **Idempotency Key** agar tidak terjadi *double-settlement*)
2. **Simulasi Eksperimen Batch (`/reliability`)**:
   - Buka menu **Simulasi & Keandalan** untuk menjalankan pengujian batch dan membandingkan metrik akurasi **Webhook-Only** vs **Kombinasi (Webhook + Polling + Rekonsiliasi)**.

