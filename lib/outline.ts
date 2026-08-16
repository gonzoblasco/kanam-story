import type { Beat, Chapter } from '@/types';

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

/**
 * Returns the two order-swap updates needed to move a chapter up/down within
 * the full chapter list, or null if not possible.
 */
export function reorderChapters(
  chapters: Chapter[],
  id: string,
  dir: -1 | 1,
): { id: string; order: number }[] | null {
  const sorted = [...chapters].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex((c) => c.id === id);
  const target = idx + dir;
  if (idx === -1 || target < 0 || target >= sorted.length) return null;
  return [
    { id: sorted[idx].id, order: sorted[target].order },
    { id: sorted[target].id, order: sorted[idx].order },
  ];
}

/**
 * Returns the update needed to move a beat to a different chapter, placing it
 * at the end of the target chapter. Returns null if the beat is already in the
 * target chapter or the beat does not exist.
 */
export function moveBeatToChapter(
  beats: Beat[],
  chapters: Chapter[],
  beatId: string,
  targetChapterId: string,
): { id: string; chapterId: string; position: number } | null {
  const beat = beats.find((b) => b.id === beatId);
  if (!beat || beat.chapterId === targetChapterId) return null;
  const targetExists = chapters.some((c) => c.id === targetChapterId);
  if (!targetExists) return null;
  const maxPosition = beats
    .filter((b) => b.chapterId === targetChapterId)
    .reduce((max, b) => Math.max(max, b.position), -1);
  return { id: beatId, chapterId: targetChapterId, position: maxPosition + 1 };
}
