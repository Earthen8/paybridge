import { AlertCircle, CheckCircle2, KeyRound, LogIn, Receipt, UserPlus } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { ThemeToggle } from '../components/ThemeToggle.js';
import { apiRequest, setStoredToken } from '../services/apiClient.js';
import { UserProfile } from '../types/paybridge.js';

type AuthMode = 'LOGIN' | 'REGISTER' | 'RESET';

interface AuthPageProps {
  onAuthenticated: (user: UserProfile) => void;
}

export function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('freelancer@paybridge.id');
  const [password, setPassword] = useState('Password123!');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setStatusNotice(null);

    try {
      if (mode === 'LOGIN') {
        const result = await apiRequest<{ token: string; user: UserProfile }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        setStoredToken(result.token);
        onAuthenticated(result.user);
        return;
      }

      if (mode === 'REGISTER') {
        const result = await apiRequest<{ token: string; user: UserProfile }>('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, businessName, email, password }),
        });
        setStoredToken(result.token);
        onAuthenticated(result.user);
        return;
      }

      await handlePasswordResetFlow();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Autentikasi gagal.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePasswordResetFlow() {
    if (!resetToken) {
      const response = await apiRequest<{ resetToken: string; expiresAt: string }>(
        '/auth/forgot-password',
        {
          method: 'POST',
          body: JSON.stringify({ email }),
        },
      );
      setResetToken(response.resetToken);
      setStatusNotice(
        `Token reset berhasil dibuat: ${response.resetToken}. Masukkan sandi baru di bawah untuk menyelesaikan pemulihan.`,
      );
      return;
    }

    await apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ resetToken, newPassword }),
    });
    setStatusNotice('Sandi berhasil diperbarui. Silakan masuk dengan sandi baru Anda.');
    setResetToken('');
    setMode('LOGIN');
  }

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col">
      <header className="max-w-md w-full mx-auto px-4 pt-6 flex items-center justify-between">
        <div className="inline-flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-[4px] bg-[var(--ink)] text-[var(--surface)] flex items-center justify-center">
            <Receipt className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <span className="font-display font-bold text-xl text-[var(--ink)]">PayBridge</span>
        </div>
        <ThemeToggle />
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 flex items-center justify-center p-4"
      >
        <div className="max-w-md w-full paper-card p-6 sm:p-8 space-y-6">
          <div className="border-b border-[var(--line)] pb-4 space-y-1">
            <h1 className="font-display text-2xl font-semibold text-[var(--ink)]">
              {mode === 'LOGIN'
                ? 'Masuk ke Akun Merchant'
                : mode === 'REGISTER'
                  ? 'Daftar Akun Freelancer'
                  : 'Pemulihan Kata Sandi'}
            </h1>
            <p className="text-sm text-[var(--ink-muted)]">
              Kelola invoice QRIS dinamis dan verifikasi pembayaran multi-layer.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Mode autentikasi"
            className="grid grid-cols-3 border-b border-[var(--line)]"
          >
            {(['LOGIN', 'REGISTER', 'RESET'] as AuthMode[]).map((tab) => {
              const isSelected = mode === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => {
                    setMode(tab);
                    setErrorMessage(null);
                  }}
                  className={`min-h-11 px-2 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
                    isSelected
                      ? 'border-[var(--stamp)] text-[var(--ink)] font-semibold'
                      : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  {tab === 'LOGIN' ? 'Masuk' : tab === 'REGISTER' ? 'Daftar' : 'Reset Sandi'}
                </button>
              );
            })}
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="p-3.5 rounded-[4px] border border-[var(--danger)] bg-[var(--danger-bg)] text-sm text-[var(--danger)] flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.75} aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          )}

          {statusNotice && (
            <div
              role="status"
              className="p-3.5 rounded-[4px] border border-[var(--paid)] bg-[var(--paid-bg)] text-sm text-[var(--paid)] flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.75} aria-hidden="true" />
              <span>{statusNotice}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'REGISTER' && (
              <>
                <div>
                  <label
                    htmlFor="auth-name"
                    className="block text-xs font-semibold text-[var(--ink)] mb-1.5"
                  >
                    Nama Lengkap
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Nama lengkap Anda"
                    className="w-full min-h-11 px-3.5 py-2 rounded-[4px] bg-[var(--surface)] border border-[var(--line-strong)] text-base text-[var(--ink)]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="auth-business"
                    className="block text-xs font-semibold text-[var(--ink)] mb-1.5"
                  >
                    Nama Bisnis atau Studio Jasa
                  </label>
                  <input
                    id="auth-business"
                    type="text"
                    required
                    value={businessName}
                    onChange={(event) => setBusinessName(event.target.value)}
                    placeholder="Contoh: Studio Desain Nusantara"
                    className="w-full min-h-11 px-3.5 py-2 rounded-[4px] bg-[var(--surface)] border border-[var(--line-strong)] text-base text-[var(--ink)]"
                  />
                </div>
              </>
            )}

            <div>
              <label
                htmlFor="auth-email"
                className="block text-xs font-semibold text-[var(--ink)] mb-1.5"
              >
                Alamat Email
              </label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nama@domain.com"
                className="w-full min-h-11 px-3.5 py-2 rounded-[4px] bg-[var(--surface)] border border-[var(--line-strong)] text-base text-[var(--ink)]"
              />
            </div>

            {mode !== 'RESET' && (
              <div>
                <label
                  htmlFor="auth-password"
                  className="block text-xs font-semibold text-[var(--ink)] mb-1.5"
                >
                  Kata Sandi
                </label>
                <input
                  id="auth-password"
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full min-h-11 px-3.5 py-2 rounded-[4px] bg-[var(--surface)] border border-[var(--line-strong)] text-base text-[var(--ink)]"
                />
              </div>
            )}

            {mode === 'RESET' && resetToken && (
              <>
                <div>
                  <label
                    htmlFor="auth-reset-token"
                    className="block text-xs font-semibold text-[var(--ink)] mb-1.5"
                  >
                    Token Reset Sandi
                  </label>
                  <input
                    id="auth-reset-token"
                    type="text"
                    required
                    value={resetToken}
                    onChange={(event) => setResetToken(event.target.value)}
                    className="w-full min-h-11 px-3.5 py-2 rounded-[4px] bg-[var(--surface)] border border-[var(--line-strong)] text-base font-mono text-[var(--ink)]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="auth-new-password"
                    className="block text-xs font-semibold text-[var(--ink)] mb-1.5"
                  >
                    Kata Sandi Baru
                  </label>
                  <input
                    id="auth-new-password"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full min-h-11 px-3.5 py-2 rounded-[4px] bg-[var(--surface)] border border-[var(--line-strong)] text-base text-[var(--ink)]"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-11 px-4 rounded-[4px] bg-[var(--stamp)] hover:bg-[var(--stamp-hover)] disabled:opacity-60 text-[var(--stamp-fg)] font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              {mode === 'LOGIN' && <LogIn className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />}
              {mode === 'REGISTER' && <UserPlus className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />}
              {mode === 'RESET' && <KeyRound className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />}
              <span>
                {isLoading
                  ? 'Memproses...'
                  : mode === 'LOGIN'
                    ? 'Masuk ke Dashboard'
                    : mode === 'REGISTER'
                      ? 'Buat Akun Merchant'
                      : resetToken
                        ? 'Simpan Kata Sandi Baru'
                        : 'Minta Token Reset Sandi'}
              </span>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
