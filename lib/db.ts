import { openDB, type IDBPDatabase } from 'idb';
import type {
  Project,
  Chapter,
  Scene,
  Character,
  WorldEntity,
  BrainstormNote,
  Settings,
  StoryBible,
  Conversation,
  Message,
  Beat,
} from '@/types';
import { mapRoleToType, mapCategoryToKind } from '@/lib/labels';

const DB_NAME = 'kanam-story';
const DB_VERSION = 7;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB only available in the browser');
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade: async (db, oldVersion, _newVersion, transaction) => {
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('chapters')) {
          const store = db.createObjectStore('chapters', { keyPath: 'id' });
          store.createIndex('by-project', 'projectId');
          store.createIndex('by-project-order', ['projectId', 'order']);
        }
        if (!db.objectStoreNames.contains('scenes')) {
          const store = db.createObjectStore('scenes', { keyPath: 'id' });
          store.createIndex('by-project', 'projectId');
          store.createIndex('by-chapter', 'chapterId');
          store.createIndex('by-chapter-order', ['chapterId', 'order']);
        }
        if (!db.objectStoreNames.contains('characters')) {
          const store = db.createObjectStore('characters', { keyPath: 'id' });
          store.createIndex('by-project', 'projectId');
        }
        if (!db.objectStoreNames.contains('world')) {
          const store = db.createObjectStore('world', { keyPath: 'id' });
          store.createIndex('by-project', 'projectId');
        }
        if (!db.objectStoreNames.contains('brainstorm')) {
          const store = db.createObjectStore('brainstorm', { keyPath: 'id' });
          store.createIndex('by-project', 'projectId');
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('storyBible')) {
          const store = db.createObjectStore('storyBible', { keyPath: 'id' });
          store.createIndex('by-project', 'projectId');
        }
        if (!db.objectStoreNames.contains('conversations')) {
          const store = db.createObjectStore('conversations', { keyPath: 'id' });
          store.createIndex('by-project', 'projectId');
        }
        if (!db.objectStoreNames.contains('messages')) {
          const store = db.createObjectStore('messages', { keyPath: 'id' });
          store.createIndex('by-conversation', 'conversationId');
        }
        if (!db.objectStoreNames.contains('beats')) {
          const store = db.createObjectStore('beats', { keyPath: 'id' });
          store.createIndex('by-project', 'projectId');
          store.createIndex('by-chapter', 'chapterId');
          store.createIndex('by-scene', 'sceneId');
        }

        // v3 → v4: migrate `style` from string to ProjectStyle object.
        // Use the versionchange `transaction` (not db.transaction(), which
        // can throw InvalidStateError inside onupgradeneeded).
        if (oldVersion < 4 && db.objectStoreNames.contains('projects')) {
          const store = transaction.objectStore('projects');
          const projects = await store.getAll();
          for (const p of projects) {
            const style = typeof p.style === 'string' ? { mode: 'custom', custom: p.style } : p.style;
            await store.put({ ...p, style });
          }
        }

        // v4 → v5: migrate Character `role` (string) → `type` (enum) + new fields.
        if (oldVersion < 5 && db.objectStoreNames.contains('characters')) {
          const store = transaction.objectStore('characters');
          const characters = await store.getAll();
          for (const c of characters) {
            await store.put({
              ...c,
              type: mapRoleToType(c.role),
              pronouns: c.pronouns ?? '',
              groups: c.groups ?? [],
              otherNames: c.otherNames ?? [],
              traits: c.traits ?? [],
              inContext: c.inContext ?? true,
            });
          }
        }

        // v5 → v6: migrate WorldEntity `category` (string) → `kind` (enum) + new fields.
        if (oldVersion < 6 && db.objectStoreNames.contains('world')) {
          const store = transaction.objectStore('world');
          const entities = await store.getAll();
          for (const w of entities) {
            await store.put({
              ...w,
              kind: mapCategoryToKind(w.category),
              otherNames: w.otherNames ?? [],
              traits: w.traits ?? [],
              inContext: w.inContext ?? true,
            });
          }
        }

        // v6 → v7: add `tense` to existing projects (default 'past').
        if (oldVersion < 7 && db.objectStoreNames.contains('projects')) {
          const store = transaction.objectStore('projects');
          const projects = await store.getAll();
          for (const p of projects) {
            await store.put({ ...p, tense: p.tense ?? 'past' });
          }
        }
      },
    });
  }
  return dbPromise;
}

const now = () => Date.now();
const id = () => crypto.randomUUID();

export const projectsDB = {
  async list(): Promise<Project[]> {
    const db = await getDB();
    const all = await db.getAll('projects');
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  },
  async get(id: string): Promise<Project | undefined> {
    const db = await getDB();
    return db.get('projects', id);
  },
  async create(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    const db = await getDB();
    const project: Project = { ...data, id: id(), createdAt: now(), updatedAt: now() };
    await db.put('projects', project);
    return project;
  },
  async update(id: string, data: Partial<Project>): Promise<Project> {
    const db = await getDB();
    const existing = await db.get('projects', id);
    if (!existing) throw new Error('Project not found');
    const updated = { ...existing, ...data, updatedAt: now() };
    await db.put('projects', updated);
    return updated;
  },
  async delete(id: string): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(
      ['projects', 'chapters', 'scenes', 'characters', 'world', 'brainstorm', 'storyBible', 'conversations', 'messages', 'beats'],
      'readwrite',
    );
    await tx.objectStore('projects').delete(id);
    const chapterIdx = tx.objectStore('chapters').index('by-project');
    for await (const cursor of chapterIdx.iterate(id)) {
      await cursor.delete();
    }
    const sceneIdx = tx.objectStore('scenes').index('by-project');
    for await (const cursor of sceneIdx.iterate(id)) {
      await cursor.delete();
    }
    const charIdx = tx.objectStore('characters').index('by-project');
    for await (const cursor of charIdx.iterate(id)) {
      await cursor.delete();
    }
    const worldIdx = tx.objectStore('world').index('by-project');
    for await (const cursor of worldIdx.iterate(id)) {
      await cursor.delete();
    }
    const brainIdx = tx.objectStore('brainstorm').index('by-project');
    for await (const cursor of brainIdx.iterate(id)) {
      await cursor.delete();
    }
    const bibleIdx = tx.objectStore('storyBible').index('by-project');
    for await (const cursor of bibleIdx.iterate(id)) {
      await cursor.delete();
    }
    const convIdx = tx.objectStore('conversations').index('by-project');
    for await (const cursor of convIdx.iterate(id)) {
      const convId = cursor.value.id as string;
      const msgIdx = tx.objectStore('messages').index('by-conversation');
      for await (const msg of msgIdx.iterate(convId)) {
        await msg.delete();
      }
      await cursor.delete();
    }
    const beatIdx = tx.objectStore('beats').index('by-project');
    for await (const cursor of beatIdx.iterate(id)) {
      await cursor.delete();
    }
    await tx.done;
  },
};

export const chaptersDB = {
  async listByProject(projectId: string): Promise<Chapter[]> {
    const db = await getDB();
    const all = await db.getAllFromIndex('chapters', 'by-project', projectId);
    return all.sort((a, b) => a.order - b.order);
  },
  async create(data: Omit<Chapter, 'id' | 'createdAt' | 'updatedAt'>): Promise<Chapter> {
    const db = await getDB();
    const chapter: Chapter = { ...data, id: id(), createdAt: now(), updatedAt: now() };
    await db.put('chapters', chapter);
    return chapter;
  },
  async update(id: string, data: Partial<Chapter>): Promise<Chapter> {
    const db = await getDB();
    const existing = await db.get('chapters', id);
    if (!existing) throw new Error('Chapter not found');
    const updated = { ...existing, ...data, updatedAt: now() };
    await db.put('chapters', updated);
    return updated;
  },
  async delete(id: string): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(['chapters', 'scenes', 'beats'], 'readwrite');
    await tx.objectStore('chapters').delete(id);
    const sceneIdx = tx.objectStore('scenes').index('by-chapter');
    // Delete chapter beats and the beats of each scene in the chapter.
    const beatChapterIdx = tx.objectStore('beats').index('by-chapter');
    for await (const cursor of beatChapterIdx.iterate(id)) {
      await cursor.delete();
    }
    for await (const cursor of sceneIdx.iterate(id)) {
      const sceneId = cursor.value.id as string;
      const beatSceneIdx = tx.objectStore('beats').index('by-scene');
      for await (const beatCursor of beatSceneIdx.iterate(sceneId)) {
        await beatCursor.delete();
      }
      await cursor.delete();
    }
    await tx.done;
  },
};

export const scenesDB = {
  async listByProject(projectId: string): Promise<Scene[]> {
    const db = await getDB();
    const all = await db.getAllFromIndex('scenes', 'by-project', projectId);
    return all.sort((a, b) => a.order - b.order);
  },
  async listByChapter(chapterId: string): Promise<Scene[]> {
    const db = await getDB();
    const all = await db.getAllFromIndex('scenes', 'by-chapter', chapterId);
    return all.sort((a, b) => a.order - b.order);
  },
  async get(id: string): Promise<Scene | undefined> {
    const db = await getDB();
    return db.get('scenes', id);
  },
  async create(data: Omit<Scene, 'id' | 'createdAt' | 'updatedAt'>): Promise<Scene> {
    const db = await getDB();
    const scene: Scene = { ...data, id: id(), createdAt: now(), updatedAt: now() };
    await db.put('scenes', scene);
    return scene;
  },
  async update(id: string, data: Partial<Scene>): Promise<Scene> {
    const db = await getDB();
    const existing = await db.get('scenes', id);
    if (!existing) throw new Error('Scene not found');
    const updated = { ...existing, ...data, updatedAt: now() };
    await db.put('scenes', updated);
    return updated;
  },
  async delete(id: string): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(['scenes', 'beats'], 'readwrite');
    await tx.objectStore('scenes').delete(id);
    const beatIdx = tx.objectStore('beats').index('by-scene');
    for await (const cursor of beatIdx.iterate(id)) {
      await cursor.delete();
    }
    await tx.done;
  },
};

export const charactersDB = {
  async listByProject(projectId: string): Promise<Character[]> {
    const db = await getDB();
    const all = await db.getAllFromIndex('characters', 'by-project', projectId);
    return all.sort((a, b) => a.name.localeCompare(b.name));
  },
  async get(id: string): Promise<Character | undefined> {
    const db = await getDB();
    return db.get('characters', id);
  },
  async create(data: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>): Promise<Character> {
    const db = await getDB();
    const ch: Character = { ...data, id: id(), createdAt: now(), updatedAt: now() };
    await db.put('characters', ch);
    return ch;
  },
  async update(id: string, data: Partial<Character>): Promise<Character> {
    const db = await getDB();
    const existing = await db.get('characters', id);
    if (!existing) throw new Error('Character not found');
    const updated = { ...existing, ...data, updatedAt: now() };
    await db.put('characters', updated);
    return updated;
  },
  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('characters', id);
  },
};

export const worldDB = {
  async listByProject(projectId: string): Promise<WorldEntity[]> {
    const db = await getDB();
    const all = await db.getAllFromIndex('world', 'by-project', projectId);
    return all.sort((a, b) => a.name.localeCompare(b.name));
  },
  async get(id: string): Promise<WorldEntity | undefined> {
    const db = await getDB();
    return db.get('world', id);
  },
  async create(data: Omit<WorldEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorldEntity> {
    const db = await getDB();
    const w: WorldEntity = { ...data, id: id(), createdAt: now(), updatedAt: now() };
    await db.put('world', w);
    return w;
  },
  async update(id: string, data: Partial<WorldEntity>): Promise<WorldEntity> {
    const db = await getDB();
    const existing = await db.get('world', id);
    if (!existing) throw new Error('World entity not found');
    const updated = { ...existing, ...data, updatedAt: now() };
    await db.put('world', updated);
    return updated;
  },
  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('world', id);
  },
};

export const brainstormDB = {
  async listByProject(projectId: string): Promise<BrainstormNote[]> {
    const db = await getDB();
    const all = await db.getAllFromIndex('brainstorm', 'by-project', projectId);
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  },
  async create(data: Omit<BrainstormNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<BrainstormNote> {
    const db = await getDB();
    const n: BrainstormNote = { ...data, id: id(), createdAt: now(), updatedAt: now() };
    await db.put('brainstorm', n);
    return n;
  },
  async update(id: string, data: Partial<BrainstormNote>): Promise<BrainstormNote> {
    const db = await getDB();
    const existing = await db.get('brainstorm', id);
    if (!existing) throw new Error('Note not found');
    const updated = { ...existing, ...data, updatedAt: now() };
    await db.put('brainstorm', updated);
    return updated;
  },
  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('brainstorm', id);
  },
};

const DEFAULT_SETTINGS: Settings = {
  id: 'singleton',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: '',
  theme: 'dark',
  sidebarCollapsed: false,
  rightPanelCollapsed: false,
};

export const BIBLE_SECTION_DEFAULTS: Array<{
  key: StoryBible['sections'][number]['key'];
  label: string;
}> = [
  { key: 'summary', label: 'Resumen de la trama' },
  { key: 'themes', label: 'Temas y tono' },
  { key: 'characters', label: 'Personajes (resumen)' },
  { key: 'world', label: 'Mundo (resumen)' },
  { key: 'rules', label: 'Reglas y consistencia' },
];

export function emptyBibleSections(): StoryBible['sections'] {
  return BIBLE_SECTION_DEFAULTS.map((s) => ({
    key: s.key,
    label: s.label,
    manual: '',
    auto: '',
    updatedAt: 0,
  }));
}

export const storyBibleDB = {
  async get(id: string): Promise<StoryBible | undefined> {
    const db = await getDB();
    return db.get('storyBible', id);
  },
  async getByProject(projectId: string): Promise<StoryBible | undefined> {
    const db = await getDB();
    const all = await db.getAllFromIndex('storyBible', 'by-project', projectId);
    return all[0];
  },
  async create(projectId: string): Promise<StoryBible> {
    const db = await getDB();
    const bible: StoryBible = {
      id: id(),
      projectId,
      sections: emptyBibleSections(),
      generatedAt: 0,
      updatedAt: now(),
    };
    await db.put('storyBible', bible);
    return bible;
  },
  async update(id: string, data: Partial<StoryBible>): Promise<StoryBible> {
    const db = await getDB();
    const existing = await db.get('storyBible', id);
    if (!existing) throw new Error('Story bible not found');
    const updated: StoryBible = { ...existing, ...data, updatedAt: now() };
    await db.put('storyBible', updated);
    return updated;
  },
  async updateSection(
    id: string,
    key: StoryBible['sections'][number]['key'],
    patch: Partial<StoryBible['sections'][number]>,
  ): Promise<StoryBible> {
    const db = await getDB();
    const existing = (await db.get('storyBible', id)) as StoryBible | undefined;
    if (!existing) throw new Error('Story bible not found');
    const sections = existing.sections.map((s) =>
      s.key === key ? { ...s, ...patch, updatedAt: now() } : s,
    );
    const updated: StoryBible = { ...existing, sections, updatedAt: now() };
    await db.put('storyBible', updated);
    return updated;
  },
  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('storyBible', id);
  },
};

export const settingsDB = {
  async get(): Promise<Settings> {
    const db = await getDB();
    const s = await db.get('settings', 'singleton');
    return s ?? DEFAULT_SETTINGS;
  },
  async update(data: Partial<Settings>): Promise<Settings> {
    const db = await getDB();
    const existing = (await db.get('settings', 'singleton')) ?? DEFAULT_SETTINGS;
    const updated: Settings = { ...existing, ...data, id: 'singleton' };
    await db.put('settings', updated);
    return updated;
  },
};

// --- Chat: conversations, messages ---

export const conversationsDB = {
  async listByProject(projectId: string): Promise<Conversation[]> {
    const db = await getDB();
    const all = await db.getAllFromIndex('conversations', 'by-project', projectId);
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  },
  async get(id: string): Promise<Conversation | undefined> {
    const db = await getDB();
    return db.get('conversations', id);
  },
  async create(data: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Conversation> {
    const db = await getDB();
    const c: Conversation = { ...data, id: id(), createdAt: now(), updatedAt: now() };
    await db.put('conversations', c);
    return c;
  },
  async update(id: string, data: Partial<Conversation>): Promise<Conversation> {
    const db = await getDB();
    const existing = await db.get('conversations', id);
    if (!existing) throw new Error('Conversation not found');
    const updated: Conversation = { ...existing, ...data, updatedAt: now() };
    await db.put('conversations', updated);
    return updated;
  },
  async delete(id: string): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(['conversations', 'messages'], 'readwrite');
    await tx.objectStore('conversations').delete(id);
    const msgIdx = tx.objectStore('messages').index('by-conversation');
    for await (const cursor of msgIdx.iterate(id)) {
      await cursor.delete();
    }
    await tx.done;
  },
};

export const messagesDB = {
  async listByConversation(conversationId: string): Promise<Message[]> {
    const db = await getDB();
    const all = await db.getAllFromIndex('messages', 'by-conversation', conversationId);
    return all.sort((a, b) => a.createdAt - b.createdAt);
  },
  async get(id: string): Promise<Message | undefined> {
    const db = await getDB();
    return db.get('messages', id);
  },
  async create(data: Omit<Message, 'id' | 'createdAt'>): Promise<Message> {
    const db = await getDB();
    const m: Message = { ...data, id: id(), createdAt: now() };
    await db.put('messages', m);
    return m;
  },
  async update(id: string, data: Partial<Message>): Promise<Message> {
    const db = await getDB();
    const existing = await db.get('messages', id);
    if (!existing) throw new Error('Message not found');
    const updated: Message = { ...existing, ...data };
    await db.put('messages', updated);
    return updated;
  },
  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('messages', id);
  },
};

// --- Outline: beats ---

export const beatsDB = {
  async listByProject(projectId: string): Promise<Beat[]> {
    const db = await getDB();
    const all = await db.getAllFromIndex('beats', 'by-project', projectId);
    return all.sort((a, b) => a.position - b.position);
  },
  async listByChapter(chapterId: string): Promise<Beat[]> {
    const db = await getDB();
    const all = await db.getAllFromIndex('beats', 'by-chapter', chapterId);
    return all.sort((a, b) => a.position - b.position);
  },
  async listByScene(sceneId: string): Promise<Beat[]> {
    const db = await getDB();
    const all = await db.getAllFromIndex('beats', 'by-scene', sceneId);
    return all.sort((a, b) => a.position - b.position);
  },
  async get(id: string): Promise<Beat | undefined> {
    const db = await getDB();
    return db.get('beats', id);
  },
  async create(data: Omit<Beat, 'id' | 'createdAt' | 'updatedAt'>): Promise<Beat> {
    const db = await getDB();
    const b: Beat = { ...data, id: id(), createdAt: now(), updatedAt: now() };
    await db.put('beats', b);
    return b;
  },
  async update(id: string, data: Partial<Beat>): Promise<Beat> {
    const db = await getDB();
    const existing = await db.get('beats', id);
    if (!existing) throw new Error('Beat not found');
    const updated: Beat = { ...existing, ...data, updatedAt: now() };
    await db.put('beats', updated);
    return updated;
  },
  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('beats', id);
  },
};