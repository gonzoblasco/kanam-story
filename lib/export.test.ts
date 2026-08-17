import { describe, it, expect } from 'vitest';
import { buildManuscriptMarkdown, markdownToPlainText, markdownToPdfmakeContent } from '@/lib/export';
import type { Project, Chapter, Scene, Character, WorldEntity, Beat } from '@/types';

const project: Project = {
  id: 'p1',
  name: 'Último Turno',
  description: 'Un corazón que se pasa de portador.',
  genre: 'thriller',
  tone: 'oscuro',
  pov: 'third-limited',
  style: { mode: 'custom', custom: 'escueto' },
  createdAt: 0,
  updatedAt: 0,
};

const chapter: Chapter = { id: 'ch1', projectId: 'p1', title: 'Capítulo 1', order: 0, createdAt: 0, updatedAt: 0 };
const scene: Scene = {
  id: 's1',
  projectId: 'p1',
  chapterId: 'ch1',
  title: 'El bolso',
  content: '<p>Santiago abrió el bolso.</p>',
  summary: 'Santiago encuentra el bolso',
  order: 0,
  createdAt: 0,
  updatedAt: 0,
};
const character: Character = {
  id: 'c1',
  projectId: 'p1',
  name: 'Santiago',
  type: 'protagonist',
  age: '',
  appearance: '',
  personality: 'terco',
  voice: '',
  backstory: '',
  goals: '',
  createdAt: 0,
  updatedAt: 0,
};
const world: WorldEntity = {
  id: 'w1',
  projectId: 'p1',
  name: 'Club',
  kind: 'place',
  description: 'salón con olor a naftalina',
  createdAt: 0,
  updatedAt: 0,
};
const beat: Beat = {
  id: 'b1',
  projectId: 'p1',
  chapterId: 'ch1',
  kind: 'inciting',
  title: 'La invitación',
  description: 'recibe una carta',
  notes: '',
  characters: [],
  status: 'draft',
  source: 'manual',
  position: 0,
  createdAt: 0,
  updatedAt: 0,
};

describe('buildManuscriptMarkdown', () => {
  it('emits the project title and description', () => {
    const md = buildManuscriptMarkdown({ project, chapters: [], scenes: [], characters: [], world: [], beats: [] });
    expect(md).toContain('# Último Turno');
    expect(md).toContain('Un corazón que se pasa de portador.');
  });

  it('emite solo la historia, sin personajes ni mundo', () => {
    const md = buildManuscriptMarkdown({ project, chapters: [], scenes: [], characters: [character], world: [world], beats: [] });
    expect(md).toContain('# Último Turno');
    expect(md).not.toContain('## Personajes');
    expect(md).not.toContain('Santiago');
    expect(md).not.toContain('## Mundo');
    expect(md).not.toContain('naftalina');
  });

  it('groups scenes under chapters in order and strips HTML', () => {
    const md = buildManuscriptMarkdown({ project, chapters: [chapter], scenes: [scene], characters: [], world: [], beats: [] });
    expect(md).toContain('## Capítulo 1');
    expect(md).toContain('### El bolso');
    expect(md).toContain('*Santiago encuentra el bolso*');
    expect(md).toContain('Santiago abrió el bolso.');
    expect(md).not.toContain('<p>');
  });

  it('no incluye beats de capítulo en el manuscrito (solo la historia)', () => {
    const md = buildManuscriptMarkdown({ project, chapters: [chapter], scenes: [], characters: [], world: [], beats: [beat] });
    expect(md).not.toContain('- **La invitación**');
    expect(md).not.toContain('recibe una carta');
  });

  it('preserves paragraph breaks in scene content', () => {
    const multiScene: Scene = {
      ...scene,
      content: '<p>Santiago abrió el bolso.</p><p>Adentro había una carta.</p>',
    };
    const md = buildManuscriptMarkdown({ project, chapters: [chapter], scenes: [multiScene], characters: [], world: [], beats: [] });
    expect(md).toContain('Santiago abrió el bolso.\n\nAdentro había una carta.');
  });

  it('inserta un separador entre escenas', () => {
    const scene2: Scene = { ...scene, id: 's2', title: 'La llegada' };
    const md = buildManuscriptMarkdown({ project, chapters: [chapter], scenes: [scene, scene2], characters: [], world: [], beats: [] });
    // Hay un separador '---' entre las dos escenas.
    expect(md.match(/---/g)?.length).toBeGreaterThanOrEqual(1);
  });
});

describe('markdownToPlainText', () => {
  it('quita encabezados, listas y negritas', () => {
    const plain = markdownToPlainText('# Título\n\n## Capítulo\n\n- **Item**\n- Otro');
    expect(plain).toContain('Título');
    expect(plain).toContain('Capítulo');
    expect(plain).toContain('Item');
    expect(plain).toContain('Otro');
    expect(plain).not.toContain('#');
    expect(plain).not.toContain('**');
    expect(plain).not.toContain('-');
  });
});

describe('markdownToPdfmakeContent', () => {
  it('maps headings to pdfmake heading styles', () => {
    const content = markdownToPdfmakeContent('# Título\n\n## Capítulo\n\n### Escena');
    expect(content).toContainEqual(expect.objectContaining({ text: 'Título', style: 'h1' }));
    expect(content).toContainEqual(expect.objectContaining({ text: 'Capítulo', style: 'h2' }));
    expect(content).toContainEqual(expect.objectContaining({ text: 'Escena', style: 'h3' }));
  });

  it('groups consecutive list items into a pdfmake ul block', () => {
    const content = markdownToPdfmakeContent('- **Santiago**\n- Otro');
    expect(content).toContainEqual(
      expect.objectContaining({
        ul: [
          expect.objectContaining({ text: [expect.objectContaining({ text: 'Santiago', bold: true })] }),
          expect.objectContaining({ text: 'Otro' }),
        ],
      }),
    );
  });

  it('parses inline bold and italic markers instead of leaking them', () => {
    const content = markdownToPdfmakeContent('Un **héroe** y una *nota*');
    expect(content).toContainEqual(
      expect.objectContaining({
        text: [
          expect.objectContaining({ text: 'Un ' }),
          expect.objectContaining({ text: 'héroe', bold: true }),
          expect.objectContaining({ text: ' y una ' }),
          expect.objectContaining({ text: 'nota', italics: true }),
        ],
      }),
    );
  });

  it('maps blockquotes to italic text', () => {
    const content = markdownToPdfmakeContent('> Un corazón que se pasa de portador.');
    expect(content).toContainEqual(expect.objectContaining({ text: 'Un corazón que se pasa de portador.', italics: true }));
  });

  it('parses inline bold inside a blockquote instead of leaking it', () => {
    const content = markdownToPdfmakeContent('> Un **héroe** y una *nota*');
    expect(content).toContainEqual(
      expect.objectContaining({
        text: [
          expect.objectContaining({ text: 'Un ' }),
          expect.objectContaining({ text: 'héroe', bold: true }),
          expect.objectContaining({ text: ' y una ' }),
          expect.objectContaining({ text: 'nota', italics: true }),
        ],
      }),
    );
  });

  it('maps plain paragraphs without styles', () => {
    const content = markdownToPdfmakeContent('Santiago abrió el bolso.');
    expect(content).toContainEqual(expect.objectContaining({ text: 'Santiago abrió el bolso.' }));
    expect(content).not.toContainEqual(expect.objectContaining({ style: 'h1' }));
  });

  it('preserves empty lines as spacing entries', () => {
    const content = markdownToPdfmakeContent('# Título\n\nTexto');
    // empty line → a spacing entry with empty text
    expect(content.some((c) => typeof c === 'object' && c !== null && 'text' in c && c.text === '')).toBe(true);
  });
});

