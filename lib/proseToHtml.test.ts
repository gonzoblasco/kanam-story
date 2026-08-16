import { describe, it, expect } from 'vitest';
import { proseToHtml } from './proseToHtml';

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
