import { describe, it, expect } from 'vitest';
import { getActionTarget, getActionsTarget } from '@/lib/actionTargets';

describe('getActionTarget', () => {
  it('replace_outline apunta al outline', () => {
    const target = getActionTarget({
      type: 'replace_outline',
      summary: 'nuevo outline',
      chapters: [{ title: 'C1' }],
      beats: [{ title: 'B1', kind: 'inciting', description: '', notes: '', chapterIndex: 0, position: 0 }],
    });
    expect(target.view).toBe('outline');
    expect(target.label).toBe('Outline');
  });

  it('update_outline apunta al outline', () => {
    const target = getActionTarget({
      type: 'update_outline',
      summary: 'editar',
      renameChapter: { chapterId: 'ch1', title: 'Nuevo' },
    });
    expect(target.view).toBe('outline');
    expect(target.label).toBe('Outline');
  });

  it('update_scene_notes apunta al editor', () => {
    const target = getActionTarget({ type: 'update_scene_notes', sceneId: 's1', notes: 'x', summary: 'nota' });
    expect(target.view).toBe('editor');
  });
});

describe('getActionsTarget', () => {
  it('devuelve outline si todas las acciones son replace_outline', () => {
    const target = getActionsTarget([
      { type: 'replace_outline', summary: 'a', chapters: [{ title: 'C1' }], beats: [] },
      { type: 'replace_outline', summary: 'b', chapters: [{ title: 'C2' }], beats: [] },
    ]);
    expect(target?.view).toBe('outline');
  });
});
