import { Ban, Copy, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { EmptyState, ErrorState, LoadingSkeleton } from '../components/DataStates.js';
import { InvoiceStatusBadge, MechanismBadge } from '../components/StatusBadge.js';
import { apiRequest } from '../services/apiClient.js';
import { CryptoMarketRates, Invoice, InvoiceStatus } from '../types/paybridge.js';
import { formatCrypto, formatDateOnly, formatIdr } from '../utils/formatters.js';

interface PendingConfirmAction {
  type: 'DELETE' | 'CANCEL';
  invoice: Invoice;
}

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [rates, setRates] = useState<CryptoMarketRates | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingConfirm, setIsProcessingConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingConfirmAction | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amountIdr, setAmountIdr] = useState(450_000);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function loadInvoicesAndRates() {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const query = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
      const [invoiceData, cryptoData] = await Promise.all([
        apiRequest<{ invoices: Invoice[] }>(`/invoices${query}`),
        apiRequest<CryptoMarketRates>('/crypto/rates'),
      ]);
      setInvoices(invoiceData.invoices);
      setRates(cryptoData);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal memuat daftar invoice.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadInvoicesAndRates();
  }, [statusFilter]);

  async function handleCreateInvoice(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setActionError(null);
    try {
      await apiRequest('/invoices', {
        method: 'POST',
        body: JSON.stringify({
          clientName,
          clientEmail,
          title,
          description,
          amountIdr,
          dueDate,
          publishImmediately: true,
        }),
      });
      setIsCreating(false);
      setClientName('');
      setClientEmail('');
      setTitle('');
      setDescription('');
      await loadInvoicesAndRates();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Gagal membuat invoice.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmInvoiceAction() {
    if (!pendingAction) {
      return;
    }
    setIsProcessingConfirm(true);
    setActionError(null);
    try {
      if (pendingAction.type === 'DELETE') {
        await apiRequest(`/invoices/${pendingAction.invoice.id}`, { method: 'DELETE' });
      } else {
        await apiRequest(`/invoices/${pendingAction.invoice.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'CANCELLED' }),
        });
      }
      setPendingAction(null);
      await loadInvoicesAndRates();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Gagal memperbarui status invoice.',
      );
      setPendingAction(null);
    } finally {
      setIsProcessingConfirm(false);
    }
  }

  function copyPublicPaymentUrl(invoice: Invoice) {
    const publicUrl = `${window.location.origin}/pay/${invoice.publicToken}`;
    navigator.clipboard.writeText(publicUrl);
    setCopiedId(invoice.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const previewBtc = rates ? amountIdr / rates.btcRateIdr : 0;
  const previewEth = rates ? amountIdr / rates.ethRateIdr : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--line)] pb-5">
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[var(--ink)]">
            Manajemen Invoice &amp; QRIS Publik
          </h1>
          <p className="text-sm text-[var(--ink-muted)]">
            Terbitkan tagihan jasa freelance dengan konversi otomatis BTC/ETH dan tautan pembayaran QRIS dinamis.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreating(!isCreating)}
          className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-[4px] bg-[var(--stamp)] hover:bg-[var(--stamp-hover)] text-[var(--stamp-fg)] text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
          <span>{isCreating ? 'Tutup Formulir' : 'Buat Invoice Baru'}</span>
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

      {isCreating && (
        <form onSubmit={handleCreateInvoice} className="paper-card p-6 space-y-5">
          <h2 className="font-display text-lg font-semibold text-[var(--ink)] border-b border-[var(--line)] pb-3">
            Formulir Invoice Baru
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="invoice-client-name"
                className="block text-xs font-semibold text-[var(--ink)] mb-1.5"
              >
                Nama Klien atau Instansi
              </label>
              <input
                id="invoice-client-name"
                type="text"
                required
                value={clientName}
                onChange={(event) => setClientName(event.target.value)}
                placeholder="Nama klien atau perusahaan"
                className="w-full min-h-11 px-3.5 py-2 rounded-[4px] bg-[var(--surface)] border border-[var(--line-strong)] text-base text-[var(--ink)]"
              />
            </div>

            <div>
              <label
                htmlFor="invoice-client-email"
                className="block text-xs font-semibold text-[var(--ink)] mb-1.5"
              >
                Email Klien
              </label>
              <input
                id="invoice-client-email"
                type="email"
                required
                value={clientEmail}
                onChange={(event) => setClientEmail(event.target.value)}
                placeholder="email@klien.com"
                className="w-full min-h-11 px-3.5 py-2 rounded-[4px] bg-[var(--surface)] border border-[var(--line-strong)] text-base text-[var(--ink)]"
              />
            </div>

            <div>
              <label
                htmlFor="invoice-title"
                className="block text-xs font-semibold text-[var(--ink)] mb-1.5"
              >
                Judul Pekerjaan atau Proyek
              </label>
              <input
                id="invoice-title"
                type="text"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Contoh: Pembuatan Landing Page"
                className="w-full min-h-11 px-3.5 py-2 rounded-[4px] bg-[var(--surface)] border border-[var(--line-strong)] text-base text-[var(--ink)]"
              />
            </div>

            <div>
              <label
                htmlFor="invoice-due-date"
                className="block text-xs font-semibold text-[var(--ink)] mb-1.5"
              >
                Tanggal Jatuh Tempo
              </label>
              <input
                id="invoice-due-date"
                type="date"
                required
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="w-full min-h-11 px-3.5 py-2 rounded-[4px] bg-[var(--surface)] border border-[var(--line-strong)] text-base text-[var(--ink)]"
              />
            </div>

            <div>
              <label
                htmlFor="invoice-amount-idr"
                className="block text-xs font-semibold text-[var(--ink)] mb-1.5"
              >
                Nominal Tagihan (IDR, minimal Rp 1.000)
              </label>
              <input
                id="invoice-amount-idr"
                type="number"
                min={1000}
                step={1}
                required
                value={amountIdr}
                onChange={(event) => setAmountIdr(Number(event.target.value))}
                className="w-full min-h-11 px-3.5 py-2 rounded-[4px] bg-[var(--surface)] border border-[var(--line-strong)] text-base font-mono text-[var(--ink)]"
              />
            </div>

            <div className="p-3.5 rounded-[4px] bg-[var(--surface-alt)] border border-[var(--line)] flex flex-col justify-center">
              <span className="text-xs font-medium text-[var(--ink-muted)]">
                Ekuivalen CoinGecko (dikunci saat invoice dibuat):
              </span>
              <span className="text-sm font-mono font-semibold text-[var(--ink)] mt-1">
                {formatCrypto(previewBtc, 'BTC')} | {formatCrypto(previewEth, 'ETH')}
              </span>
            </div>
          </div>

          <div>
            <label
              htmlFor="invoice-description"
              className="block text-xs font-semibold text-[var(--ink)] mb-1.5"
            >
              Deskripsi Rincian Jasa
            </label>
            <textarea
              id="invoice-description"
              rows={2}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Rincian pekerjaan, revisi, atau deliverables..."
              className="w-full px-3.5 py-2.5 rounded-[4px] bg-[var(--surface)] border border-[var(--line-strong)] text-base text-[var(--ink)]"
            />
          </div>

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="min-h-11 px-4 rounded-[4px] border border-[var(--line-strong)] bg-[var(--surface)] hover:bg-[var(--surface-alt)] text-[var(--ink)] text-sm font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-11 px-5 rounded-[4px] bg-[var(--stamp)] hover:bg-[var(--stamp-hover)] disabled:opacity-60 text-[var(--stamp-fg)] text-sm font-semibold"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan & Terbitkan Invoice'}
            </button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Filter status invoice">
        {(['ALL', 'PENDING', 'PAID', 'DRAFT', 'EXPIRED', 'CANCELLED'] as const).map((status) => {
          const isActive = statusFilter === status;
          return (
            <button
              key={status}
              type="button"
              aria-pressed={isActive}
              onClick={() => setStatusFilter(status)}
              className={`min-h-11 px-3.5 rounded-[4px] text-xs font-semibold border transition-colors ${
                isActive
                  ? 'bg-[var(--ink)] text-[var(--surface)] border-[var(--ink)]'
                  : 'bg-[var(--surface)] text-[var(--ink-muted)] border-[var(--line)] hover:border-[var(--line-strong)] hover:text-[var(--ink)]'
              }`}
            >
              {status === 'ALL' ? 'Semua Status' : status}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <LoadingSkeleton label="Memuat daftar invoice dan konversi kripto..." rows={5} />
      ) : errorMessage ? (
        <ErrorState
          title="Gagal memuat daftar invoice"
          message={errorMessage}
          onRetry={loadInvoicesAndRates}
        />
      ) : invoices.length === 0 ? (
        <EmptyState
          title={
            statusFilter === 'ALL'
              ? 'Belum ada invoice tersimpan'
              : `Tidak ada invoice dengan status ${statusFilter}`
          }
          description={
            statusFilter === 'ALL'
              ? 'Buat invoice pertama Anda untuk menerbitkan tautan pembayaran QRIS dinamis.'
              : 'Ubah filter status ke Semua Status atau buat invoice baru.'
          }
          action={
            statusFilter === 'ALL' ? (
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="min-h-11 px-4 rounded-[4px] bg-[var(--stamp)] text-[var(--stamp-fg)] text-sm font-semibold"
              >
                Buat Invoice Baru
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className="min-h-11 px-4 rounded-[4px] border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink)] text-sm font-semibold"
              >
                Tampilkan Semua Status
              </button>
            )
          }
        />
      ) : (
        <div className="paper-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs font-semibold text-[var(--ink-muted)] bg-[var(--surface-alt)] border-b border-[var(--line)]">
                <tr>
                  <th className="py-3.5 px-4">No. Invoice</th>
                  <th className="py-3.5 px-4">Klien &amp; Proyek</th>
                  <th className="py-3.5 px-4">Nominal IDR</th>
                  <th className="py-3.5 px-4">Ekuivalen Kripto</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Verifikasi</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {invoices.map((invoice) => {
                  const latestTx = invoice.transactions?.[0];
                  return (
                    <tr key={invoice.id} className="hover:bg-[var(--surface-alt)]/50">
                      <td className="py-3.5 px-4 font-mono text-xs text-[var(--ink)] whitespace-nowrap">
                        <div className="font-semibold">{invoice.invoiceNumber}</div>
                        <div className="text-xs text-[var(--ink-muted)] mt-0.5">
                          Tempo: {formatDateOnly(invoice.dueDate)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="text-sm font-medium text-[var(--ink)]">{invoice.clientName}</p>
                        <p className="text-xs text-[var(--ink-muted)]">{invoice.title}</p>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-sm font-semibold text-[var(--ink)] whitespace-nowrap">
                        {formatIdr(invoice.amountIdr)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-[var(--ink-muted)] whitespace-nowrap">
                        <div>{formatCrypto(invoice.btcAmount, 'BTC')}</div>
                        <div>{formatCrypto(invoice.ethAmount, 'ETH')}</div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <InvoiceStatusBadge status={invoice.status as InvoiceStatus} />
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <MechanismBadge mechanism={latestTx?.verifiedBy ?? null} />
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copyPublicPaymentUrl(invoice)}
                            className="inline-flex items-center justify-center gap-1.5 min-h-11 px-3 rounded-[4px] border border-[var(--line-strong)] bg-[var(--surface)] hover:bg-[var(--surface-alt)] text-xs font-medium text-[var(--ink)]"
                          >
                            <Copy className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
                            <span>{copiedId === invoice.id ? 'Tersalin' : 'Salin Link'}</span>
                          </button>
                          <Link
                            to={`/pay/${invoice.publicToken}`}
                            className="inline-flex items-center justify-center gap-1.5 min-h-11 px-3 rounded-[4px] border border-[var(--stamp)] text-[var(--stamp)] hover:bg-[var(--danger-bg)] text-xs font-semibold"
                          >
                            <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
                            <span>Halaman Bayar</span>
                          </Link>
                          {invoice.status === 'PENDING' && (
                            <button
                              type="button"
                              onClick={() => setPendingAction({ type: 'CANCEL', invoice })}
                              aria-label={`Batalkan invoice ${invoice.invoiceNumber}`}
                              className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-[4px] border border-[var(--line)] text-[var(--pending)] hover:bg-[var(--pending-bg)] hover:border-[var(--pending)]"
                            >
                              <Ban className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
                            </button>
                          )}
                          {invoice.status !== 'PAID' && (
                            <button
                              type="button"
                              onClick={() => setPendingAction({ type: 'DELETE', invoice })}
                              aria-label={`Hapus invoice ${invoice.invoiceNumber}`}
                              className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-[4px] border border-[var(--line)] text-[var(--danger)] hover:bg-[var(--danger-bg)] hover:border-[var(--danger)]"
                            >
                              <Trash2 className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={pendingAction !== null}
        title={
          pendingAction?.type === 'DELETE'
            ? `Hapus Invoice ${pendingAction.invoice.invoiceNumber}?`
            : `Batalkan Invoice ${pendingAction?.invoice.invoiceNumber ?? ''}?`
        }
        description={
          pendingAction?.type === 'DELETE'
            ? `Invoice untuk ${pendingAction.invoice.clientName} senilai ${formatIdr(pendingAction.invoice.amountIdr)} akan dihapus secara permanen dan tidak dapat dikembalikan.`
            : `Status invoice untuk ${pendingAction?.invoice.clientName ?? ''} akan diubah menjadi DIBATALKAN dan tidak dapat dibayar lagi oleh klien.`
        }
        confirmLabel={
          pendingAction?.type === 'DELETE' ? 'Ya, Hapus Permanen' : 'Ya, Batalkan Invoice'
        }
        cancelLabel="Kembali"
        tone="danger"
        isProcessing={isProcessingConfirm}
        onConfirm={handleConfirmInvoiceAction}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}
