import { describe, it, expect } from 'vitest';
import { planGenerateScene } from '@/lib/sceneFromBeat';
import type { Beat, Chapter, Scene } from '@/types';

function makeBeat(over: Partial<Beat> = {}): Beat {
  return {
    id: 'b1',
    projectId: 'p1',
    chapterId: 'ch1',
    kind: 'custom',
    title: 'El primer encuentro',
    description: 'Se conocen en el café.',
    notes: '',
    characters: [],
    status: 'draft',
    source: 'manual',
    position: 0,
    createdAt: 0,
    updatedAt: 0,
    ...over,
  };
}

const chapters: Chapter[] = [
  { id: 'ch1', projectId: 'p1', title: 'Cap 1', order: 0, createdAt: 0, updatedAt: 0 },
];

describe('planGenerateScene', () => {
  it('reutiliza el capítulo existente del beat y arma la escena', () => {
    const plan = planGenerateScene({ beat: makeBeat(), projectId: 'p1', chapters, scenes: [] });
    expect(plan.beatId).toBe('b1');
    expect(plan.createChapter).toBeNull();
    expect(plan.scene.chapterId).toBe('ch1');
    expect(plan.scene.title).toBe('El primer encuentro');
    expect(plan.scene.summary).toBe('Se conocen en el café.');
    expect(plan.scene.content).toBe('');
  });

  it('usa las notas como fallback del resumen cuando la descripción está vacía', () => {
    const beat = makeBeat({ description: '   ', notes: 'Tono tenso' });
    const plan = planGenerateScene({ beat, projectId: 'p1', chapters, scenes: [] });
    expect(plan.scene.summary).toBe('Tono tenso');
  });

  it('crea el capítulo automáticamente si el beat no pertenece a ninguno existente', () => {
    const orphan = makeBeat({ chapterId: 'missing', title: 'Giro final' });
    const plan = planGenerateScene({ beat: orphan, projectId: 'p1', chapters, scenes: [] });
    expect(plan.createChapter).not.toBeNull();
    expect(plan.createChapter!.projectId).toBe('p1');
    expect(plan.createChapter!.title).toBe('Giro final');
    expect(plan.createChapter!.order).toBe(chapters.length);
    expect(plan.scene.chapterId).toBeNull();
    expect(plan.scene.title).toBe('Giro final');
  });

  it('el capítulo nuevo sin título usa el fallback "Capítulo nuevo"', () => {
    const orphan = makeBeat({ chapterId: 'missing', title: '   ' });
    const plan = planGenerateScene({ beat: orphan, projectId: 'p1', chapters, scenes: [] });
    expect(plan.createChapter!.title).toBe('Capítulo nuevo');
  });

  it('la escena sin título usa el fallback "Escena nueva"', () => {
    const beat = makeBeat({ title: '   ' });
    const plan = planGenerateScene({ beat, projectId: 'p1', chapters, scenes: [] });
    expect(plan.scene.title).toBe('Escena nueva');
  });

  it('asigna el order de la escena según cuántas escenas ya hay en el capítulo', () => {
    const scenes: Scene[] = [
      { id: 's1', projectId: 'p1', chapterId: 'ch1', title: 'A', content: '', summary: '', order: 0, createdAt: 0, updatedAt: 0 },
      { id: 's2', projectId: 'p1', chapterId: 'ch1', title: 'B', content: '', summary: '', order: 1, createdAt: 0, updatedAt: 0 },
    ];
    const plan = planGenerateScene({ beat: makeBeat(), projectId: 'p1', chapters, scenes });
    expect(plan.scene.order).toBe(2);
  });

  it('respeta el nextOrder provisto para generación secuencial de un capítulo', () => {
    const scenes: Scene[] = [
      { id: 's1', projectId: 'p1', chapterId: 'ch1', title: 'A', content: '', summary: '', order: 0, createdAt: 0, updatedAt: 0 },
    ];
    const plan = planGenerateScene({ beat: makeBeat(), projectId: 'p1', chapters, scenes, nextOrder: 5 });
    expect(plan.scene.order).toBe(5);
  });

  it('reutiliza la escena existente del beat en lugar de crear otra (clicks repetidos)', () => {
    const scenes: Scene[] = [
      { id: 's1', projectId: 'p1', chapterId: 'ch1', title: 'El primer encuentro', content: '', summary: '', order: 0, createdAt: 0, updatedAt: 0 },
    ];
    const beat = makeBeat({ sceneId: 's1' });
    const plan = planGenerateScene({ beat, projectId: 'p1', chapters, scenes });
    expect(plan.existingSceneId).toBe('s1');
    expect(plan.createChapter).toBeNull();
  });

  it('no marca escena existente cuando el beat no tiene sceneId', () => {
    const scenes: Scene[] = [
      { id: 's1', projectId: 'p1', chapterId: 'ch1', title: 'A', content: '', summary: '', order: 0, createdAt: 0, updatedAt: 0 },
    ];
    const plan = planGenerateScene({ beat: makeBeat(), projectId: 'p1', chapters, scenes });
    expect(plan.existingSceneId).toBeNull();
  });

  it('devuelve null en existingSceneId si la escena del beat ya no existe', () => {
    const beat = makeBeat({ sceneId: 'desaparecida' });
    const plan = planGenerateScene({ beat, projectId: 'p1', chapters, scenes: [] });
    expect(plan.existingSceneId).toBeNull();
    expect(plan.createChapter).toBeNull();
    expect(plan.scene.chapterId).toBe('ch1');
  });
});
