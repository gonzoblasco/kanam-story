import { describe, it, expect } from 'vitest';
import { buildAgentContext, buildAgentPrompt } from '@/lib/agentPrompts';
import type { Project, Character, WorldEntity, Scene, Chapter, Beat, StoryBible } from '@/types';

const project: Project = {
  id: 'p1',
  name: 'La Última Partida',
  description: 'Un ajedrecista retirado vuelve al tablero.',
  genre: 'drama',
  tone: 'melancólico',
  pov: 'third-limited',
  style: 'sobrio',
  createdAt: 0,
  updatedAt: 0,
};

const character: Character = {
  id: 'c1',
  projectId: 'p1',
  name: 'Renzo',
  role: 'protagonista',
  age: '58',
  appearance: '',
  personality: 'orgulloso, terco',
  voice: 'seco, cortante',
  backstory: 'campeón nacional en los 80',
  goals: 'recuperar su honor',
  createdAt: 0,
  updatedAt: 0,
};

const world: WorldEntity = {
  id: 'w1',
  projectId: 'p1',
  name: 'Club Argentino de Ajedrez',
  category: 'location',
  description: 'un salón con olor a naftalina',
  createdAt: 0,
  updatedAt: 0,
};

const chapter: Chapter = {
  id: 'ch1',
  projectId: 'p1',
  title: 'Capítulo 1',
  order: 0,
  createdAt: 0,
  updatedAt: 0,
};

const scene: Scene = {
  id: 's1',
  projectId: 'p1',
  chapterId: 'ch1',
  title: 'La vuelta',
  content: '<p>Renzo entró al club y el silencio lo saludó.</p>',
  summary: 'Renzo vuelve al club después de 20 años',
  order: 0,
  createdAt: 0,
  updatedAt: 0,
};

const beat: Beat = {
  id: 'b1',
  projectId: 'p1',
  chapterId: 'ch1',
  kind: 'inciting',
  title: 'La invitación',
  description: 'Renzo recibe una carta',
  notes: '',
  characters: ['c1'],
  status: 'draft',
  source: 'manual',
  position: 0,
  createdAt: 0,
  updatedAt: 0,
};

const bible: StoryBible = {
  id: 'bible1',
  projectId: 'p1',
  sections: [
    { key: 'summary', label: 'Resumen de la trama', manual: '', auto: 'Un ex-campeón vuelve al ajedrez.', updatedAt: 0 },
    { key: 'themes', label: 'Temas y tono', manual: '', auto: 'Honor, vejez, redención.', updatedAt: 0 },
    { key: 'characters', label: 'Personajes (resumen)', manual: '', auto: '', updatedAt: 0 },
    { key: 'world', label: 'Mundo (resumen)', manual: '', auto: '', updatedAt: 0 },
    { key: 'rules', label: 'Reglas y consistencia', manual: '', auto: '', updatedAt: 0 },
  ],
  generatedAt: 0,
  updatedAt: 0,
};

describe('buildAgentContext', () => {
  it('incluye proyecto, personajes, mundo, outline, manuscrito y biblia', () => {
    const ctx = buildAgentContext({
      project,
      characters: [character],
      world: [world],
      chapters: [chapter],
      scenes: [scene],
      beats: [beat],
      storyBible: bible,
    });
    expect(ctx).toContain('La Última Partida');
    expect(ctx).toContain('Renzo');
    expect(ctx).toContain('Club Argentino de Ajedrez');
    expect(ctx).toContain('OUTLINE (beats)');
    expect(ctx).toContain('La invitación');
    expect(ctx).toContain('MANUSCRITO');
    expect(ctx).toContain('La vuelta');
    expect(ctx).toContain('(id: s1)');
    expect(ctx).toContain('BIBLIA');
    expect(ctx).toContain('Honor, vejez, redención.');
  });

  it('tolera biblia null', () => {
    const ctx = buildAgentContext({
      project,
      characters: [],
      world: [],
      chapters: [],
      scenes: [],
      beats: [],
      storyBible: null,
    });
    expect(ctx).toContain('La Última Partida');
    expect(ctx).not.toContain('BIBLIA');
  });

  it('limpia HTML del manuscrito', () => {
    const ctx = buildAgentContext({
      project,
      characters: [],
      world: [],
      chapters: [chapter],
      scenes: [scene],
      beats: [],
      storyBible: null,
    });
    expect(ctx).not.toContain('<p>');
    expect(ctx).toContain('Renzo entró al club');
  });
});

describe('buildAgentPrompt', () => {
  it('incluye el contexto y el mensaje del autor', () => {
    const prompt = buildAgentPrompt('CONTEXTO', '¿y si Renzo pierde la partida?');
    expect(prompt).toContain('CONTEXTO');
    expect(prompt).toContain('¿y si Renzo pierde la partida?');
  });

  it('instruye a responder con JSON estructurado', () => {
    const prompt = buildAgentPrompt('ctx', 'hola');
    expect(prompt).toContain('"reply"');
    expect(prompt).toContain('"actions"');
    expect(prompt).toContain('rewrite_scene');
  });
});
