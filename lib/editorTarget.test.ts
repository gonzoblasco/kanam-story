import { describe, expect, it } from 'vitest';
import type { Chapter, Scene } from '@/types';
import { resolveEditorTarget, chapterToSceneLike } from '@/lib/editorTarget';

function scene(partial: Partial<Scene> & { id: string }): Scene {
  return {
    projectId: 'p1',
    chapterId: 'c1',
    title: '',
    content: '',
    summary: '',
    order: 0,
    createdAt: 0,
    updatedAt: 0,
    ...partial,
  };
}

function chapter(partial: Partial<Chapter> & { id: string }): Chapter {
  return {
    projectId: 'p1',
    title: '',
    order: 0,
    createdAt: 0,
    updatedAt: 0,
    ...partial,
  };
}

describe('resolveEditorTarget', () => {
  const s1 = scene({ id: 's1', title: 'Escena 1' });
  const c1 = chapter({ id: 'c1', title: 'Capítulo 1', content: 'texto' });

  it('returns none when nothing is selected', () => {
    expect(resolveEditorTarget(null, null, [s1], [c1])).toEqual({ mode: 'none' });
  });

  it('returns the scene when a scene is selected', () => {
    expect(resolveEditorTarget('s1', null, [s1], [c1])).toEqual({ mode: 'scene', scene: s1 });
  });

  it('returns the chapter when only a chapter is selected', () => {
    expect(resolveEditorTarget(null, 'c1', [s1], [c1])).toEqual({ mode: 'chapter', chapter: c1 });
  });

  it('prefers the scene over the chapter when both are selected', () => {
    expect(resolveEditorTarget('s1', 'c1', [s1], [c1])).toEqual({ mode: 'scene', scene: s1 });
  });

  it('returns none when the selected scene id no longer exists', () => {
    expect(resolveEditorTarget('missing', null, [s1], [c1])).toEqual({ mode: 'none' });
  });

  it('returns none when the selected chapter id no longer exists', () => {
    expect(resolveEditorTarget(null, 'missing', [s1], [c1])).toEqual({ mode: 'none' });
  });
});

describe('chapterToSceneLike', () => {
  it('maps a chapter to a scene-like shape for AI prompts', () => {
    const c = chapter({
      id: 'c9',
      title: 'El faro',
      content: '<p>prosa</p>',
      summary: 'resumen',
      createdAt: 5,
      updatedAt: 6,
    });
    const like = chapterToSceneLike(c);
    expect(like).toEqual({
      id: 'c9',
      projectId: 'p1',
      chapterId: 'c9',
      title: 'El faro',
      content: '<p>prosa</p>',
      summary: 'resumen',
      order: 0,
      createdAt: 5,
      updatedAt: 6,
    });
  });

  it('defaults missing content/summary to empty strings', () => {
    const c = chapter({ id: 'c1' });
    const like = chapterToSceneLike(c);
    expect(like.content).toBe('');
    expect(like.summary).toBe('');
  });
});
