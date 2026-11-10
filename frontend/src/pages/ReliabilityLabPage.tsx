import {
  CheckCircle,
  FlaskConical,
  Play,
  RefreshCw,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '../services/apiClient.js';
import { ReliabilityReportResponse, SimulationScenario } from '../types/paybridge.js';
import { formatDateTime } from '../utils/formatters.js';

export function ReliabilityLabPage() {
  const [report, setReport] = useState<ReliabilityReportResponse | null>(null);
  const [scenario, setScenario] = useState<SimulationScenario>('FAILED_WEBHOOK');
  const [sampleSize, setSampleSize] = useState(20);
  const [webhookDelayMs, setWebhookDelayMs] = useState(6000);
  const [duplicateFactor, setDuplicateFactor] = useState(4);
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [actionBanner, setActionBanner] = useState<string | null>(null);

  async function loadReliabilityReport() {
    const data = await apiRequest<ReliabilityReportResponse>('/verification/reliability-report');
    setReport(data);
  }

  useEffect(() => {
    loadReliabilityReport();
  }, []);

  async function handleRunBenchmark(event: FormEvent) {
    event.preventDefault();
    setIsRunningBenchmark(true);
    setActionBanner(null);
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
        `Simulasi eksperimen [${scenario}] dengan ${sampleSize} sampel berhasil dijalankan dan dicatat ke Laporan Keandalan Sistem.`,
      );
      await loadReliabilityReport();
    } finally {
      setIsRunningBenchmark(false);
    }
  }

  async function handleTriggerReconciliation() {
    setIsReconciling(true);
    setActionBanner(null);
    try {
      const result = await apiRequest<{
        checkedCount: number;
        resolvedCount: number;
        expiredCount: number;
      }>('/verification/reconcile', { method: 'POST' });
      setActionBanner(
        `Rekonsiliasi selesai: Memeriksa ${result.checkedCount} transaksi pending, memulihkan ${result.resolvedCount} transaksi yang terlewat webhook, dan menandai ${result.expiredCount} kedaluwarsa.`,
      );
      await loadReliabilityReport();
    } finally {
      setIsReconciling(false);
    }
  }

  if (!report) {
    return (
      <div className="p-12 text-center text-slate-400">
        Memuat laporan keandalan sistem dan data eksperimen...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Laporan Keandalan Sistem & Laboratorium Simulasi
          </h1>
          <p className="text-sm text-slate-400">
            Evaluasi efektivitas kombinasi Webhook + Active Polling + Rekonsiliasi dibandingkan hanya menggunakan Webhook.
          </p>
        </div>
        <button
          type="button"
          onClick={handleTriggerReconciliation}
          disabled={isReconciling}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isReconciling ? 'animate-spin' : ''}`} />
          {isReconciling ? 'Menjalankan Rekonsiliasi...' : 'Jalankan Rekonsiliasi Sekarang'}
        </button>
      </div>

      {actionBanner && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-200 flex items-center gap-2.5">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionBanner}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Akurasi Metode Webhook-Only</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-3xl font-bold text-amber-400">
            {report.overview.webhookOnlyAccuracyPct}%
          </p>
          <p className="text-xs text-slate-400">
            {report.overview.webhookVerifiedCount} dari {report.overview.totalSettledInGateway}{' '}
            transaksi lunas terverifikasi hanya via webhook.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-indigo-500/40 space-y-2">
          <div className="flex items-center justify-between text-xs text-indigo-300">
            <span>Akurasi Kombinasi (Webhook + Polling + Rekonsiliasi)</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-bold text-emerald-400">
            {report.overview.hybridAccuracyPct}%
          </p>
          <p className="text-xs text-slate-400">
            Dipulihkan oleh Polling: <b>{report.overview.pollingRecoveredCount}</b> | Rekonsiliasi:{' '}
            <b>{report.overview.reconciliationRecoveredCount}</b>
          </p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Proteksi Idempotency & Signature</span>
            <FlaskConical className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-3xl font-bold text-cyan-300">
            {report.webhookStats.duplicatePreventedCount} Duplikat Diblokir
          </p>
          <p className="text-xs text-slate-400">
            Total Event Webhook: {report.webhookStats.totalEventsReceived} (Signature Invalid
            Ditolak: {report.webhookStats.invalidSignatureRejectedCount})
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form
          onSubmit={handleRunBenchmark}
          className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4"
        >
          <h2 className="text-base font-semibold text-white">
            Simulator Pengujian Rumusan Masalah
          </h2>
          <p className="text-xs text-slate-400">
            Jalankan pengujian komparatif antara <b>Webhook-Only</b> dan <b>Hybrid Multi-Layer</b>{' '}
            pada skenario gangguan:
          </p>

          <div>
            <label className="block text-xs text-slate-300 mb-1">Skenario Gangguan Webhook</label>
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value as SimulationScenario)}
              className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
            >
              <option value="DELAYED_WEBHOOK">
                1. Webhook Terlambat (Delayed Webhook vs Active Polling)
              </option>
              <option value="FAILED_WEBHOOK">
                2. Webhook Gagal / Hilang (Dropped Webhook vs Polling & Rekonsiliasi)
              </option>
              <option value="DUPLICATE_WEBHOOK">
                3. Webhook Terkirim Berulang (Duplicate Delivery vs Idempotency Key)
              </option>
              <option value="MIXED_BATCH">
                4. Skenario Campuran (50% Normal/Duplikat, 35% Terlambat, 15% Gagal)
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">
              Jumlah Sampel Transaksi (3 - 50)
            </label>
            <input
              type="number"
              min={3}
              max={50}
              value={sampleSize}
              onChange={(e) => setSampleSize(Number(e.target.value))}
              className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white font-mono"
            />
          </div>

          {scenario === 'DELAYED_WEBHOOK' && (
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Simulasi Delay Webhook (ms)
              </label>
              <input
                type="number"
                min={1000}
                max={60000}
                step={500}
                value={webhookDelayMs}
                onChange={(e) => setWebhookDelayMs(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white font-mono"
              />
            </div>
          )}

          {scenario === 'DUPLICATE_WEBHOOK' && (
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Frekuensi Pengiriman Berulang per Transaksi
              </label>
              <input
                type="number"
                min={2}
                max={10}
                value={duplicateFactor}
                onChange={(e) => setDuplicateFactor(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white font-mono"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isRunningBenchmark}
            className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4" />
            {isRunningBenchmark ? 'Menjalankan Simulasi...' : 'Jalankan Eksperimen Simulasi'}
          </button>
        </form>

        <div className="lg:col-span-2 p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <h2 className="text-base font-semibold text-white">
            Hasil Pengujian Eksperimen (Webhook-Only vs Kombinasi Multi-Layer)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="pb-3 font-medium">Skenario</th>
                  <th className="pb-3 font-medium">Sampel</th>
                  <th className="pb-3 font-medium">Akurasi Webhook-Only</th>
                  <th className="pb-3 font-medium">Akurasi Hybrid</th>
                  <th className="pb-3 font-medium">Pemulihan (Poll / Rec)</th>
                  <th className="pb-3 font-medium">Duplikat Diblokir</th>
                  <th className="pb-3 font-medium">Latensi Hybrid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {report.simulationRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-800/30">
                    <td className="py-3 pr-2">
                      <span className="font-mono font-semibold text-indigo-300">
                        {run.scenario}
                      </span>
                      <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
                        {run.details?.description}
                      </p>
                      <span className="text-[10px] text-slate-500">
                        {formatDateTime(run.createdAt)}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-slate-200">{run.totalSamples} tx</td>
                    <td className="py-3 font-mono font-bold text-amber-400">
                      {run.webhookOnlyAccuracyPct}%
                    </td>
                    <td className="py-3 font-mono font-bold text-emerald-400">
                      {run.hybridAccuracyPct}%
                    </td>
                    <td className="py-3 font-mono text-cyan-300">
                      {run.pollingRecoveredCount} poll / {run.reconcileRecoveredCount} rec
                    </td>
                    <td className="py-3 font-mono text-purple-300">
                      {run.duplicateBlockedCount}x
                    </td>
                    <td className="py-3 font-mono text-slate-200">{run.avgHybridLatencyMs} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

