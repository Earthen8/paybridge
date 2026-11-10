import { InvoiceStatus, VerificationMechanism } from '../types/paybridge.js';

const INVOICE_STATUS_STYLES: Record<InvoiceStatus, string> = {
  PAID: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  PENDING: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  DRAFT: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  EXPIRED: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  CANCELLED: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

const MECHANISM_STYLES: Record<VerificationMechanism, string> = {
  WEBHOOK: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  POLLING: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  RECONCILIATION: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  SIMULATION: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  MANUAL: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  SYSTEM: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${INVOICE_STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

export function MechanismBadge({ mechanism }: { mechanism: VerificationMechanism | null }) {
  if (!mechanism) {
    return <span className="text-xs text-slate-500">-</span>;
  }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${MECHANISM_STYLES[mechanism]}`}
    >
      {mechanism}
    </span>
  );
}

