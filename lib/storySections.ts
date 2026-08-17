import type { StorySectionKey } from '@/types';

/** Definición de cada sección apilada de la vista Historia (Fase 4, U1).
 *  `label` es el título visible (h2 de la sección + item del sidebar) y la base
 *  del `aria-labelledby`. `icon` es un icono de bootstrap-icons. */
export interface StorySectionDef {
  key: StorySectionKey;
  label: string;
  icon: string;
  headingId: string;
}

export const STORY_SECTIONS: StorySectionDef[] = [
  { key: 'co-writer', label: 'Co-writer', icon: 'bi-stars', headingId: 'story-section-co-writer' },
  { key: 'brainstorm', label: 'Brainstorm', icon: 'bi-lightbulb', headingId: 'story-section-brainstorm' },
  { key: 'characters', label: 'Personajes', icon: 'bi-people', headingId: 'story-section-characters' },
  { key: 'world', label: 'Mundo', icon: 'bi-globe', headingId: 'story-section-world' },
  { key: 'bible', label: 'Biblia', icon: 'bi-book', headingId: 'story-section-bible' },
  { key: 'bible-settings', label: 'Ajustes', icon: 'bi-journal-text', headingId: 'story-section-bible-settings' },
  { key: 'compass', label: 'Brújula', icon: 'bi-compass', headingId: 'story-section-compass' },
];

export function getStorySection(key: StorySectionKey): StorySectionDef {
  return STORY_SECTIONS.find((s) => s.key === key) ?? STORY_SECTIONS[0];
}
