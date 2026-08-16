import { describe, it, expect } from 'vitest';
import { moveBeatInList, reorderChapters, moveBeatToChapter } from './outline';
import type { Beat, Chapter } from '@/types';

const makeChapter = (id: string, order: number): Chapter => ({
  id,
  projectId: 'p1',
  title: `Capítulo ${order + 1}`,
  order,
  createdAt: 1,
  updatedAt: 1,
});

const makeBeat = (id: string, chapterId: string, position: number): Beat => ({
  id,
  projectId: 'p1',
  chapterId,
  kind: 'rising',
  title: id,
  description: '',
  notes: '',
  characters: [],
  status: 'draft',
  source: 'manual',
  position,
  createdAt: 1,
  updatedAt: 1,
});

describe('moveBeatInList', () => {
  it('swaps positions with the neighbour', () => {
    const list = [makeBeat('a', 'c1', 0), makeBeat('b', 'c1', 1), makeBeat('c', 'c1', 2)];
    const result = moveBeatInList(list, 'b', -1);
    expect(result).toEqual([
      { id: 'b', position: 0 },
      { id: 'a', position: 1 },
    ]);
  });

  it('returns null at the edges', () => {
    const list = [makeBeat('a', 'c1', 0), makeBeat('b', 'c1', 1)];
    expect(moveBeatInList(list, 'a', -1)).toBeNull();
    expect(moveBeatInList(list, 'b', 1)).toBeNull();
  });
});

describe('reorderChapters', () => {
  it('swaps order with the neighbour above', () => {
    const chapters = [makeChapter('c1', 0), makeChapter('c2', 1), makeChapter('c3', 2)];
    const result = reorderChapters(chapters, 'c2', -1);
    expect(result).toEqual([
      { id: 'c2', order: 0 },
      { id: 'c1', order: 1 },
    ]);
  });

  it('swaps order with the neighbour below', () => {
    const chapters = [makeChapter('c1', 0), makeChapter('c2', 1), makeChapter('c3', 2)];
    const result = reorderChapters(chapters, 'c2', 1);
    expect(result).toEqual([
      { id: 'c2', order: 2 },
      { id: 'c3', order: 1 },
    ]);
  });

  it('returns null at the edges', () => {
    const chapters = [makeChapter('c1', 0), makeChapter('c2', 1)];
    expect(reorderChapters(chapters, 'c1', -1)).toBeNull();
    expect(reorderChapters(chapters, 'c2', 1)).toBeNull();
  });
});

describe('moveBeatToChapter', () => {
  it('moves a beat to another chapter and appends it at the end', () => {
    const chapters = [makeChapter('c1', 0), makeChapter('c2', 1)];
    const beats = [
      makeBeat('b1', 'c1', 0),
      makeBeat('b2', 'c1', 1),
      makeBeat('b3', 'c2', 0),
    ];
    const result = moveBeatToChapter(beats, chapters, 'b2', 'c2');
    expect(result).toEqual({ id: 'b2', chapterId: 'c2', position: 1 });
  });

  it('keeps the beat in place if target chapter is the current one', () => {
    const chapters = [makeChapter('c1', 0), makeChapter('c2', 1)];
    const beats = [makeBeat('b1', 'c1', 0), makeBeat('b2', 'c1', 1)];
    const result = moveBeatToChapter(beats, chapters, 'b1', 'c1');
    expect(result).toBeNull();
  });

  it('returns null when the beat does not exist', () => {
    const chapters = [makeChapter('c1', 0)];
    const beats = [makeBeat('b1', 'c1', 0)];
    expect(moveBeatToChapter(beats, chapters, 'missing', 'c1')).toBeNull();
  });
});
