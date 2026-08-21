import type { Chapter, Scene } from '@/types';

/**
 * U3 — Editor target resolution.
 *
 * The editor can edit either a single scene (the classic flow) or a chapter's
 * direct content (a chapter with no scenes, edited as a unit). This module
 * centralizes the decision of which target is active so it can be unit-tested
 * without mounting the TipTap editor.
 */
export type EditorTarget =
  | { mode: 'scene'; scene: Scene }
  | { mode: 'chapter'; chapter: Chapter }
  | { mode: 'none' };

/**
 * Resolves the active editor target from the current selection state.
 *
 * A selected scene always wins (the classic scene flow). Otherwise, if a
 * chapter is selected, the editor targets the chapter's direct content. When
 * neither is selected (or the selected ids no longer exist), the editor shows
 * its empty state.
 */
export function resolveEditorTarget(
  currentSceneId: string | null,
  currentChapterId: string | null,
  scenes: Scene[],
  chapters: Chapter[],
): EditorTarget {
  if (currentSceneId) {
    const scene = scenes.find((s) => s.id === currentSceneId);
    if (scene) return { mode: 'scene', scene };
  }
  if (currentChapterId) {
    const chapter = chapters.find((c) => c.id === currentChapterId);
    if (chapter) return { mode: 'chapter', chapter };
  }
  return { mode: 'none' };
}

/**
 * Adapts a chapter to the shape the AI prompt builders expect from a scene
 * (title/summary/content). Used so `buildExpandPrompt`/`buildTensionPrompt`
 * can operate on a chapter's direct content without a real scene.
 */
export function chapterToSceneLike(chapter: Chapter): Scene {
  return {
    id: chapter.id,
    projectId: chapter.projectId,
    chapterId: chapter.id,
    title: chapter.title,
    content: chapter.content ?? '',
    summary: chapter.summary ?? '',
    order: 0,
    createdAt: chapter.createdAt,
    updatedAt: chapter.updatedAt,
  };
}
