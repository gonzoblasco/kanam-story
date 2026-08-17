import type { ContentAction, BeatKind, BeatStatus, CharacterType, Character, WorldEntity, StyleProfile } from '@/types';
import { normalizeKind } from '@/lib/outlineGeneration';

/**
 * Structured agent response.
 *
 * The model returns a JSON block with two fields:
 * - `reply`: the conversational text (what the agent "says").
 * - `actions`: an array of ContentAction the agent proposes to apply.
 *
 * The block may be wrapped in markdown fences (```json ... ```) or bare.
 * The model text may contain prose before/after the block.
 */
export interface AgentReply {
  reply: string;
  actions: ContentAction[];
}

/**
 * Extracts the JSON block from the model response and parses it.
 *
 * Strategy: start from the first `{` and try parsing the range up to each `}`
 * from the end, moving left until one parses. This tolerates prose (with
 * stray braces) that the model emits after the JSON block, which a naive
 * "first { to last }" approach would break. If none parse, returns null.
 */
export function parseAgentReply(raw: string): AgentReply | null {
  const text = (raw ?? '').trim();
  if (!text) return null;

  const firstBrace = text.indexOf('{');
  if (firstBrace === -1) return null;

  let lastBrace = text.lastIndexOf('}');
  while (lastBrace > firstBrace) {
    const candidate = text.slice(firstBrace, lastBrace + 1);
    try {
      const parsed = JSON.parse(candidate);
      if (typeof parsed !== 'object' || parsed === null) return null;
      const reply = typeof parsed.reply === 'string' ? parsed.reply : '';
      const actions = Array.isArray(parsed.actions) ? parsed.actions : [];
      return { reply, actions: normalizeActionKinds(actions) };
    } catch {
      lastBrace = text.lastIndexOf('}', lastBrace - 1);
    }
  }
  return null;
}

function normalizeActionKinds(actions: unknown[]): ContentAction[] {
  return actions.map((a) => {
    if (typeof a !== 'object' || a === null) return a;
    const action = a as Record<string, unknown>;
    if (action.type === 'replace_outline' && Array.isArray(action.beats)) {
      action.beats = action.beats.map((b) => {
        if (typeof b !== 'object' || b === null) return b;
        const beat = b as Record<string, unknown>;
        if (typeof beat.kind === 'string') {
          beat.kind = normalizeKind(beat.kind);
        }
        return beat;
      });
    }
    if (action.type === 'update_outline' && Array.isArray(action.addBeats)) {
      action.addBeats = action.addBeats.map((ab) => {
        if (typeof ab !== 'object' || ab === null) return ab;
        const entry = ab as Record<string, unknown>;
        const beat = entry.beat as Record<string, unknown> | undefined;
        if (beat && typeof beat.kind === 'string') {
          beat.kind = normalizeKind(beat.kind);
        }
        return ab;
      });
      const changes = (action.updateBeat as Record<string, unknown> | undefined)?.changes as
        | Record<string, unknown>
        | undefined;
      if (changes && typeof changes.kind === 'string') {
        changes.kind = normalizeKind(changes.kind);
      }
    }
    if ((action.type === 'add_beat' || action.type === 'update_beat') && typeof action.beat === 'object' && action.beat !== null) {
      const beat = action.beat as Record<string, unknown>;
      if (typeof beat.kind === 'string') {
        beat.kind = normalizeKind(beat.kind);
      }
    }
    if (action.type === 'update_beat' && typeof action.changes === 'object' && action.changes !== null) {
      const changes = action.changes as Record<string, unknown>;
      if (typeof changes.kind === 'string') {
        changes.kind = normalizeKind(changes.kind);
      }
    }
    return a;
  }) as ContentAction[];
}

/** Valid StoryBible section keys (used to validate `update_bible` actions). */
const BIBLE_SECTION_KEYS = ['summary', 'themes', 'characters', 'world', 'rules'] as const;

const CHARACTER_TYPES: CharacterType[] = [
  'protagonist',
  'antagonist',
  'supporting',
  'minor',
  'love_interest',
  'custom',
];

/**
 * Validates that an action has the expected shape (known type + minimal
 * fields). Returns true if valid, false otherwise.
 */
export function isValidAction(action: unknown): action is ContentAction {
  if (typeof action !== 'object' || action === null) return false;
  const a = action as Record<string, unknown>;
  const type = a.type;
  if (typeof type !== 'string') return false;

  switch (type) {
    case 'rewrite_scene':
      return typeof a.sceneId === 'string' && typeof a.after === 'string';
    case 'update_beat':
      return typeof a.beatId === 'string' && typeof a.changes === 'object' && a.changes !== null;
    case 'add_beat': {
      if (typeof a.chapterId !== 'string' || typeof a.beat !== 'object' || a.beat === null) return false;
      const b = a.beat as Record<string, unknown>;
      if (typeof b.title !== 'string') return false;
      if (b.kind !== undefined && !(BEAT_KINDS as string[]).includes(normalizeKind(b.kind as string))) return false;
      return true;
    }
    case 'update_beat': {
      if (typeof a.beatId !== 'string' || typeof a.changes !== 'object' || a.changes === null) return false;
      const ch = a.changes as Record<string, unknown>;
      if (ch.kind !== undefined && typeof ch.kind === 'string' && !(BEAT_KINDS as string[]).includes(normalizeKind(ch.kind))) {
        return false;
      }
      return true;
    }

    case 'update_character': {
      if (typeof a.characterId !== 'string' || typeof a.changes !== 'object' || a.changes === null) {
        return false;
      }
      // If the model proposes a `type` change, it must be a valid enum value.
      const ch = a.changes as Record<string, unknown>;
      if (ch.type !== undefined && (typeof ch.type !== 'string' || !(CHARACTER_TYPES as string[]).includes(ch.type))) {
        return false;
      }
      return true;
    }
    case 'add_character': {
      if (typeof a.character !== 'object' || a.character === null) return false;
      const c = a.character as Record<string, unknown>;
      if (typeof c.name !== 'string' || c.name.length === 0) return false;
      if (typeof c.type !== 'string' || !(CHARACTER_TYPES as string[]).includes(c.type)) return false;
      return true;
    }
    case 'update_world':
      return typeof a.entityId === 'string' && typeof a.changes === 'object' && a.changes !== null;
    case 'update_bible':
      return (
        typeof a.section === 'string' &&
        (BIBLE_SECTION_KEYS as readonly string[]).includes(a.section) &&
        typeof a.value === 'string'
      );
    case 'append_scene':
      return typeof a.chapterId === 'string' && typeof a.content === 'string';
    case 'replace_outline': {
      if (!Array.isArray(a.chapters) || a.chapters.length === 0) return false;
      if (!Array.isArray(a.beats)) return false;
      const chapterCount = a.chapters.length;
      for (const ch of a.chapters) {
        if (typeof (ch as Record<string, unknown>).title !== 'string') return false;
      }
      for (const b of a.beats) {
        const beat = b as Record<string, unknown>;
        if (typeof beat.title !== 'string' || beat.title.length === 0) return false;
        if (typeof beat.kind !== 'string' || !(BEAT_KINDS as string[]).includes(normalizeKind(beat.kind))) return false;
        if (typeof beat.description !== 'string') return false;
        if (typeof beat.notes !== 'string') return false;
        if (typeof beat.chapterIndex !== 'number' || beat.chapterIndex < 0 || beat.chapterIndex >= chapterCount) {
          return false;
        }
        if (typeof beat.position !== 'number') return false;
      }
      return true;
    }
    case 'update_outline': {
      // Requiere al menos una operación válida. Las operaciones son opcionales,
      // pero el objeto debe existir y tener alguna forma reconocible.
      if (a.renameChapter !== undefined) {
        const rc = a.renameChapter as Record<string, unknown>;
        if (typeof rc.chapterId !== 'string' || typeof rc.title !== 'string') return false;
      }
      if (a.deleteChapter !== undefined) {
        const dc = a.deleteChapter as Record<string, unknown>;
        if (typeof dc.chapterId !== 'string') return false;
      }
      if (a.deleteBeat !== undefined) {
        const db = a.deleteBeat as Record<string, unknown>;
        if (typeof db.beatId !== 'string') return false;
      }
      if (a.moveBeatToChapter !== undefined) {
        const mb = a.moveBeatToChapter as Record<string, unknown>;
        if (typeof mb.beatId !== 'string' || typeof mb.targetChapterId !== 'string') return false;
      }
      if (a.updateBeat !== undefined) {
        const ub = a.updateBeat as Record<string, unknown>;
        if (typeof ub.beatId !== 'string' || typeof ub.changes !== 'object' || ub.changes === null) {
          return false;
        }
        const changes = ub.changes as Record<string, unknown>;
        if (
          changes.kind !== undefined &&
          typeof changes.kind === 'string' &&
          !(BEAT_KINDS as string[]).includes(normalizeKind(changes.kind))
        ) {
          return false;
        }
      }
      if (a.addBeats !== undefined) {
        if (!Array.isArray(a.addBeats)) return false;
        for (const entry of a.addBeats) {
          const ab = entry as Record<string, unknown>;
          const beat = ab.beat as Record<string, unknown> | undefined;
          if (!beat || typeof beat.title !== 'string' || beat.title.length === 0) return false;
          if (typeof beat.kind !== 'string' || !(BEAT_KINDS as string[]).includes(normalizeKind(beat.kind))) {
            return false;
          }
        }
      }
      // Debe haber al menos una operación presente para considerarse válida.
      const hasAny =
        a.renameChapter !== undefined ||
        a.deleteChapter !== undefined ||
        a.deleteBeat !== undefined ||
        a.moveBeatToChapter !== undefined ||
        a.updateBeat !== undefined ||
        (Array.isArray(a.addBeats) && a.addBeats.length > 0);
      return hasAny;
    }
    default:
      return false;
  }
}

/** Filters an array of actions, keeping only the valid ones. */
export function filterValidActions(actions: unknown[]): ContentAction[] {
  return actions.filter(isValidAction);
}

// --- Suggest outline (tool suggest_beats) ---

const BEAT_KINDS: BeatKind[] = ['inciting', 'rising', 'climax', 'falling', 'resolution', 'custom'];
const BEAT_STATUSES: BeatStatus[] = ['draft', 'done', 'revising'];

/** A beat proposed by the model in the "suggest outline" flow (no ids yet). */
export interface SuggestedBeat {
  kind: BeatKind;
  title: string;
  description: string;
  notes: string;
  characters: string[];
  status: BeatStatus;
}

function isValidSuggestedBeat(value: unknown): value is SuggestedBeat {
  if (typeof value !== 'object' || value === null) return false;
  const b = value as Record<string, unknown>;
  if (typeof b.title !== 'string' || b.title.length === 0) return false;
  if (typeof b.kind !== 'string' || !(BEAT_KINDS as string[]).includes(b.kind)) return false;
  if (typeof b.status !== 'string' || !(BEAT_STATUSES as string[]).includes(b.status)) return false;
  const characters = Array.isArray(b.characters) ? b.characters : [];
  if (!characters.every((c) => typeof c === 'string')) return false;
  return true;
}

/**
 * Parses the model's "suggest outline" response: a JSON array of beats.
 * Tolerates prose/fences around the array and validates each beat.
 */
export function parseBeatList(raw: string): SuggestedBeat[] {
  const text = (raw ?? '').trim();
  if (!text) return [];

  const firstBracket = text.indexOf('[');
  if (firstBracket === -1) return [];

  let lastBracket = text.lastIndexOf(']');
  while (lastBracket > firstBracket) {
    const candidate = text.slice(firstBracket, lastBracket + 1);
    try {
      const parsed = JSON.parse(candidate);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isValidSuggestedBeat).map((b) => ({
        kind: b.kind,
        title: b.title,
        description: typeof b.description === 'string' ? b.description : '',
        notes: typeof b.notes === 'string' ? b.notes : '',
        characters: Array.isArray(b.characters) ? b.characters.filter((c) => typeof c === 'string') : [],
        status: b.status,
      }));
    } catch {
      lastBracket = text.lastIndexOf(']', lastBracket - 1);
    }
  }
  return [];
}

// --- Generate character (Slice 7) ---

/** A character proposed by the model in the "generate character" flow (no ids yet). */
export interface SuggestedCharacter {
  name: string;
  type: CharacterType;
  pronouns: string;
  age: string;
  appearance: string;
  personality: string;
  voice: string;
  backstory: string;
  goals: string;
  traits: string[];
}

function isValidSuggestedCharacter(value: unknown): value is SuggestedCharacter {
  if (typeof value !== 'object' || value === null) return false;
  const c = value as Record<string, unknown>;
  if (typeof c.name !== 'string' || c.name.length === 0) return false;
  if (typeof c.type !== 'string' || !(CHARACTER_TYPES as string[]).includes(c.type)) return false;
  const traits = Array.isArray(c.traits) ? c.traits : [];
  if (!traits.every((t) => typeof t === 'string')) return false;
  return true;
}

/**
 * Parses the model's "generate character" response: a JSON array of characters.
 * Tolerates prose/fences around the array and validates each character.
 */
export function parseSuggestedCharacterList(raw: string): SuggestedCharacter[] {
  const text = (raw ?? '').trim();
  if (!text) return [];

  const firstBracket = text.indexOf('[');
  if (firstBracket === -1) return [];

  let lastBracket = text.lastIndexOf(']');
  while (lastBracket > firstBracket) {
    const candidate = text.slice(firstBracket, lastBracket + 1);
    try {
      const parsed = JSON.parse(candidate);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isValidSuggestedCharacter).map((c) => ({
        name: c.name,
        type: c.type,
        pronouns: typeof c.pronouns === 'string' ? c.pronouns : '',
        age: typeof c.age === 'string' ? c.age : '',
        appearance: typeof c.appearance === 'string' ? c.appearance : '',
        personality: typeof c.personality === 'string' ? c.personality : '',
        voice: typeof c.voice === 'string' ? c.voice : '',
        backstory: typeof c.backstory === 'string' ? c.backstory : '',
        goals: typeof c.goals === 'string' ? c.goals : '',
        traits: Array.isArray(c.traits) ? c.traits.filter((t) => typeof t === 'string') : [],
      }));
    } catch {
      lastBracket = text.lastIndexOf(']', lastBracket - 1);
    }
  }
  return [];
}

// --- Match My Style (Slice 9) ---

/**
 * Parses the model's "Match My Style" response: a JSON object (StyleProfile).
 * Tolerates prose/fences around the object via progressive brace scanning.
 */
export function parseStyleProfile(raw: string): StyleProfile | null {
  const text = (raw ?? '').trim();
  if (!text) return null;

  const firstBrace = text.indexOf('{');
  if (firstBrace === -1) return null;

  let lastBrace = text.lastIndexOf('}');
  while (lastBrace > firstBrace) {
    const candidate = text.slice(firstBrace, lastBrace + 1);
    try {
      const parsed = JSON.parse(candidate);
      if (typeof parsed !== 'object' || parsed === null) return null;
      const str = (k: string): string => (typeof parsed[k] === 'string' ? parsed[k] : '');
      return {
        tone: str('tone'),
        rhythm: str('rhythm'),
        sentenceLength: str('sentenceLength'),
        vocabulary: str('vocabulary'),
        dialogue: str('dialogue'),
        imagery: str('imagery'),
        subtext: str('subtext'),
      };
    } catch {
      lastBrace = text.lastIndexOf('}', lastBrace - 1);
    }
  }
  return null;
}

// --- Enrich character / world (v0.15.0) ---

function asStr(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function asStrArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
}

/**
 * Parses the model's "enrich character" response: a JSON object (single
 * character) with the fields to merge into the existing character.
 * Returns a Partial<Character> with only string/array fields we accept.
 */
export function parseEnrichedCharacter(raw: string): Partial<Character> | null {
  const text = (raw ?? '').trim();
  if (!text) return null;
  const firstBrace = text.indexOf('{');
  if (firstBrace === -1) return null;
  let lastBrace = text.lastIndexOf('}');
  while (lastBrace > firstBrace) {
    const candidate = text.slice(firstBrace, lastBrace + 1);
    try {
      const p = JSON.parse(candidate);
      if (typeof p !== 'object' || p === null) return null;
      const name = asStr(p.name).trim();
      if (!name) return null;
      const out: Partial<Character> = { name };
      const type = asStr(p.type);
      if ((CHARACTER_TYPES as string[]).includes(type)) out.type = type as CharacterType;
      out.age = asStr(p.age);
      out.appearance = asStr(p.appearance);
      out.personality = asStr(p.personality);
      out.voice = asStr(p.voice);
      out.goals = asStr(p.goals);
      out.backstory = asStr(p.backstory);
      out.pronouns = asStr(p.pronouns);
      out.groups = asStrArray(p.groups);
      out.otherNames = asStrArray(p.otherNames);
      out.traits = asStrArray(p.traits);
      return out;
    } catch {
      lastBrace = text.lastIndexOf('}', lastBrace - 1);
    }
  }
  return null;
}

/** Parses the model's "enrich world" response: a JSON object to merge. */
export function parseEnrichedWorld(raw: string): Partial<WorldEntity> | null {
  const text = (raw ?? '').trim();
  if (!text) return null;
  const firstBrace = text.indexOf('{');
  if (firstBrace === -1) return null;
  let lastBrace = text.lastIndexOf('}');
  while (lastBrace > firstBrace) {
    const candidate = text.slice(firstBrace, lastBrace + 1);
    try {
      const p = JSON.parse(candidate);
      if (typeof p !== 'object' || p === null) return null;
      const name = asStr(p.name).trim();
      if (!name) return null;
      const out: Partial<WorldEntity> = { name };
      out.description = asStr(p.description);
      out.otherNames = asStrArray(p.otherNames);
      out.traits = asStrArray(p.traits);
      return out;
    } catch {
      lastBrace = text.lastIndexOf('}', lastBrace - 1);
    }
  }
  return null;
}
