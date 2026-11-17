import {
  CheckCircle2,
  Clock,
  FileEdit,
  FlaskConical,
  Radio,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { InvoiceStatus, VerificationMechanism } from '../types/paybridge.js';

interface StatusMeta {
  label: string;
  className: string;
  Icon: typeof CheckCircle2;
}

const INVOICE_STATUS_META: Record<InvoiceStatus, StatusMeta> = {
  PAID: {
    label: 'Lunas',
    className: 'bg-[var(--paid-bg)] text-[var(--paid)] border-[var(--paid)]',
    Icon: CheckCircle2,
  },
  PENDING: {
    label: 'Menunggu',
    className: 'bg-[var(--pending-bg)] text-[var(--pending)] border-[var(--pending)]',
    Icon: Clock,
  },
  DRAFT: {
    label: 'Draf',
    className: 'bg-[var(--surface-alt)] text-[var(--ink-muted)] border-[var(--line-strong)]',
    Icon: FileEdit,
  },
  EXPIRED: {
    label: 'Kedaluwarsa',
    className: 'bg-[var(--danger-bg)] text-[var(--danger)] border-[var(--danger)]',
    Icon: XCircle,
  },
  CANCELLED: {
    label: 'Dibatalkan',
    className: 'bg-[var(--danger-bg)] text-[var(--danger)] border-[var(--danger)]',
    Icon: XCircle,
  },
};

const MECHANISM_META: Record<VerificationMechanism, StatusMeta> = {
  WEBHOOK: {
    label: 'Webhook',
    className: 'bg-[var(--paid-bg)] text-[var(--paid)] border-[var(--paid)]',
    Icon: Radio,
  },
  POLLING: {
    label: 'Active Polling',
    className: 'bg-[var(--pending-bg)] text-[var(--pending)] border-[var(--pending)]',
    Icon: RefreshCw,
  },
  RECONCILIATION: {
    label: 'Rekonsiliasi',
    className: 'bg-[var(--surface-alt)] text-[var(--ink)] border-[var(--line-strong)]',
    Icon: ShieldCheck,
  },
  SIMULATION: {
    label: 'Simulasi',
    className: 'bg-[var(--surface-alt)] text-[var(--ink-muted)] border-[var(--line-strong)]',
    Icon: FlaskConical,
  },
  MANUAL: {
    label: 'Manual',
    className: 'bg-[var(--surface-alt)] text-[var(--ink-muted)] border-[var(--line-strong)]',
    Icon: FileEdit,
  },
  SYSTEM: {
    label: 'Sistem',
    className: 'bg-[var(--surface-alt)] text-[var(--ink-muted)] border-[var(--line-strong)]',
    Icon: FileEdit,
  },
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const { label, className, Icon } = INVOICE_STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-xs font-semibold border ${className}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

export function MechanismBadge({ mechanism }: { mechanism: VerificationMechanism | null }) {
  if (!mechanism) {
    return <span className="text-xs text-[var(--ink-muted)]">Belum ada</span>;
  }
  const { label, className, Icon } = MECHANISM_META[mechanism];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-xs font-medium border ${className}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
