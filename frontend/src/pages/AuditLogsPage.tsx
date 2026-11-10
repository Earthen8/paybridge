import { useEffect, useState } from 'react';
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

  async function loadAuditData() {
    setIsLoading(true);
    try {
      const response = await apiRequest<{
        auditLogs: AuditLogItem[];
        webhookEvents: WebhookEventItem[];
      }>(`/verification/audit-logs?mechanism=${mechanismFilter}`);
      setAuditLogs(response.auditLogs);
      setWebhookEvents(response.webhookEvents);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAuditData();
  }, [mechanismFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Riwayat Transaksi & Audit Log</h1>
          <p className="text-sm text-slate-400">
            Jejak audit transparan untuk setiap verifikasi Webhook, Active Polling, Rekonsiliasi, dan Idempotency Guard.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('AUDIT')}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium cursor-pointer ${
              activeTab === 'AUDIT'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            Audit Trail Verifikasi ({auditLogs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('WEBHOOKS')}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium cursor-pointer ${
              activeTab === 'WEBHOOKS'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            Log Event Webhook Masuk ({webhookEvents.length})
          </button>
        </div>
      </div>

      {activeTab === 'AUDIT' && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            {(['ALL', 'WEBHOOK', 'POLLING', 'RECONCILIATION', 'SIMULATION', 'SYSTEM'] as const).map(
              (mech) => (
                <button
                  key={mech}
                  type="button"
                  onClick={() => setMechanismFilter(mech)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                    mechanismFilter === mech
                      ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  {mech === 'ALL' ? 'Semua Mekanisme' : mech}
                </button>
              ),
            )}
          </div>

          <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400 bg-slate-950/60 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 font-medium">Waktu</th>
                    <th className="py-3.5 px-4 font-medium">Mekanisme</th>
                    <th className="py-3.5 px-4 font-medium">Aksi</th>
                    <th className="py-3.5 px-4 font-medium">Transisi Status</th>
                    <th className="py-3.5 px-4 font-medium">Latensi</th>
                    <th className="py-3.5 px-4 font-medium">Keterangan Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Memuat log audit...
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                          {formatDateTime(log.createdAt)}
                        </td>
                        <td className="py-3 px-4">
                          <MechanismBadge mechanism={log.mechanism} />
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-200">{log.action}</td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {log.previousStatus ? `${log.previousStatus} → ` : ''}
                          <span className="text-emerald-300">{log.newStatus ?? '-'}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {log.latencyMs ? `${log.latencyMs} ms` : '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-200">{log.message}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'WEBHOOKS' && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 bg-slate-950/60 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-medium">Waktu Diterima</th>
                  <th className="py-3.5 px-4 font-medium">Order ID</th>
                  <th className="py-3.5 px-4 font-medium">Status Gateway</th>
                  <th className="py-3.5 px-4 font-medium">Validasi SHA-512</th>
                  <th className="py-3.5 px-4 font-medium">Status Idempotency</th>
                  <th className="py-3.5 px-4 font-medium">Skenario</th>
                  <th className="py-3.5 px-4 font-medium">Waktu Proses</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {webhookEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 text-slate-400">
                      {formatDateTime(event.createdAt)}
                    </td>
                    <td className="py-3 px-4 font-mono text-white">{event.orderId}</td>
                    <td className="py-3 px-4 font-mono text-emerald-300">
                      {event.transactionStatus}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                          event.isSignatureValid
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-rose-500/15 text-rose-300'
                        }`}
                      >
                        {event.isSignatureValid ? 'VALID' : 'INVALID SIGNATURE'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                          event.isDuplicate
                            ? 'bg-amber-500/15 text-amber-300'
                            : 'bg-indigo-500/15 text-indigo-300'
                        }`}
                      >
                        {event.isDuplicate ? 'DUPLIKAT DIBLOKIR' : 'PERTAMA (DIPROSES)'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">{event.scenario}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">
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

