import { describe, expect, it } from 'vitest';
import type { Scene, SceneSnapshot, Chapter, ChapterSnapshot } from '@/types';
import {
  sceneEditable,
  sameContent,
  shouldSnapshot,
  buildSnapshot,
  sortSnapshotsNewestFirst,
  formatSnapshotTime,
  diffLines,
  chapterEditable,
  sameChapterContent,
  shouldChapterSnapshot,
  buildChapterSnapshot,
} from '@/lib/snapshots';

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

function snapshot(partial: Partial<SceneSnapshot> & { id: string }): SceneSnapshot {
  return {
    sceneId: 's1',
    projectId: 'p1',
    title: '',
    content: '',
    summary: '',
    createdAt: 0,
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

function chapterSnapshot(partial: Partial<ChapterSnapshot> & { id: string }): ChapterSnapshot {
  return {
    chapterId: 'c1',
    projectId: 'p1',
    title: '',
    content: '',
    summary: '',
    createdAt: 0,
    ...partial,
  };
}

describe('sceneEditable', () => {
  it('extracts title/content/summary with empty defaults', () => {
    expect(sceneEditable(scene({ id: 's1', title: 'T', content: 'C', summary: 'S' }))).toEqual({
      title: 'T',
      content: 'C',
      summary: 'S',
    });
    expect(sceneEditable(scene({ id: 's1' }))).toEqual({ title: '', content: '', summary: '' });
  });
});

describe('sameContent', () => {
  it('is true when all three fields match', () => {
    const a = { title: 'T', content: 'C', summary: 'S' };
    expect(sameContent(a, { ...a })).toBe(true);
  });
  it('is false when any field differs', () => {
    const a = { title: 'T', content: 'C', summary: 'S' };
    expect(sameContent(a, { ...a, content: 'C2' })).toBe(false);
    expect(sameContent(a, { ...a, title: 'T2' })).toBe(false);
    expect(sameContent(a, { ...a, summary: 'S2' })).toBe(false);
  });
});

describe('shouldSnapshot', () => {
  it('returns true when there is no previous snapshot', () => {
    expect(shouldSnapshot(scene({ id: 's1', content: '<p>x</p>' }), undefined)).toBe(true);
  });
  it('returns false when content is identical to the last snapshot', () => {
    const last = snapshot({ id: 'x', content: '<p>x</p>', title: 'T', summary: 'S' });
    expect(shouldSnapshot(scene({ id: 's1', content: '<p>x</p>', title: 'T', summary: 'S' }), last)).toBe(false);
  });
  it('returns true when content changed', () => {
    const last = snapshot({ id: 'x', content: '<p>x</p>' });
    expect(shouldSnapshot(scene({ id: 's1', content: '<p>y</p>' }), last)).toBe(true);
  });
  it('returns true when only the title changed', () => {
    const last = snapshot({ id: 'x', title: 'T', content: '<p>x</p>' });
    expect(shouldSnapshot(scene({ id: 's1', title: 'T2', content: '<p>x</p>' }), last)).toBe(true);
  });
});

describe('buildSnapshot', () => {
  it('builds a snapshot with the given createdAt and scene fields', () => {
    const s = buildSnapshot(scene({ id: 's1', projectId: 'p1', title: 'T', content: 'C', summary: 'S' }), 123);
    expect(s).toEqual({
      id: 's1:123',
      sceneId: 's1',
      projectId: 'p1',
      title: 'T',
      content: 'C',
      summary: 'S',
      createdAt: 123,
    });
  });
});

describe('sortSnapshotsNewestFirst', () => {
  it('sorts by createdAt descending without mutating the input', () => {
    const a = snapshot({ id: 'a', createdAt: 100 });
    const b = snapshot({ id: 'b', createdAt: 300 });
    const c = snapshot({ id: 'c', createdAt: 200 });
    const input = [a, b, c];
    const out = sortSnapshotsNewestFirst(input);
    expect(out.map((s) => s.id)).toEqual(['b', 'c', 'a']);
    expect(input.map((s) => s.id)).toEqual(['a', 'b', 'c']); // no mutation
  });
});

describe('formatSnapshotTime', () => {
  it('formats a timestamp as dd/mm/yyyy hh:mm', () => {
    // 2026-08-14 09:05 local.
    const ts = new Date(2026, 7, 14, 9, 5).getTime();
    expect(formatSnapshotTime(ts)).toBe('14/08/2026 09:05');
  });
  it('pads single-digit day/month/hour/minute', () => {
    const ts = new Date(2026, 0, 5, 3, 7).getTime();
    expect(formatSnapshotTime(ts)).toBe('05/01/2026 03:07');
  });
});

describe('diffLines', () => {
  it('returns empty diff for identical text', () => {
    expect(diffLines('a\nb', 'a\nb')).toEqual({ added: [], removed: [] });
  });
  it('detects added lines', () => {
    expect(diffLines('a\nb', 'a\nX\nb')).toEqual({ added: ['X'], removed: [] });
  });
  it('detects removed lines', () => {
    expect(diffLines('a\nX\nb', 'a\nb')).toEqual({ added: [], removed: ['X'] });
  });
  it('detects both added and removed lines', () => {
    const { added, removed } = diffLines('a\nold\nb', 'a\nnew\nb');
    expect(removed).toEqual(['old']);
    expect(added).toEqual(['new']);
  });
  it('handles empty strings', () => {
    expect(diffLines('', '')).toEqual({ added: [], removed: [] });
    // '' splits to [''] (one empty line), so adding 'x' removes the empty line
    // and adds 'x'.
    expect(diffLines('', 'x')).toEqual({ added: ['x'], removed: [''] });
    expect(diffLines('x', '')).toEqual({ added: [''], removed: ['x'] });
  });
});

describe('chapterEditable', () => {
  it('extracts title/content/summary with empty defaults', () => {
    expect(chapterEditable(chapter({ id: 'c1', title: 'T', content: 'C', summary: 'S' }))).toEqual({
      title: 'T',
      content: 'C',
      summary: 'S',
    });
    expect(chapterEditable(chapter({ id: 'c1' }))).toEqual({ title: '', content: '', summary: '' });
  });
});

describe('sameChapterContent', () => {
  it('is true when all three fields match', () => {
    const a = { title: 'T', content: 'C', summary: 'S' };
    expect(sameChapterContent(a, { ...a })).toBe(true);
  });
  it('is false when any field differs', () => {
    const a = { title: 'T', content: 'C', summary: 'S' };
    expect(sameChapterContent(a, { ...a, content: 'C2' })).toBe(false);
    expect(sameChapterContent(a, { ...a, title: 'T2' })).toBe(false);
    expect(sameChapterContent(a, { ...a, summary: 'S2' })).toBe(false);
  });
});

describe('shouldChapterSnapshot', () => {
  it('returns true when there is no previous snapshot', () => {
    expect(shouldChapterSnapshot(chapter({ id: 'c1', content: '<p>x</p>' }), undefined)).toBe(true);
  });
  it('returns false when content is identical to the last snapshot', () => {
    const last = chapterSnapshot({ id: 'x', content: '<p>x</p>', title: 'T', summary: 'S' });
    expect(shouldChapterSnapshot(chapter({ id: 'c1', content: '<p>x</p>', title: 'T', summary: 'S' }), last)).toBe(false);
  });
  it('returns true when content changed', () => {
    const last = chapterSnapshot({ id: 'x', content: '<p>x</p>' });
    expect(shouldChapterSnapshot(chapter({ id: 'c1', content: '<p>y</p>' }), last)).toBe(true);
  });
  it('returns true when only the title changed', () => {
    const last = chapterSnapshot({ id: 'x', title: 'T', content: '<p>x</p>' });
    expect(shouldChapterSnapshot(chapter({ id: 'c1', title: 'T2', content: '<p>x</p>' }), last)).toBe(true);
  });
});

describe('buildChapterSnapshot', () => {
  it('builds a snapshot with the given createdAt and chapter fields', () => {
    const s = buildChapterSnapshot(chapter({ id: 'c1', projectId: 'p1', title: 'T', content: 'C', summary: 'S' }), 123);
    expect(s).toEqual({
      id: 'c1:123',
      chapterId: 'c1',
      projectId: 'p1',
      title: 'T',
      content: 'C',
      summary: 'S',
      createdAt: 123,
    });
  });
});
