import { Plus, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorState, LoadingSkeleton } from '../components/DataStates.js';
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
    return <LoadingSkeleton label="Memuat ringkasan pembayaran dan kurs pasar kripto..." rows={5} />;
  }

  if (errorMessage || !summary) {
    return (
      <ErrorState
        title="Gagal memuat ringkasan pembayaran"
        message={errorMessage ?? 'Data ringkasan tidak tersedia.'}
        onRetry={loadDashboard}
      />
    );
  }

  const convertedBtc = calculatorIdr / summary.cryptoRates.btcRateIdr;
  const convertedEth = calculatorIdr / summary.cryptoRates.ethRateIdr;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--line)] pb-5">
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[var(--ink)]">
            Ringkasan Pembayaran
          </h1>
          <p className="text-sm text-[var(--ink-muted)]">
            Pantau tagihan tertunda, verifikasi multi-layer, dan ekuivalen aset kripto secara langsung.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={loadDashboard}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-[4px] border border-[var(--line-strong)] bg-[var(--surface)] hover:bg-[var(--surface-alt)] text-sm font-medium text-[var(--ink)] transition-colors"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <span>Segarkan Data</span>
          </button>
          <Link
            to="/invoices"
            className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-[4px] bg-[var(--stamp)] hover:bg-[var(--stamp-hover)] text-[var(--stamp-fg)] text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Buat Invoice Baru</span>
          </Link>
        </div>
      </div>

      <section aria-label="Ikhtisar saldo dan keandalan" className="paper-card p-6 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-6 space-y-2 lg:border-r lg:border-[var(--line)] lg:pr-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
              Total Menunggu Pembayaran
            </p>
            <p className="font-display text-3xl sm:text-4xl font-bold text-[var(--ink)] tabular-nums">
              {formatIdr(summary.metrics.totalPendingIdr)}
            </p>
            <p className="text-sm text-[var(--pending)] font-medium">
              {summary.metrics.pendingInvoicesCount} invoice aktif menunggu penyelesaian pembayaran
            </p>
          </div>

          <div className="lg:col-span-6 divide-y divide-[var(--line)]">
            <div className="py-2.5 flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm text-[var(--ink-muted)]">Total Pembayaran Lunas</span>
              <div className="text-right">
                <span className="font-mono text-sm font-semibold text-[var(--paid)]">
                  {formatIdr(summary.metrics.totalPaidIdr)}
                </span>
                <p className="font-mono text-xs text-[var(--ink-muted)]">
                  {formatCrypto(summary.metrics.totalPaidBtc, 'BTC')} |{' '}
                  {formatCrypto(summary.metrics.totalPaidEth, 'ETH')}
                </p>
              </div>
            </div>

            <div className="py-2.5 flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm text-[var(--ink-muted)]">Akurasi Verifikasi Hybrid</span>
              <div className="text-right">
                <span className="font-mono text-sm font-semibold text-[var(--ink)]">
                  {summary.reliabilityOverview.hybridAccuracyPct}%
                </span>
                <span className="ml-2 text-xs text-[var(--ink-muted)]">
                  (Webhook-Only: {summary.reliabilityOverview.webhookOnlyAccuracyPct}%)
                </span>
              </div>
            </div>

            <div className="py-2.5 flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm text-[var(--ink-muted)]">Sumber Verifikasi Tercatat</span>
              <span className="font-mono text-xs sm:text-sm text-[var(--ink)]">
                Webhook {summary.reliabilityOverview.webhookVerifiedCount} / Polling{' '}
                {summary.reliabilityOverview.pollingRecoveredCount} / Rekonsiliasi{' '}
                {summary.reliabilityOverview.reconciliationRecoveredCount}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section
          aria-labelledby="recent-invoices-heading"
          className="lg:col-span-2 paper-card p-6 space-y-4"
        >
          <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] pb-3">
            <h2 id="recent-invoices-heading" className="font-display text-lg font-semibold text-[var(--ink)]">
              Daftar Invoice Terbaru
            </h2>
            <Link
              to="/invoices"
              className="inline-flex items-center min-h-11 px-2 text-sm font-semibold text-[var(--stamp)] hover:underline"
            >
              Kelola Semua Invoice
            </Link>
          </div>

          {summary.recentInvoices.length === 0 ? (
            <EmptyState
              title="Belum ada invoice"
              description="Buat invoice pertama Anda untuk menghasilkan kode QRIS dinamis dan tautan pembayaran klien."
              action={
                <Link
                  to="/invoices"
                  className="inline-flex items-center justify-center min-h-11 px-4 rounded-[4px] bg-[var(--stamp)] text-[var(--stamp-fg)] text-sm font-semibold"
                >
                  Buat Invoice Pertama
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs font-semibold text-[var(--ink-muted)] border-b border-[var(--line)]">
                  <tr>
                    <th className="pb-3 pr-3">No. Invoice</th>
                    <th className="pb-3 pr-3">Klien</th>
                    <th className="pb-3 pr-3">Nominal</th>
                    <th className="pb-3 pr-3">Status</th>
                    <th className="pb-3 text-right">Tautan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {summary.recentInvoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="py-3 pr-3 font-mono text-xs text-[var(--ink)] whitespace-nowrap">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="py-3 pr-3">
                        <p className="text-sm font-medium text-[var(--ink)]">{invoice.clientName}</p>
                        <p className="text-xs text-[var(--ink-muted)] truncate max-w-44">
                          {invoice.title}
                        </p>
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        <p className="font-mono text-sm font-semibold text-[var(--ink)]">
                          {formatIdr(invoice.amountIdr)}
                        </p>
                        <p className="font-mono text-xs text-[var(--ink-muted)]">
                          {formatCrypto(invoice.btcAmount, 'BTC')}
                        </p>
                      </td>
                      <td className="py-3 pr-3">
                        <InvoiceStatusBadge status={invoice.status} />
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          to={`/pay/${invoice.publicToken}`}
                          className="inline-flex items-center justify-center min-h-11 px-3 rounded-[4px] border border-[var(--line-strong)] bg-[var(--surface)] hover:bg-[var(--surface-alt)] text-xs font-semibold text-[var(--ink)]"
                        >
                          Buka QRIS
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section aria-labelledby="crypto-converter-heading" className="paper-card p-6 space-y-4">
            <div className="border-b border-[var(--line)] pb-3 space-y-1">
              <h2 id="crypto-converter-heading" className="font-display text-lg font-semibold text-[var(--ink)]">
                Konversi Kurs BTC / ETH
              </h2>
              <p className="text-xs text-[var(--ink-muted)]">
                Sumber kurs: {summary.cryptoRates.source}
              </p>
            </div>

            <div className="divide-y divide-[var(--line)] text-sm">
              <div className="py-2 flex justify-between items-baseline">
                <span className="text-[var(--ink-muted)]">1 Bitcoin (BTC)</span>
                <span className="font-mono font-semibold text-[var(--ink)]">
                  {formatIdr(summary.cryptoRates.btcRateIdr)}
                </span>
              </div>
              <div className="py-2 flex justify-between items-baseline">
                <span className="text-[var(--ink-muted)]">1 Ethereum (ETH)</span>
                <span className="font-mono font-semibold text-[var(--ink)]">
                  {formatIdr(summary.cryptoRates.ethRateIdr)}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-[var(--line)]">
              <label
                htmlFor="crypto-calc-idr"
                className="block text-xs font-semibold text-[var(--ink)]"
              >
                Simulasi Konversi Nominal (IDR)
              </label>
              <input
                id="crypto-calc-idr"
                type="number"
                min={1000}
                step={1}
                value={calculatorIdr}
                onChange={(event) => setCalculatorIdr(Math.max(0, Number(event.target.value)))}
                className="w-full min-h-11 px-3.5 py-2 rounded-[4px] bg-[var(--surface)] border border-[var(--line-strong)] text-base font-mono text-[var(--ink)]"
              />
              <div className="p-3 rounded-[4px] bg-[var(--surface-alt)] border border-[var(--line)] space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--ink-muted)]">Ekuivalen BTC</span>
                  <span className="font-mono font-semibold text-[var(--ink)]">
                    {formatCrypto(convertedBtc, 'BTC')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--ink-muted)]">Ekuivalen ETH</span>
                  <span className="font-mono font-semibold text-[var(--ink)]">
                    {formatCrypto(convertedEth, 'ETH')}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section aria-labelledby="recent-logs-heading" className="paper-card p-6 space-y-3">
            <h2 id="recent-logs-heading" className="font-display text-lg font-semibold text-[var(--ink)] border-b border-[var(--line)] pb-3">
              Log Verifikasi Terakhir
            </h2>
            {summary.recentAuditLogs.length === 0 ? (
              <p className="text-sm text-[var(--ink-muted)] py-2">
                Belum ada catatan verifikasi transaksi.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--line)]">
                {summary.recentAuditLogs.slice(0, 4).map((log) => (
                  <li key={log.id} className="py-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <MechanismBadge mechanism={log.mechanism} />
                      <span className="text-xs text-[var(--ink-muted)]">
                        {formatDateTime(log.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--ink)]">{log.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
