import { CheckCircle2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { EmptyState, ErrorState, LoadingSkeleton } from '../components/DataStates.js';
import { MechanismBadge } from '../components/StatusBadge.js';
import { apiRequest } from '../services/apiClient.js';
import { AuditLogItem, WebhookEventItem } from '../types/paybridge.js';
import { formatDateTime } from '../utils/formatters.js';

export function AuditLogsPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<WebhookEventItem[]>([]);
  const [mechanismFilter, setMechanismFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'AUDIT' | 'WEBHOOKS'>('AUDIT');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadAuditData() {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await apiRequest<{
        auditLogs: AuditLogItem[];
        webhookEvents: WebhookEventItem[];
      }>(`/verification/audit-logs?mechanism=${mechanismFilter}`);
      setAuditLogs(response.auditLogs);
      setWebhookEvents(response.webhookEvents);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal memuat riwayat audit log.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAuditData();
  }, [mechanismFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--line)] pb-5">
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[var(--ink)]">
            Riwayat Transaksi &amp; Audit Log
          </h1>
          <p className="text-sm text-[var(--ink-muted)]">
            Jejak audit untuk setiap verifikasi Webhook, Active Polling, Rekonsiliasi, dan Idempotency Guard.
          </p>
        </div>

        <div role="tablist" aria-label="Kategori log" className="flex items-center gap-2">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'AUDIT'}
            onClick={() => setActiveTab('AUDIT')}
            className={`min-h-11 px-4 rounded-[4px] text-xs font-semibold border transition-colors ${
              activeTab === 'AUDIT'
                ? 'bg-[var(--ink)] text-[var(--surface)] border-[var(--ink)]'
                : 'bg-[var(--surface)] text-[var(--ink-muted)] border-[var(--line-strong)] hover:text-[var(--ink)]'
            }`}
          >
            Audit Trail ({auditLogs.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'WEBHOOKS'}
            onClick={() => setActiveTab('WEBHOOKS')}
            className={`min-h-11 px-4 rounded-[4px] text-xs font-semibold border transition-colors ${
              activeTab === 'WEBHOOKS'
                ? 'bg-[var(--ink)] text-[var(--surface)] border-[var(--ink)]'
                : 'bg-[var(--surface)] text-[var(--ink-muted)] border-[var(--line-strong)] hover:text-[var(--ink)]'
            }`}
          >
            Event Webhook ({webhookEvents.length})
          </button>
        </div>
      </div>

      {activeTab === 'AUDIT' && (
        <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Filter mekanisme audit">
          {(['ALL', 'WEBHOOK', 'POLLING', 'RECONCILIATION', 'SIMULATION', 'SYSTEM'] as const).map(
            (mech) => {
              const isSelected = mechanismFilter === mech;
              return (
                <button
                  key={mech}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setMechanismFilter(mech)}
                  className={`min-h-11 px-3.5 rounded-[4px] text-xs font-semibold border transition-colors ${
                    isSelected
                      ? 'bg-[var(--ink)] text-[var(--surface)] border-[var(--ink)]'
                      : 'bg-[var(--surface)] text-[var(--ink-muted)] border-[var(--line)] hover:border-[var(--line-strong)] hover:text-[var(--ink)]'
                  }`}
                >
                  {mech === 'ALL' ? 'Semua Mekanisme' : mech}
                </button>
              );
            },
          )}
        </div>
      )}

      {isLoading ? (
        <LoadingSkeleton label="Memuat riwayat verifikasi dan event webhook..." rows={5} />
      ) : errorMessage ? (
        <ErrorState
          title="Gagal memuat riwayat audit"
          message={errorMessage}
          onRetry={loadAuditData}
        />
      ) : activeTab === 'AUDIT' ? (
        auditLogs.length === 0 ? (
          <EmptyState
            title="Belum ada audit log"
            description={
              mechanismFilter === 'ALL'
                ? 'Aktivitas pembuatan invoice dan verifikasi transaksi akan muncul di sini.'
                : `Tidak ada log untuk mekanisme ${mechanismFilter}.`
            }
            action={
              mechanismFilter !== 'ALL' ? (
                <button
                  type="button"
                  onClick={() => setMechanismFilter('ALL')}
                  className="min-h-11 px-4 rounded-[4px] border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink)] text-sm font-semibold"
                >
                  Tampilkan Semua Mekanisme
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="paper-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs font-semibold text-[var(--ink-muted)] bg-[var(--surface-alt)] border-b border-[var(--line)]">
                  <tr>
                    <th className="py-3.5 px-4">Waktu</th>
                    <th className="py-3.5 px-4">Mekanisme</th>
                    <th className="py-3.5 px-4">Aksi</th>
                    <th className="py-3.5 px-4">Transisi Status</th>
                    <th className="py-3.5 px-4">Latensi</th>
                    <th className="py-3.5 px-4">Keterangan Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[var(--surface-alt)]/50">
                      <td className="py-3 px-4 text-xs text-[var(--ink-muted)] whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <MechanismBadge mechanism={log.mechanism} />
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-[var(--ink)] whitespace-nowrap">
                        {log.action}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-[var(--ink)] whitespace-nowrap">
                        {log.previousStatus ? `${log.previousStatus} ke ` : ''}
                        <span className="font-semibold text-[var(--paid)]">
                          {log.newStatus ?? '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-[var(--ink)] whitespace-nowrap">
                        {log.latencyMs ? `${log.latencyMs} ms` : '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-[var(--ink)]">{log.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : webhookEvents.length === 0 ? (
        <EmptyState
          title="Belum ada event webhook tercatat"
          description="Jalankan simulasi pembayaran atau terima notifikasi dari Midtrans untuk melihat payload yang tercatat."
        />
      ) : (
        <div className="paper-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs font-semibold text-[var(--ink-muted)] bg-[var(--surface-alt)] border-b border-[var(--line)]">
                <tr>
                  <th className="py-3.5 px-4">Waktu Diterima</th>
                  <th className="py-3.5 px-4">Order ID</th>
                  <th className="py-3.5 px-4">Status Gateway</th>
                  <th className="py-3.5 px-4">Validasi SHA-512</th>
                  <th className="py-3.5 px-4">Idempotency</th>
                  <th className="py-3.5 px-4">Skenario</th>
                  <th className="py-3.5 px-4">Waktu Proses</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {webhookEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-[var(--surface-alt)]/50">
                    <td className="py-3 px-4 text-xs text-[var(--ink-muted)] whitespace-nowrap">
                      {formatDateTime(event.createdAt)}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-[var(--ink)] whitespace-nowrap">
                      {event.orderId}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-[var(--paid)]">
                      {event.transactionStatus}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-xs font-semibold border ${
                          event.isSignatureValid
                            ? 'bg-[var(--paid-bg)] text-[var(--paid)] border-[var(--paid)]'
                            : 'bg-[var(--danger-bg)] text-[var(--danger)] border-[var(--danger)]'
                        }`}
                      >
                        {event.isSignatureValid ? (
                          <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
                        )}
                        <span>{event.isSignatureValid ? 'Valid' : 'Signature Ditolak'}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-[4px] text-xs font-semibold border ${
                          event.isDuplicate
                            ? 'bg-[var(--pending-bg)] text-[var(--pending)] border-[var(--pending)]'
                            : 'bg-[var(--surface-alt)] text-[var(--ink)] border-[var(--line-strong)]'
                        }`}
                      >
                        {event.isDuplicate ? 'Duplikat Diblokir' : 'Diproses Pertama'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-[var(--ink)]">
                      {event.scenario}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-[var(--ink)] whitespace-nowrap">
                      {event.processingTimeMs} ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
