import { describe, it, expect } from 'vitest';
import {
  buildContext,
  buildExpandPrompt,
  buildStoryBiblePrompt,
  buildDialoguePrompt,
  buildTensionPrompt,
  buildBibleExtractPrompt,
  buildBibleSectionPrompt,
} from '@/lib/prompts';
import type { Project, Character, WorldEntity, Scene, Chapter } from '@/types';

const baseProject: Project = {
  id: 'p1',
  name: 'El faro de la última noche',
  description: '',
  genre: '',
  tone: '',
  pov: 'third-limited',
  style: { mode: 'custom', custom: '' },
  createdAt: 0,
  updatedAt: 0,
};

const fullProject: Project = {
  ...baseProject,
  description: 'Una historia sobre el olvido.',
  genre: 'thriller',
  tone: 'oscuro',
  style: { mode: 'custom', custom: 'prosa escueta' },
};

describe('buildContext', () => {
  it('returns the title even when everything else is empty', () => {
    const ctx = buildContext(baseProject, [], []);
    expect(ctx).toContain('Título: El faro de la última noche');
    expect(ctx).not.toContain('Género:');
    expect(ctx).not.toContain('Personajes:');
    expect(ctx).not.toContain('Mundo:');
  });

  it('uses Spanish labels for every POV variant', () => {
    const variants: Project['pov'][] = ['first', 'third-limited', 'third-omniscient', 'second'];
    const labels = ['Primera persona', 'Tercera (limitado)', 'Tercera (omnisciente)', 'Segunda persona'];
    for (const pov of variants) {
      const ctx = buildContext({ ...baseProject, pov }, [], []);
      const idx = labels.indexOf(ctx.match(/Punto de vista: (.+)/)?.[1] ?? '');
      expect(idx).toBe(variants.indexOf(pov));
    }
  });

  it('includes synopsis, genre, tone, style when present', () => {
    const ctx = buildContext(fullProject, [], []);
    expect(ctx).toContain('Género: thriller');
    expect(ctx).toContain('Tono: oscuro');
    expect(ctx).toContain('Estilo: prosa escueta');
    expect(ctx).toContain('Sinopsis: Una historia sobre el olvido.');
  });

  it('includes genres, braindump, synopsis override and featured style (Slice 6)', () => {
    const ctx = buildContext(
      {
        ...baseProject,
        genres: ['thriller', 'noir'],
        braindump: 'Un faro que no alumbra.',
        synopsis: 'Sinopsis manual.',
        style: { mode: 'featured', featured: 'lirica' },
      },
      [],
      [],
    );
    expect(ctx).toContain('Géneros: thriller, noir');
    expect(ctx).toContain('BRAINDUMP');
    expect(ctx).toContain('Un faro que no alumbra.');
    expect(ctx).toContain('Sinopsis: Sinopsis manual.');
    expect(ctx).toContain('Estilo: Lírica');
  });

  it('formats characters with role and persona fields, skipping empty ones', () => {
    const characters: Character[] = [
      {
        id: 'c1',
        projectId: 'p1',
        name: 'Mara',
        type: 'protagonist',
        age: '',
        appearance: '',
        personality: 'fría, observadora',
        voice: '',
        backstory: '',
        goals: 'encontrar a su hermana',
        createdAt: 0,
        updatedAt: 0,
      },
      {
        id: 'c2',
        projectId: 'p1',
        name: 'Iván',
        type: 'supporting',
        age: '',
        appearance: '',
        personality: '',
        voice: '',
        backstory: '',
        goals: '',
        createdAt: 0,
        updatedAt: 0,
      },
    ];
    const ctx = buildContext(baseProject, characters, []);
    expect(ctx).toContain('Personajes:');
    expect(ctx).toContain('- Mara (id: c1) (Protagonista)');
    expect(ctx).toContain('Personalidad: fría, observadora');
    expect(ctx).toContain('Objetivos: encontrar a su hermana');
    expect(ctx).toContain('- Iván (id: c2)');
    expect(ctx).not.toContain('  Personalidad: \n');
  });

  it('formats world entries with their kind label', () => {
    const world: WorldEntity[] = [
      { id: 'w1', projectId: 'p1', name: 'El faro', kind: 'place', description: 'Torre abandonada', createdAt: 0, updatedAt: 0 },
      { id: 'w2', projectId: 'p1', name: 'La marea negra', kind: 'lore', description: '', createdAt: 0, updatedAt: 0 },
    ];
    const ctx = buildContext(baseProject, [], world);
    expect(ctx).toContain('Mundo:');
    expect(ctx).toContain('- El faro (id: w1) [Lugar]: Torre abandonada');
    expect(ctx).toContain('- La marea negra (id: w2) [Lore]:');
  });

  it('excluye entidades de mundo con inContext false', () => {
    const world: WorldEntity[] = [
      { id: 'w1', projectId: 'p1', name: 'Visible', kind: 'place', description: 'x', createdAt: 0, updatedAt: 0 },
      { id: 'w2', projectId: 'p1', name: 'Oculto', kind: 'lore', description: 'y', inContext: false, createdAt: 0, updatedAt: 0 },
    ];
    const ctx = buildContext(baseProject, [], world);
    expect(ctx).toContain('Visible');
    expect(ctx).not.toContain('Oculto');
  });

  it('excluye personajes con inContext false (auditoría 2026-08-17)', () => {
    const characters: Character[] = [
      { id: 'c1', projectId: 'p1', name: 'Visible', type: 'protagonist', age: '', appearance: '', personality: '', voice: '', backstory: '', goals: '', createdAt: 0, updatedAt: 0 },
      { id: 'c2', projectId: 'p1', name: 'Oculto', type: 'supporting', age: '', appearance: '', personality: '', voice: '', backstory: '', goals: '', inContext: false, createdAt: 0, updatedAt: 0 },
    ];
    const ctx = buildContext(baseProject, characters, []);
    expect(ctx).toContain('Visible');
    expect(ctx).not.toContain('Oculto');
  });

  it('incluye la brújula narrativa (auditoría 2026-08-17)', () => {
    const project = {
      ...baseProject,
      premise: 'Una vigilante del faro contra su pasado',
      promise: 'Promesa de redención',
      theme: 'El precio de la verdad',
      protagonist: 'c1',
    };
    const characters: Character[] = [
      { id: 'c1', projectId: 'p1', name: 'Mara', type: 'protagonist', age: '', appearance: '', personality: '', voice: '', backstory: '', goals: '', createdAt: 0, updatedAt: 0 },
    ];
    const ctx = buildContext(project, characters, []);
    expect(ctx).toContain('BRÚJULA NARRATIVA:');
    expect(ctx).toContain('Premisa: Una vigilante del faro contra su pasado');
    expect(ctx).toContain('Promesa al lector: Promesa de redención');
    expect(ctx).toContain('Tema: El precio de la verdad');
    expect(ctx).toContain('Protagonista: Mara');
  });

  it('incluye las notas de continuidad cuando se pasan (auditoría 2026-08-17)', () => {
    const ctx = buildContext(baseProject, [], [], {
      continuityNotes: 'El alfil blanco aparece por primera vez - objeto clave.',
    });
    expect(ctx).toContain('NOTAS DE CONTINUIDAD DE ESTA ESCENA');
    expect(ctx).toContain('El alfil blanco aparece por primera vez');
  });
});

const chapter: Chapter = {
  id: 'ch1',
  projectId: 'p1',
  title: 'Capítulo 1',
  order: 0,
  createdAt: 0,
  updatedAt: 0,
};

const emptyScene: Scene = {
  id: 's1',
  projectId: 'p1',
  chapterId: 'ch1',
  title: 'La vigilia',
  summary: 'Mara espera en el faro a que amanezca.',
  content: '',
  order: 0,
  createdAt: 0,
  updatedAt: 0,
};

const draftedScene: Scene = {
  ...emptyScene,
  content: '<p>Mara llegó al faro antes del amanecer.</p>',
};

describe('buildExpandPrompt', () => {
  it('targets ~200 / 500 / 1000 words for short / medium / long', () => {
    const short = buildExpandPrompt('ctx', emptyScene, chapter, 'short');
    const medium = buildExpandPrompt('ctx', emptyScene, chapter, 'medium');
    const long = buildExpandPrompt('ctx', emptyScene, chapter, 'long');
    expect(short).toContain('~200 palabras');
    expect(medium).toContain('~500 palabras');
    expect(long).toContain('~1000 palabras');
  });

  it('uses the beat language for an empty scene', () => {
    const p = buildExpandPrompt('ctx', emptyScene, chapter, 'medium');
    expect(p).toContain('Beat de la escena: Mara espera en el faro a que amanezca.');
    expect(p).toContain('escribir una escena de ficción en prosa');
    expect(p).not.toContain('Prosa actual');
  });

  it('uses rewrite language when the scene already has prose', () => {
    const p = buildExpandPrompt('ctx', draftedScene, chapter, 'long');
    expect(p).toContain('REEMPLAZAR el contenido existente');
    expect(p).toContain('Prosa actual (referencia');
    expect(p).toContain('Mara llegó al faro antes del amanecer.');
  });

  it('falls back to scene title when summary is empty', () => {
    const scene = { ...emptyScene, summary: '' };
    const p = buildExpandPrompt('ctx', scene, chapter, 'short');
    expect(p).toContain('Beat de la escena: La vigilia');
  });

  it('omits the chapter hint when no chapter is provided', () => {
    const p = buildExpandPrompt('ctx', emptyScene, undefined, 'short');
    expect(p).not.toContain('Capítulo:');
  });

  it('includes the chapter title when a chapter is provided', () => {
    const p = buildExpandPrompt('ctx', emptyScene, chapter, 'short');
    expect(p).toContain('Capítulo: Capítulo 1');
  });

  it('always asks for Spanish prose only', () => {
    const p = buildExpandPrompt('ctx', emptyScene, chapter, 'medium');
    expect(p).toContain('Respondé SOLO con prosa en español');
  });
});

describe('buildStoryBiblePrompt', () => {
  it('emits the five required section headers in Spanish and in order', () => {
    const p = buildStoryBiblePrompt({
      project: fullProject,
      characters: [],
      world: [],
      chapters: [],
      scenes: [],
    });
    const headers = [
      'Resumen de la trama',
      'Temas y tono',
      'Personajes (resumen)',
      'Mundo (resumen)',
      'Reglas y consistencia',
    ];
    const indices = headers.map((h) => p.indexOf(`## ${h}`));
    indices.forEach((i) => expect(i).toBeGreaterThan(-1));
    for (let i = 1; i < indices.length; i++) {
      expect(indices[i]).toBeGreaterThan(indices[i - 1]);
    }
  });

  it('groups scenes by chapter in the digest', () => {
    const scenes: Scene[] = [
      { ...emptyScene, id: 's1', chapterId: 'ch1', title: 'Escena A', summary: 'Mara espera.', order: 0 },
      { ...emptyScene, id: 's2', chapterId: 'ch2', title: 'Escena B', summary: 'Mara recuerda.', order: 0 },
      { ...emptyScene, id: 's3', chapterId: 'ch1', title: 'Escena C', summary: '', order: 1, content: '<p>Texto C.</p>' },
    ];
    const chapters: Chapter[] = [
      chapter,
      { ...chapter, id: 'ch2', title: 'Capítulo 2', order: 1 },
    ];
    const p = buildStoryBiblePrompt({
      project: fullProject,
      characters: [],
      world: [],
      chapters,
      scenes,
    });
    expect(p.indexOf('## Capítulo 1')).toBeLessThan(p.indexOf('## Capítulo 2'));
    expect(p).toContain('## Capítulo 1');
    expect(p).toContain('**Escena A**: Mara espera.');
    expect(p).toContain('**Escena C**');
    expect(p.indexOf('**Escena C**')).toBeLessThan(p.indexOf('Texto C.'));
    expect(p).toContain('Texto C.');
    expect(p).toContain('## Capítulo 2');
    expect(p).toContain('**Escena B**: Mara recuerda.');
  });

  it('uses a placeholder when there are no chapters and no scenes', () => {
    const p = buildStoryBiblePrompt({
      project: fullProject,
      characters: [],
      world: [],
      chapters: [],
      scenes: [],
    });
    expect(p).toContain('(Todavía no hay escenas escritas.)');
  });

  it('lists empty chapter headers when there are chapters but no scenes', () => {
    const p = buildStoryBiblePrompt({
      project: fullProject,
      characters: [],
      world: [],
      chapters: [chapter],
      scenes: [],
    });
    expect(p).toContain('## Capítulo 1');
    expect(p).not.toContain('(Todavía no hay escenas escritas.)');
  });

  it('strips HTML and trims whitespace before excerpting scene text', () => {
    const scenes: Scene[] = [
      {
        ...emptyScene,
        content: '<p>Hola<strong>mundo</strong></p>\n\n  espacios  ',
        summary: '',
      },
    ];
    const p = buildStoryBiblePrompt({
      project: fullProject,
      characters: [],
      world: [],
      chapters: [chapter],
      scenes,
    });
    expect(p).toContain('Texto: Hola mundo espacios');
    expect(p).not.toContain('<p>');
  });

  it('truncates long scene excerpts with an ellipsis', () => {
    const longText = 'a'.repeat(500);
    const p = buildStoryBiblePrompt({
      project: fullProject,
      characters: [],
      world: [],
      chapters: [chapter],
      scenes: [{ ...emptyScene, content: longText, summary: '' }],
    });
    expect(p).toContain('…');
    const match = p.match(/Texto: (a+)/);
    expect(match).not.toBeNull();
    expect(match?.[1].length).toBe(400);
  });

  it('orders chapters by the chapter.order field', () => {
    const chapters: Chapter[] = [
      { ...chapter, id: 'a', title: 'A', order: 1 },
      { ...chapter, id: 'b', title: 'B', order: 0 },
    ];
    const p = buildStoryBiblePrompt({
      project: fullProject,
      characters: [],
      world: [],
      chapters,
      scenes: [],
    });
    const digest = p.split('A partir del material')[0];
    const chapterHeaders = digest.split('\n').filter((l) => l.startsWith('## '));
    expect(chapterHeaders).toEqual(['## B', '## A']);
  });
});

describe('buildDialoguePrompt', () => {
  it('requests exactly the requested number of variants', () => {
    const p = buildDialoguePrompt('ctx', 'Mara', 'setup', 4);
    expect(p).toContain('exactamente 4 versiones alternativas');
  });

  it('uses the character name verbatim when provided', () => {
    const p = buildDialoguePrompt('ctx', 'Iván', 'setup', 3);
    expect(p).toContain('línea de diálogo de Iván');
  });

  it('falls back to a neutral subject when the name is empty', () => {
    const p = buildDialoguePrompt('ctx', '   ', 'setup', 3);
    expect(p).toContain('línea de diálogo de el personaje');
  });

  it('clamps lineCount to the [1, 12] range', () => {
    const tooFew = buildDialoguePrompt('ctx', 'Mara', 'setup', 0);
    const tooMany = buildDialoguePrompt('ctx', 'Mara', 'setup', 50);
    const negative = buildDialoguePrompt('ctx', 'Mara', 'setup', -3);
    const floored = buildDialoguePrompt('ctx', 'Mara', 'setup', 3.9);
    expect(tooFew).toContain('exactamente 1 versiones');
    expect(tooMany).toContain('exactamente 12 versiones');
    expect(negative).toContain('exactamente 1 versiones');
    expect(floored).toContain('exactamente 3 versiones');
  });

  it('includes the setup verbatim so the model sees the surrounding context', () => {
    const setup = 'Mara: "¿Vas a venir?" Iván miró la puerta.';
    const p = buildDialoguePrompt('ctx', 'Iván', setup, 2);
    expect(p).toContain(setup);
  });

  it('always asks for Spanish dialogue', () => {
    const p = buildDialoguePrompt('ctx', 'Mara', 'setup', 3);
    expect(p).toContain('Respondé SOLO con las líneas de diálogo en español');
  });
});

describe('buildTensionPrompt', () => {
  it('requires existing prose to rewrite', () => {
    const scene: Scene = { ...emptyScene, content: '' };
    const p = buildTensionPrompt('ctx', scene, chapter);
    expect(p).toContain('La siguiente escena ya tiene prosa.');
    expect(p).toContain('REEMPLAZAR el último tercio');
  });

  it('inlines the current scene content as the source to rewrite', () => {
    const scene: Scene = { ...emptyScene, content: '<p>Texto de prueba.</p>' };
    const p = buildTensionPrompt('ctx', scene, chapter);
    expect(p).toContain('Texto de prueba.');
    expect(p).not.toContain('<p>');
  });

  it('omits the chapter hint when no chapter is provided', () => {
    const scene: Scene = { ...emptyScene, content: 'algo' };
    const p = buildTensionPrompt('ctx', scene, undefined);
    expect(p).not.toContain('Capítulo:');
  });

  it('includes the chapter title when a chapter is provided', () => {
    const scene: Scene = { ...emptyScene, content: 'algo' };
    const p = buildTensionPrompt('ctx', scene, chapter);
    expect(p).toContain('Capítulo: Capítulo 1');
  });

  it('asks for the full rewritten scene, not just the new ending', () => {
    const scene: Scene = { ...emptyScene, content: 'algo' };
    const p = buildTensionPrompt('ctx', scene, chapter);
    expect(p).toContain('la escena completa reescrita en español');
  });
});

describe('buildBibleExtractPrompt', () => {
  it('personajes: pide JSON con schema de Character', () => {
    const p = buildBibleExtractPrompt('characters', '- **Marta**: antagonista.');
    expect(p).toContain('personajes');
    expect(p).toContain('JSON');
    expect(p).toContain('"name"');
    expect(p).toContain('"voice"');
    expect(p).not.toContain('"category"');
  });

  it('mundo: pide JSON con schema de WorldEntity e incluye kinds permitidos', () => {
    const p = buildBibleExtractPrompt('world', '- **Bosque**: lugar oscuro.');
    expect(p).toContain('entradas de mundo');
    expect(p).toContain('"kind"');
    expect(p).toContain('"place"');
    expect(p).toContain('"rule"');
    expect(p).toContain('"magic_system"');
  });

  it('incluye el markdown crudo dentro del prompt', () => {
    const md = '### Marta\nRol: antagonista';
    const p = buildBibleExtractPrompt('characters', md);
    expect(p).toContain(md);
  });
});

describe('buildBibleSectionPrompt', () => {
  it('targets a single section and includes its instructions', () => {
    const p = buildBibleSectionPrompt(
      { project: fullProject, characters: [], world: [], chapters: [], scenes: [] },
      'characters',
      'contenido actual',
    );
    expect(p).toContain('Regenerá SOLO la sección "Personajes (resumen)"');
    expect(p).toContain('Lista de personajes con rol en la historia');
    expect(p).toContain('contenido actual');
  });

  it('includes the current content as reference', () => {
    const p = buildBibleSectionPrompt(
      { project: fullProject, characters: [], world: [], chapters: [], scenes: [] },
      'themes',
      'Tema: el olvido',
    );
    expect(p).toContain('Tema: el olvido');
  });

  it('asks for the section content only, without a header', () => {
    const p = buildBibleSectionPrompt(
      { project: fullProject, characters: [], world: [], chapters: [], scenes: [] },
      'rules',
      '',
    );
    expect(p).toContain('Respondé SOLO con el contenido de la sección');
    expect(p).toContain('sin encabezado');
  });
});
