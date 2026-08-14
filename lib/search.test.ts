import { describe, expect, it } from 'vitest';
import type { Chapter, Scene } from '@/types';
import {
  htmlToText,
  replaceInHtml,
  replacePlain,
  searchScenes,
  buildReplacePlan,
} from '@/lib/search';

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

const chapters: Chapter[] = [
  { id: 'c1', projectId: 'p1', title: 'Capítulo Uno', order: 0, createdAt: 0, updatedAt: 0 },
  { id: 'c2', projectId: 'p1', title: 'Capítulo Dos', order: 1, createdAt: 0, updatedAt: 0 },
];

describe('htmlToText', () => {
  it('strips tags and collapses whitespace', () => {
    expect(htmlToText('<p>Hola <strong>mundo</strong></p>')).toBe('Hola mundo');
  });
  it('decodes common HTML entities', () => {
    expect(htmlToText('<p>a&nbsp;&amp;&lt;b&gt;&quot;c&#39;d</p>')).toBe('a &<b>"c\'d');
  });
  it('returns empty for empty input', () => {
    expect(htmlToText('')).toBe('');
  });
});

describe('replaceInHtml', () => {
  it('replaces text but not inside tags', () => {
    const html = '<p>El gato y el perro</p>';
    expect(replaceInHtml(html, 'gato', 'tigre')).toBe('<p>El tigre y el perro</p>');
  });
  it('does not corrupt tags when the term matches tag names', () => {
    const html = '<p>p es una letra</p>';
    expect(replaceInHtml(html, 'p', 'X')).toBe('<p>X es una letra</p>');
  });
  it('is case-insensitive', () => {
    expect(replaceInHtml('<p>GATO</p>', 'gato', 'tigre')).toBe('<p>tigre</p>');
  });
  it('replaces all occurrences', () => {
    expect(replaceInHtml('<p>gato gato</p>', 'gato', 'tigre')).toBe('<p>tigre tigre</p>');
  });
  it('returns the same html when search is empty', () => {
    const html = '<p>hola</p>';
    expect(replaceInHtml(html, '', 'x')).toBe(html);
  });
});

describe('replacePlain', () => {
  it('replaces case-insensitively', () => {
    expect(replacePlain('Hola HOLA hola', 'hola', 'adiós')).toBe('adiós adiós adiós');
  });
  it('returns the same text when search is empty', () => {
    expect(replacePlain('hola', '', 'x')).toBe('hola');
  });
});

describe('searchScenes', () => {
  it('returns empty for empty query', () => {
    expect(searchScenes([], chapters, '  ')).toEqual([]);
  });

  it('finds matches in content, title and summary', () => {
    const scenes = [
      scene({
        id: 's1',
        title: 'La casa del gato',
        content: '<p>El gato duerme.</p>',
        summary: 'Un gato aparece.',
      }),
    ];
    const hits = searchScenes(scenes, chapters, 'gato');
    expect(hits).toHaveLength(1);
    expect(hits[0].sceneId).toBe('s1');
    expect(hits[0].chapterTitle).toBe('Capítulo Uno');
    expect(hits[0].matches.map((m) => m.field).sort()).toEqual(['content', 'summary', 'title']);
    expect(hits[0].matches.find((m) => m.field === 'content')?.count).toBe(1);
  });

  it('counts multiple occurrences in content', () => {
    const scenes = [scene({ id: 's1', content: '<p>gato gato gato</p>' })];
    const hits = searchScenes(scenes, chapters, 'gato');
    expect(hits[0].matches.find((m) => m.field === 'content')?.count).toBe(3);
  });

  it('groups by chapter via chapterTitle', () => {
    const scenes = [
      scene({ id: 's1', chapterId: 'c1', content: '<p>gato</p>' }),
      scene({ id: 's2', chapterId: 'c2', content: '<p>gato</p>' }),
    ];
    const hits = searchScenes(scenes, chapters, 'gato');
    expect(hits.map((h) => h.chapterTitle)).toEqual(['Capítulo Uno', 'Capítulo Dos']);
  });

  it('skips scenes without matches', () => {
    const scenes = [
      scene({ id: 's1', content: '<p>gato</p>' }),
      scene({ id: 's2', content: '<p>perro</p>' }),
    ];
    const hits = searchScenes(scenes, chapters, 'gato');
    expect(hits).toHaveLength(1);
    expect(hits[0].sceneId).toBe('s1');
  });

  it('produces a snippet with context around the match', () => {
    const long = 'a'.repeat(200) + 'gato' + 'b'.repeat(200);
    const scenes = [scene({ id: 's1', content: `<p>${long}</p>` })];
    const hits = searchScenes(scenes, chapters, 'gato');
    const snippet = hits[0].matches[0].snippet;
    expect(snippet).toContain('gato');
    expect(snippet.startsWith('…')).toBe(true);
    expect(snippet.endsWith('…')).toBe(true);
  });
});

describe('buildReplacePlan', () => {
  it('builds a plan for scenes with changes', () => {
    const scenes = [
      scene({ id: 's1', title: 'El gato', content: '<p>gato</p>', summary: 'gato' }),
      scene({ id: 's2', content: '<p>perro</p>' }),
    ];
    const plans = buildReplacePlan(scenes, 'gato', 'tigre');
    expect(plans).toHaveLength(1);
    expect(plans[0].sceneId).toBe('s1');
    expect(plans[0].changes.map((c) => c.field).sort()).toEqual(['content', 'summary', 'title']);
    expect(plans[0].changes.find((c) => c.field === 'content')?.after).toBe('<p>tigre</p>');
  });

  it('returns empty for empty search', () => {
    expect(buildReplacePlan([scene({ id: 's1', content: '<p>gato</p>' })], '  ', 'x')).toEqual([]);
  });

  it('returns empty when nothing changes', () => {
    const scenes = [scene({ id: 's1', content: '<p>perro</p>' })];
    expect(buildReplacePlan(scenes, 'gato', 'tigre')).toEqual([]);
  });
});
