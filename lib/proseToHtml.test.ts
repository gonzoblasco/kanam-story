import { describe, it, expect } from 'vitest';
import { proseToHtml, ensureHtml } from './proseToHtml';

describe('proseToHtml', () => {
  it('returns empty string for empty input', () => {
    expect(proseToHtml('')).toBe('');
  });

  it('wraps a single paragraph in p tags', () => {
    expect(proseToHtml('Hola mundo.')).toBe('<p>Hola mundo.</p>');
  });

  it('splits double line breaks into separate paragraphs', () => {
    expect(proseToHtml('Párrafo uno.\n\nPárrafo dos.')).toBe('<p>Párrafo uno.</p><p>Párrafo dos.</p>');
  });

  it('preserves single line breaks as br tags', () => {
    expect(proseToHtml('Línea uno\nLínea dos')).toBe('<p>Línea uno<br>Línea dos</p>');
  });

  it('escapes HTML special characters', () => {
    expect(proseToHtml('a < b & b > c')).toBe('<p>a &lt; b &amp; b &gt; c</p>');
  });

  it('trims surrounding whitespace', () => {
    expect(proseToHtml('  text  ')).toBe('<p>text</p>');
  });
});

describe('ensureHtml', () => {
  it('convierte texto plano con saltos de línea en párrafos HTML', () => {
    expect(ensureHtml('Párrafo uno\n\nPárrafo dos')).toBe('<p>Párrafo uno</p><p>Párrafo dos</p>');
  });

  it('deja el HTML de TipTap intacto (no lo duplica)', () => {
    const html = '<p>Primero</p><p>Segundo</p>';
    expect(ensureHtml(html)).toBe(html);
  });

  it('convierte saltos simples dentro de un párrafo en <br>', () => {
    expect(ensureHtml('Línea 1\nLínea 2')).toBe('<p>Línea 1<br>Línea 2</p>');
  });

  it('devuelve string vacío para contenido vacío', () => {
    expect(ensureHtml('')).toBe('');
    expect(ensureHtml('   ')).toBe('');
  });
});
