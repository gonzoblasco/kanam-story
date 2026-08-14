'use client';

import { useApp } from '@/lib/store';

/**
 * B5 — Tema claro. Toggles the app theme between light and dark. The choice is
 * persisted through `setSettings` (IndexedDB `settings.theme`) and applied to
 * `data-bs-theme` by the store; this component only flips the preference.
 */
export default function ThemeToggle() {
  const { settings, setSettings } = useApp();
  const isDark = settings.theme === 'dark';
  const label = isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';
  return (
    <button
      className="icon-btn"
      title={label}
      aria-label={label}
      onClick={() => setSettings({ theme: isDark ? 'light' : 'dark' })}
    >
      <i className={`bi bi-${isDark ? 'sun' : 'moon-stars'}`} />
    </button>
  );
}
