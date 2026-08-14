import type { Chapter, Scene } from '@/types';

/**
 * B4 — Búsqueda entre escenas.
 *
 * Lógica pura (sin DB ni DOM) para buscar un término a lo largo de todas las
 * escenas de un proyecto (contenido, títulos y summaries) y armar un plan de
 * find/replace. Separada en `lib/` para poder testearla en node (mismo patrón
 * que `lib/bibleSync.ts`).
 */

export type SearchField = 'content' | 'title' | 'summary';

export interface SearchMatch {
  field: SearchField;
  /** Snippet de contexto alrededor del primer match. */
  snippet: string;
  /** Número de ocurrencias del término en ese campo. */
  count: number;
}

export interface SceneSearchHit {
  sceneId: string;
  chapterId: string;
  chapterTitle: string;
  sceneTitle: string;
  matches: SearchMatch[];
}

export interface SceneFieldChange {
  field: SearchField;
  before: string;
  after: string;
}

export interface SceneReplacePlan {
  sceneId: string;
  changes: SceneFieldChange[];
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Convierte HTML (TipTap) a texto plano para buscar y mostrar snippets. */
export function htmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Reemplaza un término (case-insensitive) en un HTML, pero SOLO en los nodos de
 * texto — nunca dentro de las etiquetas. Así un término como "p" no corrompe
 * `<p>` ni los atributos.
 */
export function replaceInHtml(html: string, search: string, replacement: string): string {
  if (!search) return html;
  const re = new RegExp(escapeRegExp(search), 'gi');
  return html.replace(/<[^>]*>|[^<]+/g, (segment) => {
    if (segment.startsWith('<')) return segment; // etiqueta: no tocar
    return segment.replace(re, () => replacement);
  });
}

/** Reemplazo case-insensitive sobre texto plano (títulos/summaries). */
export function replacePlain(text: string, search: string, replacement: string): string {
  if (!search) return text;
  const re = new RegExp(escapeRegExp(search), 'gi');
  return text.replace(re, () => replacement);
}

function countOccurrences(text: string, lowerQuery: string): number {
  if (!lowerQuery) return 0;
  const lower = text.toLowerCase();
  let count = 0;
  let idx = lower.indexOf(lowerQuery);
  while (idx !== -1) {
    count++;
    idx = lower.indexOf(lowerQuery, idx + lowerQuery.length);
  }
  return count;
}

function makeSnippet(text: string, matchIndex: number, matchLength: number, radius = 60): string {
  const start = Math.max(0, matchIndex - radius);
  const end = Math.min(text.length, matchIndex + matchLength + radius);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return prefix + text.slice(start, end) + suffix;
}

function makeSnippetAround(text: string, lowerQuery: string, radius = 60): string {
  const idx = text.toLowerCase().indexOf(lowerQuery);
  if (idx === -1) return text.slice(0, radius * 2);
  return makeSnippet(text, idx, lowerQuery.length, radius);
}

/**
 * Busca `query` en todas las escenas (contenido, título y summary).
 * Devuelve un hit por escena con al menos una coincidencia; el componente
 * agrupa los hits por capítulo.
 */
export function searchScenes(
  scenes: Scene[],
  chapters: Chapter[],
  query: string,
): SceneSearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const chapterById = new Map(chapters.map((c) => [c.id, c]));
  const hits: SceneSearchHit[] = [];

  for (const scene of scenes) {
    const chapter = chapterById.get(scene.chapterId);
    const chapterTitle = chapter?.title ?? 'Sin capítulo';
    const matches: SearchMatch[] = [];

    const contentText = htmlToText(scene.content || '');
    const contentCount = countOccurrences(contentText, q);
    if (contentCount > 0) {
      matches.push({
        field: 'content',
        snippet: makeSnippetAround(contentText, q),
        count: contentCount,
      });
    }

    const title = scene.title || '';
    const titleCount = countOccurrences(title, q);
    if (titleCount > 0) {
      matches.push({ field: 'title', snippet: makeSnippetAround(title, q), count: titleCount });
    }

    const summary = scene.summary || '';
    const summaryCount = countOccurrences(summary, q);
    if (summaryCount > 0) {
      matches.push({
        field: 'summary',
        snippet: makeSnippetAround(summary, q),
        count: summaryCount,
      });
    }

    if (matches.length > 0) {
      hits.push({
        sceneId: scene.id,
        chapterId: scene.chapterId,
        chapterTitle,
        sceneTitle: title || 'Escena sin título',
        matches,
      });
    }
  }

  return hits;
}

/**
 * Arma el plan de find/replace para todas las escenas. Solo incluye escenas con
 * al menos un cambio real. El componente aplica el plan vía `updateScene` tras
 * la confirmación del usuario.
 */
export function buildReplacePlan(
  scenes: Scene[],
  search: string,
  replacement: string,
): SceneReplacePlan[] {
  const q = search.trim();
  if (!q) return [];
  const plans: SceneReplacePlan[] = [];

  for (const scene of scenes) {
    const changes: SceneFieldChange[] = [];

    const content = scene.content || '';
    const contentAfter = replaceInHtml(content, q, replacement);
    if (contentAfter !== content) {
      changes.push({ field: 'content', before: content, after: contentAfter });
    }

    const title = scene.title || '';
    const titleAfter = replacePlain(title, q, replacement);
    if (titleAfter !== title) {
      changes.push({ field: 'title', before: title, after: titleAfter });
    }

    const summary = scene.summary || '';
    const summaryAfter = replacePlain(summary, q, replacement);
    if (summaryAfter !== summary) {
      changes.push({ field: 'summary', before: summary, after: summaryAfter });
    }

    if (changes.length > 0) plans.push({ sceneId: scene.id, changes });
  }

  return plans;
}
