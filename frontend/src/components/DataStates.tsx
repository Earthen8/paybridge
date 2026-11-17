import { AlertCircle, FileText, RefreshCw } from 'lucide-react';
import { ReactNode } from 'react';

interface LoadingSkeletonProps {
  label: string;
  rows?: number;
}

export function LoadingSkeleton({ label, rows = 4 }: LoadingSkeletonProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="paper-card p-6 space-y-4"
    >
      <p className="text-sm font-medium text-[var(--ink-muted)]">{label}</p>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className="h-11 rounded bg-[var(--surface-alt)] border border-[var(--line)]"
          />
        ))}
      </div>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="paper-card p-8 text-center space-y-4">
      <div className="w-11 h-11 rounded border border-[var(--line)] bg-[var(--surface-alt)] flex items-center justify-center mx-auto text-[var(--ink-muted)]">
        <FileText className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
      </div>
      <div className="space-y-1 max-w-md mx-auto">
        <h2 className="text-lg font-semibold text-[var(--ink)]">{title}</h2>
        <p className="text-sm text-[var(--ink-muted)]">{description}</p>
      </div>
      {action && <div className="pt-1 flex justify-center">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry: () => void;
}

export function ErrorState({
  title = 'Gagal memuat data',
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="rounded-[6px] border border-[var(--danger)] bg-[var(--danger-bg)] p-6 space-y-4"
    >
      <div className="flex items-start gap-3">
        <AlertCircle
          className="w-5 h-5 text-[var(--danger)] shrink-0 mt-0.5"
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-[var(--danger)]">{title}</h2>
          <p className="text-sm text-[var(--ink)]">{message}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-[4px] bg-[var(--stamp)] hover:bg-[var(--stamp-hover)] text-[var(--stamp-fg)] text-sm font-medium transition-colors"
      >
        <RefreshCw className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
        Coba lagi
      </button>
    </div>
  );
}
