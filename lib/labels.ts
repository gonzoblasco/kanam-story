import type { Project, ProjectStyle } from '@/types';

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
