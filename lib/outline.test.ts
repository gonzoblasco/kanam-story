import { describe, it, expect } from 'vitest';
import { moveBeatInList } from '@/lib/outline';
import type { Beat } from '@/types';

function makeBeat(id: string, position: number): Beat {
  return {
    id,
    projectId: 'p1',
    chapterId: 'ch1',
    kind: 'custom',
    title: id,
    description: '',
    notes: '',
    characters: [],
    status: 'draft',
    source: 'manual',
    position,
    createdAt: 0,
    updatedAt: 0,
  };
}

describe('moveBeatInList', () => {
  const list = [makeBeat('a', 0), makeBeat('b', 1), makeBeat('c', 2)];

  it('mueve un beat hacia arriba intercambiando posiciones', () => {
    const swaps = moveBeatInList(list, 'b', -1);
    expect(swaps).toEqual([
      { id: 'b', position: 0 },
      { id: 'a', position: 1 },
    ]);
  });

  it('mueve un beat hacia abajo intercambiando posiciones', () => {
    const swaps = moveBeatInList(list, 'b', 1);
    expect(swaps).toEqual([
      { id: 'b', position: 2 },
      { id: 'c', position: 1 },
    ]);
  });

  it('devuelve null si el beat no existe', () => {
    expect(moveBeatInList(list, 'zz', -1)).toBeNull();
  });

  it('devuelve null en el borde (no puede subir el primero / bajar el último)', () => {
    expect(moveBeatInList(list, 'a', -1)).toBeNull();
    expect(moveBeatInList(list, 'c', 1)).toBeNull();
  });

  it('ordena por position aunque la lista llegue desordenada', () => {
    const shuffled = [makeBeat('c', 2), makeBeat('a', 0), makeBeat('b', 1)];
    const swaps = moveBeatInList(shuffled, 'b', -1);
    expect(swaps).toEqual([
      { id: 'b', position: 0 },
      { id: 'a', position: 1 },
    ]);
  });
});
