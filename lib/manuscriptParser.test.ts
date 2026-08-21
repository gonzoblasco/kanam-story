import { describe, expect, it } from 'vitest';
import { parseManuscript } from '@/lib/manuscriptParser';

describe('parseManuscript', () => {
  it('parses a full manuscript with prologue, parts and chapters', () => {
    const md = `# Último Turno

## Prólogo

Santiago Nasar ya había aceptado que iba a morir.

## Parte 1

### Capítulo 1 — El nombre

El hombre elegante encontró el nombre.

### Capítulo 2 — La mujer

El hombre elegante caminó hasta que el cielo empezó a aclarar.

## Parte 2: El origen

### Capítulo 6 — Ismael

Ismael llegó a su casa a las 19:03.
`;

    const result = parseManuscript(md);
    expect(result.title).toBe('Último Turno');
    expect('parts' in result).toBe(true);
    if (!('parts' in result)) return;

    expect(result.parts).toHaveLength(3);

    // Prólogo: parte con contenido directo y sin capítulos.
    expect(result.parts[0].title).toBe('Prólogo');
    expect(result.parts[0].content).toContain('Santiago Nasar');
    expect(result.parts[0].chapters).toHaveLength(0);

    // Parte 1: dos capítulos con título.
    expect(result.parts[1].title).toBe('Parte 1');
    expect(result.parts[1].chapters).toHaveLength(2);
    expect(result.parts[1].chapters[0]).toEqual({
      title: 'El nombre',
      content: 'El hombre elegante encontró el nombre.',
      order: 0,
      number: 1,
    });
    expect(result.parts[1].chapters[1].title).toBe('La mujer');
    expect(result.parts[1].chapters[1].number).toBe(2);

    // Parte 2: título con dos puntos.
    expect(result.parts[2].title).toBe('Parte 2: El origen');
    expect(result.parts[2].chapters[0].title).toBe('Ismael');
    expect(result.parts[2].chapters[0].number).toBe(6);
  });

  it('parses a chapter without a title (number only)', () => {
    const md = `# Obra

## Parte 1

### Capítulo 7

Contenido del capítulo siete.
`;

    const result = parseManuscript(md);
    if (!('parts' in result)) throw new Error('expected parts');
    const chapter = result.parts[0].chapters[0];
    expect(chapter.title).toBe('Capítulo 7');
    expect(chapter.number).toBe(7);
    expect(chapter.content).toBe('Contenido del capítulo siete.');
  });

  it('parses a manuscript with only chapters (no parts)', () => {
    const md = `# Obra

### Capítulo 1 — Uno

Primer contenido.

### Capítulo 2 — Dos

Segundo contenido.
`;

    const result = parseManuscript(md);
    expect(result.title).toBe('Obra');
    expect('chapters' in result).toBe(true);
    if (!('chapters' in result)) return;

    expect(result.chapters).toHaveLength(2);
    expect(result.chapters[0].title).toBe('Uno');
    expect(result.chapters[0].order).toBe(0);
    expect(result.chapters[1].title).toBe('Dos');
    expect(result.chapters[1].order).toBe(1);
  });

  it('handles an empty chapter (no content between headers)', () => {
    const md = `# Obra

### Capítulo 1 — Uno

### Capítulo 2 — Dos

Contenido del dos.
`;

    const result = parseManuscript(md);
    if (!('chapters' in result)) throw new Error('expected chapters');
    expect(result.chapters[0].content).toBe('');
    expect(result.chapters[1].content).toBe('Contenido del dos.');
  });

  it('trims surrounding whitespace from content', () => {
    const md = `# Obra

### Capítulo 1 — Uno

   Texto con espacios alrededor.   

### Capítulo 2 — Dos
`;

    const result = parseManuscript(md);
    if (!('chapters' in result)) throw new Error('expected chapters');
    expect(result.chapters[0].content).toBe('Texto con espacios alrededor.');
  });

  it('keeps markdown elements (lists, quotes) inside content', () => {
    const md = `# Obra

### Capítulo 1 — Uno

- un item
- otro item

> una cita

**negrita** y *cursiva*.
`;

    const result = parseManuscript(md);
    if (!('chapters' in result)) throw new Error('expected chapters');
    expect(result.chapters[0].content).toContain('- un item');
    expect(result.chapters[0].content).toContain('> una cita');
    expect(result.chapters[0].content).toContain('**negrita** y *cursiva*.');
  });

  it('flattens nested headers (level 4+) inside content to plain text', () => {
    const md = `# Obra

### Capítulo 1 — Uno

#### Subsección

Texto bajo la subsección.
`;

    const result = parseManuscript(md);
    if (!('chapters' in result)) throw new Error('expected chapters');
    expect(result.chapters[0].content).toContain('Subsección');
    expect(result.chapters[0].content).not.toContain('####');
  });

  it('returns empty title and chapters for empty input', () => {
    const result = parseManuscript('');
    expect(result.title).toBe('');
    expect('chapters' in result).toBe(true);
    if ('chapters' in result) expect(result.chapters).toHaveLength(0);
  });

  it('ignores text before the first header', () => {
    const md = `texto suelto antes del título

# Obra

### Capítulo 1 — Uno

Contenido.
`;

    const result = parseManuscript(md);
    expect(result.title).toBe('Obra');
    if (!('chapters' in result)) throw new Error('expected chapters');
    expect(result.chapters[0].content).toBe('Contenido.');
  });

  it('handles chapters appearing before any part', () => {
    const md = `# Obra

### Capítulo 1 — Uno

Contenido uno.

## Parte 1

### Capítulo 2 — Dos

Contenido dos.
`;

    const result = parseManuscript(md);
    if (!('parts' in result)) throw new Error('expected parts');
    // Los capítulos sueltos se agrupan en una parte sin título al inicio.
    expect(result.parts[0].title).toBe('');
    expect(result.parts[0].chapters[0].title).toBe('Uno');
    expect(result.parts[1].chapters[0].title).toBe('Dos');
  });
});
