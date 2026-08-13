import { describe, it, expect } from 'vitest';
import { applyAction, applyActions, type StoryState } from '@/lib/actions';
import type { Scene, Beat, Character, WorldEntity, StoryBible } from '@/types';

function makeState(overrides: Partial<StoryState> = {}): StoryState {
  const scene: Scene = {
    id: 's1',
    projectId: 'p1',
    chapterId: 'ch1',
    title: 'La vuelta',
    content: '<p>texto original</p>',
    summary: '',
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
    description: 'recibe una carta',
    notes: '',
    characters: [],
    status: 'draft',
    source: 'manual',
    position: 0,
    createdAt: 0,
    updatedAt: 0,
  };
  const character: Character = {
    id: 'c1',
    projectId: 'p1',
    name: 'Renzo',
    role: 'protagonista',
    age: '',
    appearance: '',
    personality: 'orgulloso',
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
    description: 'salón',
    createdAt: 0,
    updatedAt: 0,
  };
  const bible: StoryBible = {
    id: 'bible1',
    projectId: 'p1',
    sections: [
      { key: 'summary', label: 'Resumen', manual: '', auto: '', updatedAt: 0 },
      { key: 'themes', label: 'Temas', manual: '', auto: '', updatedAt: 0 },
      { key: 'characters', label: 'Personajes', manual: '', auto: '', updatedAt: 0 },
      { key: 'world', label: 'Mundo', manual: '', auto: '', updatedAt: 0 },
      { key: 'rules', label: 'Reglas', manual: '', auto: '', updatedAt: 0 },
    ],
    generatedAt: 0,
    updatedAt: 0,
  };
  return {
    scenes: [scene],
    beats: [beat],
    characters: [character],
    world: [world],
    bible,
    ...overrides,
  };
}

describe('applyAction', () => {
  it('rewrite_scene reemplaza el contenido y es reversible', () => {
    const state = makeState();
    const { next, undo } = applyAction(state, {
      type: 'rewrite_scene',
      sceneId: 's1',
      before: '<p>texto original</p>',
      after: '<p>texto nuevo</p>',
      summary: 'reescribir',
    });
    expect(next.scenes[0].content).toBe('<p>texto nuevo</p>');
    const reverted = undo(next);
    expect(reverted.scenes[0].content).toBe('<p>texto original</p>');
  });

  it('rewrite_scene no muta el estado original', () => {
    const state = makeState();
    applyAction(state, {
      type: 'rewrite_scene',
      sceneId: 's1',
      before: 'a',
      after: 'b',
      summary: 'x',
    });
    expect(state.scenes[0].content).toBe('<p>texto original</p>');
  });

  it('update_beat aplica cambios y revierte al beat original', () => {
    const state = makeState();
    const { next, undo } = applyAction(state, {
      type: 'update_beat',
      beatId: 'b1',
      changes: { title: 'Nuevo título', status: 'done' },
      summary: 'cambiar beat',
    });
    expect(next.beats[0].title).toBe('Nuevo título');
    expect(next.beats[0].status).toBe('done');
    const reverted = undo(next);
    expect(reverted.beats[0].title).toBe('La invitación');
    expect(reverted.beats[0].status).toBe('draft');
  });

  it('add_beat agrega y revierte', () => {
    const state = makeState();
    const newBeat: Beat = {
      id: 'b2',
      projectId: 'p1',
      chapterId: 'ch1',
      kind: 'climax',
      title: 'El duelo',
      description: '',
      notes: '',
      characters: [],
      status: 'draft',
      source: 'ai',
      position: 1,
      createdAt: 0,
      updatedAt: 0,
    };
    const { next, undo } = applyAction(state, {
      type: 'add_beat',
      chapterId: 'ch1',
      beat: newBeat,
      summary: 'agregar beat',
    });
    expect(next.beats).toHaveLength(2);
    const reverted = undo(next);
    expect(reverted.beats).toHaveLength(1);
  });

  it('update_character aplica y revierte', () => {
    const state = makeState();
    const { next, undo } = applyAction(state, {
      type: 'update_character',
      characterId: 'c1',
      changes: { personality: 'dulce' },
      summary: 'cambiar personalidad',
    });
    expect(next.characters[0].personality).toBe('dulce');
    expect(undo(next).characters[0].personality).toBe('orgulloso');
  });

  it('add_character agrega y revierte', () => {
    const state = makeState();
    const newChar: Character = {
      id: 'c2',
      projectId: 'p1',
      name: 'Lía',
      role: 'secundaria',
      age: '',
      appearance: '',
      personality: '',
      voice: '',
      backstory: '',
      goals: '',
      createdAt: 0,
      updatedAt: 0,
    };
    const { next, undo } = applyAction(state, {
      type: 'add_character',
      character: newChar,
      summary: 'agregar personaje',
    });
    expect(next.characters).toHaveLength(2);
    expect(undo(next).characters).toHaveLength(1);
  });

  it('update_world aplica y revierte', () => {
    const state = makeState();
    const { next, undo } = applyAction(state, {
      type: 'update_world',
      entityId: 'w1',
      changes: { description: 'salón renovado' },
      summary: 'cambiar mundo',
    });
    expect(next.world[0].description).toBe('salón renovado');
    expect(undo(next).world[0].description).toBe('salón');
  });

  it('update_bible aplica y revierte', () => {
    const state = makeState();
    const { next, undo } = applyAction(state, {
      type: 'update_bible',
      section: 'themes',
      value: 'Redención',
      summary: 'cambiar biblia',
    });
    const section = next.bible!.sections.find((s) => s.key === 'themes')!;
    expect(section.manual).toBe('Redención');
    const reverted = undo(next);
    const revertedSection = reverted.bible!.sections.find((s) => s.key === 'themes')!;
    expect(revertedSection.manual).toBe('');
  });

  it('append_scene agrega una escena nueva y revierte', () => {
    const state = makeState();
    const { next, undo } = applyAction(state, {
      type: 'append_scene',
      chapterId: 'ch1',
      content: '<p>nueva escena</p>',
      summary: 'agregar escena',
    });
    expect(next.scenes).toHaveLength(2);
    expect(next.scenes[1].content).toBe('<p>nueva escena</p>');
    expect(undo(next).scenes).toHaveLength(1);
  });

  it('append_scene con escenas vacías deriva projectId de otra entidad', () => {
    const state = makeState({ scenes: [] });
    const { next } = applyAction(state, {
      type: 'append_scene',
      chapterId: 'ch1',
      content: '<p>nueva escena</p>',
      summary: 'agregar escena',
    });
    expect(next.scenes).toHaveLength(1);
    expect(next.scenes[0].projectId).toBe('p1');
  });

  it('acciones con IDs inexistentes no cambian nada', () => {
    const state = makeState();
    const { next } = applyAction(state, {
      type: 'rewrite_scene',
      sceneId: 'no-existe',
      before: 'a',
      after: 'b',
      summary: 'x',
    });
    expect(next).toBe(state);
  });
});

describe('applyActions', () => {
  it('aplica varias acciones en orden y revierte todas en orden inverso', () => {
    const state = makeState();
    const { next, undo } = applyActions(state, [
      { type: 'rewrite_scene', sceneId: 's1', before: '<p>texto original</p>', after: '<p>v2</p>', summary: '1' },
      { type: 'update_beat', beatId: 'b1', changes: { title: 'T2' }, summary: '2' },
      { type: 'update_character', characterId: 'c1', changes: { personality: 'dulce' }, summary: '3' },
    ]);
    expect(next.scenes[0].content).toBe('<p>v2</p>');
    expect(next.beats[0].title).toBe('T2');
    expect(next.characters[0].personality).toBe('dulce');

    const reverted = undo(next);
    expect(reverted.scenes[0].content).toBe('<p>texto original</p>');
    expect(reverted.beats[0].title).toBe('La invitación');
    expect(reverted.characters[0].personality).toBe('orgulloso');
  });
});
