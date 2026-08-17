// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WelcomeScreen from '@/components/WelcomeScreen';

describe('WelcomeScreen (onboarding)', () => {
  it('muestra el título y los 4 conceptos clave', () => {
    render(<WelcomeScreen onCreateProject={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /bienvenido a kanam story/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /el co-writer/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /outline & beats/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /la biblia viva/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /la brújula narrativa/i })).toBeInTheDocument();
  });

  it('el botón de crear proyecto dispara onCreateProject', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<WelcomeScreen onCreateProject={onCreate} />);
    const btn = screen.getByRole('button', { name: /crear tu primer proyecto/i });
    await user.click(btn);
    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});
