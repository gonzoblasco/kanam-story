import type { Project, ProjectStyle, CharacterType, WorldKind } from '@/types';

/** Human-readable labels for the point-of-view field, shared across the UI. */
export const POV_LABELS: Record<Project['pov'], string> = {
  first: 'Primera persona',
  'third-limited': 'Tercera (limitado)',
  'third-omniscient': 'Tercera (omnisciente)',
  second: 'Segunda persona',
};

export function povLabel(pov: Project['pov']): string {
  return POV_LABELS[pov];
}

/** Human-readable labels for the character type (Slice 7). */
export const CHARACTER_TYPE_LABELS: Record<CharacterType, string> = {
  protagonist: 'Protagonista',
  antagonist: 'Antagonista',
  supporting: 'Secundario',
  minor: 'Menor',
  love_interest: 'Interés romántico',
  custom: 'Personalizado',
};

export function characterTypeLabel(type: CharacterType): string {
  return CHARACTER_TYPE_LABELS[type] ?? type;
}

/**
 * Maps a legacy free-text `role` to the typed `CharacterType` enum (used by the
 * v4→v5 DB migration and the bible-extract import). Unknown values default to
 * `supporting` per the Slice 7 spec.
 */
export function mapRoleToType(role: string | undefined | null): CharacterType {
  const r = (role ?? '').trim().toLowerCase();
  if (r.includes('protagon')) return 'protagonist';
  if (r.includes('antagon')) return 'antagonist';
  if (r.includes('secundar')) return 'supporting';
  if (r.includes('menor')) return 'minor';
  if (r.includes('love') || r.includes('interés') || r.includes('interes')) return 'love_interest';
  return 'supporting';
}

/** Human-readable labels for the world entity kind (Slice 8). */
export const WORLD_KIND_LABELS: Record<WorldKind, string> = {
  place: 'Lugar',
  organization: 'Organización',
  lore: 'Lore',
  key_event: 'Evento clave',
  clue: 'Pista',
  magic_system: 'Sistema de magia',
  item: 'Objeto',
  rule: 'Regla',
  other: 'Otro',
};

export function worldKindLabel(kind: WorldKind): string {
  return WORLD_KIND_LABELS[kind] ?? kind;
}

/**
 * Maps a legacy `category` value to the typed `WorldKind` enum (used by the
 * v5→v6 DB migration and the bible-extract import). Unknown values default to
 * `other` per the Slice 8 spec.
 */
export function mapCategoryToKind(category: string | undefined | null): WorldKind {
  const c = (category ?? '').trim().toLowerCase();
  if (c === 'location' || c.includes('lugar') || c.includes('loca')) return 'place';
  if (c === 'lore' || c.includes('lore')) return 'lore';
  if (c === 'rule' || c.includes('regla') || c.includes('ley')) return 'rule';
  if (c === 'item' || c === 'object' || c.includes('objeto')) return 'item';
  if (c.includes('organiz') || c.includes('faccion') || c.includes('facción')) return 'organization';
  if (c.includes('evento') || c.includes('key event')) return 'key_event';
  if (c.includes('pista') || c.includes('clue')) return 'clue';
  if (c.includes('magia') || c.includes('magic')) return 'magic_system';
  return 'other';
}

/** Featured style presets offered in the Style selector. */
export const STYLE_PRESETS: { value: string; label: string }[] = [
  { value: 'prosa-tensa', label: 'Prosa tensa' },
  { value: 'lirica', label: 'Lírica' },
  { value: 'minimalista', label: 'Minimalista' },
  { value: 'sensorial', label: 'Sensorial' },
  { value: 'literaria-elevada', label: 'Literaria elevada' },
];

/** Resolves the active style text (featured preset or custom instructions). */
export function styleText(style: ProjectStyle | undefined): string {
  if (!style) return '';
  if (style.mode === 'featured' && style.featured) {
    const preset = STYLE_PRESETS.find((p) => p.value === style.featured);
    return preset?.label ?? style.featured;
  }
  if (style.mode === 'custom' && style.custom) return style.custom;
  if (style.mode === 'match' && style.profile) return `Estilo del autor: ${style.profile.tone}`;
  return '';
}
