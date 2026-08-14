/**
 * Tests for the IndexedDB layer (lib/db.ts) and its pure migration transforms.
 *
 * - Migrations: tested as pure functions in lib/migrations.ts (fake-indexeddb
 *   hangs on async `idb` upgrades, so we cover the transforms lib/db.ts applies
 *   inside onupgradeneeded).
 * - CRUD: tested against fake-indexeddb. lib/db.ts caches a module-level
 *   `dbPromise` singleton, so beforeEach drops the fake DB and `vi.resetModules()`
 *   + dynamic import rebuilds the module with a fresh singleton.
 */
import 'fake-indexeddb/auto';

// lib/db.ts guards with `typeof window === 'undefined'`. fake-indexeddb provides
// `indexedDB` but not `window`; alias window → globalThis so the guard passes.
if (typeof window === 'undefined') {
  (globalThis as Record<string, unknown>).window = globalThis;
}

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { openDB } from 'idb';
import type {
  Beat,
  BrainstormNote,
  Chapter,
  Character,
  Conversation,
  Message,
  Project,
  Scene,
  Settings,
  WorldEntity,
} from '@/types';
import {
  migrateProjectStyle,
  migrateCharacterRole,
  migrateWorldCategory,
  migrateProjectTense,
} from '@/lib/migrations';

const DB_NAME = 'kanam-story';
const ALL_STORES = [
  'projects',
  'chapters',
  'scenes',
  'characters',
  'world',
  'brainstorm',
  'storyBible',
  'settings',
  'conversations',
  'messages',
  'beats',
];

type Db = typeof import('@/lib/db');
let db: Db;

beforeEach(async () => {
  // Rebuild the module so lib/db's cached dbPromise points at a fresh singleton.
  vi.resetModules();
  db = await import('@/lib/db');
  // Force lib/db to create the DB at v7 (with all stores) via its own upgrade,
  // then clear every store. We deliberately do NOT drop the DB — deleteDatabase
  // blocks on the singleton's open connection and hangs.
  await db.projectsDB.list();
  const connection = await openDB(DB_NAME, 7);
  for (const store of ALL_STORES) {
    if (connection.objectStoreNames.contains(store)) await connection.clear(store);
  }
  connection.close();
});

// --- Pure migrations (lib/migrations.ts) ---

describe('db: pure migrations', () => {
  it('migrateProjectStyle: string → { mode: custom, custom }', () => {
    const out = migrateProjectStyle({ id: 'p1', style: 'gothic' } as Project);
    expect(out.style).toEqual({ mode: 'custom', custom: 'gothic' });
  });

  it('migrateProjectStyle: keeps existing object style unchanged', () => {
    const style = { mode: 'featured', featured: 'noir' } as Project['style'];
    const out = migrateProjectStyle({ id: 'p1', style } as Project);
    expect(out.style).toBe(style);
  });

  it('migrateCharacterRole: role → type + rich-sheet defaults', () => {
    const out = migrateCharacterRole({
      id: 'c1',
      name: 'Ada',
      role: 'protagonist',
    } as Character);
    expect(out.type).toBe('protagonist');
    expect(out.pronouns).toBe('');
    expect(out.groups).toEqual([]);
    expect(out.otherNames).toEqual([]);
    expect(out.traits).toEqual([]);
    expect(out.inContext).toBe(true);
  });

  it('migrateCharacterRole: preserves existing rich-sheet values', () => {
    const out = migrateCharacterRole({
      id: 'c1',
      name: 'Ada',
      role: 'antagonist',
      pronouns: 'she/her',
      inContext: false,
    } as Character);
    expect(out.type).toBe('antagonist');
    expect(out.pronouns).toBe('she/her');
    expect(out.inContext).toBe(false);
  });

  it('migrateWorldCategory: category → kind + defaults', () => {
    const out = migrateWorldCategory({
      id: 'w1',
      name: 'New Terra',
      category: 'location',
    } as WorldEntity);
    expect(out.kind).toBe('place');
    expect(out.otherNames).toEqual([]);
    expect(out.traits).toEqual([]);
    expect(out.inContext).toBe(true);
  });

  it('migrateWorldCategory: maps category legacy values (lugar, magia)', () => {
    expect(migrateWorldCategory({ id: 'w1', name: 'W', category: 'lugar' } as WorldEntity).kind).toBe('place');
    expect(migrateWorldCategory({ id: 'w1', name: 'W', category: 'magia' } as WorldEntity).kind).toBe('magic_system');
    expect(migrateWorldCategory({ id: 'w1', name: 'W', category: 'organizacion' } as WorldEntity).kind).toBe('organization');
  });

  it('migrateWorldCategory: unknown category falls back to other', () => {
    const out = migrateWorldCategory({
      id: 'w1',
      name: 'New Terra',
      category: 'unknown-thing',
    } as WorldEntity);
    expect(out.kind).toBe('other');
    expect(out.inContext).toBe(true);
  });

  it('migrateProjectTense: defaults to past when absent', () => {
    const out = migrateProjectTense({ id: 'p1', name: 'X' } as Project);
    expect(out.tense).toBe('past');
  });

  it('migrateProjectTense: keeps existing tense', () => {
    const out = migrateProjectTense({ id: 'p1', name: 'X', tense: 'present' } as Project);
    expect(out.tense).toBe('present');
  });
});

// --- CRUD per store (fake-indexeddb) ---

describe('db: CRUD', () => {
  it('projects: create, list (desc by updatedAt), get, update, delete', async () => {
    const { projectsDB } = db;
    const a = await projectsDB.create(makeProject({ name: 'A', updatedAt: 100 }));
    await projectsDB.create(makeProject({ name: 'B', updatedAt: 200 }));

    expect((await projectsDB.list()).map((p) => p.name)).toEqual(['B', 'A']);

    const got = await projectsDB.get(a.id);
    expect(got!.name).toBe('A');

    const updated = await projectsDB.update(a.id, { name: 'A2' });
    expect(updated.name).toBe('A2');

    await projectsDB.delete(a.id);
    expect(await projectsDB.get(a.id)).toBeUndefined();
    expect((await projectsDB.list()).length).toBe(1);
  });

  it('chapters: create + listByProject ordered, update, delete', async () => {
    const { projectsDB, chaptersDB } = db;
    const p = await projectsDB.create(makeProject());
    await chaptersDB.create(makeChapter(p.id, 1));
    await chaptersDB.create(makeChapter(p.id, 0));
    const c = await chaptersDB.create(makeChapter(p.id, 2));

    expect((await chaptersDB.listByProject(p.id)).map((ch) => ch.order)).toEqual([0, 1, 2]);

    await chaptersDB.update(c.id, { title: 'Renamed' });
    expect((await chaptersDB.listByProject(p.id))[2].title).toBe('Renamed');

    await chaptersDB.delete(c.id);
    expect((await chaptersDB.listByProject(p.id)).length).toBe(2);
  });

  it('scenes: create, listByProject/Chapter, get, update, delete', async () => {
    const { projectsDB, chaptersDB, scenesDB } = db;
    const p = await projectsDB.create(makeProject());
    const ch1 = await chaptersDB.create(makeChapter(p.id, 0));
    const ch2 = await chaptersDB.create(makeChapter(p.id, 1));
    const s = await scenesDB.create(makeScene(p.id, ch1.id, 0));
    await scenesDB.create(makeScene(p.id, ch1.id, 1));
    await scenesDB.create(makeScene(p.id, ch2.id, 0));

    expect((await scenesDB.listByProject(p.id)).length).toBe(3);
    expect((await scenesDB.listByChapter(ch1.id)).length).toBe(2);
    expect((await scenesDB.listByChapter(ch2.id)).length).toBe(1);

    await scenesDB.update(s.id, { content: 'New text' });
    expect((await scenesDB.get(s.id))!.content).toBe('New text');

    await scenesDB.delete(s.id);
    expect((await scenesDB.listByChapter(ch1.id)).length).toBe(1);
  });

  it('characters: create, listByProject, get, update, delete', async () => {
    const { projectsDB, charactersDB } = db;
    const p = await projectsDB.create(makeProject());
    const c = await charactersDB.create(makeCharacter(p.id));
    await charactersDB.create({ ...makeCharacter(p.id), name: 'Bob' });

    expect((await charactersDB.listByProject(p.id)).length).toBe(2);

    await charactersDB.update(c.id, { personality: 'Brilliant' });
    expect((await charactersDB.get(c.id))!.personality).toBe('Brilliant');

    await charactersDB.delete(c.id);
    expect((await charactersDB.listByProject(p.id)).length).toBe(1);
  });

  it('world: create, listByProject, get, update, delete', async () => {
    const { projectsDB, worldDB } = db;
    const p = await projectsDB.create(makeProject());
    const w = await worldDB.create(makeWorldEntity(p.id));
    await worldDB.create({ ...makeWorldEntity(p.id), name: 'Mars' });

    expect((await worldDB.listByProject(p.id)).length).toBe(2);

    await worldDB.update(w.id, { description: 'Updated' });
    expect((await worldDB.get(w.id))!.description).toBe('Updated');

    await worldDB.delete(w.id);
    expect((await worldDB.listByProject(p.id)).length).toBe(1);
  });

  it('brainstorm: create, listByProject, update, delete', async () => {
    const { projectsDB, brainstormDB } = db;
    const p = await projectsDB.create(makeProject());
    const n = await brainstormDB.create(makeBrainstorm(p.id));

    expect((await brainstormDB.listByProject(p.id)).length).toBe(1);

    await brainstormDB.update(n.id, { content: 'Refined' });
    expect((await brainstormDB.listByProject(p.id))[0].content).toBe('Refined');

    await brainstormDB.delete(n.id);
    expect((await brainstormDB.listByProject(p.id)).length).toBe(0);
  });

  it('storyBible: create (default sections), getByProject, updateSection, update, delete', async () => {
    const { projectsDB, storyBibleDB } = db;
    const p = await projectsDB.create(makeProject());
    const bible = await storyBibleDB.create(p.id);

    expect(bible.sections.map((s) => s.key)).toEqual(['summary', 'themes', 'characters', 'world', 'rules']);
    expect((await storyBibleDB.getByProject(p.id))!.id).toBe(bible.id);

    await storyBibleDB.updateSection(bible.id, 'characters', { manual: 'Ada is the protagonist.' });
    const updated = await storyBibleDB.get(bible.id);
    expect(updated!.sections.find((s) => s.key === 'characters')!.manual).toBe('Ada is the protagonist.');

    await storyBibleDB.update(bible.id, { generatedAt: 999 });
    expect((await storyBibleDB.get(bible.id))!.generatedAt).toBe(999);

    await storyBibleDB.delete(bible.id);
    expect(await storyBibleDB.getByProject(p.id)).toBeUndefined();
  });

  it('settings: singleton get with defaults + update', async () => {
    const { settingsDB } = db;
    const def: Settings = await settingsDB.get();
    expect(def.id).toBe('singleton');
    expect(def.theme).toBe('dark');
    expect(def.sidebarCollapsed).toBe(false);

    const updated = await settingsDB.update({ theme: 'light', sidebarCollapsed: true });
    expect(updated.theme).toBe('light');
    expect(updated.sidebarCollapsed).toBe(true);
    expect((await settingsDB.get()).theme).toBe('light');
  });

  it('conversations + messages: create, list, update, delete', async () => {
    const { projectsDB, conversationsDB, messagesDB } = db;
    const p = await projectsDB.create(makeProject());
    const conv = await conversationsDB.create(makeConversation(p.id));
    const m1 = await messagesDB.create(makeMessage(conv.id));
    const m2 = await messagesDB.create(makeMessage(conv.id));

    expect((await conversationsDB.listByProject(p.id)).length).toBe(1);
    expect((await messagesDB.listByConversation(conv.id)).length).toBe(2);
    expect((await messagesDB.get(m1.id))!.content).toBe('Hello');

    await messagesDB.update(m1.id, { content: 'Hi there' });
    expect((await messagesDB.get(m1.id))!.content).toBe('Hi there');

    await messagesDB.delete(m1.id);
    expect((await messagesDB.listByConversation(conv.id)).length).toBe(1);
    expect((await messagesDB.get(m2.id))).toBeDefined();

    await conversationsDB.delete(conv.id);
    expect(await conversationsDB.get(conv.id)).toBeUndefined();
  });

  it('beats: create, listByProject/Chapter/Scene, update, delete', async () => {
    const { projectsDB, chaptersDB, scenesDB, beatsDB } = db;
    const p = await projectsDB.create(makeProject());
    const ch = await chaptersDB.create(makeChapter(p.id, 0));
    const sc = await scenesDB.create(makeScene(p.id, ch.id, 0));
    const b = await beatsDB.create({ ...makeBeat(p.id, ch.id), sceneId: sc.id });

    expect((await beatsDB.listByProject(p.id)).length).toBe(1);
    expect((await beatsDB.listByChapter(ch.id)).length).toBe(1);
    expect((await beatsDB.listByScene(sc.id)).length).toBe(1);

    await beatsDB.update(b.id, { status: 'done' });
    expect((await beatsDB.get(b.id))!.status).toBe('done');

    await beatsDB.delete(b.id);
    expect((await beatsDB.listByProject(p.id)).length).toBe(0);
  });

  it('project delete cascades to all child stores', async () => {
    const {
      projectsDB,
      chaptersDB,
      scenesDB,
      charactersDB,
      worldDB,
      brainstormDB,
      storyBibleDB,
      conversationsDB,
      messagesDB,
      beatsDB,
    } = db;

    const p = await projectsDB.create(makeProject());
    const ch = await chaptersDB.create(makeChapter(p.id, 0));
    await scenesDB.create(makeScene(p.id, ch.id, 0));
    await charactersDB.create(makeCharacter(p.id));
    await worldDB.create(makeWorldEntity(p.id));
    await brainstormDB.create(makeBrainstorm(p.id));
    await storyBibleDB.create(p.id);
    const conv = await conversationsDB.create(makeConversation(p.id));
    await messagesDB.create(makeMessage(conv.id));
    await beatsDB.create(makeBeat(p.id, ch.id));

    await projectsDB.delete(p.id);

    expect(await projectsDB.get(p.id)).toBeUndefined();
    expect((await chaptersDB.listByProject(p.id)).length).toBe(0);
    expect((await scenesDB.listByProject(p.id)).length).toBe(0);
    expect((await charactersDB.listByProject(p.id)).length).toBe(0);
    expect((await worldDB.listByProject(p.id)).length).toBe(0);
    expect((await brainstormDB.listByProject(p.id)).length).toBe(0);
    expect(await storyBibleDB.getByProject(p.id)).toBeUndefined();
    expect((await conversationsDB.listByProject(p.id)).length).toBe(0);
    expect((await messagesDB.listByConversation(conv.id)).length).toBe(0);
    expect((await beatsDB.listByProject(p.id)).length).toBe(0);
  });
});

// --- Fixtures (only required fields) ---

function makeProject(overrides: Partial<Project> = {}): Omit<Project, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name: 'Test Project',
    description: 'A test project',
    genre: 'sci-fi',
    tone: 'dark',
    pov: 'third-limited',
    style: { mode: 'custom', custom: 'minimalist' },
    ...overrides,
  };
}

function makeChapter(projectId: string, order = 0): Omit<Chapter, 'id' | 'createdAt' | 'updatedAt'> {
  return { projectId, title: `Chapter ${order}`, order };
}

function makeScene(projectId: string, chapterId: string, order = 0): Omit<Scene, 'id' | 'createdAt' | 'updatedAt'> {
  return { projectId, chapterId, title: `Scene ${order}`, content: '', summary: '', order };
}

function makeCharacter(projectId: string): Omit<Character, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    projectId,
    name: 'Ada',
    type: 'protagonist',
    age: '',
    appearance: '',
    personality: '',
    voice: '',
    backstory: '',
    goals: '',
  };
}

function makeWorldEntity(projectId: string): Omit<WorldEntity, 'id' | 'createdAt' | 'updatedAt'> {
  return { projectId, name: 'New Terra', kind: 'place', description: 'A colony world' };
}

function makeBrainstorm(projectId: string): Omit<BrainstormNote, 'id' | 'createdAt' | 'updatedAt'> {
  return { projectId, title: 'Idea', content: 'An idea' };
}

function makeConversation(projectId: string): Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'> {
  return { projectId, title: 'Chat' };
}

function makeMessage(conversationId: string): Omit<Message, 'id' | 'createdAt'> {
  return { conversationId, role: 'user', content: 'Hello', actions: [] };
}

function makeBeat(projectId: string, chapterId: string): Omit<Beat, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    projectId,
    chapterId,
    kind: 'rising',
    title: 'Beat',
    description: 'what happens',
    notes: 'tone',
    characters: [],
    status: 'draft',
    source: 'manual',
    position: 0,
  };
}
