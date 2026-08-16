import type { BeatKind, BeatStatus } from '@/types';

export const KIND_LABELS: Record<BeatKind, string> = {
  inciting: 'Incitante',
  rising: 'Ascenso',
  climax: 'Clímax',
  falling: 'Caída',
  resolution: 'Resolución',
  custom: 'Personalizado',
};

export const STATUS_LABELS: Record<BeatStatus, string> = {
  draft: 'Borrador',
  done: 'Hecho',
  revising: 'Revisando',
};

export function beatKindLabel(kind: BeatKind): string {
  return KIND_LABELS[kind] ?? kind;
}
