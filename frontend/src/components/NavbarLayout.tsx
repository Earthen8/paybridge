import {
  Activity,
  FileText,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Receipt,
} from 'lucide-react';
import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UserProfile } from '../types/paybridge.js';
import { ThemeToggle } from './ThemeToggle.js';

interface NavbarLayoutProps {
  user: UserProfile;
  onLogout: () => void;
  children: ReactNode;
}

const NAVIGATION_ITEMS = [
  { path: '/', label: 'Dashboard', mobileLabel: 'Dashboard', icon: LayoutDashboard },
  { path: '/invoices', label: 'Invoice & QRIS', mobileLabel: 'Invoice', icon: FileText },
  { path: '/audit-logs', label: 'Riwayat & Audit', mobileLabel: 'Audit', icon: Activity },
  { path: '/reliability', label: 'Simulasi & Lab', mobileLabel: 'Lab', icon: FlaskConical },
];

export function NavbarLayout({ user, onLogout, children }: NavbarLayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col">
      <header className="border-b border-[var(--line)] bg-[var(--surface)] sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Link
              to="/"
              className="inline-flex items-center gap-2.5 min-h-11 pr-2 rounded-[4px]"
            >
              <span className="w-9 h-9 rounded-[4px] bg-[var(--ink)] text-[var(--surface)] flex items-center justify-center shrink-0">
                <Receipt className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span className="font-display font-bold text-xl tracking-tight text-[var(--ink)]">
                PayBridge
              </span>
            </Link>

            <nav aria-label="Navigasi utama" className="hidden md:flex items-center gap-1">
              {NAVIGATION_ITEMS.map((item) => {
                const IconComponent = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    aria-current={isActive ? 'page' : undefined}
                    className={`inline-flex items-center gap-2 min-h-11 px-3.5 text-sm font-medium border-b-2 transition-colors ${
                      isActive
                        ? 'border-[var(--stamp)] text-[var(--ink)]'
                        : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-alt)]'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="text-right hidden lg:block pr-2">
              <p className="text-sm font-semibold text-[var(--ink)]">{user.businessName}</p>
              <p className="text-xs text-[var(--ink-muted)]">{user.email}</p>
            </div>
            <ThemeToggle />
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center justify-center gap-2 min-h-11 min-w-11 px-3.5 rounded-[4px] text-xs font-medium text-[var(--ink)] bg-[var(--surface)] hover:bg-[var(--surface-alt)] border border-[var(--line-strong)] transition-colors"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 md:pb-12"
      >
        {children}
      </main>

      <nav
        aria-label="Navigasi mobile"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[var(--surface)] border-t border-[var(--line)] pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-4">
          {NAVIGATION_ITEMS.map((item) => {
            const IconComponent = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-1 min-h-14 py-2 px-1 text-xs font-medium border-t-2 transition-colors ${
                  isActive
                    ? 'border-[var(--stamp)] text-[var(--stamp)] font-semibold'
                    : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]'
                }`}
              >
                <IconComponent className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
                <span>{item.mobileLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
