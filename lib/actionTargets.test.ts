import { describe, expect, it } from 'vitest';
import { getActionTarget, getActionsTarget } from '@/lib/actionTargets';
import type { ContentAction, Character, WorldEntity, Beat } from '@/types';

function makeCharacter(): Character {
  return {
    id: 'c1',
    projectId: 'p1',
    name: 'Ana',
    type: 'protagonist',
    age: '',
    appearance: '',
    personality: '',
    voice: '',
    backstory: '',
    goals: '',
    traits: [],
    inContext: true,
    source: 'ai',
    createdAt: 0,
    updatedAt: 0,
  };
}

function makeWorld(): WorldEntity {
  return {
    id: 'w1',
    projectId: 'p1',
    name: 'El Club',
    kind: 'place',
    description: '',
    source: 'manual',
    createdAt: 0,
    updatedAt: 0,
  };
}

function makeBeat(): Beat {
  return {
    id: 'b1',
    projectId: 'p1',
    chapterId: 'ch1',
    title: 'Beat',
    description: '',
    notes: '',
    characters: [],
    position: 0,
    kind: 'rising',
    status: 'draft',
    source: 'ai',
    createdAt: 0,
    updatedAt: 0,
  };
}

describe('getActionTarget', () => {
  it('maps add_character to the Personajes story section', () => {
    const action: ContentAction = { type: 'add_character', character: makeCharacter(), summary: 'Agregar personaje Ana' };
    expect(getActionTarget(action)).toEqual({ view: 'story', section: 'characters', label: 'Personajes' });
  });

  it('maps update_character to the Personajes story section', () => {
    const action: ContentAction = { type: 'update_character', characterId: 'c1', changes: { name: 'Ana' }, summary: 'Actualizar personaje' };
    expect(getActionTarget(action)).toEqual({ view: 'story', section: 'characters', label: 'Personajes' });
  });

  it('maps update_world to the Mundo story section', () => {
    const action: ContentAction = { type: 'update_world', entityId: makeWorld().id, changes: { description: 'Nuevo' }, summary: 'Actualizar mundo' };
    expect(getActionTarget(action)).toEqual({ view: 'story', section: 'world', label: 'Mundo' });
  });

  it('maps update_bible to the Biblia story section', () => {
    const action: ContentAction = { type: 'update_bible', section: 'summary', value: 'x', summary: 's' };
    expect(getActionTarget(action)).toEqual({ view: 'story', section: 'bible', label: 'Biblia' });
  });

  it('maps add_beat and update_beat to the Outline view', () => {
    const addBeat: ContentAction = { type: 'add_beat', chapterId: 'ch1', beat: makeBeat(), summary: 'Agregar beat' };
    expect(getActionTarget(addBeat)).toEqual({ view: 'outline', label: 'Outline' });
    const updateBeat: ContentAction = { type: 'update_beat', beatId: 'b1', changes: { title: 'X' }, summary: 'Actualizar beat' };
    expect(getActionTarget(updateBeat)).toEqual({ view: 'outline', label: 'Outline' });
  });

  it('maps rewrite_scene and append_scene to the Editor view', () => {
    const rewrite: ContentAction = { type: 'rewrite_scene', sceneId: 's1', before: '', after: '', summary: 's' };
    expect(getActionTarget(rewrite)).toEqual({ view: 'editor', label: 'Editor' });
    const append: ContentAction = { type: 'append_scene', chapterId: 'ch1', content: '', summary: 's' };
    expect(getActionTarget(append)).toEqual({ view: 'editor', label: 'Editor' });
  });
});

describe('getActionsTarget', () => {
  it('returns null for an empty batch', () => {
    expect(getActionsTarget([])).toBeNull();
  });

  it('returns the single target when all actions agree', () => {
    const a1: ContentAction = { type: 'add_character', character: makeCharacter(), summary: 'a' };
    const a2: ContentAction = { type: 'add_character', character: makeCharacter(), summary: 'b' };
    expect(getActionsTarget([a1, a2])).toEqual({ view: 'story', section: 'characters', label: 'Personajes' });
  });

  it('returns null when actions target different views', () => {
    const a1: ContentAction = { type: 'add_character', character: makeCharacter(), summary: 'a' };
    const a2: ContentAction = { type: 'add_beat', chapterId: 'ch1', beat: makeBeat(), summary: 'b' };
    expect(getActionsTarget([a1, a2])).toBeNull();
  });

  it('returns null when actions target different story sections', () => {
    const a1: ContentAction = { type: 'add_character', character: makeCharacter(), summary: 'a' };
    const a2: ContentAction = { type: 'update_world', entityId: 'w1', changes: {}, summary: 'b' };
    expect(getActionsTarget([a1, a2])).toBeNull();
  });
});
