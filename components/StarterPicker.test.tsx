/**
 * Component tests (U5) for the StarterPicker radio group.
 * Verifies ARIA roles/checked state, keyboard navigation (arrow keys),
 * and that the genre sub-picker appears only when the template option is chosen.
 */
// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StarterPicker from '@/components/StarterPicker';

describe('StarterPicker (U5)', () => {
  it('expone las 4 opciones como radiogroup accesible', () => {
    render(
      <StarterPicker value="outline" onChange={() => {}} genre="thriller" onGenreChange={() => {}} />,
    );
    const group = screen.getByRole('radiogroup', { name: /punto de partida/i });
    expect(group).toBeInTheDocument();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(4);
    expect(screen.getByRole('radio', { name: /outline en blanco/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /proyecto vacío/i })).toBeInTheDocument();
  });

  it('la opción elegida tiene aria-checked true y es el roving tabindex', () => {
    render(
      <StarterPicker value="bible" onChange={() => {}} genre="thriller" onGenreChange={() => {}} />,
    );
    const bible = screen.getByRole('radio', { name: /biblia de la historia/i });
    expect(bible).toHaveAttribute('aria-checked', 'true');
    expect(bible).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: /outline en blanco/i })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('navega por flechas (ArrowDown) y llama onChange', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [value, setValue] = React.useState('outline');
      return (
        <StarterPicker value={value} onChange={setValue} genre="thriller" onGenreChange={() => {}} />
      );
    }
    render(<Harness />);
    screen.getByRole('radio', { name: /outline en blanco/i }).focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: /biblia de la historia/i })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: /plantilla de género/i })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('muestra el sub-radiogroup de géneros solo al elegir plantilla', () => {
    const { rerender } = render(
      <StarterPicker value="outline" onChange={() => {}} genre="thriller" onGenreChange={() => {}} />,
    );
    expect(screen.queryByRole('radiogroup', { name: /género de la plantilla/i })).toBeNull();
    rerender(
      <StarterPicker value="template" onChange={() => {}} genre="scifi" onGenreChange={() => {}} />,
    );
    const genreGroup = screen.getByRole('radiogroup', { name: /género de la plantilla/i });
    expect(genreGroup).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(4 + 3); // 4 starters + 3 genres
    expect(screen.getByRole('radio', { name: /ciencia ficción/i })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });
});
