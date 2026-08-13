import type { Project, ProjectStyle, CharacterType } from '@/types';

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
  if (r.includes('protagon') || r === 'protagonist') return 'protagonist';
  if (r.includes('antagon') || r === 'antagonist') return 'antagonist';
  if (r.includes('secundar') || r === 'supporting') return 'supporting';
  if (r.includes('menor') || r === 'minor') return 'minor';
  if (r.includes('love') || r.includes('interés') || r.includes('interes')) return 'love_interest';
  return 'supporting';
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
