'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
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
  ContentAction,
  StyleProfile,
  SceneSnapshot,
  StorySectionKey,
} from '@/types';
import {
  projectsDB,
  chaptersDB,
  scenesDB,
  charactersDB,
  worldDB,
  brainstormDB,
  settingsDB,
  storyBibleDB,
  conversationsDB,
  messagesDB,
  beatsDB,
  sceneSnapshotsDB,
} from '@/lib/db';
import {
  parseCharacterEntries,
  parseWorldEntries,
  safeParseJsonArray,
} from '@/lib/bibleExtract';
import {
  buildBibleExtractPrompt,
  buildStoryBiblePrompt,
  buildBibleSectionPrompt,
} from '@/lib/prompts';
import { buildAgentContext, buildSuggestBeatsPrompt, buildGenerateCharacterPrompt, buildStyleProfilePrompt } from '@/lib/agentPrompts';
import { parseBeatList, parseSuggestedCharacterList, parseStyleProfile } from '@/lib/agentReply';
import { mapRoleToType, mapCategoryToKind } from '@/lib/labels';
import { buildCharacterSyncPlan, buildWorldSyncPlan } from '@/lib/bibleSync';
import { shouldSnapshot, buildSnapshot } from '@/lib/snapshots';
import { ollamaChat } from '@/lib/ollama';
import { BIBLE_SECTION_DEFAULTS } from '@/lib/db';
import { parseBibleSections } from '@/lib/bibleParse';

interface AppState {
  ready: boolean;
  settings: Settings;
  projects: Project[];
  currentProject: Project | null;
  chapters: Chapter[];
  scenes: Scene[];
  characters: Character[];
  world: WorldEntity[];
  brainstorm: BrainstormNote[];
  storyBible: StoryBible | null;
  currentSceneId: string | null;
  conversations: Conversation[];
  currentConversationId: string | null;
  messages: Message[];
  beats: Beat[];
  view: 'editor' | 'outline' | 'story';
  /** Sección de Historia activa en la vista apilada (sidebar). */
  activeStorySection: StorySectionKey;
  currentOutlineChapterId: string | null;

  setSettings: (patch: Partial<Settings>) => Promise<void>;
  setView: (view: 'editor' | 'outline' | 'story') => void;
  setActiveStorySection: (key: StorySectionKey) => void;
  setCurrentOutlineChapterId: (id: string | null) => void;
  refreshProjects: () => Promise<void>;
  selectProject: (id: string | null) => Promise<void>;
  createProject: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;

  createChapter: (data: Omit<Chapter, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Chapter>;
  updateChapter: (id: string, data: Partial<Chapter>) => Promise<void>;
  deleteChapter: (id: string) => Promise<void>;

  createScene: (data: Omit<Scene, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Scene>;
  updateScene: (id: string, data: Partial<Scene>) => Promise<void>;
  deleteScene: (id: string) => Promise<void>;
  selectScene: (id: string | null) => void;

  // B6: scene versioning / snapshots.
  /** Lista las versiones previas de una escena (más reciente primero). */
  listSceneSnapshots: (sceneId: string) => Promise<SceneSnapshot[]>;
  /** Restaura una escena a una versión previa (con confirmación en la UI). */
  restoreSceneSnapshot: (sceneId: string, snapshot: SceneSnapshot) => Promise<void>;

  createCharacter: (data: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Character>;
  updateCharacter: (id: string, data: Partial<Character>) => Promise<void>;
  deleteCharacter: (id: string) => Promise<void>;
  /** Asks the agent to propose one or more characters (Slice 7). */
  generateCharacter: (type?: string, instructions?: string) => Promise<Partial<Character>[]>;
  /** Extracts a style profile from a sample of the author's writing (Slice 9). */
  analyzeStyle: (sample: string) => Promise<StyleProfile | null>;

  createWorld: (data: Omit<WorldEntity, 'id' | 'createdAt' | 'updatedAt'>) => Promise<WorldEntity>;
  updateWorld: (id: string, data: Partial<WorldEntity>) => Promise<void>;
  deleteWorld: (id: string) => Promise<void>;

  createNote: (data: Omit<BrainstormNote, 'id' | 'createdAt' | 'updatedAt'>) => Promise<BrainstormNote>;
  updateNote: (id: string, data: Partial<BrainstormNote>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;

  saveStoryBible: (id: string, patch: Partial<StoryBible>) => Promise<void>;
  updateBibleSection: (
    id: string,
    key: StoryBible['sections'][number]['key'],
    patch: Partial<StoryBible['sections'][number]>,
  ) => Promise<void>;
  setStoryBible: (b: StoryBible | null) => void;
  ensureStoryBible: (projectId: string) => Promise<StoryBible | null>;
  regenerateStoryBible: () => Promise<void>;
  /** Regenerates a single Bible section from the current manuscript (Biblia Viva). */
  regenerateBibleSection: (key: StoryBible['sections'][number]['key']) => Promise<void>;
  /** Marks Bible sections as stale when their source material changed. */
  markBibleStale: (keys: StoryBible['sections'][number]['key'][]) => Promise<void>;
  /** Clears the stale flag on Bible sections (e.g. after an undo reverts the change). */
  clearBibleStale: (keys: StoryBible['sections'][number]['key'][]) => Promise<void>;

  previewBibleCharacters: (rawMarkdown: string) => Promise<Partial<Character>[]>;
  importCharactersFromBible: (entries: Partial<Character>[]) => Promise<Character[]>;
  /** U5: auto-sync characters from the Bible into the Characters tab (dedupe by name, no overwrite of manual edits). */
  syncCharactersFromBible: () => Promise<{ created: number; updated: number }>;
  previewBibleWorld: (rawMarkdown: string) => Promise<Partial<WorldEntity>[]>;
  importWorldFromBible: (entries: Partial<WorldEntity>[]) => Promise<WorldEntity[]>;
  /** U6: auto-sync world entities from the Bible into the World tab (dedupe by name, no overwrite of manual edits). */
  syncWorldFromBible: () => Promise<{ created: number; updated: number }>;
  /** U7: revert a bible auto-import — detach the entity from the bible (keeps it, stops future syncs from touching it). */
  revertBibleImport: (kind: 'character' | 'world', id: string) => Promise<void>;

  createConversation: (data: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Conversation>;
  selectConversation: (id: string | null) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  createMessage: (data: Omit<Message, 'id' | 'createdAt'>) => Promise<Message>;

  createBeat: (data: Omit<Beat, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Beat>;
  updateBeat: (id: string, data: Partial<Beat>) => Promise<void>;
  deleteBeat: (id: string) => Promise<void>;
  /** Asks the agent to propose a beat map for a chapter (tool suggest_beats). */
  suggestBeats: (chapterId: string) => Promise<Beat[]>;

  /** Applies agent actions to the real state (persists to IndexedDB) and returns an undo function. */
  applyContentActions: (actions: ContentAction[]) => Promise<() => Promise<void>>;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettingsState] = useState<Settings>({
    id: 'singleton',
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: '',
    theme: 'dark',
    sidebarCollapsed: false,
    rightPanelCollapsed: false,
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [world, setWorld] = useState<WorldEntity[]>([]);
  const [brainstorm, setBrainstorm] = useState<BrainstormNote[]>([]);
  const [storyBible, setStoryBible] = useState<StoryBible | null>(null);
  const [currentSceneId, setCurrentSceneId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [view, setViewState] = useState<'editor' | 'outline' | 'story'>('editor');
  const [activeStorySection, setActiveStorySectionState] = useState<StorySectionKey>('co-writer');
  const [currentOutlineChapterId, setCurrentOutlineChapterIdState] = useState<string | null>(null);

  const setView = useCallback((v: 'editor' | 'outline' | 'story') => setViewState(v), []);
  const setActiveStorySection = useCallback((key: StorySectionKey) => setActiveStorySectionState(key), []);
  const setCurrentOutlineChapterId = useCallback(
    (id: string | null) => setCurrentOutlineChapterIdState(id),
    [],
  );

  const refreshProjects = useCallback(async (): Promise<void> => {
    const list = await projectsDB.list();
    setProjects(list);
  }, []);

  const loadProjectData = useCallback(async (projectId: string) => {
    const [chs, scs, chars, w, br, bible, convs, bts] = await Promise.all([
      chaptersDB.listByProject(projectId),
      scenesDB.listByProject(projectId),
      charactersDB.listByProject(projectId),
      worldDB.listByProject(projectId),
      brainstormDB.listByProject(projectId),
      storyBibleDB.getByProject(projectId),
      conversationsDB.listByProject(projectId),
      beatsDB.listByProject(projectId),
    ]);
    setChapters(chs);
    setScenes(scs);
    setCharacters(chars);
    setWorld(w);
    setBrainstorm(br);
    setStoryBible(bible ?? null);
    setConversations(convs);
    setBeats(bts);
    // NOTE: no reset currentConversationId/messages here. loadProjectData runs
    // on every entity CRUD (updateScene, createBeat, ...), and resetting the
    // active chat here would drop the conversation right after the agent applies
    // a change. The conversation is reset only when switching projects
    // (see selectProject).
  }, []);

  const selectProject = useCallback(
    async (id: string | null) => {
      if (!id) {
        setCurrentProject(null);
        setChapters([]);
        setScenes([]);
        setCharacters([]);
        setWorld([]);
        setBrainstorm([]);
        setStoryBible(null);
        setCurrentSceneId(null);
        setConversations([]);
        setCurrentConversationId(null);
        setMessages([]);
        setBeats([]);
        return;
      }
      const p = await projectsDB.get(id);
      if (!p) return;
      setCurrentProject(p);
      // Reset the chat when switching projects (new project context).
      setCurrentConversationId(null);
      setMessages([]);
      await loadProjectData(id);
      setCurrentSceneId(null);
    },
    [loadProjectData],
  );

  useEffect(() => {
    (async () => {
      let s = await settingsDB.get();
      if (!s.ollamaModel) {
        try {
          const res = await fetch('/api/ollama/models', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ollamaUrl: s.ollamaUrl }),
          });
          if (res.ok) {
            const data = await res.json();
            const models: string[] = data.models ?? [];
            // Prefer deepseek-v4-flash when available; otherwise fall back to
            // the first installed model.
            const preferred = models.find((m) => m.includes('deepseek-v4-flash'));
            const chosen = preferred ?? models[0];
            if (chosen) {
              s = { ...s, ollamaModel: chosen };
              await settingsDB.update({ ollamaModel: chosen });
            }
          }
        } catch {
          /* ignore */
        }
      }
      setSettingsState(s);
      const list = await projectsDB.list();
      setProjects(list);
      if (list.length > 0) {
        await selectProject(list[0].id);
      }
      setReady(true);
    })();
  }, [selectProject]);

  useEffect(() => {
    // Gate on `ready`: before IndexedDB loads the real settings, `settings.theme`
    // is still the hardcoded 'dark' default. Running this effect on mount would
    // flash the wrong theme and overwrite the persisted `kanam-theme` in
    // localStorage, defeating the anti-flash script in layout.tsx. The inline
    // script already applied the persisted theme before first paint; once the
    // real settings arrive we reconcile and mirror the choice.
    if (!ready) return;
    const theme = settings.theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-bs-theme', theme);
    // Mirror the theme to localStorage so the inline script in layout.tsx can
    // apply it before React hydrates (avoids a flash of the wrong theme on
    // reload). IndexedDB remains the source of truth; this is only a paint hint.
    try {
      localStorage.setItem('kanam-theme', theme);
    } catch {
      /* ignore (private mode, etc.) */
    }
  }, [settings.theme, ready]);

  const setSettings = useCallback(async (patch: Partial<Settings>) => {
    const updated = await settingsDB.update(patch);
    setSettingsState(updated);
  }, []);

  const createProject = useCallback(
    async (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
      const p = await projectsDB.create(data);
      await refreshProjects();
      await selectProject(p.id);
      return p;
    },
    [refreshProjects, selectProject],
  );

  const updateProject = useCallback(
    async (id: string, data: Partial<Project>) => {
      const updated = await projectsDB.update(id, data);
      await refreshProjects();
      if (currentProject?.id === id) setCurrentProject(updated);
    },
    [refreshProjects, currentProject],
  );

  const createChapter = useCallback(
    async (data: Omit<Chapter, 'id' | 'createdAt' | 'updatedAt'>) => {
      const c = await chaptersDB.create(data);
      if (currentProject) await loadProjectData(currentProject.id);
      return c;
    },
    [currentProject, loadProjectData],
  );

  const updateChapter = useCallback(
    async (id: string, data: Partial<Chapter>) => {
      await chaptersDB.update(id, data);
      if (currentProject) await loadProjectData(currentProject.id);
    },
    [currentProject, loadProjectData],
  );

  const deleteChapter = useCallback(
    async (id: string) => {
      await chaptersDB.delete(id);
      if (currentSceneId) setCurrentSceneId(null);
      if (currentProject) await loadProjectData(currentProject.id);
    },
    [currentProject, loadProjectData, currentSceneId],
  );

  const createScene = useCallback(
    async (data: Omit<Scene, 'id' | 'createdAt' | 'updatedAt'>) => {
      const s = await scenesDB.create(data);
      if (currentProject) await loadProjectData(currentProject.id);
      setCurrentSceneId(s.id);
      return s;
    },
    [currentProject, loadProjectData],
  );

  const updateScene = useCallback(
    async (id: string, data: Partial<Scene>) => {
      // B6: capture a snapshot of the scene's PREVIOUS state before applying the
      // change, so the history always reflects what the scene looked like at each
      // save. Dedupe identical snapshots (no noise when autosave fires without
      // real changes). The snapshot is taken from the DB (source of truth), not
      // the React snapshot, so concurrent saves capture the correct intermediate
      // value.
      const existing = await scenesDB.get(id);
      if (existing) {
        const last = await sceneSnapshotsDB.getLatest(id);
        if (shouldSnapshot(existing, last)) {
          await sceneSnapshotsDB.create(buildSnapshot(existing, Date.now()));
        }
      }
      await scenesDB.update(id, data);
      if (currentProject) await loadProjectData(currentProject.id);
    },
    [currentProject, loadProjectData],
  );

  const deleteScene = useCallback(
    async (id: string) => {
      await scenesDB.delete(id);
      if (currentSceneId === id) setCurrentSceneId(null);
      if (currentProject) await loadProjectData(currentProject.id);
    },
    [currentProject, loadProjectData, currentSceneId],
  );

  const selectScene = useCallback((id: string | null) => setCurrentSceneId(id), []);

  // B6: list the version history of a scene (newest first).
  const listSceneSnapshots = useCallback(async (sceneId: string): Promise<SceneSnapshot[]> => {
    return sceneSnapshotsDB.listByScene(sceneId);
  }, []);

  // B6: restore a scene to a previous version. The UI confirms before calling.
  // Restoring writes the snapshot's fields back onto the scene; the write goes
  // through `updateScene`, which itself captures a snapshot of the current
  // (pre-restore) state — so the restore is itself reversible from the history.
  const restoreSceneSnapshot = useCallback(
    async (sceneId: string, snapshot: SceneSnapshot): Promise<void> => {
      await updateScene(sceneId, {
        title: snapshot.title,
        content: snapshot.content,
        summary: snapshot.summary,
      });
    },
    [updateScene],
  );

  const createCharacter = useCallback(
    async (data: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>) => {
      const c = await charactersDB.create(data);
      if (currentProject) await loadProjectData(currentProject.id);
      return c;
    },
    [currentProject, loadProjectData],
  );

  const updateCharacter = useCallback(
    async (id: string, data: Partial<Character>) => {
      await charactersDB.update(id, data);
      if (currentProject) await loadProjectData(currentProject.id);
    },
    [currentProject, loadProjectData],
  );

  const deleteCharacter = useCallback(
    async (id: string) => {
      await charactersDB.delete(id);
      // If the deleted character was the project's protagonist, clear the
      // reference so the agent never sees a dangling UUID in its context.
      if (currentProject?.protagonist === id) {
        await updateProject(currentProject.id, { protagonist: undefined });
      }
      if (currentProject) await loadProjectData(currentProject.id);
    },
    [currentProject, loadProjectData, updateProject],
  );

  const createWorld = useCallback(
    async (data: Omit<WorldEntity, 'id' | 'createdAt' | 'updatedAt'>) => {
      const w = await worldDB.create(data);
      if (currentProject) await loadProjectData(currentProject.id);
      return w;
    },
    [currentProject, loadProjectData],
  );

  const updateWorld = useCallback(
    async (id: string, data: Partial<WorldEntity>) => {
      await worldDB.update(id, data);
      if (currentProject) await loadProjectData(currentProject.id);
    },
    [currentProject, loadProjectData],
  );

  const deleteWorld = useCallback(
    async (id: string) => {
      await worldDB.delete(id);
      if (currentProject) await loadProjectData(currentProject.id);
    },
    [currentProject, loadProjectData],
  );

  const createNote = useCallback(
    async (data: Omit<BrainstormNote, 'id' | 'createdAt' | 'updatedAt'>) => {
      const n = await brainstormDB.create(data);
      if (currentProject) await loadProjectData(currentProject.id);
      return n;
    },
    [currentProject, loadProjectData],
  );

  const updateNote = useCallback(
    async (id: string, data: Partial<BrainstormNote>) => {
      await brainstormDB.update(id, data);
      if (currentProject) await loadProjectData(currentProject.id);
    },
    [currentProject, loadProjectData],
  );

  const deleteNote = useCallback(
    async (id: string) => {
      await brainstormDB.delete(id);
      if (currentProject) await loadProjectData(currentProject.id);
    },
    [currentProject, loadProjectData],
  );

  const saveStoryBible = useCallback(
    async (id: string, patch: Partial<StoryBible>) => {
      const updated = await storyBibleDB.update(id, patch);
      setStoryBible(updated);
    },
    [],
  );

  const updateBibleSection = useCallback(
    async (
      id: string,
      key: StoryBible['sections'][number]['key'],
      patch: Partial<StoryBible['sections'][number]>,
    ) => {
      const updated = await storyBibleDB.updateSection(id, key, patch);
      setStoryBible(updated);
    },
    [],
  );

  const ensureStoryBible = useCallback(
    async (projectId: string): Promise<StoryBible | null> => {
      const existing = await storyBibleDB.getByProject(projectId);
      if (existing) {
        setStoryBible(existing);
        return existing;
      }
      const created = await storyBibleDB.create(projectId);
      setStoryBible(created);
      return created;
    },
    [],
  );

  const regenerateStoryBible = useCallback(async (): Promise<void> => {
    if (!currentProject || !storyBible) return;
    const prompt = buildStoryBiblePrompt({
      project: currentProject,
      characters,
      world,
      chapters,
      scenes,
    });
    const text = await ollamaChat({
      ollamaUrl: settings.ollamaUrl,
      model: settings.ollamaModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
    });
    const parsed = parseBibleSections(text);
    for (const def of BIBLE_SECTION_DEFAULTS) {
      const section = parsed[def.key];
      if (section) {
        await storyBibleDB.updateSection(storyBible.id, def.key, { auto: section });
      }
    }
    const refreshed = await storyBibleDB.get(storyBible.id);
    if (refreshed) setStoryBible(refreshed);
  }, [currentProject, storyBible, characters, world, chapters, scenes, settings.ollamaUrl, settings.ollamaModel]);

  const regenerateBibleSection = useCallback(
    async (key: StoryBible['sections'][number]['key']): Promise<void> => {
      if (!currentProject || !storyBible) return;
      const section = storyBible.sections.find((s) => s.key === key);
      const currentContent = section?.manual || section?.auto || '';
      const prompt = buildBibleSectionPrompt(
        { project: currentProject, characters, world, chapters, scenes },
        key,
        currentContent,
      );
      const text = await ollamaChat({
        ollamaUrl: settings.ollamaUrl,
        model: settings.ollamaModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
      });
      const clean = text.trim();
      if (!clean) return;
      // Regenerate the auto content; keep the manual override if present.
      await storyBibleDB.updateSection(storyBible.id, key, { auto: clean, staleAt: undefined });
      const refreshed = await storyBibleDB.get(storyBible.id);
      if (refreshed) setStoryBible(refreshed);
    },
    [currentProject, storyBible, characters, world, chapters, scenes, settings.ollamaUrl, settings.ollamaModel],
  );

  const markBibleStale = useCallback(
    async (keys: StoryBible['sections'][number]['key'][]): Promise<void> => {
      if (!storyBible) return;
      const nowTs = Date.now();
      for (const key of keys) {
        await storyBibleDB.updateSection(storyBible.id, key, { staleAt: nowTs });
      }
      const refreshed = await storyBibleDB.get(storyBible.id);
      if (refreshed) setStoryBible(refreshed);
    },
    [storyBible],
  );

  const clearBibleStale = useCallback(
    async (keys: StoryBible['sections'][number]['key'][]): Promise<void> => {
      if (!storyBible) return;
      for (const key of keys) {
        await storyBibleDB.updateSection(storyBible.id, key, { staleAt: undefined });
      }
      const refreshed = await storyBibleDB.get(storyBible.id);
      if (refreshed) setStoryBible(refreshed);
    },
    [storyBible],
  );

  const previewBibleCharacters = useCallback(
    async (rawMarkdown: string): Promise<Partial<Character>[]> => {
      const parsed = parseCharacterEntries(rawMarkdown);
      const fromMarkdown: Partial<Character>[] = parsed
        .filter((c) => c.name)
        .map((c) => ({
          name: c.name,
          type: mapRoleToType(c.role),
          age: c.age,
          appearance: c.appearance,
          personality: c.personality,
          voice: c.voice,
          backstory: c.backstory,
          goals: c.goals,
        }));
      if (fromMarkdown.length > 0) return fromMarkdown;
      if (!rawMarkdown.trim() || !settings.ollamaModel) return [];
      const prompt = buildBibleExtractPrompt('characters', rawMarkdown);
      const text = await ollamaChat({
        ollamaUrl: settings.ollamaUrl,
        model: settings.ollamaModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      });
      type LooseCharacter = Partial<Character> & { name?: string; role?: string };
      const loose = safeParseJsonArray<LooseCharacter>(text);
      return loose
        .filter((c): c is LooseCharacter => typeof c?.name === 'string' && c.name.length > 0)
        .map((c) => ({
          name: c.name!,
          type: mapRoleToType(c.role),
          personality: typeof c.personality === 'string' ? c.personality : '',
          voice: typeof c.voice === 'string' ? c.voice : '',
          goals: typeof c.goals === 'string' ? c.goals : '',
        }));
    },
    [settings.ollamaUrl, settings.ollamaModel],
  );

  const importCharactersFromBible = useCallback(
    async (entries: Partial<Character>[]): Promise<Character[]> => {
      if (!currentProject) return [];
      const created: Character[] = [];
      for (const e of entries) {
        if (!e.name) continue;
        const c = await createCharacter({
          projectId: currentProject.id,
          name: e.name,
          type: e.type ?? 'supporting',
          age: e.age ?? '',
          appearance: e.appearance ?? '',
          personality: e.personality ?? '',
          voice: e.voice ?? '',
          backstory: e.backstory ?? '',
          goals: e.goals ?? '',
          source: 'biblia',
        });
        created.push(c);
      }
      return created;
    },
    [currentProject, createCharacter],
  );

  // U5: auto-sync characters from the Bible into the Characters tab.
  // Dedupes by name (case-insensitive) and never overwrites manual edits:
  // only fills empty fields on existing characters, and only touches
  // characters that came from the bible (source === 'biblia') or are new.
  // Reads the bible fresh from the DB so it picks up a just-regenerated bible
  // (the closure `storyBible` would be stale after `regenerateStoryBible`).
  // The dedupe/merge logic lives in the pure `buildCharacterSyncPlan` (U8).
  const syncCharactersFromBible = useCallback(async (): Promise<{ created: number; updated: number }> => {
    if (!currentProject) return { created: 0, updated: 0 };
    const bible = await storyBibleDB.getByProject(currentProject.id);
    if (!bible) return { created: 0, updated: 0 };
    const section = bible.sections.find((s) => s.key === 'characters');
    const text = (section?.manual.trim() || section?.auto || '').trim();
    if (!text) return { created: 0, updated: 0 };

    const entries = await previewBibleCharacters(text);
    if (entries.length === 0) return { created: 0, updated: 0 };

    const plan = buildCharacterSyncPlan(entries, characters);
    let created = 0;
    for (const e of plan.toCreate) {
      await createCharacter({ projectId: currentProject.id, ...e });
      created++;
    }
    let updated = 0;
    for (const u of plan.toUpdate) {
      await updateCharacter(u.id, u.patch);
      updated++;
    }
    return { created, updated };
  }, [currentProject, characters, previewBibleCharacters, createCharacter, updateCharacter]);

  const generateCharacter = useCallback(
    async (type?: string, instructions?: string): Promise<Partial<Character>[]> => {
      if (!currentProject) return [];
      const context = buildAgentContext({
        project: currentProject,
        characters,
        world,
        chapters,
        scenes,
        beats,
        storyBible,
      });
      const prompt = buildGenerateCharacterPrompt(context, type, instructions);
      const text = await ollamaChat({
        ollamaUrl: settings.ollamaUrl,
        model: settings.ollamaModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      });
      const suggested = parseSuggestedCharacterList(text);
      return suggested.map((s) => ({
        name: s.name,
        type: s.type,
        pronouns: s.pronouns,
        age: s.age,
        appearance: s.appearance,
        personality: s.personality,
        voice: s.voice,
        backstory: s.backstory,
        goals: s.goals,
        traits: s.traits,
        source: 'ai' as const,
      }));
    },
    [currentProject, characters, world, chapters, scenes, beats, storyBible, settings.ollamaUrl, settings.ollamaModel],
  );

  const analyzeStyle = useCallback(
    async (sample: string): Promise<StyleProfile | null> => {
      if (!sample.trim() || !settings.ollamaModel) return null;
      const prompt = buildStyleProfilePrompt(sample);
      const text = await ollamaChat({
        ollamaUrl: settings.ollamaUrl,
        model: settings.ollamaModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      });
      return parseStyleProfile(text);
    },
    [settings.ollamaUrl, settings.ollamaModel],
  );

  const previewBibleWorld = useCallback(
    async (rawMarkdown: string): Promise<Partial<WorldEntity>[]> => {
      const parsed = parseWorldEntries(rawMarkdown);
      const fromMarkdown: Partial<WorldEntity>[] = parsed.map((w) => ({
        name: w.name,
        kind: w.kind,
        description: w.description,
      }));
      if (fromMarkdown.length > 0) return fromMarkdown;
      if (!rawMarkdown.trim() || !settings.ollamaModel) return [];
      const prompt = buildBibleExtractPrompt('world', rawMarkdown);
      const text = await ollamaChat({
        ollamaUrl: settings.ollamaUrl,
        model: settings.ollamaModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      });
      type LooseWorld = Partial<WorldEntity> & { name?: string; kind?: string; category?: string };
      const loose = safeParseJsonArray<LooseWorld>(text);
      const allowed: WorldEntity['kind'][] = [
        'place', 'organization', 'lore', 'key_event', 'clue', 'magic_system', 'item', 'rule', 'other',
      ];
      return loose
        .filter((w): w is LooseWorld => typeof w?.name === 'string' && w.name.length > 0)
        .map((w) => ({
          name: w.name!,
          kind: allowed.includes(w.kind as WorldEntity['kind'])
            ? (w.kind as WorldEntity['kind'])
            : mapCategoryToKind(w.category),
          description: typeof w.description === 'string' ? w.description : '',
        }));
    },
    [settings.ollamaUrl, settings.ollamaModel],
  );

  const importWorldFromBible = useCallback(
    async (entries: Partial<WorldEntity>[]): Promise<WorldEntity[]> => {
      if (!currentProject) return [];
      const created: WorldEntity[] = [];
      for (const e of entries) {
        if (!e.name) continue;
        const w = await createWorld({
          projectId: currentProject.id,
          name: e.name,
          kind: e.kind ?? 'other',
          description: e.description ?? '',
          source: 'biblia',
        });
        created.push(w);
      }
      return created;
    },
    [currentProject, createWorld],
  );

  // U6: auto-sync world entities from the Bible into the World tab.
  // Same pattern as syncCharactersFromBible: dedupe by name (case-insensitive),
  // mark new ones as source 'biblia', only fill empty fields on existing
  // entities that came from the bible, never overwrite manual edits.
  // Reads the bible fresh from the DB (post-regeneration).
  // The dedupe/merge logic lives in the pure `buildWorldSyncPlan` (U8).
  const syncWorldFromBible = useCallback(async (): Promise<{ created: number; updated: number }> => {
    if (!currentProject) return { created: 0, updated: 0 };
    const bible = await storyBibleDB.getByProject(currentProject.id);
    if (!bible) return { created: 0, updated: 0 };
    const section = bible.sections.find((s) => s.key === 'world');
    const text = (section?.manual.trim() || section?.auto || '').trim();
    if (!text) return { created: 0, updated: 0 };

    const entries = await previewBibleWorld(text);
    if (entries.length === 0) return { created: 0, updated: 0 };

    const plan = buildWorldSyncPlan(entries, world);
    let created = 0;
    for (const e of plan.toCreate) {
      await createWorld({ projectId: currentProject.id, ...e });
      created++;
    }
    let updated = 0;
    for (const u of plan.toUpdate) {
      await updateWorld(u.id, u.patch);
      updated++;
    }
    return { created, updated };
  }, [currentProject, world, previewBibleWorld, createWorld, updateWorld]);

  // U7: revert a bible auto-import. Detaches the entity from the bible by
  // clearing its `source` (keeps the entity, but future syncs will no longer
  // touch it). Non-destructive — the user keeps their edits.
  const revertBibleImport = useCallback(
    async (kind: 'character' | 'world', id: string): Promise<void> => {
      if (!currentProject) return;
      if (kind === 'character') {
        await updateCharacter(id, { source: 'manual' });
      } else {
        await updateWorld(id, { source: 'manual' });
      }
    },
    [currentProject, updateCharacter, updateWorld],
  );

  const createConversation = useCallback(
    async (data: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Conversation> => {
      const c = await conversationsDB.create(data);
      if (currentProject) {
        const convs = await conversationsDB.listByProject(currentProject.id);
        setConversations(convs);
      }
      return c;
    },
    [currentProject],
  );

  const selectConversation = useCallback(async (id: string | null) => {
    setCurrentConversationId(id);
    if (!id) {
      setMessages([]);
      return;
    }
    const msgs = await messagesDB.listByConversation(id);
    setMessages(msgs);
  }, []);

  const deleteConversation = useCallback(
    async (id: string) => {
      await conversationsDB.delete(id);
      if (currentConversationId === id) {
        setCurrentConversationId(null);
        setMessages([]);
      }
      if (currentProject) {
        const convs = await conversationsDB.listByProject(currentProject.id);
        setConversations(convs);
      }
    },
    [currentProject, currentConversationId],
  );

  const loadMessages = useCallback(async (conversationId: string) => {
    const msgs = await messagesDB.listByConversation(conversationId);
    setMessages(msgs);
  }, []);

  const createMessage = useCallback(
    async (data: Omit<Message, 'id' | 'createdAt'>): Promise<Message> => {
      const m = await messagesDB.create(data);
      setMessages((prev) => [...prev, m]);
      return m;
    },
    [],
  );

  const createBeat = useCallback(
    async (data: Omit<Beat, 'id' | 'createdAt' | 'updatedAt'>): Promise<Beat> => {
      const b = await beatsDB.create(data);
      if (currentProject) {
        const bts = await beatsDB.listByProject(currentProject.id);
        setBeats(bts);
      }
      return b;
    },
    [currentProject],
  );

  const updateBeat = useCallback(
    async (id: string, data: Partial<Beat>) => {
      await beatsDB.update(id, data);
      if (currentProject) {
        const bts = await beatsDB.listByProject(currentProject.id);
        setBeats(bts);
      }
    },
    [currentProject],
  );

  const deleteBeat = useCallback(
    async (id: string) => {
      await beatsDB.delete(id);
      if (currentProject) {
        const bts = await beatsDB.listByProject(currentProject.id);
        setBeats(bts);
      }
    },
    [currentProject],
  );

  const suggestBeats = useCallback(
    async (chapterId: string): Promise<Beat[]> => {
      if (!currentProject) return [];
      const chapter = chapters.find((c) => c.id === chapterId);
      if (!chapter) return [];
      const context = buildAgentContext({
        project: currentProject,
        characters,
        world,
        chapters,
        scenes,
        beats,
        storyBible,
      });
      const prompt = buildSuggestBeatsPrompt(context, chapter.title);
      const text = await ollamaChat({
        ollamaUrl: settings.ollamaUrl,
        model: settings.ollamaModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
      });
      const suggested = parseBeatList(text);
      const existing = beats.filter((b) => b.chapterId === chapterId && !b.sceneId);
      return suggested.map((s, i) => ({
        id: '',
        projectId: currentProject.id,
        chapterId,
        sceneId: undefined,
        kind: s.kind,
        title: s.title,
        description: s.description,
        notes: s.notes,
        characters: s.characters,
        status: s.status,
        source: 'ai' as const,
        position: existing.length + i,
        createdAt: 0,
        updatedAt: 0,
      }));
    },
    [currentProject, chapters, characters, world, scenes, beats, storyBible, settings.ollamaUrl, settings.ollamaModel],
  );

  const applyContentActions = useCallback(
    async (actions: ContentAction[]): Promise<() => Promise<void>> => {
      if (!currentProject) return async () => {};
      // Capture previous values so we can revert each action.
      // Read each entity fresh from the DB (not from the React snapshot) so that
      // multiple actions on the same entity within one batch capture the correct
      // intermediate value as the "before" for the undo.
      const undos: Array<() => Promise<void>> = [];

      for (const action of actions) {
        switch (action.type) {
          case 'rewrite_scene': {
            const scene = await scenesDB.get(action.sceneId);
            if (scene) {
              const prev = scene.content;
              await updateScene(action.sceneId, { content: action.after });
              undos.push(() => updateScene(action.sceneId, { content: prev }));
              // The manuscript changed → the manuscript-derived sections are stale.
              await markBibleStale(['summary', 'themes', 'rules']);
              undos.push(() => clearBibleStale(['summary', 'themes', 'rules']));
            }
            break;
          }
          case 'update_beat': {
            const beat = await beatsDB.get(action.beatId);
            if (beat) {
              const prev = { ...beat };
              await updateBeat(action.beatId, action.changes);
              undos.push(() => updateBeat(action.beatId, prev));
            }
            break;
          }
          case 'add_beat': {
            // Propagate chapterId (and projectId) from the action onto the beat,
            // since the model puts chapterId at the action level, not on the beat.
            const created = await createBeat({
              ...action.beat,
              projectId: currentProject.id,
              chapterId: action.chapterId ?? action.beat.chapterId,
            });
            undos.push(() => deleteBeat(created.id));
            break;
          }
          case 'update_character': {
            const character = await charactersDB.get(action.characterId);
            if (character) {
              const prev = { ...character };
              await updateCharacter(action.characterId, action.changes);
              undos.push(() => updateCharacter(action.characterId, prev));
              // Characters changed → the "characters" bible section is stale.
              await markBibleStale(['characters']);
              undos.push(() => clearBibleStale(['characters']));
            }
            break;
          }
          case 'add_character': {
            const created = await createCharacter(action.character);
            undos.push(() => deleteCharacter(created.id));
            await markBibleStale(['characters']);
            undos.push(() => clearBibleStale(['characters']));
            break;
          }
          case 'update_world': {
            const entity = await worldDB.get(action.entityId);
            if (entity) {
              const prev = { ...entity };
              await updateWorld(action.entityId, action.changes);
              undos.push(() => updateWorld(action.entityId, prev));
              // World changed → the "world" bible section is stale.
              await markBibleStale(['world']);
              undos.push(() => clearBibleStale(['world']));
            }
            break;
          }
          case 'update_bible': {
            if (storyBible) {
              const section = storyBible.sections.find((s) => s.key === action.section);
              const prev = section?.manual ?? '';
              await updateBibleSection(storyBible.id, action.section, { manual: action.value });
              undos.push(() => updateBibleSection(storyBible.id, action.section, { manual: prev }));
            }
            break;
          }
          case 'append_scene': {
            const created = await createScene({
              projectId: currentProject.id,
              chapterId: action.chapterId,
              title: 'Escena nueva',
              content: action.content,
              summary: action.summary,
              order: scenes.filter((s) => s.chapterId === action.chapterId).length,
            });
            undos.push(() => deleteScene(created.id));
            // New manuscript content → manuscript-derived sections are stale.
            await markBibleStale(['summary', 'themes', 'rules']);
            undos.push(() => clearBibleStale(['summary', 'themes', 'rules']));
            break;
          }
        }
      }

      // Revert in reverse order.
      return async () => {
        for (let i = undos.length - 1; i >= 0; i--) {
          await undos[i]();
        }
      };
    },
    [currentProject, storyBible, scenes, updateScene, updateBeat, createBeat, deleteBeat, updateCharacter, createCharacter, deleteCharacter, updateWorld, updateBibleSection, createScene, deleteScene, markBibleStale, clearBibleStale],
  );

  const value: AppState = {
    ready,
    settings,
    projects,
    currentProject,
    chapters,
    scenes,
    characters,
    world,
    brainstorm,
    storyBible,
    currentSceneId,
    conversations,
    currentConversationId,
    messages,
    beats,
    view,
    activeStorySection,
    currentOutlineChapterId,
    setSettings,
    setView,
    setActiveStorySection,
    setCurrentOutlineChapterId,
    refreshProjects,
    selectProject,
    createProject,
    updateProject,
    createChapter,
    updateChapter,
    deleteChapter,
    createScene,
    updateScene,
    deleteScene,
    selectScene,
    listSceneSnapshots,
    restoreSceneSnapshot,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    generateCharacter,
    analyzeStyle,
    createWorld,
    updateWorld,
    deleteWorld,
    createNote,
    updateNote,
    deleteNote,
    saveStoryBible,
    updateBibleSection,
    setStoryBible,
    ensureStoryBible,
    regenerateStoryBible,
    regenerateBibleSection,
    markBibleStale,
    clearBibleStale,
    previewBibleCharacters,
    importCharactersFromBible,
    syncCharactersFromBible,
    previewBibleWorld,
    importWorldFromBible,
    syncWorldFromBible,
    revertBibleImport,
    createConversation,
    selectConversation,
    deleteConversation,
    loadMessages,
    createMessage,
    createBeat,
    updateBeat,
    deleteBeat,
    suggestBeats,
    applyContentActions,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}