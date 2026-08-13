import type { Project } from '@/types';

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
