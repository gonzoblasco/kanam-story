import type { ContentAction, StorySectionKey } from '@/types';

/**
 * U7 — Destino contextual de una acción del co-writer.
 *
 * Cada acción del agente se inserta en la sección correspondiente del proyecto:
 * un personaje → Personajes, un beat → Outline, el mundo → Mundo, la biblia →
 * Biblia, una escena → el editor. Esta función pura (sin DB/DOM) resuelve a qué
 * vista/sección apuntar para que el usuario vea el cambio "en contexto" con el
 * flujo de aceptación (propuesta → diff → aceptar/descartar).
 */
export interface ActionTarget {
  /** Vista a la que navegar para ver el cambio aplicado. */
  view: 'editor' | 'outline' | 'story';
  /** Sección de la vista Historia (solo cuando `view === 'story'`). */
  section?: StorySectionKey;
  /** Etiqueta legible para mostrar en la propuesta y anunciar. */
  label: string;
}

/** Resuelve el destino de una única acción. */
export function getActionTarget(action: ContentAction): ActionTarget {
  switch (action.type) {
    case 'add_character':
    case 'update_character':
    case 'delete_character':
      return { view: 'story', section: 'characters', label: 'Personajes' };
    case 'update_world':
    case 'delete_world':
      return { view: 'story', section: 'world', label: 'Mundo' };
    case 'update_bible':
      return { view: 'story', section: 'bible', label: 'Biblia' };
    case 'update_project':
      return { view: 'story', section: 'bible-settings', label: 'Ajustes' };
    case 'add_beat':
    case 'update_beat':
      return { view: 'outline', label: 'Outline' };
    case 'rewrite_scene':
    case 'append_scene':
    case 'update_scene_notes':
      return { view: 'editor', label: 'Editor' };
    case 'replace_outline':
    case 'update_outline':
      return { view: 'outline', label: 'Outline' };
    default:
      return { view: 'outline', label: 'Outline' };
  }
}

/**
 * Resuelve el destino de un lote de acciones.
 *
 * Devuelve el destino único si todas las acciones apuntan a la misma vista y
 * (en la vista Historia) a la misma sección; devuelve `null` si el lote mezcla
 * destinos (en ese caso no se navega a un único lugar y el usuario decide).
 */
export function getActionsTarget(actions: ContentAction[]): ActionTarget | null {
  if (actions.length === 0) return null;
  const first = getActionTarget(actions[0]);
  const allSame = actions.every((a) => {
    const t = getActionTarget(a);
    return t.view === first.view && t.section === first.section;
  });
  return allSame ? first : null;
}
