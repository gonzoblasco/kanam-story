/**
 * Component tests (B5) for the ThemeToggle light/dark switch.
 * Verifies the icon reflects the current theme and that clicking flips the
 * preference through `setSettings` (which persists to IndexedDB).
 */
// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/lib/store', () => ({
  useApp: () => mockApp,
}));

import ThemeToggle from '@/components/ThemeToggle';

const mockApp = {
  settings: { theme: 'dark' as 'dark' | 'light' },
  setSettings: vi.fn(),
};

beforeEach(() => {
  vi.resetAllMocks();
  mockApp.settings = { theme: 'dark' };
  mockApp.setSettings.mockResolvedValue(undefined);
});

describe('ThemeToggle (B5)', () => {
  it('shows a sun icon in dark mode and toggles to light', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const btn = screen.getByRole('button', { name: /tema claro/i });
    expect(btn.querySelector('.bi-sun')).toBeInTheDocument();

    await user.click(btn);
    expect(mockApp.setSettings).toHaveBeenCalledTimes(1);
    expect(mockApp.setSettings).toHaveBeenCalledWith({ theme: 'light' });
  });

  it('shows a moon icon in light mode and toggles to dark', async () => {
    mockApp.settings = { theme: 'light' };
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const btn = screen.getByRole('button', { name: /tema oscuro/i });
    expect(btn.querySelector('.bi-moon-stars')).toBeInTheDocument();

    await user.click(btn);
    expect(mockApp.setSettings).toHaveBeenCalledTimes(1);
    expect(mockApp.setSettings).toHaveBeenCalledWith({ theme: 'dark' });
  });
});
