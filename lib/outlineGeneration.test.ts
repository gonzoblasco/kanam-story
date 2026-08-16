import { describe, it, expect } from 'vitest';
import { parseGlobalOutline, buildGlobalOutlinePrompt } from '@/lib/outlineGeneration';
import type { Project, Character, WorldEntity, Chapter, Beat } from '@/types';

const mockProject: Project = {
  id: 'p1',
  name: 'La carta',
  description: '',
  genre: 'thriller',
  genres: [],
  tone: 'tenso',
  pov: 'third-limited',
  tense: 'past',
  style: { mode: 'custom', custom: 'literario' },
  braindump: 'Una carta misteriosa desencadena una persecución.',
  synopsis: 'Un hombre recibe una carta anónima que lo obliga a huir.',
  createdAt: 0,
  updatedAt: 0,
};

const mockCharacters: Character[] = [];
const mockWorld: WorldEntity[] = [];

const mockChapters: Chapter[] = [
  { id: 'c1', projectId: 'p1', title: 'El encuentro', order: 0, createdAt: 0, updatedAt: 0 },
];

const mockBeats: Beat[] = [];

describe('parseGlobalOutline', () => {
  it('parses a two-chapter outline with beats', () => {
    const raw = `## Capítulo 1: La carta
- **inciting**: El sobre llega — Una carta sin remitente aparece en el buzón.
- **rising**: Ignorar no es opción — El protagonista descubre que lo vigilan.

## Capítulo 2: La huida
- **climax**: El callejón — La persecución termina en un callejón sin salida.
- **falling**: Revelación — El perseguidor revela quién envió la carta.`;

    const result = parseGlobalOutline(raw);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('La carta');
    expect(result[0].beats).toHaveLength(2);
    expect(result[0].beats[0]).toMatchObject({
      title: 'El sobre llega',
      kind: 'inciting',
      description: 'Una carta sin remitente aparece en el buzón.',
    });
    expect(result[1].beats[1]).toMatchObject({
      title: 'Revelación',
      kind: 'falling',
      description: 'El perseguidor revela quién envió la carta.',
    });
  });

  it('accepts Spanish kind aliases', () => {
    const raw = `## Capítulo 1
- **incitante**: Primer evento
- **caida**: Desenlace parcial`;

    const result = parseGlobalOutline(raw);
    expect(result[0].beats[0].kind).toBe('inciting');
    expect(result[0].beats[1].kind).toBe('falling');
  });

  it('falls back to custom for unknown kinds', () => {
    const raw = `## Capítulo 1
- **unknown**: Beat raro`;

    const result = parseGlobalOutline(raw);
    expect(result[0].beats[0].kind).toBe('custom');
  });

  it('skips chapters without beats', () => {
    const raw = `## Capítulo 1: Con beats
- **rising**: Sí

## Capítulo 2: Sin beats
`;

    const result = parseGlobalOutline(raw);
    expect(result).toHaveLength(1);
  });

  it('handles chapter headings without "Capítulo N:" prefix', () => {
    const raw = `## El inicio
- **inciting**: Comienza todo`;

    const result = parseGlobalOutline(raw);
    expect(result[0].title).toBe('El inicio');
  });

  it('ignores lines that are not chapter or beat markers', () => {
    const raw = `Introducción libre

## Capítulo 1
- **inciting**: Beat

Nota al final`;

    const result = parseGlobalOutline(raw);
    expect(result).toHaveLength(1);
    expect(result[0].beats).toHaveLength(1);
  });
});

describe('buildGlobalOutlinePrompt', () => {
  it('includes project context and existing outline', () => {
    const prompt = buildGlobalOutlinePrompt(mockProject, mockCharacters, mockWorld, mockChapters, mockBeats);
    expect(prompt).toContain('La carta');
    expect(prompt).toContain('thriller');
    expect(prompt).toContain('El encuentro');
    expect(prompt).toContain('Formato obligatorio');
  });
});
