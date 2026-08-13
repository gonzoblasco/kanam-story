import type { Beat } from '@/types';

/**
 * Returns the two position-swap updates needed to move the beat `id` up/down
 * within `list` (a group of beats that share the same parent), or null if the
 * move is not possible (not found / at the edge).
 */
export function moveBeatInList(
  list: Beat[],
  id: string,
  dir: -1 | 1,
): { id: string; position: number }[] | null {
  const sorted = [...list].sort((a, b) => a.position - b.position);
  const idx = sorted.findIndex((b) => b.id === id);
  const target = idx + dir;
  if (idx === -1 || target < 0 || target >= sorted.length) return null;
  return [
    { id: sorted[idx].id, position: sorted[target].position },
    { id: sorted[target].id, position: sorted[idx].position },
  ];
}
