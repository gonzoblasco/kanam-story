export interface Project {
  id: string;
  name: string;
  description: string;
  genre: string;
  tone: string;
  pov: 'first' | 'third-limited' | 'third-omniscient' | 'second';
  style: string;
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

export interface Character {
  id: string;
  projectId: string;
  name: string;
  role: string;
  age: string;
  appearance: string;
  personality: string;
  voice: string;
  backstory: string;
  goals: string;
  source?: 'manual' | 'biblia';
  createdAt: number;
  updatedAt: number;
}

export interface WorldEntity {
  id: string;
  projectId: string;
  name: string;
  category: 'location' | 'lore' | 'rule' | 'item' | 'other';
  description: string;
  source?: 'manual' | 'biblia';
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