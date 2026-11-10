import {
  ArrowLeft,
  CheckCircle2,
  FlaskConical,
  QrCode,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { InvoiceStatusBadge, MechanismBadge } from '../components/StatusBadge.js';
import { apiRequest } from '../services/apiClient.js';
import { Invoice, PaymentTransaction } from '../types/paybridge.js';
import { formatCrypto, formatDateTime, formatIdr } from '../utils/formatters.js';

export function PublicPaymentPage() {
  const { publicToken } = useParams<{ publicToken: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [transaction, setTransaction] = useState<PaymentTransaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingQris, setIsGeneratingQris] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [simulationFeedback, setSimulationFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadPublicInvoice() {
    if (!publicToken) {
      return;
    }
    try {
      const response = await apiRequest<{ invoice: Invoice }>(`/invoices/public/${publicToken}`);
      setInvoice(response.invoice);
      setTransaction(response.invoice.transactions?.[0] ?? null);
    } catch (error) {
      setErrorMessage(
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
    setErrorMessage(null);
    try {
      const response = await apiRequest<{ transaction: PaymentTransaction }>(
        `/invoices/public/${publicToken}/qris`,
        { method: 'POST' },
      );
      setTransaction(response.transaction);
      await loadPublicInvoice();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal membuat QRIS dinamis.');
    } finally {
      setIsGeneratingQris(false);
    }
  }

  async function handleManualPollStatus() {
    if (!transaction) {
      return;
    }
    setIsPolling(true);
    try {
      const result = await apiRequest<{
        hasChanged: boolean;
        currentStatus: string;
        verifiedBy: string | null;
      }>(`/verification/poll/${transaction.orderId}`, { method: 'POST' });

      setSimulationFeedback(
        result.hasChanged
          ? `Polling berhasil menemukan perubahan status: ${result.currentStatus} (Diverifikasi oleh ${result.verifiedBy})!`
          : `Status saat ini di Payment Gateway: ${result.currentStatus}.`,
      );
      await loadPublicInvoice();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal melakukan polling status.');
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
    setErrorMessage(null);
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
      setErrorMessage(error instanceof Error ? error.message : 'Simulasi gagal dijalankan.');
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Memuat halaman pembayaran publik...
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-4">
          <p className="text-rose-400 font-medium">{errorMessage ?? 'Invoice tidak ditemukan.'}</p>
          <Link to="/" className="inline-block text-xs text-indigo-400 hover:underline">
            ← Kembali ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isPaid = invoice.status === 'PAID';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            to="/invoices"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Dashboard Merchant
          </Link>
          <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            PayBridge Secure Checkout
          </span>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
            {errorMessage}
          </div>
        )}

        {simulationFeedback && (
          <div className="p-4 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-xs text-indigo-200 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Hasil Simulasi / Verifikasi:</p>
              <p className="mt-0.5">{simulationFeedback}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="md:col-span-3 p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <p className="text-xs text-indigo-400 font-medium">
                  {invoice.user?.businessName ?? 'PayBridge Freelancer'}
                </p>
                <h1 className="text-xl font-bold text-white mt-0.5">{invoice.title}</h1>
                <p className="text-xs font-mono text-slate-400 mt-1">{invoice.invoiceNumber}</p>
              </div>
              <InvoiceStatusBadge status={invoice.status} />
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Ditagihkan Kepada:</span>
                <span className="text-slate-200 font-medium">
                  {invoice.clientName} ({invoice.clientEmail})
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Jatuh Tempo:</span>
                <span className="text-slate-200">{formatDateTime(invoice.dueDate)}</span>
              </div>
              {invoice.description && (
                <div className="pt-2">
                  <span className="text-slate-400 block mb-1">Deskripsi Pekerjaan:</span>
                  <p className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                    {invoice.description}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-400">Total Tagihan (IDR)</span>
                <span className="text-2xl font-bold text-white">
                  {formatIdr(invoice.amountIdr)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">Nilai Konversi Kripto (CoinGecko):</span>
                <span className="font-mono text-amber-300">
                  {formatCrypto(invoice.btcAmount, 'BTC')} |{' '}
                  <span className="text-indigo-300">{formatCrypto(invoice.ethAmount, 'ETH')}</span>
                </span>
              </div>
            </div>

            {transaction && (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <FlaskConical className="w-4 h-4 text-amber-400" />
                    Panel Pengujian Simulasi Riset (Sandbox)
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">{transaction.orderId}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Uji keandalan status transaksi terhadap gangguan webhook pada Order ID ini:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isPaid}
                    onClick={() => handleRunPaymentSimulation('NORMAL')}
                    className="p-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 disabled:opacity-40 border border-emerald-500/30 text-emerald-300 text-xs font-medium cursor-pointer"
                  >
                    1. Bayar Normal (Webhook Instan)
                  </button>
                  <button
                    type="button"
                    disabled={isPaid}
                    onClick={() => handleRunPaymentSimulation('DELAYED_WEBHOOK')}
                    className="p-2 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 disabled:opacity-40 border border-amber-500/30 text-amber-300 text-xs font-medium cursor-pointer"
                  >
                    2. Simulasi Webhook Terlambat (5s)
                  </button>
                  <button
                    type="button"
                    disabled={isPaid}
                    onClick={() => handleRunPaymentSimulation('FAILED_WEBHOOK')}
                    className="p-2 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 disabled:opacity-40 border border-rose-500/30 text-rose-300 text-xs font-medium cursor-pointer"
                  >
                    3. Simulasi Webhook Gagal / Drop
                  </button>
                  <button
                    type="button"
                    disabled={isPaid}
                    onClick={() => handleRunPaymentSimulation('DUPLICATE_WEBHOOK')}
                    className="p-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 disabled:opacity-40 border border-indigo-500/30 text-indigo-300 text-xs font-medium cursor-pointer"
                  >
                    4. Webhook Berulang 4x (Idempoten)
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="md:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-between text-center space-y-5">
            {isPaid ? (
              <div className="my-auto space-y-4 py-8">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <h2 className="text-lg font-bold text-white">Pembayaran Telah Diverifikasi!</h2>
                <p className="text-xs text-slate-400">
                  Terima kasih, pembayaran sebesar {formatIdr(invoice.amountIdr)} telah diterima.
                </p>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5 text-left">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Order ID:</span>
                    <span className="font-mono text-slate-200">{transaction?.orderId}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Diverifikasi Melalui:</span>
                    <MechanismBadge mechanism={transaction?.verifiedBy ?? 'WEBHOOK'} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Latensi Deteksi:</span>
                    <span className="font-mono text-emerald-400">
                      {transaction?.verificationLatencyMs ?? 120} ms
                    </span>
                  </div>
                </div>
              </div>
            ) : transaction ? (
              <>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                    QRIS Dinamis Nasional (NMID)
                  </span>
                  <h2 className="text-base font-bold text-white mt-1">
                    Scan dengan Mobile Banking / E-Wallet
                  </h2>
                </div>

                <div className="p-4 bg-white rounded-2xl shadow-xl">
                  <QRCodeSVG value={transaction.qrisString} size={200} level="M" />
                </div>

                <div className="w-full space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Status Lokal:</span>
                    <span className="font-semibold text-amber-300">{transaction.status}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Status di Gateway:</span>
                    <span className="font-mono text-emerald-300">
                      {transaction.simulatedGatewayStatus}
                    </span>
                  </div>
                  {transaction.simulatedGatewayStatus === 'SETTLEMENT' &&
                    transaction.status === 'PENDING' && (
                      <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[11px] text-amber-200 flex items-center gap-2 text-left">
                        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>
                          Gateway sudah SETTLEMENT tetapi Webhook gagal/terlambat! Klik tombol{' '}
                          <b>Polling Status Sekarang</b> di bawah untuk memulihkan.
                        </span>
                      </div>
                    )}
                </div>

                <button
                  type="button"
                  onClick={handleManualPollStatus}
                  disabled={isPolling}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isPolling ? 'animate-spin' : ''}`} />
                  {isPolling ? 'Mengecek API Gateway...' : 'Cek Status Pembayaran (Active Polling)'}
                </button>
              </>
            ) : (
              <div className="my-auto space-y-4 py-8">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
                  <QrCode className="w-7 h-7" />
                </div>
                <h2 className="text-base font-bold text-white">Generate QRIS Dinamis</h2>
                <p className="text-xs text-slate-400">
                  Klik tombol di bawah untuk membuat kode QRIS dinamis sesuai nominal tagihan{' '}
                  {formatIdr(invoice.amountIdr)}.
                </p>
                <button
                  type="button"
                  onClick={handleGenerateQris}
                  disabled={isGeneratingQris}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer"
                >
                  {isGeneratingQris ? 'Menghubungi Midtrans...' : 'Tampilkan Kode QRIS Sekarang'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

