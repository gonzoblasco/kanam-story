import type { Character, WorldEntity } from '@/types';

/**
 * Pure sync-plan builders for the Bible ↔ tabs auto-sync (U8).
 *
 * These are DB-free: they take the bible-extracted entries and the current
 * entities and return what to create / update, so the logic can be unit-tested
 * without IndexedDB. The store's `syncCharactersFromBible` / `syncWorldFromBible`
 * apply the plan.
 *
 * Rules (shared with U5/U6):
 * - Dedupe by name (case-insensitive, trimmed).
 * - New entities are marked `source: 'biblia'`.
 * - Existing entities are only touched if `source === 'biblia'`, and only to
 *   fill empty fields — manual edits are never overwritten.
 */

export type CharacterDraft = Omit<Character, 'id' | 'createdAt' | 'updatedAt' | 'projectId'>;
export type WorldDraft = Omit<WorldEntity, 'id' | 'createdAt' | 'updatedAt' | 'projectId'>;

export interface CharacterSyncPlan {
  toCreate: CharacterDraft[];
  toUpdate: { id: string; patch: Partial<Character> }[];
}

export interface WorldSyncPlan {
  toCreate: WorldDraft[];
  toUpdate: { id: string; patch: Partial<WorldEntity> }[];
}

export function buildCharacterSyncPlan(
  entries: Partial<Character>[],
  existing: Character[],
): CharacterSyncPlan {
  const byName = new Map<string, Character>();
  for (const c of existing) byName.set(c.name.trim().toLowerCase(), c);

  const toCreate: CharacterDraft[] = [];
  const toUpdate: { id: string; patch: Partial<Character> }[] = [];

  for (const e of entries) {
    if (!e.name) continue;
    const key = e.name.trim().toLowerCase();
    const existingChar = byName.get(key);

    if (!existingChar) {
      toCreate.push({
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
      continue;
    }

    // Never overwrite a manually-authored character.
    if (existingChar.source !== 'biblia') continue;
    const patch: Partial<Character> = {};
    if (!existingChar.personality && e.personality) patch.personality = e.personality;
    if (!existingChar.voice && e.voice) patch.voice = e.voice;
    if (!existingChar.goals && e.goals) patch.goals = e.goals;
    if (!existingChar.backstory && e.backstory) patch.backstory = e.backstory;
    if (Object.keys(patch).length > 0) toUpdate.push({ id: existingChar.id, patch });
  }

  return { toCreate, toUpdate };
}

export function buildWorldSyncPlan(
  entries: Partial<WorldEntity>[],
  existing: WorldEntity[],
): WorldSyncPlan {
  const byName = new Map<string, WorldEntity>();
  for (const w of existing) byName.set(w.name.trim().toLowerCase(), w);

  const toCreate: WorldDraft[] = [];
  const toUpdate: { id: string; patch: Partial<WorldEntity> }[] = [];

  for (const e of entries) {
    if (!e.name) continue;
    const key = e.name.trim().toLowerCase();
    const existingWorld = byName.get(key);

    if (!existingWorld) {
      toCreate.push({
        name: e.name,
        kind: e.kind ?? 'other',
        description: e.description ?? '',
        source: 'biblia',
      });
      continue;
    }

    // Never overwrite a manually-authored entity.
    if (existingWorld.source !== 'biblia') continue;
    const patch: Partial<WorldEntity> = {};
    if (!existingWorld.description && e.description) patch.description = e.description;
    if (Object.keys(patch).length > 0) toUpdate.push({ id: existingWorld.id, patch });
  }

  return { toCreate, toUpdate };
}
