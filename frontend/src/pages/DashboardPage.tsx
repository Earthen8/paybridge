import {
  ArrowUpRight,
  Bitcoin,
  CheckCircle2,
  Clock,
  Coins,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { InvoiceStatusBadge, MechanismBadge } from '../components/StatusBadge.js';
import { apiRequest } from '../services/apiClient.js';
import { DashboardSummaryResponse } from '../types/paybridge.js';
import { formatCrypto, formatDateTime, formatIdr } from '../utils/formatters.js';

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [calculatorIdr, setCalculatorIdr] = useState(1_500_000);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadDashboard() {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await apiRequest<DashboardSummaryResponse>('/invoices/dashboard-summary');
      setSummary(response);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal memuat ringkasan dashboard.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (isLoading && !summary) {
    return (
      <div className="p-12 text-center text-slate-400">
        Memuat ringkasan pembayaran dan kurs kripto...
      </div>
    );
  }

  if (errorMessage || !summary) {
    return (
      <div className="p-6 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 space-y-3">
        <p className="font-semibold">Gagal Memuat Dashboard</p>
        <p className="text-sm">{errorMessage}</p>
        <button
          type="button"
          onClick={loadDashboard}
          className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium cursor-pointer"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  const convertedBtc = calculatorIdr / summary.cryptoRates.btcRateIdr;
  const convertedEth = calculatorIdr / summary.cryptoRates.ethRateIdr;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard Ringkasan Pembayaran</h1>
          <p className="text-sm text-slate-400">
            Monitoring invoice QRIS dinamis, verifikasi multi-layer, dan konversi harga pasar kripto.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadDashboard}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Segarkan Data
          </button>
          <Link
            to="/invoices"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white"
          >
            + Buat Invoice Baru
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Total Pembayaran Lunas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">{formatIdr(summary.metrics.totalPaidIdr)}</p>
          <p className="text-xs text-slate-400 mt-1">
            ≈ {formatCrypto(summary.metrics.totalPaidBtc, 'BTC')} |{' '}
            {formatCrypto(summary.metrics.totalPaidEth, 'ETH')}
          </p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Menunggu Pembayaran (Pending)</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {formatIdr(summary.metrics.totalPendingIdr)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {summary.metrics.pendingInvoicesCount} invoice aktif menunggu penyelesaian
          </p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Akurasi Verifikasi Hybrid</span>
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">
            {summary.reliabilityOverview.hybridAccuracyPct}%
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Webhook-Only: {summary.reliabilityOverview.webhookOnlyAccuracyPct}% (
            +{summary.reliabilityOverview.accuracyImprovementPct}% peningkatan)
          </p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Distribusi Verifikasi</span>
            <Coins className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-3 mt-1">
            <div>
              <span className="text-xs text-slate-400 block">Webhook</span>
              <span className="text-lg font-bold text-indigo-300">
                {summary.reliabilityOverview.webhookVerifiedCount}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Polling</span>
              <span className="text-lg font-bold text-cyan-300">
                {summary.reliabilityOverview.pollingRecoveredCount}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Rekonsiliasi</span>
              <span className="text-lg font-bold text-purple-300">
                {summary.reliabilityOverview.reconciliationRecoveredCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Invoice Terbaru</h2>
            <Link to="/invoices" className="text-xs text-indigo-400 hover:text-indigo-300">
              Lihat Semua →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="pb-3 font-medium">No. Invoice</th>
                  <th className="pb-3 font-medium">Klien</th>
                  <th className="pb-3 font-medium">Nominal (IDR & Kripto)</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium text-right">Link Publik</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {summary.recentInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="py-3 font-mono text-xs text-slate-200">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="py-3">
                      <p className="text-slate-200 font-medium text-xs">{invoice.clientName}</p>
                      <p className="text-slate-500 text-xs truncate max-w-44">{invoice.title}</p>
                    </td>
                    <td className="py-3">
                      <p className="text-slate-200 font-semibold text-xs">
                        {formatIdr(invoice.amountIdr)}
                      </p>
                      <p className="text-slate-400 text-[11px] font-mono">
                        {formatCrypto(invoice.btcAmount, 'BTC')}
                      </p>
                    </td>
                    <td className="py-3">
                      <InvoiceStatusBadge status={invoice.status} />
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        to={`/pay/${invoice.publicToken}`}
                        className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
                      >
                        Buka QRIS
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bitcoin className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-semibold text-white">Konversi Real-Time BTC / ETH</h2>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              {summary.cryptoRates.source}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400">Harga Pasar BTC</span>
              <p className="text-sm font-bold text-amber-400 mt-0.5">
                {formatIdr(summary.cryptoRates.btcRateIdr)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400">Harga Pasar ETH</span>
              <p className="text-sm font-bold text-indigo-400 mt-0.5">
                {formatIdr(summary.cryptoRates.ethRateIdr)}
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-800">
            <label className="block text-xs font-medium text-slate-300">
              Simulasi Konversi Nominal Invoice (IDR)
            </label>
            <input
              type="number"
              min={1000}
              step={50000}
              value={calculatorIdr}
              onChange={(event) => setCalculatorIdr(Math.max(0, Number(event.target.value)))}
              className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white font-mono"
            />
            <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/20 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Estimasi Bitcoin (BTC):</span>
                <span className="font-mono font-semibold text-amber-300">
                  {formatCrypto(convertedBtc, 'BTC')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Estimasi Ethereum (ETH):</span>
                <span className="font-mono font-semibold text-indigo-300">
                  {formatCrypto(convertedEth, 'ETH')}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-2">
            <p className="text-xs font-medium text-slate-300">Log Verifikasi Terakhir</p>
            <div className="space-y-2 max-h-44 overflow-y-auto">
              {summary.recentAuditLogs.slice(0, 4).map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs flex items-start justify-between gap-2"
                >
                  <div>
                    <p className="text-slate-200">{log.message}</p>
                    <p className="text-[11px] text-slate-500">{formatDateTime(log.createdAt)}</p>
                  </div>
                  <MechanismBadge mechanism={log.mechanism} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

