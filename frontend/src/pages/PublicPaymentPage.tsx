import {
  AlertCircle,
  CheckCircle2,
  FlaskConical,
  QrCode,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo.js';
import { ErrorState, LoadingSkeleton } from '../components/DataStates.js';
import { InvoiceStatusBadge, MechanismBadge } from '../components/StatusBadge.js';
import { ThemeToggle } from '../components/ThemeToggle.js';
import { apiRequest } from '../services/apiClient.js';
import { Invoice, PaymentTransaction } from '../types/paybridge.js';
import { formatCrypto, formatDateTime, formatIdr } from '../utils/formatters.js';

export function PublicPaymentPage() {
  const { publicToken } = useParams<{ publicToken: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [transaction, setTransaction] = useState<PaymentTransaction | null>(null);
  const [isSimulationEnabled, setIsSimulationEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingQris, setIsGeneratingQris] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [simulationFeedback, setSimulationFeedback] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function loadPublicInvoice() {
    if (!publicToken) {
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await apiRequest<{ invoice: Invoice; isSimulationEnabled?: boolean }>(
        `/invoices/public/${publicToken}`,
      );
      setInvoice(response.invoice);
      setTransaction(response.invoice.transactions?.[0] ?? null);
      setIsSimulationEnabled(response.isSimulationEnabled ?? false);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : 'Halaman pembayaran tidak ditemukan.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPublicInvoice();
  }, [publicToken]);

  async function handleGenerateQris() {
    if (!publicToken) {
      return;
    }
    setIsGeneratingQris(true);
    setActionError(null);
    try {
      const response = await apiRequest<{ transaction: PaymentTransaction }>(
        `/invoices/public/${publicToken}/qris`,
        { method: 'POST' },
      );
      setTransaction(response.transaction);
      await loadPublicInvoice();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Gagal membuat QRIS dinamis.');
    } finally {
      setIsGeneratingQris(false);
    }
  }

  async function handleManualPollStatus() {
    if (!transaction) {
      return;
    }
    setIsPolling(true);
    setActionError(null);
    try {
      const result = await apiRequest<{
        hasChanged: boolean;
        currentStatus: string;
        verifiedBy: string | null;
      }>(`/verification/poll/${transaction.orderId}`, { method: 'POST' });

      setSimulationFeedback(
        result.hasChanged
          ? `Polling berhasil menemukan perubahan status: ${result.currentStatus} (diverifikasi oleh ${result.verifiedBy}).`
          : `Status saat ini di Payment Gateway: ${result.currentStatus}.`,
      );
      await loadPublicInvoice();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Gagal melakukan polling status.');
    } finally {
      setIsPolling(false);
    }
  }

  async function handleRunPaymentSimulation(
    scenario: 'NORMAL' | 'DELAYED_WEBHOOK' | 'FAILED_WEBHOOK' | 'DUPLICATE_WEBHOOK',
  ) {
    if (!transaction) {
      return;
    }
    setSimulationFeedback(null);
    setActionError(null);
    try {
      const response = await apiRequest<{ explanation: string }>('/verification/simulate-payment', {
        method: 'POST',
        body: JSON.stringify({
          orderId: transaction.orderId,
          scenario,
          delayMs: 5000,
          duplicateCount: 4,
          autoRecoverWithPolling: false,
        }),
      });
      setSimulationFeedback(response.explanation);
      await loadPublicInvoice();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Simulasi gagal dijalankan.');
    }
  }

  const isPaid = invoice?.status === 'PAID';

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col">
      <header className="border-b border-[var(--line)] bg-[var(--surface)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <BrandLogo size={26} />
            <span className="font-display font-bold text-lg text-[var(--ink)]">PayBridge</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/invoices"
              className="inline-flex items-center min-h-11 px-3 rounded-[4px] border border-[var(--line-strong)] bg-[var(--surface)] hover:bg-[var(--surface-alt)] text-xs font-semibold text-[var(--ink)]"
            >
              Kembali ke Daftar Invoice
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6"
      >
        {isLoading && !invoice ? (
          <LoadingSkeleton label="Memuat lembar invoice dan kode QRIS dinamis..." rows={5} />
        ) : loadError || !invoice ? (
          <div className="space-y-4">
            <ErrorState
              title="Lembar invoice tidak ditemukan"
              message={loadError ?? 'Tautan pembayaran publik tidak valid atau sudah kedaluwarsa.'}
              onRetry={loadPublicInvoice}
            />
          </div>
        ) : (
          <>
            {actionError && (
              <div
                role="alert"
                className="p-4 rounded-[4px] border border-[var(--danger)] bg-[var(--danger-bg)] text-sm text-[var(--danger)] flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.75} aria-hidden="true" />
                <span>{actionError}</span>
              </div>
            )}

            {simulationFeedback && (
              <div
                role="status"
                className="p-4 rounded-[4px] border border-[var(--ink)] bg-[var(--surface)] text-sm text-[var(--ink)] flex items-start gap-3"
              >
                <FlaskConical className="w-4 h-4 text-[var(--stamp)] shrink-0 mt-0.5" strokeWidth={1.75} aria-hidden="true" />
                <div>
                  <p className="font-semibold text-[var(--ink)]">
                    Mode Simulasi: Hasil Verifikasi
                  </p>
                  <p className="text-[var(--ink-muted)] mt-0.5">{simulationFeedback}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              <section
                aria-labelledby="public-invoice-title"
                className="md:col-span-7 paper-card p-6 sm:p-8 space-y-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] pb-5">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                      {invoice.user?.businessName ?? 'PayBridge Freelancer'}
                    </p>
                    <h1
                      id="public-invoice-title"
                      className="font-display text-2xl font-semibold text-[var(--ink)]"
                    >
                      {invoice.title}
                    </h1>
                    <p className="text-xs font-mono text-[var(--ink-muted)]">
                      Nomor Invoice: {invoice.invoiceNumber}
                    </p>
                  </div>
                  <InvoiceStatusBadge status={invoice.status} />
                </div>

                <dl className="divide-y divide-[var(--line)] text-sm">
                  <div className="py-3 flex flex-wrap justify-between gap-2">
                    <dt className="text-[var(--ink-muted)]">Ditagihkan kepada</dt>
                    <dd className="font-medium text-[var(--ink)] text-right">
                      {invoice.clientName}
                      {invoice.clientEmail ? ` (${invoice.clientEmail})` : ''}
                    </dd>
                  </div>
                  <div className="py-3 flex flex-wrap justify-between gap-2">
                    <dt className="text-[var(--ink-muted)]">Jatuh tempo</dt>
                    <dd className="text-[var(--ink)]">{formatDateTime(invoice.dueDate)}</dd>
                  </div>
                  {invoice.description && (
                    <div className="py-3 space-y-1.5">
                      <dt className="text-[var(--ink-muted)]">Deskripsi pekerjaan</dt>
                      <dd className="p-3.5 rounded-[4px] bg-[var(--surface-alt)] border border-[var(--line)] text-sm text-[var(--ink)]">
                        {invoice.description}
                      </dd>
                    </div>
                  )}
                </dl>

                <div className="p-4 rounded-[4px] bg-[var(--surface-alt)] border border-[var(--line)] space-y-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                      Total Tagihan
                    </span>
                    <span className="font-display text-2xl sm:text-3xl font-bold text-[var(--ink)] tabular-nums">
                      {formatIdr(invoice.amountIdr)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-[var(--ink-muted)]">Ekuivalen aset kripto (CoinGecko)</span>
                    <span className="font-mono font-medium text-[var(--ink)]">
                      {formatCrypto(invoice.btcAmount, 'BTC')} | {formatCrypto(invoice.ethAmount, 'ETH')}
                    </span>
                  </div>
                </div>

                {transaction && isSimulationEnabled && (
                  <div className="p-4 rounded-[4px] border border-[var(--line)] bg-[var(--surface)] space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[var(--ink)] inline-flex items-center gap-1.5">
                        <FlaskConical className="w-4 h-4 text-[var(--stamp)]" strokeWidth={1.75} aria-hidden="true" />
                        <span>Panel Mode Simulasi (Sandbox Riset)</span>
                      </span>
                      <span className="text-xs font-mono text-[var(--ink-muted)]">
                        {transaction.orderId}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--ink-muted)]">
                      Uji perilaku verifikasi status pada Order ID ini ketika terjadi gangguan webhook:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        disabled={isPaid}
                        onClick={() => handleRunPaymentSimulation('NORMAL')}
                        className="min-h-11 px-3 py-2 rounded-[4px] border border-[var(--paid)] bg-[var(--paid-bg)] text-[var(--paid)] disabled:opacity-50 text-xs font-semibold text-left"
                      >
                        1. Bayar Normal (Webhook Instan)
                      </button>
                      <button
                        type="button"
                        disabled={isPaid}
                        onClick={() => handleRunPaymentSimulation('DELAYED_WEBHOOK')}
                        className="min-h-11 px-3 py-2 rounded-[4px] border border-[var(--pending)] bg-[var(--pending-bg)] text-[var(--pending)] disabled:opacity-50 text-xs font-semibold text-left"
                      >
                        2. Webhook Terlambat (5 detik)
                      </button>
                      <button
                        type="button"
                        disabled={isPaid}
                        onClick={() => handleRunPaymentSimulation('FAILED_WEBHOOK')}
                        className="min-h-11 px-3 py-2 rounded-[4px] border border-[var(--danger)] bg-[var(--danger-bg)] text-[var(--danger)] disabled:opacity-50 text-xs font-semibold text-left"
                      >
                        3. Webhook Gagal / Drop
                      </button>
                      <button
                        type="button"
                        disabled={isPaid}
                        onClick={() => handleRunPaymentSimulation('DUPLICATE_WEBHOOK')}
                        className="min-h-11 px-3 py-2 rounded-[4px] border border-[var(--line-strong)] bg-[var(--surface-alt)] text-[var(--ink)] disabled:opacity-50 text-xs font-semibold text-left"
                      >
                        4. Webhook Berulang 4x (Idempoten)
                      </button>
                    </div>
                  </div>
                )}
              </section>

              <section
                aria-label="Kartu pembayaran QRIS"
                className="md:col-span-5 pt-2 pb-2"
              >
                <div className="serrated-ticket p-6 sm:p-7 flex flex-col items-center text-center space-y-5">
                  {isPaid ? (
                    <div className="py-6 space-y-5 w-full flex flex-col items-center">
                      <div className="lunas-stamp">
                        <CheckCircle2 className="w-5 h-5" strokeWidth={2} aria-hidden="true" />
                        <span>LUNAS</span>
                      </div>

                      <div className="space-y-1">
                        <h2 className="font-display text-xl font-semibold text-[var(--ink)]">
                          Pembayaran Terverifikasi
                        </h2>
                        <p className="text-sm text-[var(--ink-muted)]">
                          Pembayaran sebesar {formatIdr(invoice.amountIdr)} telah tercatat lunas.
                        </p>
                      </div>

                      <dl className="w-full p-4 rounded-[4px] bg-[var(--surface-alt)] border border-[var(--line)] text-xs space-y-2 text-left">
                        <div className="flex justify-between gap-2">
                          <dt className="text-[var(--ink-muted)]">Order ID</dt>
                          <dd className="font-mono text-[var(--ink)]">{transaction?.orderId}</dd>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                          <dt className="text-[var(--ink-muted)]">Diverifikasi melalui</dt>
                          <dd>
                            <MechanismBadge mechanism={transaction?.verifiedBy ?? 'WEBHOOK'} />
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-[var(--ink-muted)]">Latensi deteksi</dt>
                          <dd className="font-mono font-semibold text-[var(--paid)]">
                            {transaction?.verificationLatencyMs ?? 120} ms
                          </dd>
                        </div>
                      </dl>
                    </div>
                  ) : transaction ? (
                    <>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                          QRIS Dinamis Nasional
                        </p>
                        <h2 className="font-display text-lg font-semibold text-[var(--ink)]">
                          Pindai dengan Mobile Banking atau E-Wallet
                        </h2>
                      </div>

                      <div className="p-4 bg-white border border-[var(--line-strong)] rounded-[4px]">
                        <QRCodeSVG
                          value={transaction.qrisString}
                          size={220}
                          level="M"
                          title={`Kode QRIS untuk ${invoice.invoiceNumber}`}
                        />
                      </div>

                      <dl className="w-full space-y-2 text-xs border-t border-[var(--line)] pt-4">
                        <div className="flex justify-between">
                          <dt className="text-[var(--ink-muted)]">Status Lokal</dt>
                          <dd className="font-mono font-semibold text-[var(--pending)]">
                            {transaction.status}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-[var(--ink-muted)]">Status Gateway</dt>
                          <dd className="font-mono font-semibold text-[var(--ink)]">
                            {transaction.simulatedGatewayStatus}
                          </dd>
                        </div>
                      </dl>

                      {transaction.simulatedGatewayStatus === 'SETTLEMENT' &&
                        transaction.status === 'PENDING' && (
                          <div
                            role="status"
                            className="w-full p-3 rounded-[4px] border border-[var(--pending)] bg-[var(--pending-bg)] text-xs text-[var(--pending)] flex items-start gap-2 text-left"
                          >
                            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.75} aria-hidden="true" />
                            <span>
                              Gateway sudah SETTLEMENT namun webhook belum masuk. Jalankan Active Polling di bawah untuk memulihkan status.
                            </span>
                          </div>
                        )}

                      <button
                        type="button"
                        onClick={handleManualPollStatus}
                        disabled={isPolling}
                        className="w-full min-h-11 px-4 rounded-[4px] bg-[var(--stamp)] hover:bg-[var(--stamp-hover)] disabled:opacity-60 text-[var(--stamp-fg)] text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                      >
                        <RefreshCw
                          className={`w-4 h-4 ${isPolling ? 'animate-spin' : ''}`}
                          strokeWidth={1.75}
                          aria-hidden="true"
                        />
                        <span>
                          {isPolling ? 'Mengecek API Gateway...' : 'Cek Status Pembayaran (Polling)'}
                        </span>
                      </button>
                    </>
                  ) : (
                    <div className="py-8 space-y-4 w-full">
                      <div className="w-12 h-12 rounded-[4px] border border-[var(--line)] bg-[var(--surface-alt)] flex items-center justify-center mx-auto text-[var(--ink)]">
                        <QrCode className="w-6 h-6" strokeWidth={1.75} aria-hidden="true" />
                      </div>
                      <div className="space-y-1">
                        <h2 className="font-display text-lg font-semibold text-[var(--ink)]">
                          Terbitkan Kode QRIS Dinamis
                        </h2>
                        <p className="text-sm text-[var(--ink-muted)]">
                          Kode QR akan dibuat sesuai nominal tagihan {formatIdr(invoice.amountIdr)}.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleGenerateQris}
                        disabled={isGeneratingQris}
                        className="w-full min-h-11 px-4 rounded-[4px] bg-[var(--stamp)] hover:bg-[var(--stamp-hover)] disabled:opacity-60 text-[var(--stamp-fg)] text-sm font-semibold"
                      >
                        {isGeneratingQris ? 'Menghubungi Midtrans...' : 'Tampilkan Kode QRIS Sekarang'}
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
