import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { NavbarLayout } from './components/NavbarLayout.js';
import { AuditLogsPage } from './pages/AuditLogsPage.js';
import { AuthPage } from './pages/AuthPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { InvoicesPage } from './pages/InvoicesPage.js';
import { PublicPaymentPage } from './pages/PublicPaymentPage.js';
import { ReliabilityLabPage } from './pages/ReliabilityLabPage.js';
import { apiRequest, clearStoredToken, getStoredToken } from './services/apiClient.js';
import { UserProfile } from './types/paybridge.js';

export function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem('paybridge_theme') === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setIsCheckingSession(false);
      return;
    }

    apiRequest<{ user: UserProfile }>('/auth/me')
      .then((response) => setUser(response.user))
      .catch(() => clearStoredToken())
      .finally(() => setIsCheckingSession(false));
  }, []);

  function handleLogout() {
    clearStoredToken();
    setUser(null);
  }

  if (isCheckingSession) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="min-h-screen bg-[var(--paper)] flex items-center justify-center text-[var(--ink-muted)] text-sm p-6"
      >
        Memeriksa sesi autentikasi PayBridge...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <a href="#main-content" className="skip-link">
        Lewati ke konten
      </a>
      <Routes>
        <Route path="/pay/:publicToken" element={<PublicPaymentPage />} />

        {!user ? (
          <Route path="*" element={<AuthPage onAuthenticated={setUser} />} />
        ) : (
          <Route
            path="*"
            element={
              <NavbarLayout user={user} onLogout={handleLogout}>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/invoices" element={<InvoicesPage />} />
                  <Route path="/reliability" element={<ReliabilityLabPage />} />
                  <Route path="/audit-logs" element={<AuditLogsPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </NavbarLayout>
            }
          />
        )}
      </Routes>
    </BrowserRouter>
  );
}
