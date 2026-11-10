import { Copy, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { InvoiceStatusBadge, MechanismBadge } from '../components/StatusBadge.js';
import { apiRequest } from '../services/apiClient.js';
import { CryptoMarketRates, Invoice, InvoiceStatus } from '../types/paybridge.js';
import { formatCrypto, formatDateOnly, formatIdr } from '../utils/formatters.js';

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [rates, setRates] = useState<CryptoMarketRates | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isCreating, setIsCreating] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amountIdr, setAmountIdr] = useState(500_000);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadInvoicesAndRates() {
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
    }
  }

  useEffect(() => {
    loadInvoicesAndRates();
  }, [statusFilter]);

  async function handleCreateInvoice(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
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
      setErrorMessage(error instanceof Error ? error.message : 'Gagal membuat invoice.');
    }
  }

  async function handleDeleteInvoice(invoiceId: string) {
    try {
      await apiRequest(`/invoices/${invoiceId}`, { method: 'DELETE' });
      await loadInvoicesAndRates();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal menghapus invoice.');
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Manajemen Invoice & Link QRIS Publik</h1>
          <p className="text-sm text-slate-400">
            Buat invoice jasa freelance, konversi otomatis ke BTC/ETH, dan bagikan link pembayaran QRIS dinamis.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreating(!isCreating)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {isCreating ? 'Tutup Form' : 'Buat Invoice Baru'}
        </button>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
          {errorMessage}
        </div>
      )}

      {isCreating && (
        <form
          onSubmit={handleCreateInvoice}
          className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4"
        >
          <h2 className="text-base font-semibold text-white">Buat Invoice Freelance Baru</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Nama Klien / Instansi</label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="PT Kreatif Nusantara"
                className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Email Klien</label>
              <input
                type="email"
                required
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="billing@klien.co.id"
                className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Judul Pekerjaan / Proyek</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Pembuatan Aplikasi Web E-Katalog"
                className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Jatuh Tempo</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Nominal Tagihan (IDR)</label>
              <input
                type="number"
                min={1000}
                step={5000}
                required
                value={amountIdr}
                onChange={(e) => setAmountIdr(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white font-mono"
              />
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-center">
              <span className="text-[11px] text-slate-400">
                Konversi Real-Time CoinGecko (Dikunci saat invoice dibuat):
              </span>
              <span className="text-xs font-mono text-amber-300 mt-1">
                ≈ {formatCrypto(previewBtc, 'BTC')} | {formatCrypto(previewEth, 'ETH')}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">Deskripsi Rincian Jasa</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Rincian milestone, revisi, atau deliverables..."
              className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer"
            >
              Simpan & Terbitkan Invoice
            </button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {(['ALL', 'PENDING', 'PAID', 'DRAFT', 'EXPIRED'] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              statusFilter === status
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            {status === 'ALL' ? 'Semua Status' : status}
          </button>
        ))}
      </div>

      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-400 bg-slate-950/60 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-medium">No. Invoice</th>
                <th className="py-3.5 px-4 font-medium">Klien & Proyek</th>
                <th className="py-3.5 px-4 font-medium">Nominal IDR</th>
                <th className="py-3.5 px-4 font-medium">Ekuivalen BTC / ETH</th>
                <th className="py-3.5 px-4 font-medium">Status</th>
                <th className="py-3.5 px-4 font-medium">Metode Verifikasi</th>
                <th className="py-3.5 px-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {invoices.map((invoice) => {
                const latestTx = invoice.transactions?.[0];
                return (
                  <tr key={invoice.id} className="hover:bg-slate-800/30">
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-200">
                      <div>{invoice.invoiceNumber}</div>
                      <div className="text-[11px] text-slate-500">
                        Tempo: {formatDateOnly(invoice.dueDate)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="text-xs font-medium text-white">{invoice.clientName}</p>
                      <p className="text-xs text-slate-400">{invoice.title}</p>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-xs text-white">
                      {formatIdr(invoice.amountIdr)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                      <div className="text-amber-300">{formatCrypto(invoice.btcAmount, 'BTC')}</div>
                      <div className="text-indigo-300">{formatCrypto(invoice.ethAmount, 'ETH')}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <InvoiceStatusBadge status={invoice.status as InvoiceStatus} />
                    </td>
                    <td className="py-3.5 px-4">
                      <MechanismBadge mechanism={latestTx?.verifiedBy ?? null} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => copyPublicPaymentUrl(invoice)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          {copiedId === invoice.id ? 'Tersalin!' : 'Salin Link'}
                        </button>
                        <Link
                          to={`/pay/${invoice.publicToken}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Halaman Bayar
                        </Link>
                        {invoice.status !== 'PAID' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteInvoice(invoice.id)}
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/15 cursor-pointer"
                            title="Hapus Invoice"
                          >
                            <Trash2 className="w-4 h-4" />
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
    </div>
  );
}

