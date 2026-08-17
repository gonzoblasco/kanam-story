'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
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
import { buildAgentContext, buildSuggestBeatsPrompt, buildGenerateCharacterPrompt, buildEnrichCharacterPrompt, buildEnrichWorldPrompt, buildStyleProfilePrompt } from '@/lib/agentPrompts';
import { parseBeatList, parseSuggestedCharacterList, parseEnrichedCharacter, parseEnrichedWorld, parseStyleProfile } from '@/lib/agentReply';
import { mapRoleToType, mapCategoryToKind } from '@/lib/labels';
import { buildCharacterSyncPlan, buildWorldSyncPlan } from '@/lib/bibleSync';
import { shouldSnapshot, buildSnapshot } from '@/lib/snapshots';
import { ollamaChat } from '@/lib/ollama';
import { BIBLE_SECTION_DEFAULTS } from '@/lib/db';
import { parseBibleSections } from '@/lib/bibleParse';
import { GENRE_TEMPLATES, type ProjectTemplate } from '@/lib/projectTemplates';
import { reorderChapters, moveBeatToChapter } from '@/lib/outline';
import { ensureHtml } from '@/lib/proseToHtml';
import { suggestGlobalOutline, type SuggestedChapter } from '@/lib/outlineGeneration';

/** U5 — Punto de partida al crear un proyecto (nunca obligatorio). */
export type StarterStructure =
  | { kind: 'empty' }
  | { kind: 'outline' }
  | { kind: 'bible' }
  | { kind: 'template'; templateKey: string };

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
  view: 'editor' | 'outline' | 'story' | 'chapter-reader';
  /** Sección de Historia activa en la vista apilada (sidebar). */
  activeStorySection: StorySectionKey;
  currentOutlineChapterId: string | null;

  setSettings: (patch: Partial<Settings>) => Promise<void>;
  setView: (view: 'editor' | 'outline' | 'story' | 'chapter-reader') => void;
  /** Capítulo activo en la vista de lectura del capítulo completo. */
  currentChapterId: string | null;
  /** Abre o cierra la vista de lectura del capítulo completo. */
  setCurrentChapterId: (id: string | null) => void;
  /** Nonce que el Editor observa para tomar el foco. */
  editorFocusNonce: number;
  /** Pide al editor tomar el foco (nonce observado por `Editor`). */
  requestEditorFocus: () => void;
  /** U8: nonce que `StorySections` observa para enfocar una sección apilada. */
  sectionFocusNonce: number;
  /** U8: sección a enfocar cuando `sectionFocusNonce` cambia. */
  sectionFocusTarget: StorySectionKey | null;
  /** U8: pide enfocar la sección apilada indicada (p.ej. tras aceptar una
   *  propuesta del co-writer que navega a Personajes/Mundo/Biblia). */
  requestSectionFocus: (key: StorySectionKey) => void;
  /** Mensaje para la live region global (role="status", persistente). */
  announcement: string;
  /** Anuncia un mensaje en la live region global. */
  announce: (msg: string) => void;
  setActiveStorySection: (key: StorySectionKey) => void;
  setCurrentOutlineChapterId: (id: string | null) => void;
  refreshProjects: () => Promise<void>;
  selectProject: (id: string | null) => Promise<void>;
  /** Borra un proyecto y todo su contenido (cascada) desde la DB. */
  deleteProject: (id: string) => Promise<void>;
  createProject: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Project>;
  /** U5: crea un proyecto y opcionalmente su estructura inicial (capítulos/beats + biblia). */
  createProjectWithStructure: (
    data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>,
    starter: StarterStructure,
  ) => Promise<Project>;
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
  /** Enriches an existing character's profile with depth, respecting the world. */
  enrichCharacter: (id: string) => Promise<void>;
  /** Enriches an existing world entity with depth, respecting the world. */
  enrichWorld: (id: string) => Promise<void>;
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
  /** Move a beat to a different chapter (global outline view). */
  moveBeatToChapter: (beatId: string, targetChapterId: string) => Promise<void>;
  /** Reorder chapters up/down (global outline view). */
  reorderChapters: (chapterId: string, dir: -1 | 1) => Promise<void>;
  /** Asks the agent to propose a beat map for a chapter (tool suggest_beats). */
  suggestBeats: (chapterId: string) => Promise<Beat[]>;
  /** U2: suggests a full global outline (chapters + beats) from project context. */
  suggestGlobalOutline: () => Promise<SuggestedChapter[]>;
  /** U2: applies a suggested global outline, replacing chapters and beats. */
  applyGlobalOutline: (suggestions: SuggestedChapter[]) => Promise<void>;

  /** Applies agent actions to the real state (persists to IndexedDB) and returns an undo function. */
  applyContentActions: (actions: ContentAction[]) => Promise<{ undo: () => Promise<void>; failed: string[] }>;
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
  const [view, setViewState] = useState<'editor' | 'outline' | 'story' | 'chapter-reader'>('editor');
  const [currentChapterId, setCurrentChapterIdState] = useState<string | null>(null);
  const [activeStorySection, setActiveStorySectionState] = useState<StorySectionKey>('co-writer');
  const [currentOutlineChapterId, setCurrentOutlineChapterIdState] = useState<string | null>(null);
  // U4: nonce que pide al editor tomar el foco (p.ej. tras generar una escena
  // desde el outline). Cada `requestEditorFocus()` incrementa el contador y el
  // `Editor` lo observa para llamar `editor.commands.focus()`.
  const [editorFocusNonce, setEditorFocusNonce] = useState(0);
  // U8: nonce + destino para enfocar una sección apilada tras una navegación
  // contextual (p.ej. aceptar una propuesta del co-writer que apunta a
  // Personajes/Mundo/Biblia). `StorySections` observa el nonce y enfoca el
  // heading de la sección, evitando que el foco caiga a <body> al desmontarse
  // el botón Aceptar/Descartar.
  const [sectionFocusNonce, setSectionFocusNonce] = useState(0);
  const [sectionFocusTarget, setSectionFocusTarget] = useState<StorySectionKey | null>(null);
  // U4: anuncio global para live region. Se muestra en un `role="status"` que
  // vive a nivel de página (persistente) para que el AT lo lea aunque el
  // componente que generó el feedback cambie de vista (p.ej. Outline → Editor).
  const [announcement, setAnnouncement] = useState('');
  const announceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announce = useCallback((msg: string) => {
    if (announceTimer.current) clearTimeout(announceTimer.current);
    setAnnouncement(msg);
    // Limpia el anuncio para que un mensaje repetido vuelva a anunciarse.
    announceTimer.current = setTimeout(() => setAnnouncement(''), 5000);
  }, []);

  const setView = useCallback(
    (v: 'editor' | 'outline' | 'story' | 'chapter-reader') => {
      setViewState(v);
      // Al salir de la vista de lectura de capítulo, limpiamos el capítulo activo
      // para que no quede colgado si volvemos al editor/outline.
      if (v !== 'chapter-reader') {
        setCurrentChapterIdState(null);
      }
    },
    [],
  );
  const setCurrentChapterId = useCallback((id: string | null) => {
    setCurrentChapterIdState(id);
    if (id) {
      setViewState('chapter-reader');
    } else if (view === 'chapter-reader') {
      setViewState('editor');
    }
  }, [view]);
  const requestEditorFocus = useCallback(() => setEditorFocusNonce((n) => n + 1), []);
  const requestSectionFocus = useCallback((key: StorySectionKey) => {
    setSectionFocusTarget(key);
    setSectionFocusNonce((n) => n + 1);
  }, []);
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
      const projectScenes = await scenesDB.listByProject(id);
      const sceneId = settings.lastSceneId;
      if (sceneId && projectScenes.some((s) => s.id === sceneId)) {
        setCurrentSceneId(sceneId);
      } else {
        setCurrentSceneId(null);
      }
    },
    [loadProjectData, settings.lastSceneId],
  );

  const deleteProject = useCallback(
    async (id: string) => {
      await projectsDB.delete(id);
      // Si borramos el proyecto activo, limpiar el estado.
      if (currentProject?.id === id) {
        await selectProject(null);
      } else {
        const updated = await projectsDB.list();
        setProjects(updated);
      }
      // Si el proyecto borrado era el último seleccionado, olvidarlo.
      if (settings.lastProjectId === id) {
        await settingsDB.update({ lastProjectId: undefined });
      }
    },
    [currentProject, settings.lastProjectId, selectProject],
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
      const startId = s.lastProjectId && list.some((p) => p.id === s.lastProjectId)
        ? s.lastProjectId
        : list[0]?.id ?? null;
      if (startId) await selectProject(startId);
      setReady(true);
    })();
  }, [selectProject]);

  useEffect(() => {
    if (!ready) return;
    const patch: Partial<Settings> = {};
    if (currentProject?.id) patch.lastProjectId = currentProject.id;
    if (currentSceneId) patch.lastSceneId = currentSceneId;
    if (Object.keys(patch).length > 0) {
      void settingsDB.update(patch);
    }
  }, [currentProject?.id, currentSceneId, ready]);

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

  // U5: crea el proyecto y, según el punto de partida elegido (opcional),
  // arma su estructura inicial: outline (capítulo + beat), biblia en blanco,
  // plantilla de género (capítulos + beats sugeridos) o vacío (sin estructura).
  const createProjectWithStructure = useCallback(
    async (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>, starter: StarterStructure) => {
      const p = await projectsDB.create(data);
      if (starter.kind === 'outline') {
        const chapter = await chaptersDB.create({
          projectId: p.id,
          title: 'Capítulo 1',
          order: 0,
        });
        await beatsDB.create({
          projectId: p.id,
          chapterId: chapter.id,
          kind: 'custom',
          title: 'Primer beat',
          description: '',
          notes: '',
          characters: [],
          status: 'draft',
          source: 'manual',
          position: 0,
        });
      } else if (starter.kind === 'bible') {
        await storyBibleDB.create(p.id);
      } else if (starter.kind === 'template') {
        const template: ProjectTemplate | undefined = GENRE_TEMPLATES.find(
          (t) => t.key === starter.templateKey,
        );
        if (template) {
          for (const [ci, ch] of template.chapters.entries()) {
            const chapter = await chaptersDB.create({
              projectId: p.id,
              title: ch.title,
              order: ci,
            });
            for (const [bi, beat] of ch.beats.entries()) {
              await beatsDB.create({
                projectId: p.id,
                chapterId: chapter.id,
                kind: beat.kind,
                title: beat.title,
                description: beat.description,
                notes: beat.notes,
                characters: [],
                status: 'draft',
                source: 'manual',
                position: bi,
              });
            }
          }
          if (template.includeBible) {
            await storyBibleDB.create(p.id);
          }
        }
      }
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
      // value. If the sceneSnapshots store is unavailable (corrupted/interrupted
      // upgrade), skip the snapshot and continue saving the scene.
      try {
        const existing = await scenesDB.get(id);
        if (existing) {
          const last = await sceneSnapshotsDB.getLatest(id);
          if (shouldSnapshot(existing, last)) {
            await sceneSnapshotsDB.create(buildSnapshot(existing, Date.now()));
          }
        }
      } catch (err) {
        console.warn('Scene snapshot skipped (store unavailable):', err);
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

  const enrichCharacter = useCallback(
    async (id: string) => {
      const character = characters.find((c) => c.id === id);
      if (!currentProject || !character || !settings.ollamaModel) return;
      const context = buildAgentContext({
        project: currentProject,
        characters,
        world,
        chapters,
        scenes,
        beats,
        storyBible,
      });
      const prompt = buildEnrichCharacterPrompt(context, character);
      const text = await ollamaChat({
        ollamaUrl: settings.ollamaUrl,
        model: settings.ollamaModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
      });
      const enriched = parseEnrichedCharacter(text);
      if (!enriched) return;
      // Merge solo los campos que el modelo devolvió; preserva el id y source.
      await updateCharacter(id, enriched);
    },
    [currentProject, characters, world, chapters, scenes, beats, storyBible, updateCharacter, settings.ollamaUrl, settings.ollamaModel],
  );

  const enrichWorld = useCallback(
    async (id: string) => {
      const entity = world.find((w) => w.id === id);
      if (!currentProject || !entity || !settings.ollamaModel) return;
      const context = buildAgentContext({
        project: currentProject,
        characters,
        world,
        chapters,
        scenes,
        beats,
        storyBible,
      });
      const prompt = buildEnrichWorldPrompt(context, entity);
      const text = await ollamaChat({
        ollamaUrl: settings.ollamaUrl,
        model: settings.ollamaModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
      });
      const enriched = parseEnrichedWorld(text);
      if (!enriched) return;
      await updateWorld(id, enriched);
    },
    [currentProject, characters, world, chapters, scenes, beats, storyBible, updateWorld, settings.ollamaUrl, settings.ollamaModel],
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

  /** U1 — global outline: move a beat to a different chapter. */
  const moveBeatToChapterAction = useCallback(
    async (beatId: string, targetChapterId: string) => {
      if (!currentProject) return;
      const update = moveBeatToChapter(beats, chapters, beatId, targetChapterId);
      if (!update) return;
      await updateBeat(update.id, {
        chapterId: update.chapterId,
        position: update.position,
      });
    },
    [currentProject, beats, chapters, updateBeat],
  );

  /** U1 — global outline: reorder chapters up/down. */
  const reorderChaptersAction = useCallback(
    async (chapterId: string, dir: -1 | 1) => {
      if (!currentProject) return;
      const swaps = reorderChapters(chapters, chapterId, dir);
      if (!swaps) return;
      for (const s of swaps) {
        await chaptersDB.update(s.id, { order: s.order });
      }
      await loadProjectData(currentProject.id);
    },
    [currentProject, chapters, loadProjectData],
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

  const suggestGlobalOutlineAction = useCallback(async (): Promise<SuggestedChapter[]> => {
    if (!currentProject) return [];
    return suggestGlobalOutline({
      project: currentProject,
      characters,
      world,
      chapters,
      beats,
      settings,
    });
  }, [currentProject, characters, world, chapters, beats, settings]);

  const applyGlobalOutline = useCallback(
    async (suggestions: SuggestedChapter[]) => {
      if (!currentProject) return;
      const projectBeats = beats.filter((b) => b.projectId === currentProject.id);
      const projectChapters = chapters.filter((c) => c.projectId === currentProject.id);
      for (const b of projectBeats) {
        await beatsDB.delete(b.id);
      }
      for (const c of projectChapters) {
        await chaptersDB.delete(c.id);
      }
      const createdChapters: Chapter[] = [];
      for (let i = 0; i < suggestions.length; i++) {
        const created = await chaptersDB.create({
          projectId: currentProject.id,
          title: suggestions[i].title,
          order: i,
        });
        createdChapters.push(created);
      }
      for (let i = 0; i < suggestions.length; i++) {
        const chapter = createdChapters[i];
        for (let j = 0; j < suggestions[i].beats.length; j++) {
          const b = suggestions[i].beats[j];
          await beatsDB.create({
            projectId: currentProject.id,
            chapterId: chapter.id,
            kind: b.kind,
            title: b.title,
            description: b.description ?? '',
            notes: b.notes ?? '',
            characters: [],
            status: 'draft',
            source: 'ai',
            position: j,
          });
        }
      }
      await loadProjectData(currentProject.id);
      setCurrentOutlineChapterId(createdChapters[0]?.id ?? null);
    },
    [currentProject, beats, chapters, loadProjectData, setCurrentOutlineChapterId],
  );

  const applyContentActions = useCallback(
    async (actions: ContentAction[]): Promise<{ undo: () => Promise<void>; failed: string[] }> => {
      if (!currentProject) return { undo: async () => {}, failed: [] };
      // Capture previous values so we can revert each action.
      // Read each entity fresh from the DB (not from the React snapshot) so that
      // multiple actions on the same entity within one batch capture the correct
      // intermediate value as the "before" for the undo.
      const undos: Array<() => Promise<void>> = [];
      const failed: string[] = [];

      for (const action of actions) {
        switch (action.type) {
          case 'rewrite_scene': {
            const scene = await scenesDB.get(action.sceneId);
            if (scene) {
              const prev = scene.content;
              // Normaliza a HTML para que TipTap muestre párrafos (el agente
              // puede devolver texto plano/markdown con saltos de línea).
              await updateScene(action.sceneId, { content: ensureHtml(action.after) });
              undos.push(() => updateScene(action.sceneId, { content: prev }));
              // The manuscript changed → the manuscript-derived sections are stale.
              await markBibleStale(['summary', 'themes', 'rules']);
              undos.push(() => clearBibleStale(['summary', 'themes', 'rules']));
            } else {
              failed.push(`escena ${action.sceneId}`);
            }
            break;
          }
          case 'update_scene_notes': {
            const scene = await scenesDB.get(action.sceneId);
            if (scene) {
              const prev = scene.continuityNotes ?? '';
              await updateScene(action.sceneId, { continuityNotes: action.notes });
              undos.push(() => updateScene(action.sceneId, { continuityNotes: prev }));
            } else {
              failed.push(`escena ${action.sceneId}`);
            }
            break;
          }
          case 'update_beat': {
            const beat = await beatsDB.get(action.beatId);
            if (beat) {
              const prev = { ...beat };
              await updateBeat(action.beatId, action.changes);
              undos.push(() => updateBeat(action.beatId, prev));
            } else {
              failed.push(`beat ${action.beatId}`);
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
            } else {
              failed.push(`personaje ${action.characterId}`);
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
            } else {
              failed.push(`entidad ${action.entityId}`);
            }
            break;
          }
          case 'delete_character': {
            const character = await charactersDB.get(action.characterId);
            if (character) {
              await deleteCharacter(action.characterId);
              undos.push(() => createCharacter(character).then(() => {}));
              await markBibleStale(['characters']);
              undos.push(() => clearBibleStale(['characters']));
            } else {
              failed.push(`personaje ${action.characterId}`);
            }
            break;
          }
          case 'delete_world': {
            const entity = await worldDB.get(action.entityId);
            if (entity) {
              await deleteWorld(action.entityId);
              undos.push(() => createWorld(entity).then(() => {}));
              await markBibleStale(['world']);
              undos.push(() => clearBibleStale(['world']));
            } else {
              failed.push(`entidad ${action.entityId}`);
            }
            break;
          }
          case 'update_project': {
            if (currentProject) {
              const prev = {
                name: currentProject.name,
                description: currentProject.description,
                genre: currentProject.genre,
                tone: currentProject.tone,
                pov: currentProject.pov,
                style: currentProject.style,
              };
              await updateProject(currentProject.id, action.changes);
              undos.push(() => updateProject(currentProject.id, prev));
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
              content: ensureHtml(action.content),
              summary: action.summary,
              order: scenes.filter((s) => s.chapterId === action.chapterId).length,
            });
            undos.push(() => deleteScene(created.id));
            // New manuscript content → manuscript-derived sections are stale.
            await markBibleStale(['summary', 'themes', 'rules']);
            undos.push(() => clearBibleStale(['summary', 'themes', 'rules']));
            break;
          }
          case 'replace_outline': {
            // Snapshot current outline (chapters + beats) and the chapter each
            // scene belongs to, so we can fully restore on undo.
            const projectId = currentProject.id;
            const oldChapters = [...chapters];
            const oldBeats = [...beats];
            const projectScenes = await scenesDB.listByProject(projectId);
            const sceneChapterMap = new Map(projectScenes.map((s) => [s.id, s.chapterId]));

            // Move existing scenes to orphaned state so they survive chapter deletion.
            for (const scene of projectScenes) {
              await scenesDB.update(scene.id, { chapterId: '' });
            }

            // Delete current beats and chapters.
            for (const b of oldBeats) {
              await beatsDB.delete(b.id);
            }
            for (const c of oldChapters) {
              await chaptersDB.delete(c.id);
            }

            // Create new chapters in order.
            const createdChapters: Chapter[] = [];
            for (const [index, ch] of action.chapters.entries()) {
              const created = await chaptersDB.create({
                projectId,
                title: ch.title,
                order: ch.order ?? index,
              });
              createdChapters.push(created);
            }

            // Create new beats assigned to the corresponding new chapter.
            const createdBeats: Beat[] = [];
            for (const b of action.beats) {
              const chapterId = createdChapters[b.chapterIndex]?.id;
              const created = await beatsDB.create({
                projectId,
                chapterId,
                kind: b.kind,
                title: b.title,
                description: b.description,
                notes: b.notes,
                characters: [],
                position: b.position,
                status: b.status ?? 'draft',
                source: 'ai',
              });
              createdBeats.push(created);
            }

            await loadProjectData(projectId);

            undos.push(async () => {
              // Delete new outline.
              for (const b of createdBeats) {
                await beatsDB.delete(b.id);
              }
              for (const c of createdChapters) {
                await chaptersDB.delete(c.id);
              }
              // Restore previous chapters and beats preserving original ids.
              for (const c of oldChapters) {
                await chaptersDB.put(c);
              }
              for (const b of oldBeats) {
                await beatsDB.put(b);
              }
              // Restore scene chapter assignments.
              for (const [sceneId, chapterId] of sceneChapterMap.entries()) {
                await scenesDB.update(sceneId, { chapterId });
              }
              await loadProjectData(projectId);
            });
            break;
          }
          case 'update_outline': {
            const projectId = currentProject.id;
            const oldChapters = [...chapters];
            const oldBeats = [...beats];
            const projectScenes = await scenesDB.listByProject(projectId);
            const sceneChapterMap = new Map(projectScenes.map((s) => [s.id, s.chapterId]));

            // Renombrar capítulo
            if (action.renameChapter) {
              const ch = chapters.find((c) => c.id === action.renameChapter!.chapterId);
              if (ch) await chaptersDB.update(ch.id, { title: action.renameChapter.title });
            }

            // Borrar capítulo: sus escenas quedan huérfanas, sus beats se borran
            if (action.deleteChapter) {
              const delId = action.deleteChapter.chapterId;
              for (const b of beats.filter((x) => x.chapterId === delId)) {
                await beatsDB.delete(b.id);
              }
              for (const s of projectScenes.filter((x) => x.chapterId === delId)) {
                await scenesDB.update(s.id, { chapterId: '' });
              }
              await chaptersDB.delete(delId);
            }

            // Agregar beats
            if (action.addBeats && action.addBeats.length > 0) {
              for (const ab of action.addBeats) {
                let chapterId = ab.chapterId;
                if (!chapterId && ab.sceneId) {
                  chapterId = projectScenes.find((s) => s.id === ab.sceneId)?.chapterId;
                }
                const position =
                  ab.beat.position ??
                  beats.filter((b) =>
                    ab.sceneId
                      ? b.sceneId === ab.sceneId
                      : b.chapterId === chapterId && !b.sceneId,
                  ).length;
                await beatsDB.create({
                  projectId,
                  chapterId,
                  sceneId: ab.sceneId,
                  kind: ab.beat.kind,
                  title: ab.beat.title,
                  description: ab.beat.description,
                  notes: ab.beat.notes,
                  characters: ab.beat.characters ?? [],
                  position,
                  status: ab.beat.status ?? 'draft',
                  source: 'ai',
                });
              }
            }

            // Borrar beat
            if (action.deleteBeat) {
              await beatsDB.delete(action.deleteBeat.beatId);
            }

            // Mover beat a otro capítulo
            if (action.moveBeatToChapter) {
              const { beatId, targetChapterId } = action.moveBeatToChapter;
              await beatsDB.update(beatId, { chapterId: targetChapterId, sceneId: undefined });
            }

            // Actualizar beat
            if (action.updateBeat) {
              await beatsDB.update(action.updateBeat.beatId, action.updateBeat.changes);
            }

            await loadProjectData(projectId);

            undos.push(async () => {
              // Restore chapters, beats and scene assignments preserving ids.
              for (const c of oldChapters) {
                await chaptersDB.put(c);
              }
              for (const b of oldBeats) {
                await beatsDB.put(b);
              }
              for (const [sceneId, chapterId] of sceneChapterMap.entries()) {
                await scenesDB.update(sceneId, { chapterId });
              }
              await loadProjectData(projectId);
            });
            break;
          }
        }
      }

      // Revert in reverse order.
      return {
        failed,
        undo: async () => {
          for (let i = undos.length - 1; i >= 0; i--) {
            await undos[i]();
          }
        },
      };
    },
    [currentProject, storyBible, scenes, beats, chapters, loadProjectData, updateScene, updateBeat, createBeat, deleteBeat, updateCharacter, createCharacter, deleteCharacter, updateWorld, deleteWorld, createWorld, updateProject, updateBibleSection, createScene, deleteScene, markBibleStale, clearBibleStale],
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
    currentChapterId,
    setSettings,
    setView,
    editorFocusNonce,
    requestEditorFocus,
    sectionFocusNonce,
    sectionFocusTarget,
    requestSectionFocus,
    announcement,
    announce,
    setActiveStorySection,
    setCurrentOutlineChapterId,
    setCurrentChapterId,
    refreshProjects,
    selectProject,
    deleteProject,
    createProject,
    createProjectWithStructure,
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
    enrichCharacter,
    enrichWorld,
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
    moveBeatToChapter: moveBeatToChapterAction,
    reorderChapters: reorderChaptersAction,
    suggestBeats,
    suggestGlobalOutline: suggestGlobalOutlineAction,
    applyGlobalOutline,
    applyContentActions,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}