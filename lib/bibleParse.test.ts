import { describe, it, expect } from 'vitest';
import { parseBibleSections } from '@/lib/bibleParse';

describe('parseBibleSections', () => {
  it('returns empty object for empty input', () => {
    expect(parseBibleSections('')).toEqual({});
  });

  it('extracts all five known sections in order', () => {
    const text = `## Resumen de la trama
Mara busca a su hermana.

## Temas y tono
Memoria y culpa.

## Personajes (resumen)
- Mara: protagonista.

## Mundo (resumen)
Costa atlántica.

## Reglas y consistencia
POV limitado.`;
    const out = parseBibleSections(text);
    expect(out.summary).toBe('Mara busca a su hermana.');
    expect(out.themes).toBe('Memoria y culpa.');
    expect(out.characters).toBe('- Mara: protagonista.');
    expect(out.world).toBe('Costa atlántica.');
    expect(out.rules).toBe('POV limitado.');
  });

  it('is case-insensitive on the label match', () => {
    const out = parseBibleSections('## RESUMEN DE LA TRAMA\ntexto.');
    expect(out.summary).toBe('texto.');
  });

  it('ignores sections whose label is not recognized', () => {
    const text = `## Resumen de la trama
bien.

## Apéndice extra
basura.

## Temas y tono
oscuro.`;
    const out = parseBibleSections(text);
    expect(out.summary).toBe('bien.');
    expect(out.themes).toBe('oscuro.');
    expect(Object.keys(out)).toEqual(['summary', 'themes']);
  });

  it('matches by section key as a fallback when the label has been altered', () => {
    const out = parseBibleSections('## summary\nbreve.');
    expect(out.summary).toBe('breve.');
  });

  it('preserves multiline content within a section', () => {
    const text = `## Temas y tono
línea uno
línea dos
línea tres`;
    const out = parseBibleSections(text);
    expect(out.themes).toBe('línea uno\nlínea dos\nlínea tres');
  });

  it('trims surrounding whitespace from each section', () => {
    const out = parseBibleSections('## Resumen de la trama\n\n   texto con espacios   \n');
    expect(out.summary).toBe('texto con espacios');
  });

  it('handles a trailing section without a trailing newline', () => {
    const out = parseBibleSections('## Mundo (resumen)\ncosas');
    expect(out.world).toBe('cosas');
  });
});
