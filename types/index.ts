/** Keys of the stacked sections shown in the Historia view (Fase 4, U1). */
export type StorySectionKey =
  | 'co-writer'
  | 'brainstorm'
  | 'characters'
  | 'world'
  | 'bible'
  | 'bible-settings'
  | 'compass';

export type StyleMode = 'featured' | 'custom' | 'match';

/** Narrative style of the project. `match` (Match My Style) arrives in Slice 9. */
export interface ProjectStyle {
  mode: StyleMode;
  featured?: string;   // preset elegido
  custom?: string;     // instrucciones libres
  profile?: StyleProfile; // perfil de Match My Style (Slice 9)
}

/** Extracted author style profile (Match My Style, Slice 9). */
export interface StyleProfile {
  tone: string;
  rhythm: string;
  sentenceLength: string;
  vocabulary: string;
  dialogue: string;
  imagery: string;
  subtext: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  genre: string;
  genres?: string[];       // Slice 6: multi-select con tags
  tone: string;
  pov: 'first' | 'third-limited' | 'third-omniscient' | 'second';
  tense?: 'past' | 'present' | 'future'; // Slice 10: tiempo verbal del narrador
  style: ProjectStyle;     // Slice 6: objeto (antes string)
  braindump?: string;      // Slice 6: volcado libre de ideas (contexto de bajo peso)
  synopsis?: string;       // Slice 6: override manual sobre la sección auto-generada
  // Brújula Narrativa (Slice 4)
  premise?: string;      // la idea en 1-2 frases
  promise?: string;      // qué le prometemos al lector
  theme?: string;        // tema central
  protagonist?: string;  // id de Character protagonista
  createdAt: number;
  updatedAt: number;
}

export interface Chapter {
  id: string;
  projectId: string;
  title: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface Scene {
  id: string;
  projectId: string;
  chapterId: string;
  title: string;
  content: string;
  summary: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * B6 — Versioning / snapshots. A point-in-time copy of a scene's editable
 * fields (title, content, summary), captured each time the scene is saved.
 * Stored in a dedicated `sceneSnapshots` store (keyed by `id`), indexed by
 * `sceneId` + `createdAt` so the history can be listed newest-first.
 */
export interface SceneSnapshot {
  id: string;
  sceneId: string;
  projectId: string;
  title: string;
  content: string;
  summary: string;
  createdAt: number;
}

export type CharacterType =
  | 'protagonist'
  | 'antagonist'
  | 'supporting'
  | 'minor'
  | 'love_interest'
  | 'custom';

export interface Character {
  id: string;
  projectId: string;
  name: string;
  type: CharacterType;
  age: string;
  appearance: string;
  personality: string;
  voice: string;
  backstory: string;
  goals: string;
  // Slice 7: fichas ricas
  pronouns?: string;
  groups?: string[];
  otherNames?: string[];
  traits?: string[];
  inContext?: boolean; // si false, se excluye del contexto del agente
  source?: 'manual' | 'biblia' | 'ai';
  createdAt: number;
  updatedAt: number;
}

export type WorldKind =
  | 'place'
  | 'organization'
  | 'lore'
  | 'key_event'
  | 'clue'
  | 'magic_system'
  | 'item'
  | 'rule'
  | 'other';

export interface WorldEntity {
  id: string;
  projectId: string;
  name: string;
  kind: WorldKind;
  description: string;
  // Slice 8: worldbuilding tipado fino
  otherNames?: string[];
  traits?: string[];
  inContext?: boolean; // si false, se excluye del contexto del agente
  source?: 'manual' | 'biblia' | 'ai';
  createdAt: number;
  updatedAt: number;
}

export interface BrainstormNote {
  id: string;
  projectId: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface StoryBibleSection {
  key: 'summary' | 'themes' | 'characters' | 'world' | 'rules';
  label: string;
  manual: string;
  auto: string;
  updatedAt: number;
  /** Timestamp when the source material changed after this section was generated (stale). */
  staleAt?: number;
}

export interface StoryBible {
  id: string;
  projectId: string;
  sections: StoryBibleSection[];
  generatedAt: number;
  updatedAt: number;
}

export interface Settings {
  id: 'singleton';
  ollamaUrl: string;
  ollamaModel: string;
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  rightPanelCollapsed: boolean;
}

export type AICommand = 'write' | 'describe' | 'rewrite' | 'brainstorm';

// --- Chat (the heart) ---

export interface Conversation {
  id: string;
  projectId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

/**
 * Action the agent executed on the content (the agent "has hands").
 * Must be applicable and reversible (to accept/undo a proposal before it becomes final).
 */
export type ContentAction =
  | { type: 'rewrite_scene'; sceneId: string; before: string; after: string; summary: string }
  | { type: 'update_beat'; beatId: string; changes: Partial<Beat>; summary: string }
  | { type: 'add_beat'; chapterId: string; beat: Beat; summary: string }
  | { type: 'update_character'; characterId: string; changes: Partial<Character>; summary: string }
  | { type: 'add_character'; character: Character; summary: string }
  | { type: 'update_world'; entityId: string; changes: Partial<WorldEntity>; summary: string }
  | { type: 'update_bible'; section: StoryBibleSection['key']; value: string; summary: string }
  | { type: 'append_scene'; chapterId: string; content: string; summary: string };

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  actions: ContentAction[];
  createdAt: number;
}

// --- Outline & Beats ---

export type BeatKind = 'inciting' | 'rising' | 'climax' | 'falling' | 'resolution' | 'custom';
export type BeatStatus = 'draft' | 'done' | 'revising';
export type BeatSource = 'manual' | 'ai';

/** Structure map of a chapter/scene. Persisted in a separate `beats` store (with chapterId/sceneId). */
export interface Beat {
  id: string;
  projectId?: string;
  chapterId?: string;
  sceneId?: string;
  kind: BeatKind;
  title: string;
  description: string;   // what happens in this beat
  notes: string;         // intent, tone, elements to watch
  characters: string[];  // ids of involved Characters
  location?: string;     // id of WorldEntity (place)
  status: BeatStatus;
  source: BeatSource;    // defined by hand or suggested by AI
  position: number;
  createdAt: number;
  updatedAt: number;
}