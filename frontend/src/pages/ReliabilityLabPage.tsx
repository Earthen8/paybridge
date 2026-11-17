import { CheckCircle2, Play, RefreshCw } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { EmptyState, ErrorState, LoadingSkeleton } from '../components/DataStates.js';
import { apiRequest } from '../services/apiClient.js';
import { ReliabilityReportResponse, SimulationScenario } from '../types/paybridge.js';
import { formatDateTime } from '../utils/formatters.js';

export function ReliabilityLabPage() {
  const [report, setReport] = useState<ReliabilityReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [scenario, setScenario] = useState<SimulationScenario>('FAILED_WEBHOOK');
  const [sampleSize, setSampleSize] = useState(20);
  const [webhookDelayMs, setWebhookDelayMs] = useState(6000);
  const [duplicateFactor, setDuplicateFactor] = useState(4);
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [actionBanner, setActionBanner] = useState<string | null>(null);

  async function loadReliabilityReport() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await apiRequest<ReliabilityReportResponse>('/verification/reliability-report');
      setReport(data);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : 'Gagal memuat laporan keandalan sistem.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadReliabilityReport();
  }, []);

  async function handleRunBenchmark(event: FormEvent) {
    event.preventDefault();
    setIsRunningBenchmark(true);
    setActionBanner(null);
    setActionError(null);
    try {
      await apiRequest('/verification/simulate-benchmark', {
        method: 'POST',
        body: JSON.stringify({
          scenario,
          sampleSize,
          webhookDelayMs,
          duplicateFactor,
        }),
      });
      setActionBanner(
        `Simulasi eksperimen [${scenario}] dengan ${sampleSize} sampel berhasil dicatat ke laporan keandalan.`,
      );
      await loadReliabilityReport();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Gagal menjalankan simulasi.');
    } finally {
      setIsRunningBenchmark(false);
    }
  }

  async function handleTriggerReconciliation() {
    setIsReconciling(true);
    setActionBanner(null);
    setActionError(null);
    try {
      const result = await apiRequest<{
        checkedCount: number;
        resolvedCount: number;
        expiredCount: number;
      }>('/verification/reconcile', { method: 'POST' });
      setActionBanner(
        `Rekonsiliasi selesai: ${result.checkedCount} transaksi pending diperiksa, ${result.resolvedCount} transaksi dipulihkan, ${result.expiredCount} ditandai kedaluwarsa.`,
      );
      await loadReliabilityReport();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Gagal menjalankan rekonsiliasi.');
    } finally {
      setIsReconciling(false);
    }
  }

  if (isLoading && !report) {
    return <LoadingSkeleton label="Memuat laporan keandalan sistem dan hasil simulasi..." rows={5} />;
  }

  if (loadError || !report) {
    return (
      <ErrorState
        title="Gagal memuat laporan keandalan"
        message={loadError ?? 'Data laporan keandalan belum tersedia.'}
        onRetry={loadReliabilityReport}
      />
    );
  }

  const isSimulationEnabled = report.isSimulationEnabled ?? true;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--line)] pb-5">
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[var(--ink)]">
            {isSimulationEnabled
              ? 'Laporan Keandalan & Lab Simulasi'
              : 'Laporan Keandalan Sistem'}
          </h1>
          <p className="text-sm text-[var(--ink-muted)]">
            Bandingkan efektivitas kombinasi Webhook, Active Polling, dan Rekonsiliasi terhadap metode Webhook-Only.
          </p>
        </div>

        <button
          type="button"
          onClick={handleTriggerReconciliation}
          disabled={isReconciling}
          className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-[4px] bg-[var(--stamp)] hover:bg-[var(--stamp-hover)] disabled:opacity-60 text-[var(--stamp-fg)] text-sm font-semibold transition-colors"
        >
          <RefreshCw
            className={`w-4 h-4 ${isReconciling ? 'animate-spin' : ''}`}
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <span>{isReconciling ? 'Menjalankan Rekonsiliasi...' : 'Jalankan Rekonsiliasi'}</span>
        </button>
      </div>

      {actionError && (
        <div
          role="alert"
          className="p-4 rounded-[4px] border border-[var(--danger)] bg-[var(--danger-bg)] text-sm text-[var(--danger)]"
        >
          {actionError}
        </div>
      )}

      {actionBanner && (
        <div
          role="status"
          className="p-4 rounded-[4px] border border-[var(--paid)] bg-[var(--paid-bg)] text-sm text-[var(--paid)] flex items-start gap-2.5"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.75} aria-hidden="true" />
          <span>{actionBanner}</span>
        </div>
      )}

      <section aria-label="Ringkasan komparasi keandalan" className="paper-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--line)]">
          <div className="pb-4 md:pb-0 md:pr-6 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
              Akurasi Webhook-Only
            </p>
            <p className="font-display text-3xl font-bold text-[var(--pending)] tabular-nums">
              {report.overview.webhookOnlyAccuracyPct}%
            </p>
            <p className="text-xs text-[var(--ink-muted)]">
              {report.overview.webhookVerifiedCount} dari {report.overview.totalSettledInGateway}{' '}
              transaksi lunas tercatat hanya via webhook.
            </p>
          </div>

          <div className="py-4 md:py-0 md:px-6 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
              Akurasi Kombinasi Multi-Layer
            </p>
            <p className="font-display text-3xl font-bold text-[var(--paid)] tabular-nums">
              {report.overview.hybridAccuracyPct}%
            </p>
            <p className="text-xs text-[var(--ink-muted)]">
              Dipulihkan Polling: {report.overview.pollingRecoveredCount} | Rekonsiliasi:{' '}
              {report.overview.reconciliationRecoveredCount}
            </p>
          </div>

          <div className="pt-4 md:pt-0 md:pl-6 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
              Proteksi Idempotency
            </p>
            <p className="font-display text-3xl font-bold text-[var(--ink)] tabular-nums">
              {report.webhookStats.duplicatePreventedCount}
            </p>
            <p className="text-xs text-[var(--ink-muted)]">
              Duplikat diblokir dari {report.webhookStats.totalEventsReceived} webhook (signature invalid ditolak: {report.webhookStats.invalidSignatureRejectedCount}).
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {isSimulationEnabled && (
          <form onSubmit={handleRunBenchmark} className="paper-card p-6 space-y-4">
          <div className="border-b border-[var(--line)] pb-3 space-y-1">
            <h2 className="font-display text-lg font-semibold text-[var(--ink)]">
              Simulator Eksperimen Batch
            </h2>
            <p className="text-xs text-[var(--ink-muted)]">
              Uji keandalan verifikasi pada skenario gangguan pengiriman webhook.
            </p>
          </div>

          <div>
            <label
              htmlFor="sim-scenario"
              className="block text-xs font-semibold text-[var(--ink)] mb-1.5"
            >
              Skenario Gangguan Webhook
            </label>
            <select
              id="sim-scenario"
              value={scenario}
              onChange={(event) => setScenario(event.target.value as SimulationScenario)}
              className="w-full min-h-11 px-3.5 py-2 rounded-[4px] bg-[var(--surface)] border border-[var(--line-strong)] text-base text-[var(--ink)]"
            >
              <option value="DELAYED_WEBHOOK">1. Webhook Terlambat (Delayed Webhook)</option>
              <option value="FAILED_WEBHOOK">2. Webhook Gagal / Hilang (Dropped)</option>
              <option value="DUPLICATE_WEBHOOK">3. Webhook Terkirim Berulang (Duplicate)</option>
              <option value="MIXED_BATCH">4. Skenario Campuran (Mixed Batch)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="sim-sample-size"
              className="block text-xs font-semibold text-[var(--ink)] mb-1.5"
            >
              Jumlah Sampel Transaksi (3 sampai 50)
            </label>
            <input
              id="sim-sample-size"
              type="number"
              min={3}
              max={50}
              value={sampleSize}
              onChange={(event) => setSampleSize(Number(event.target.value))}
              className="w-full min-h-11 px-3.5 py-2 rounded-[4px] bg-[var(--surface)] border border-[var(--line-strong)] text-base font-mono text-[var(--ink)]"
            />
          </div>

          {scenario === 'DELAYED_WEBHOOK' && (
            <div>
              <label
                htmlFor="sim-delay-ms"
                className="block text-xs font-semibold text-[var(--ink)] mb-1.5"
              >
                Simulasi Delay Webhook (ms)
              </label>
              <input
                id="sim-delay-ms"
                type="number"
                min={1000}
                max={60000}
                step={500}
                value={webhookDelayMs}
                onChange={(event) => setWebhookDelayMs(Number(event.target.value))}
                className="w-full min-h-11 px-3.5 py-2 rounded-[4px] bg-[var(--surface)] border border-[var(--line-strong)] text-base font-mono text-[var(--ink)]"
              />
            </div>
          )}

          {scenario === 'DUPLICATE_WEBHOOK' && (
            <div>
              <label
                htmlFor="sim-dup-factor"
                className="block text-xs font-semibold text-[var(--ink)] mb-1.5"
              >
                Pengiriman Berulang per Transaksi
              </label>
              <input
                id="sim-dup-factor"
                type="number"
                min={2}
                max={10}
                value={duplicateFactor}
                onChange={(event) => setDuplicateFactor(Number(event.target.value))}
                className="w-full min-h-11 px-3.5 py-2 rounded-[4px] bg-[var(--surface)] border border-[var(--line-strong)] text-base font-mono text-[var(--ink)]"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isRunningBenchmark}
            className="w-full min-h-11 px-4 rounded-[4px] bg-[var(--stamp)] hover:bg-[var(--stamp-hover)] disabled:opacity-60 text-[var(--stamp-fg)] text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Play className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
            <span>{isRunningBenchmark ? 'Menjalankan Simulasi...' : 'Jalankan Eksperimen'}</span>
          </button>
        </form>
        )}

        <section
          aria-labelledby="sim-results-heading"
          className={`${isSimulationEnabled ? 'lg:col-span-2' : 'lg:col-span-3'} paper-card p-6 space-y-4`}
        >
          <h2 id="sim-results-heading" className="font-display text-lg font-semibold text-[var(--ink)] border-b border-[var(--line)] pb-3">
            Hasil Pengujian Eksperimen
          </h2>

          {report.simulationRuns.length === 0 ? (
            <EmptyState
              title="Belum ada catatan simulasi"
              description="Jalankan eksperimen pada panel simulator di samping untuk merekam perbandingan akurasi."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs font-semibold text-[var(--ink-muted)] border-b border-[var(--line)]">
                  <tr>
                    <th className="pb-3 pr-3">Skenario</th>
                    <th className="pb-3 pr-3">Sampel</th>
                    <th className="pb-3 pr-3">Webhook-Only</th>
                    <th className="pb-3 pr-3">Hybrid</th>
                    <th className="pb-3 pr-3">Pemulihan</th>
                    <th className="pb-3 pr-3">Duplikat</th>
                    <th className="pb-3">Latensi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {report.simulationRuns.map((run) => (
                    <tr key={run.id}>
                      <td className="py-3 pr-3">
                        <span className="font-mono text-xs font-semibold text-[var(--ink)]">
                          {run.scenario}
                        </span>
                        <p className="text-xs text-[var(--ink-muted)] mt-0.5 max-w-xs">
                          {run.details?.description}
                        </p>
                        <span className="text-xs text-[var(--ink-muted)] block mt-0.5">
                          {formatDateTime(run.createdAt)}
                        </span>
                      </td>
                      <td className="py-3 pr-3 font-mono text-sm text-[var(--ink)] whitespace-nowrap">
                        {run.totalSamples} tx
                      </td>
                      <td className="py-3 pr-3 font-mono text-sm font-semibold text-[var(--pending)]">
                        {run.webhookOnlyAccuracyPct}%
                      </td>
                      <td className="py-3 pr-3 font-mono text-sm font-semibold text-[var(--paid)]">
                        {run.hybridAccuracyPct}%
                      </td>
                      <td className="py-3 pr-3 font-mono text-xs text-[var(--ink)] whitespace-nowrap">
                        Poll {run.pollingRecoveredCount} / Rek {run.reconcileRecoveredCount}
                      </td>
                      <td className="py-3 pr-3 font-mono text-xs text-[var(--ink)]">
                        {run.duplicateBlockedCount}x
                      </td>
                      <td className="py-3 font-mono text-xs text-[var(--ink)] whitespace-nowrap">
                        {run.avgHybridLatencyMs} ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
