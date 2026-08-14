import type { Character, Project, WorldEntity } from '@/types';
import { mapRoleToType, mapCategoryToKind } from '@/lib/labels';

/**
 * Pure migration transforms (B1).
 *
 * Each migration is a pure function: given a legacy record, return the migrated
 * record. `lib/db.ts` orchestrates them inside the IndexedDB `onupgradeneeded`
 * (getAll → map → put). Keeping them pure makes the migration logic unit-testable
 * without fake-indexeddb (which hangs on async `idb` upgrades).
 */

/** v3 → v4: `Project.style` string → ProjectStyle object. */
export function migrateProjectStyle(p: Project & { style?: unknown }): Project {
  const style =
    typeof p.style === 'string'
      ? { mode: 'custom' as const, custom: p.style }
      : (p.style as Project['style']);
  return { ...p, style };
}

/** v4 → v5: `Character.role` string → `type` enum + new rich-sheet fields. */
export function migrateCharacterRole(c: Character & { role?: string }): Character {
  return {
    ...c,
    type: mapRoleToType(c.role),
    pronouns: c.pronouns ?? '',
    groups: c.groups ?? [],
    otherNames: c.otherNames ?? [],
    traits: c.traits ?? [],
    inContext: c.inContext ?? true,
  };
}

/** v5 → v6: `WorldEntity.category` string → `kind` enum + new fields. */
export function migrateWorldCategory(w: WorldEntity & { category?: string }): WorldEntity {
  return {
    ...w,
    kind: mapCategoryToKind(w.category),
    otherNames: w.otherNames ?? [],
    traits: w.traits ?? [],
    inContext: w.inContext ?? true,
  };
}

/** v6 → v7: add `tense` to existing projects (default 'past'). */
export function migrateProjectTense(p: Project): Project {
  return { ...p, tense: p.tense ?? 'past' };
}
