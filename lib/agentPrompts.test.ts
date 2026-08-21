import { describe, it, expect } from 'vitest';
import { buildAgentContext, buildSceneContext, buildAgentPrompt, buildSuggestBeatsPrompt, buildGenerateCharacterPrompt, buildEnrichCharacterPrompt, buildEnrichWorldPrompt, buildStyleProfilePrompt } from '@/lib/agentPrompts';
import type { Project, Character, WorldEntity, Scene, Chapter, Beat, StoryBible } from '@/types';

const project: Project = {
  id: 'p1',
  name: 'La Última Partida',
  description: 'Un ajedrecista retirado vuelve al tablero.',
  genre: 'drama',
  tone: 'melancólico',
  pov: 'third-limited',
  tense: 'past',
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
    expect(ctx).toContain('(id: b1');
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

  it('incluye la escena activa completa bajo ESCENA ACTIVA', () => {
    const longContent = '<p>' + 'Renzo miró el tablero. '.repeat(200) + '</p>'; // > 800 chars
    const active: Scene = { ...scene, id: 's-activa', content: longContent };
    const ctx = buildAgentContext({
      project,
      characters: [character],
      world: [world],
      chapters: [chapter],
      scenes: [active],
      beats: [beat],
      storyBible: bible,
      activeSceneId: 's-activa',
    });
    expect(ctx).toContain('ESCENA ACTIVA');
    // La escena activa se incluye completa: el texto largo no se trunca con '…'.
    expect(ctx).toContain('Renzo miró el tablero. Renzo miró el tablero.');
  });

  it('incluye las notas de continuidad de la escena activa', () => {
    const active: Scene = { ...scene, id: 's-activa', continuityNotes: 'Acá aparece el diario de Renzo.' };
    const ctx = buildAgentContext({
      project,
      characters: [character],
      world: [world],
      chapters: [chapter],
      scenes: [active],
      beats: [beat],
      storyBible: bible,
      activeSceneId: 's-activa',
    });
    expect(ctx).toContain('NOTAS DE CONTINUIDAD');
    expect(ctx).toContain('el diario de Renzo');
  });

  it('incluye el capítulo activo completo bajo CAPÍTULO ACTIVO', () => {
    const longContent = '<p>' + 'Renzo meditó sobre la partida. '.repeat(200) + '</p>'; // > 800 chars
    const activeChapter: Chapter = { ...chapter, id: 'ch-activo', content: longContent };
    const ctx = buildAgentContext({
      project,
      characters: [character],
      world: [world],
      chapters: [activeChapter],
      scenes: [],
      beats: [beat],
      storyBible: bible,
      activeChapterId: 'ch-activo',
    });
    expect(ctx).toContain('CAPÍTULO ACTIVO');
    // El capítulo activo se incluye completo: el texto largo no se trunca con '…'.
    expect(ctx).toContain('Renzo meditó sobre la partida. Renzo meditó sobre la partida.');
  });

  it('incluye las notas de continuidad del capítulo activo', () => {
    const activeChapter: Chapter = { ...chapter, id: 'ch-activo', content: '<p>texto</p>', continuityNotes: 'Acá aparece el tablero mágico.' };
    const ctx = buildAgentContext({
      project,
      characters: [character],
      world: [world],
      chapters: [activeChapter],
      scenes: [],
      beats: [beat],
      storyBible: bible,
      activeChapterId: 'ch-activo',
    });
    expect(ctx).toContain('NOTAS DE CONTINUIDAD DE ESTE CAPÍTULO');
    expect(ctx).toContain('el tablero mágico');
  });

  it('no incluye CAPÍTULO ACTIVO si el id no existe', () => {
    const ctx = buildAgentContext({
      project,
      characters: [],
      world: [],
      chapters: [chapter],
      scenes: [],
      beats: [],
      storyBible: null,
      activeChapterId: 'no-existe',
    });
    expect(ctx).not.toContain('CAPÍTULO ACTIVO');
  });

  it('buildSceneContext acota al capítulo activo cuando no hay escena activa', () => {
    const otherChapter: Chapter = { id: 'ch2', projectId: 'p1', title: 'Capítulo 2', order: 1, createdAt: 0, updatedAt: 0 };
    const otherBeat: Beat = { ...beat, id: 'b-otro', chapterId: 'ch2', title: 'Otro beat' };
    const scoped = buildSceneContext({
      project,
      characters: [character],
      world: [world],
      chapters: [chapter, otherChapter],
      scenes: [scene],
      beats: [beat, otherBeat],
      storyBible: bible,
      activeChapterId: 'ch1',
    });
    expect(scoped.scenes).toEqual([]);
    expect(scoped.chapters.map((c) => c.id)).toEqual(['ch1']);
    expect(scoped.beats.map((b) => b.id)).toEqual(['b1']);
  });

  it('buildSceneContext prioriza la escena activa sobre el capítulo activo', () => {
    const scoped = buildSceneContext({
      project,
      characters: [character],
      world: [world],
      chapters: [chapter],
      scenes: [scene],
      beats: [beat],
      storyBible: bible,
      activeSceneId: 's1',
      activeChapterId: 'ch1',
    });
    expect(scoped.scenes.map((s) => s.id)).toEqual(['s1']);
  });

  it('buildSceneContext limita a la escena activa, su capítulo y sus beats', () => {
    const otherChapter: Chapter = { id: 'ch2', projectId: 'p1', title: 'Capítulo 2', order: 1, createdAt: 0, updatedAt: 0 };
    const otherScene: Scene = { ...scene, id: 's-otra', chapterId: 'ch2', title: 'Otra escena' };
    const otherBeat: Beat = { ...beat, id: 'b-otro', chapterId: 'ch2', title: 'Otro beat' };
    const scoped = buildSceneContext({
      project,
      characters: [character],
      world: [world],
      chapters: [chapter, otherChapter],
      scenes: [scene, otherScene],
      beats: [beat, otherBeat],
      storyBible: bible,
      activeSceneId: 's1',
    });
    expect(scoped.scenes.map((s) => s.id)).toEqual(['s1']);
    expect(scoped.chapters.map((c) => c.id)).toEqual(['ch1']);
    expect(scoped.beats.map((b) => b.id)).toEqual(['b1']);
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

  it('incluye el tiempo verbal cuando el proyecto lo tiene (Slice 10)', () => {
    const ctx = buildAgentContext({
      project: { ...project, tense: 'present' },
      characters: [],
      world: [],
      chapters: [],
      scenes: [],
      beats: [],
      storyBible: null,
    });
    expect(ctx).toContain('Tiempo verbal: Presente');
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

describe('buildStyleProfilePrompt', () => {
  it('incluye el extracto del autor', () => {
    const prompt = buildStyleProfilePrompt('El mar estaba quieto.');
    expect(prompt).toContain('El mar estaba quieto.');
  });

  it('pide un JSON con los campos del perfil', () => {
    const prompt = buildStyleProfilePrompt('muestra');
    expect(prompt).toContain('"tone"');
    expect(prompt).toContain('"rhythm"');
    expect(prompt).toContain('"sentenceLength"');
    expect(prompt).toContain('"subtext"');
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

  it('documenta las acciones de capítulo-directo', () => {
    const prompt = buildAgentPrompt('ctx', 'hola');
    expect(prompt).toContain('rewrite_chapter');
    expect(prompt).toContain('update_chapter_notes');
    expect(prompt).toContain('append_chapter_content');
    expect(prompt).toContain('CAPÍTULO ACTIVO');
  });

  it('por defecto usa el rol co-writer general', () => {
    const prompt = buildAgentPrompt('ctx', 'hola');
    expect(prompt).toContain('co-writer de ficción');
    expect(prompt).not.toContain('Plot Doctor');
    expect(prompt).not.toContain('Consistency Checker');
  });

  it('plot-doctor enfoca en estructura narrativa y arco', () => {
    const prompt = buildAgentPrompt('ctx', '¿el segundo acto funciona?', 'plot-doctor');
    expect(prompt).toContain('Plot Doctor');
    expect(prompt).toContain('ARCO');
    expect(prompt).toContain('tensión');
  });

  it('consistency-checker enfoca en coherencia interna', () => {
    const prompt = buildAgentPrompt('ctx', '¿hay inconsistencias?', 'consistency-checker');
    expect(prompt).toContain('Consistency Checker');
    expect(prompt).toContain('COHERENCIA');
    expect(prompt).toContain('inconsistencias');
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

describe('buildEnrichCharacterPrompt / buildEnrichWorldPrompt', () => {
  it('incluye el perfil actual del personaje y la consigna de respetar el mundo', () => {
    const ctx = buildAgentContext({
      project, characters: [character], world: [world], chapters: [chapter], scenes: [scene], beats: [beat], storyBible: bible,
    });
    const prompt = buildEnrichCharacterPrompt(ctx, character);
    expect(prompt).toContain('ENRIQUECER');
    expect(prompt).toContain(character.name);
    expect(prompt).toContain('sin contradecir lo ya establecido');
    expect(prompt).toContain('Perfil ACTUAL');
  });

  it('incluye la descripción actual del mundo y la consigna de consistencia', () => {
    const ctx = buildAgentContext({
      project, characters: [character], world: [world], chapters: [chapter], scenes: [scene], beats: [beat], storyBible: bible,
    });
    const prompt = buildEnrichWorldPrompt(ctx, world);
    expect(prompt).toContain('ENRIQUECER');
    expect(prompt).toContain(world.name);
    expect(prompt).toContain(world.description);
  });
});
