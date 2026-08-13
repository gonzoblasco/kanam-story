import { describe, it, expect } from 'vitest';
import { buildAgentContext, buildAgentPrompt, buildSuggestBeatsPrompt, buildGenerateCharacterPrompt } from '@/lib/agentPrompts';
import type { Project, Character, WorldEntity, Scene, Chapter, Beat, StoryBible } from '@/types';

const project: Project = {
  id: 'p1',
  name: 'La Última Partida',
  description: 'Un ajedrecista retirado vuelve al tablero.',
  genre: 'drama',
  tone: 'melancólico',
  pov: 'third-limited',
  style: { mode: 'custom', custom: 'sobrio' },
  createdAt: 0,
  updatedAt: 0,
};

const character: Character = {
  id: 'c1',
  projectId: 'p1',
  name: 'Renzo',
  type: 'protagonist',
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
  kind: 'place',
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

  it('incluye la brújula narrativa cuando el proyecto la tiene', () => {
    const withCompass: Project = {
      ...project,
      premise: 'Un campeón retirado vuelve por una última partida.',
      promise: 'Una historia sobre el honor y la redención.',
      theme: 'Redención',
      protagonist: 'c1',
    };
    const ctx = buildAgentContext({
      project: withCompass,
      characters: [character],
      world: [],
      chapters: [],
      scenes: [],
      beats: [],
      storyBible: null,
    });
    expect(ctx).toContain('BRÚJULA NARRATIVA');
    expect(ctx).toContain('Premisa: Un campeón retirado');
    expect(ctx).toContain('Promesa al lector: Una historia');
    expect(ctx).toContain('Tema: Redención');
    expect(ctx).toContain('Protagonista: Renzo');
  });

  it('omite la brújula si el proyecto no la tiene', () => {
    const ctx = buildAgentContext({
      project,
      characters: [],
      world: [],
      chapters: [],
      scenes: [],
      beats: [],
      storyBible: null,
    });
    expect(ctx).not.toContain('BRÚJULA NARRATIVA');
  });

  it('incluye braindump, géneros, estilo y sinopsis editable (Slice 6)', () => {
    const withBible: Project = {
      ...project,
      braindump: 'Idea suelta: un torneo clandestino en el sótano.',
      genres: ['drama', 'thriller'],
      style: { mode: 'featured', featured: 'prosa-tensa' },
      synopsis: 'Sinopsis manual override.',
    };
    const ctx = buildAgentContext({
      project: withBible,
      characters: [],
      world: [],
      chapters: [],
      scenes: [],
      beats: [],
      storyBible: null,
    });
    expect(ctx).toContain('BRAINDUMP');
    expect(ctx).toContain('Idea suelta: un torneo clandestino');
    expect(ctx).toContain('Géneros: drama, thriller');
    expect(ctx).toContain('Estilo: Prosa tensa');
    expect(ctx).toContain('Sinopsis: Sinopsis manual override.');
  });

  it('usa la descripción como sinopsis si no hay override manual', () => {
    const ctx = buildAgentContext({
      project,
      characters: [],
      world: [],
      chapters: [],
      scenes: [],
      beats: [],
      storyBible: null,
    });
    expect(ctx).toContain('Sinopsis: Un ajedrecista retirado vuelve al tablero.');
  });

  it('excluye personajes con inContext false y muestra el tipo', () => {
    const inContext: Character = { ...character, type: 'protagonist', inContext: true };
    const excluded: Character = { ...character, id: 'c2', name: 'Fantasma', type: 'minor', inContext: false };
    const ctx = buildAgentContext({
      project,
      characters: [inContext, excluded],
      world: [],
      chapters: [],
      scenes: [],
      beats: [],
      storyBible: null,
    });
    expect(ctx).toContain('Renzo');
    expect(ctx).toContain('(Protagonista)');
    expect(ctx).not.toContain('Fantasma');
  });

  it('excluye entidades de mundo con inContext false y muestra el kind', () => {
    const visible: WorldEntity = { ...world, kind: 'place', inContext: true };
    const hidden: WorldEntity = { ...world, id: 'w2', name: 'Sociedad Secreta', kind: 'organization', inContext: false };
    const ctx = buildAgentContext({
      project,
      characters: [],
      world: [visible, hidden],
      chapters: [],
      scenes: [],
      beats: [],
      storyBible: null,
    });
    expect(ctx).toContain('Club Argentino de Ajedrez');
    expect(ctx).toContain('[Lugar]');
    expect(ctx).not.toContain('Sociedad Secreta');
  });
});

describe('buildGenerateCharacterPrompt', () => {
  it('incluye el contexto y el tipo pedido', () => {
    const prompt = buildGenerateCharacterPrompt('CONTEXTO', 'antagonist', 'un rival frío');
    expect(prompt).toContain('CONTEXTO');
    expect(prompt).toContain('"antagonist"');
    expect(prompt).toContain('un rival frío');
  });

  it('pide un array JSON de personajes con los campos esperados', () => {
    const prompt = buildGenerateCharacterPrompt('ctx');
    expect(prompt).toContain('"name"');
    expect(prompt).toContain('"type"');
    expect(prompt).toContain('"traits"');
    expect(prompt).toContain('protagonist');
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

describe('buildSuggestBeatsPrompt', () => {
  it('incluye el contexto y el título del capítulo', () => {
    const prompt = buildSuggestBeatsPrompt('CONTEXTO', 'Capítulo 1');
    expect(prompt).toContain('CONTEXTO');
    expect(prompt).toContain('Capítulo 1');
  });

  it('pide un array JSON de beats con los campos esperados', () => {
    const prompt = buildSuggestBeatsPrompt('ctx', 'Capítulo 1');
    expect(prompt).toContain('"kind"');
    expect(prompt).toContain('"title"');
    expect(prompt).toContain('"description"');
    expect(prompt).toContain('"status"');
    expect(prompt).toContain('inciting');
  });
});
