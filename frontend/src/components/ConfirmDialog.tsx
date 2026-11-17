import { AlertTriangle } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'danger' | 'stamp';
  isProcessing?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Batal',
  tone = 'danger',
  isProcessing = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    cancelButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isProcessing) {
        onCancel();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing, onCancel]);

  if (!isOpen) {
    return null;
  }

  const confirmButtonClass =
    tone === 'danger'
      ? 'bg-[var(--danger)] hover:opacity-90 text-[#FFFDF8]'
      : 'bg-[var(--stamp)] hover:bg-[var(--stamp-hover)] text-[var(--stamp-fg)]';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isProcessing) {
          onCancel();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        className="max-w-md w-full paper-card p-6 space-y-5"
      >
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-[4px] border border-[var(--danger)] bg-[var(--danger-bg)] text-[var(--danger)] flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <h2
              id="confirm-dialog-title"
              className="font-display text-lg font-semibold text-[var(--ink)]"
            >
              {title}
            </h2>
            <p id="confirm-dialog-desc" className="text-sm text-[var(--ink-muted)]">
              {description}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3 pt-2 border-t border-[var(--line)]">
          <button
            ref={cancelButtonRef}
            type="button"
            disabled={isProcessing}
            onClick={onCancel}
            className="min-h-11 px-4 rounded-[4px] border border-[var(--line-strong)] bg-[var(--surface)] hover:bg-[var(--surface-alt)] text-sm font-medium text-[var(--ink)]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={onConfirm}
            className={`min-h-11 px-4 rounded-[4px] text-sm font-semibold transition-colors disabled:opacity-60 ${confirmButtonClass}`}
          >
            {isProcessing ? 'Memproses...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
