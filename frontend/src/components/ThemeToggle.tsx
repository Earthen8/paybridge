import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'paybridge_theme';

function getInitialTheme(): ThemeMode {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  return saved === 'dark' ? 'dark' : 'light';
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Aktifkan mode kertas terang' : 'Aktifkan mode gelap'}
      className="inline-flex items-center justify-center gap-2 min-h-11 min-w-11 px-3 rounded-[4px] border border-[var(--line-strong)] bg-[var(--surface)] hover:bg-[var(--surface-alt)] text-[var(--ink)] text-xs font-medium transition-colors"
    >
      {isDark ? (
        <Sun className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
      ) : (
        <Moon className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
      )}
      <span className="hidden sm:inline">{isDark ? 'Mode Terang' : 'Mode Gelap'}</span>
    </button>
  );
}
