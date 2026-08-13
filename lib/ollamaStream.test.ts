import { describe, it, expect } from 'vitest';
import { createOllamaStreamParser } from '@/lib/ollamaStream';

describe('createOllamaStreamParser', () => {
  it('devuelve el contenido de líneas NDJSON completas', () => {
    const parser = createOllamaStreamParser();
    const chunks = parser.push('{"message":{"content":"Hola"},"done":false}\n');
    expect(chunks).toEqual(['Hola']);
  });

  it('acumula varias líneas en un solo chunk', () => {
    const parser = createOllamaStreamParser();
    const chunks = parser.push(
      '{"message":{"content":"A"},"done":false}\n{"message":{"content":"B"},"done":false}\n',
    );
    expect(chunks).toEqual(['A', 'B']);
  });

  it('reparte una línea entre chunks sin perder contenido', () => {
    const parser = createOllamaStreamParser();
    const first = parser.push('{"message":{"content":"Hola mun');
    expect(first).toEqual([]);
    const second = parser.push('do"},"done":false}\n');
    expect(second).toEqual(['Hola mundo']);
  });

  it('ignora la línea de cierre done:true sin content', () => {
    const parser = createOllamaStreamParser();
    parser.push('{"message":{"content":"Fin"},"done":false}\n');
    const done = parser.push('{"message":{"content":"","role":"assistant"},"done":true}\n');
    expect(done).toEqual([]);
  });

  it('ignora líneas inválidas sin abortar el stream', () => {
    const parser = createOllamaStreamParser();
    parser.push('{not valid json\n');
    const next = parser.push('{"message":{"content":"ok"},"done":false}\n');
    expect(next).toEqual(['ok']);
  });

  it('descarta líneas en blanco', () => {
    const parser = createOllamaStreamParser();
    const chunks = parser.push('\n\n{"message":{"content":"X"},"done":false}\n\n');
    expect(chunks).toEqual(['X']);
  });
});
