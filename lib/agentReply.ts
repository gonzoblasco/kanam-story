import type { ContentAction } from '@/types';

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
      return { reply, actions };
    } catch {
      lastBrace = text.lastIndexOf('}', lastBrace - 1);
    }
  }
  return null;
}

/** Valid StoryBible section keys (used to validate `update_bible` actions). */
const BIBLE_SECTION_KEYS = ['summary', 'themes', 'characters', 'world', 'rules'] as const;

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
      return typeof b.title === 'string';
    }
    case 'update_character':
      return typeof a.characterId === 'string' && typeof a.changes === 'object' && a.changes !== null;
    case 'add_character': {
      if (typeof a.character !== 'object' || a.character === null) return false;
      const c = a.character as Record<string, unknown>;
      return typeof c.name === 'string';
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
    default:
      return false;
  }
}

/** Filters an array of actions, keeping only the valid ones. */
export function filterValidActions(actions: unknown[]): ContentAction[] {
  return actions.filter(isValidAction);
}
