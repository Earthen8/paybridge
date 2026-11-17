import { Link } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo.js';
import { ThemeToggle } from '../components/ThemeToggle.js';

interface LegalPageProps {
  section: 'terms' | 'privacy';
}

export function LegalPage({ section }: LegalPageProps) {
  const isTerms = section === 'terms';

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col">
      <header className="border-b border-[var(--line)] bg-[var(--surface)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2.5 min-h-11 pr-2 rounded-[4px]">
            <BrandLogo size={28} />
            <span className="font-display font-bold text-lg text-[var(--ink)]">PayBridge</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center min-h-11 px-3 rounded-[4px] border border-[var(--line-strong)] bg-[var(--surface)] hover:bg-[var(--surface-alt)] text-xs font-semibold text-[var(--ink)]"
            >
              Kembali
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8">
        <article className="paper-card p-6 sm:p-8 space-y-6">
          <div className="border-b border-[var(--line)] pb-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
              Dokumen Legal PayBridge
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[var(--ink)]">
              {isTerms ? 'Syarat dan Ketentuan Layanan' : 'Kebijakan Privasi'}
            </h1>
          </div>

          {isTerms ? (
            <div className="space-y-4 text-sm text-[var(--ink)] leading-relaxed">
              <p>
                PayBridge menyediakan sistem penerbitan invoice dan verifikasi pembayaran QRIS dinamis untuk freelancer dan penyedia jasa profesional.
              </p>
              <h2 className="font-display text-lg font-semibold pt-2">1. Transaksi &amp; Pembayaran</h2>
              <p className="text-[var(--ink-muted)]">
                Setiap tagihan yang diterbitkan memiliki nomor invoice unik dan kode QRIS dinamis yang hanya berlaku sesuai nominal tagihan hingga batas waktu yang tertera pada halaman pembayaran.
              </p>
              <h2 className="font-display text-lg font-semibold pt-2">2. Kebijakan Pembatalan &amp; Pengembalian Dana</h2>
              <p className="text-[var(--ink-muted)]">
                Invoice yang berstatus Menunggu dapat dibatalkan oleh penyedia jasa sebelum pembayaran diselesaikan. Untuk pembayaran yang sudah berstatus Lunas, pengajuan pengembalian dana atau sengketa pekerjaan diselesaikan langsung antara klien dan penyedia jasa terkait sesuai kesepakatan proyek.
              </p>
              <h2 className="font-display text-lg font-semibold pt-2">3. Kurs Aset Kripto</h2>
              <p className="text-[var(--ink-muted)]">
                Nilai ekuivalen Bitcoin (BTC) dan Ethereum (ETH) yang ditampilkan bersifat informatif berdasarkan kurs pasar CoinGecko saat invoice diterbitkan. Penyelesaian pembayaran tetap diproses dalam mata uang Rupiah (IDR) melalui QRIS.
              </p>
            </div>
          ) : (
            <div className="space-y-4 text-sm text-[var(--ink)] leading-relaxed">
              <p>
                PayBridge menjaga kerahasiaan data akun merchant, rincian invoice, serta data transaksi pembayaran klien.
              </p>
              <h2 className="font-display text-lg font-semibold pt-2">1. Data yang Dikumpulkan</h2>
              <p className="text-[var(--ink-muted)]">
                Kami menyimpan nama, alamat email, nama usaha, rincian invoice, serta catatan verifikasi status transaksi dari payment gateway (Midtrans) guna memastikan keakuratan status pembayaran dan jejak audit.
              </p>
              <h2 className="font-display text-lg font-semibold pt-2">2. Keamanan Transaksi</h2>
              <p className="text-[var(--ink-muted)]">
                PayBridge tidak menyimpan data kredensial kartu atau saldo rekening pribadi klien. Seluruh pemrosesan QRIS ditangani oleh payment gateway berizin melalui koneksi terenkripsi HTTPS dan verifikasi tanda tangan SHA-512.
              </p>
            </div>
          )}
        </article>
      </main>
    </div>
  );
}
