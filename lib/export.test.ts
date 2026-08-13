import { describe, it, expect } from 'vitest';
import { buildManuscriptMarkdown, markdownToPlainText } from '@/lib/export';
import type { Project, Chapter, Scene, Character, WorldEntity, Beat } from '@/types';

const project: Project = {
  id: 'p1',
  name: 'Último Turno',
  description: 'Un corazón que se pasa de portador.',
  genre: 'thriller',
  tone: 'oscuro',
  pov: 'third-limited',
  style: 'escueto',
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
  category: 'location',
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

  it('lists characters and world', () => {
    const md = buildManuscriptMarkdown({ project, chapters: [], scenes: [], characters: [character], world: [world], beats: [] });
    expect(md).toContain('## Personajes');
    expect(md).toContain('**Santiago** (Protagonista) — terco');
    expect(md).toContain('## Mundo');
    expect(md).toContain('**Club**: salón con olor a naftalina');
  });

  it('groups scenes under chapters in order and strips HTML', () => {
    const md = buildManuscriptMarkdown({ project, chapters: [chapter], scenes: [scene], characters: [], world: [], beats: [] });
    expect(md).toContain('## Capítulo 1');
    expect(md).toContain('### El bolso');
    expect(md).toContain('*Santiago encuentra el bolso*');
    expect(md).toContain('Santiago abrió el bolso.');
    expect(md).not.toContain('<p>');
  });

  it('includes chapter-level beats in the outline', () => {
    const md = buildManuscriptMarkdown({ project, chapters: [chapter], scenes: [], characters: [], world: [], beats: [beat] });
    expect(md).toContain('- **La invitación**: recibe una carta');
  });

  it('preserves paragraph breaks in scene content', () => {
    const multiScene: Scene = {
      ...scene,
      content: '<p>Santiago abrió el bolso.</p><p>Adentro había una carta.</p>',
    };
    const md = buildManuscriptMarkdown({ project, chapters: [chapter], scenes: [multiScene], characters: [], world: [], beats: [] });
    expect(md).toContain('Santiago abrió el bolso.\n\nAdentro había una carta.');
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
