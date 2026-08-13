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
} from '@/lib/db';
import {
  parseCharacterEntries,
  parseWorldEntries,
  safeParseJsonArray,
} from '@/lib/bibleExtract';
import {
  buildBibleExtractPrompt,
  buildStoryBiblePrompt,
} from '@/lib/prompts';
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

  setSettings: (patch: Partial<Settings>) => Promise<void>;
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

  createCharacter: (data: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Character>;
  updateCharacter: (id: string, data: Partial<Character>) => Promise<void>;
  deleteCharacter: (id: string) => Promise<void>;

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

  previewBibleCharacters: (rawMarkdown: string) => Promise<Partial<Character>[]>;
  importCharactersFromBible: (entries: Partial<Character>[]) => Promise<Character[]>;
  previewBibleWorld: (rawMarkdown: string) => Promise<Partial<WorldEntity>[]>;
  importWorldFromBible: (entries: Partial<WorldEntity>[]) => Promise<WorldEntity[]>;

  createConversation: (data: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Conversation>;
  selectConversation: (id: string | null) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  createMessage: (data: Omit<Message, 'id' | 'createdAt'>) => Promise<Message>;

  createBeat: (data: Omit<Beat, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Beat>;
  updateBeat: (id: string, data: Partial<Beat>) => Promise<void>;
  deleteBeat: (id: string) => Promise<void>;
  loadBeatsByChapter: (chapterId: string) => Promise<void>;
  loadBeatsByScene: (sceneId: string) => Promise<void>;
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
    setCurrentConversationId(null);
    setMessages([]);
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
            if (models.length > 0) {
              s = { ...s, ollamaModel: models[0] };
              await settingsDB.update({ ollamaModel: models[0] });
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
    if (settings.theme === 'dark') {
      document.documentElement.setAttribute('data-bs-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-bs-theme', 'light');
    }
  }, [settings.theme]);

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
      if (currentProject) await loadProjectData(currentProject.id);
    },
    [currentProject, loadProjectData],
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

  const previewBibleCharacters = useCallback(
    async (rawMarkdown: string): Promise<Partial<Character>[]> => {
      const parsed = parseCharacterEntries(rawMarkdown);
      const fromMarkdown: Partial<Character>[] = parsed
        .filter((c) => c.name)
        .map((c) => ({
          name: c.name,
          role: c.role,
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
      type LooseCharacter = Partial<Character> & { name?: string };
      const loose = safeParseJsonArray<LooseCharacter>(text);
      return loose
        .filter((c): c is LooseCharacter => typeof c?.name === 'string' && c.name.length > 0)
        .map((c) => ({
          name: c.name!,
          role: typeof c.role === 'string' ? c.role : '',
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
          role: e.role ?? '',
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

  const previewBibleWorld = useCallback(
    async (rawMarkdown: string): Promise<Partial<WorldEntity>[]> => {
      const parsed = parseWorldEntries(rawMarkdown);
      const fromMarkdown: Partial<WorldEntity>[] = parsed.map((w) => ({
        name: w.name,
        category: w.category,
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
      type LooseWorld = Partial<WorldEntity> & { name?: string; category?: string };
      const loose = safeParseJsonArray<LooseWorld>(text);
      const allowed: WorldEntity['category'][] = ['location', 'lore', 'rule', 'item', 'other'];
      return loose
        .filter((w): w is LooseWorld => typeof w?.name === 'string' && w.name.length > 0)
        .map((w) => ({
          name: w.name!,
          category: allowed.includes(w.category as WorldEntity['category'])
            ? (w.category as WorldEntity['category'])
            : 'other',
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
          category: e.category ?? 'other',
          description: e.description ?? '',
          source: 'biblia',
        });
        created.push(w);
      }
      return created;
    },
    [currentProject, createWorld],
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

  const loadBeatsByChapter = useCallback(async (chapterId: string) => {
    const bts = await beatsDB.listByChapter(chapterId);
    setBeats(bts);
  }, []);

  const loadBeatsByScene = useCallback(async (sceneId: string) => {
    const bts = await beatsDB.listByScene(sceneId);
    setBeats(bts);
  }, []);

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
    setSettings,
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
    createCharacter,
    updateCharacter,
    deleteCharacter,
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
    previewBibleCharacters,
    importCharactersFromBible,
    previewBibleWorld,
    importWorldFromBible,
    createConversation,
    selectConversation,
    deleteConversation,
    loadMessages,
    createMessage,
    createBeat,
    updateBeat,
    deleteBeat,
    loadBeatsByChapter,
    loadBeatsByScene,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}