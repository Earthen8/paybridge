import { KeyRound, LogIn, QrCode, UserPlus } from 'lucide-react';
import { FormEvent, useState } from 'react';
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
      setErrorMessage(error instanceof Error ? error.message : 'Authentication failed.');
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
        `Token reset berhasil dibuat: ${response.resetToken}. Masukkan password baru di bawah untuk menyelesaikan reset.`,
      );
      return;
    }

    await apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ resetToken, newPassword }),
    });
    setStatusNotice('Password berhasil diperbarui! Silakan login dengan password baru.');
    setResetToken('');
    setMode('LOGIN');
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">PayBridge</h1>
            <p className="text-xs text-slate-400">
              Invoice QRIS Dinamis & Verifikasi Pembayaran Multi-Layer
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 mb-6">
          {(['LOGIN', 'REGISTER', 'RESET'] as AuthMode[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setMode(tab);
                setErrorMessage(null);
              }}
              className={`py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                mode === tab
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'LOGIN' ? 'Masuk' : tab === 'REGISTER' ? 'Daftar' : 'Reset Sandi'}
            </button>
          ))}
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
            {errorMessage}
          </div>
        )}

        {statusNotice && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
            {statusNotice}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'REGISTER' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Raka Pratama"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nama Bisnis / Freelancer Studio
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Pratama Creative & Dev Studio"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="freelancer@paybridge.id"
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {mode !== 'RESET' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {mode === 'RESET' && resetToken && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Token Reset Password
                </label>
                <input
                  type="text"
                  required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Password Baru
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {mode === 'LOGIN' && <LogIn className="w-4 h-4" />}
            {mode === 'REGISTER' && <UserPlus className="w-4 h-4" />}
            {mode === 'RESET' && <KeyRound className="w-4 h-4" />}
            {isLoading
              ? 'Memproses...'
              : mode === 'LOGIN'
                ? 'Masuk ke Dashboard'
                : mode === 'REGISTER'
                  ? 'Buat Akun Merchant'
                  : resetToken
                    ? 'Simpan Password Baru'
                    : 'Minta Token Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

