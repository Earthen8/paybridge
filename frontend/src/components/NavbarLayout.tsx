import {
  Activity,
  FileText,
  LayoutDashboard,
  LogOut,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UserProfile } from '../types/paybridge.js';

interface NavbarLayoutProps {
  user: UserProfile;
  onLogout: () => void;
  children: ReactNode;
}

const NAVIGATION_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/invoices', label: 'Invoice & QRIS', icon: FileText },
  { path: '/reliability', label: 'Simulasi & Keandalan', icon: ShieldCheck },
  { path: '/audit-logs', label: 'Riwayat & Audit Log', icon: Activity },
];

export function NavbarLayout({ user, onLogout, children }: NavbarLayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight text-white">PayBridge</span>
                <span className="hidden sm:inline-block ml-2 text-xs px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  QRIS + Crypto
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {NAVIGATION_ITEMS.map((item) => {
                const IconComponent = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-200">{user.businessName}</p>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

