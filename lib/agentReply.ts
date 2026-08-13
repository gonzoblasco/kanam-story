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
 * Strategy: find the first `{` and the last `}` in the text and parse that
 * range. If it fails, returns null (the agent proposed no structured actions).
 */
export function parseAgentReply(raw: string): AgentReply | null {
  const text = (raw ?? '').trim();
  if (!text) return null;

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;

  const candidate = text.slice(firstBrace, lastBrace + 1);
  try {
    const parsed = JSON.parse(candidate);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const reply = typeof parsed.reply === 'string' ? parsed.reply : '';
    const actions = Array.isArray(parsed.actions) ? parsed.actions : [];
    return { reply, actions };
  } catch {
    return null;
  }
}

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
    case 'add_beat':
      return typeof a.chapterId === 'string' && typeof a.beat === 'object' && a.beat !== null;
    case 'update_character':
      return typeof a.characterId === 'string' && typeof a.changes === 'object' && a.changes !== null;
    case 'add_character':
      return typeof a.character === 'object' && a.character !== null;
    case 'update_world':
      return typeof a.entityId === 'string' && typeof a.changes === 'object' && a.changes !== null;
    case 'update_bible':
      return typeof a.section === 'string' && typeof a.value === 'string';
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
