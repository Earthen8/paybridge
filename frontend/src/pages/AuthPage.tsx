import { AlertCircle, CheckCircle2, KeyRound, LogIn, Mail, UserPlus } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo.js';
import { ThemeToggle } from '../components/ThemeToggle.js';
import { apiRequest, setStoredToken } from '../services/apiClient.js';
import { UserProfile } from '../types/paybridge.js';

type AuthMode = 'LOGIN' | 'REGISTER' | 'RESET';

interface AuthPageProps {
  onAuthenticated: (user: UserProfile) => void;
}

export function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [isDemoEnvironment, setIsDemoEnvironment] = useState(false);
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registerOtpCode, setRegisterOtpCode] = useState('');

  useEffect(() => {
    apiRequest<{ isSimulationEnabled?: boolean }>('/health')
      .then((res) => {
        if (res.isSimulationEnabled) {
          setIsDemoEnvironment(true);
        }
      })
      .catch(() => {
        // Keep production-safe empty inputs on network failure
      });
  }, []);
  const [hasSentRegisterOtp, setHasSentRegisterOtp] = useState(false);
  const [resetOtpCode, setResetOtpCode] = useState('');
  const [hasSentResetOtp, setHasSentResetOtp] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  async function handleSendRegisterOtp() {
    if (!email.trim()) {
      setErrorMessage('Masukkan alamat email terlebih dahulu untuk menerima kode OTP.');
      return;
    }
    setIsSendingOtp(true);
    setErrorMessage(null);
    setStatusNotice(null);
    try {
      const response = await apiRequest<{ notice: string }>('/auth/send-register-otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setHasSentRegisterOtp(true);
      setStatusNotice(response.notice);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal mengirim kode OTP.');
    } finally {
      setIsSendingOtp(false);
    }
  }

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
          body: JSON.stringify({
            name,
            businessName,
            email,
            password,
            otpCode: registerOtpCode,
          }),
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
    if (!hasSentResetOtp) {
      const response = await apiRequest<{ notice: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setHasSentResetOtp(true);
      setStatusNotice(response.notice);
      return;
    }

    await apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        email,
        otpCode: resetOtpCode,
        newPassword,
      }),
    });
    setStatusNotice('Kata sandi berhasil diperbarui. Silakan masuk dengan sandi baru Anda.');
    setResetOtpCode('');
    setHasSentResetOtp(false);
    setMode('LOGIN');
  }

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col">
      <header className="max-w-md w-full mx-auto px-4 pt-6 flex items-center justify-between">
        <div className="inline-flex items-center gap-2.5">
          <BrandLogo size={28} />
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
                  : 'Pemulihan Kata Sandi (OTP)'}
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
                    setStatusNotice(null);
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
              <div className="flex gap-2">
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nama@domain.com"
                  className="flex-1 min-h-11 px-3.5 py-2 rounded-[4px] bg-[var(--surface)] border border-[var(--line-strong)] text-base text-[var(--ink)]"
                />
                {mode === 'REGISTER' && (
                  <button
                    type="button"
                    disabled={isSendingOtp}
                    onClick={handleSendRegisterOtp}
                    className="inline-flex items-center justify-center gap-1.5 min-h-11 px-3.5 rounded-[4px] border border-[var(--line-strong)] bg-[var(--surface-alt)] hover:bg-[var(--line)] text-xs font-semibold text-[var(--ink)] whitespace-nowrap"
                  >
                    <Mail className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
                    <span>{isSendingOtp ? 'Mengirim...' : hasSentRegisterOtp ? 'Kirim Ulang OTP' : 'Kirim OTP'}</span>
                  </button>
                )}
              </div>
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

            {mode === 'REGISTER' && (
              <div>
                <label
                  htmlFor="auth-register-otp"
                  className="block text-xs font-semibold text-[var(--ink)] mb-1.5"
                >
                  Kode OTP Verifikasi Email (6 Digit)
                </label>
                <input
                  id="auth-register-otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={registerOtpCode}
                  onChange={(event) => setRegisterOtpCode(event.target.value.replace(/\D/g, ''))}
                  placeholder="Masukkan 6 digit kode OTP dari email"
                  className="w-full min-h-11 px-3.5 py-2 rounded-[4px] bg-[var(--surface)] border border-[var(--line-strong)] text-base font-mono tracking-widest text-[var(--ink)]"
                />
              </div>
            )}

            {mode === 'RESET' && hasSentResetOtp && (
              <>
                <div>
                  <label
                    htmlFor="auth-reset-otp"
                    className="block text-xs font-semibold text-[var(--ink)] mb-1.5"
                  >
                    Kode OTP Email (6 Digit)
                  </label>
                  <input
                    id="auth-reset-otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={resetOtpCode}
                    onChange={(event) => setResetOtpCode(event.target.value.replace(/\D/g, ''))}
                    placeholder="Masukkan 6 digit kode OTP"
                    className="w-full min-h-11 px-3.5 py-2 rounded-[4px] bg-[var(--surface)] border border-[var(--line-strong)] text-base font-mono tracking-widest text-[var(--ink)]"
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

          {isDemoEnvironment && mode === 'LOGIN' && (
            <div className="p-3 rounded-[4px] border border-[var(--line)] bg-[var(--surface-alt)] flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-[var(--ink-muted)]">Mode Demo Riset aktif</span>
              <button
                type="button"
                onClick={() => {
                  setEmail('freelancer@paybridge.id');
                  setPassword('Password123!');
                }}
                className="min-h-11 px-3 rounded-[4px] border border-[var(--line-strong)] bg-[var(--surface)] text-xs font-semibold text-[var(--ink)]"
              >
                Isi Akun Demo
              </button>
            </div>
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
                      ? 'Verifikasi OTP & Buat Akun'
                      : hasSentResetOtp
                        ? 'Verifikasi OTP & Simpan Sandi Baru'
                        : 'Kirim Kode OTP ke Email'}
              </span>
            </button>
          </form>

          <footer className="pt-4 border-t border-[var(--line)] flex flex-wrap items-center justify-center gap-4 text-xs text-[var(--ink-muted)]">
            <Link to="/terms" className="hover:text-[var(--ink)] underline">
              Syarat &amp; Ketentuan
            </Link>
            <Link to="/privacy" className="hover:text-[var(--ink)] underline">
              Kebijakan Privasi
            </Link>
          </footer>
        </div>
      </main>
    </div>
  );
}
