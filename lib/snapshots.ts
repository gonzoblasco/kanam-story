import type { Scene, SceneSnapshot } from '@/types';

/**
 * B6 — Versioning / snapshots.
 *
 * Lógica pura (sin DB ni DOM) para decidir cuándo guardar una snapshot de una
 * escena y para armar el diff entre dos versiones. Separada en `lib/` para
 * poder testearla en node (mismo patrón que `lib/bibleSync.ts` y `lib/search.ts`).
 *
 * Regla de dedupe: no guardamos snapshots idénticos a la anterior (evita ruido
 * cuando el autosave dispara varias veces sin cambios reales).
 */

/** Campos editables de una escena que se versionan. */
export interface SceneEditable {
  title: string;
  content: string;
  summary: string;
}

/** Extrae los campos versionables de una escena. */
export function sceneEditable(scene: Pick<Scene, 'title' | 'content' | 'summary'>): SceneEditable {
  return {
    title: scene.title ?? '',
    content: scene.content ?? '',
    summary: scene.summary ?? '',
  };
}

/** Compara dos snapshots por su contenido (ignora id/timestamps). */
export function sameContent(a: SceneEditable, b: SceneEditable): boolean {
  return a.title === b.title && a.content === b.content && a.summary === b.summary;
}

/**
 * Decide si conviene guardar una snapshot nueva para `scene` dado el estado
 * guardado previo (`lastSnapshot`). Devuelve `true` solo si el contenido cambió
 * respecto a la última snapshot (o si no hay ninguna previa).
 */
export function shouldSnapshot(
  scene: Pick<Scene, 'title' | 'content' | 'summary'>,
  lastSnapshot: SceneSnapshot | undefined,
): boolean {
  if (!lastSnapshot) return true;
  return !sameContent(sceneEditable(scene), sceneEditable(lastSnapshot));
}

/**
 * Arma una snapshot nueva a partir de una escena. `createdAt` se pasa por
 * parámetro para poder testear el orden de forma determinista.
 */
export function buildSnapshot(
  scene: Pick<Scene, 'id' | 'projectId' | 'title' | 'content' | 'summary'>,
  createdAt: number,
): SceneSnapshot {
  return {
    id: `${scene.id}:${createdAt}`,
    sceneId: scene.id,
    projectId: scene.projectId,
    title: scene.title ?? '',
    content: scene.content ?? '',
    summary: scene.summary ?? '',
    createdAt,
  };
}

/** Ordena snapshots de más reciente a más antigua (para el historial). */
export function sortSnapshotsNewestFirst(snapshots: SceneSnapshot[]): SceneSnapshot[] {
  return [...snapshots].sort((a, b) => b.createdAt - a.createdAt);
}

/** Formatea un timestamp como fecha/hora legible en español. */
export function formatSnapshotTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Diff de texto plano entre dos versiones (para mostrar qué cambió en el
 * historial). Devuelve las líneas agregadas y eliminadas. Es un diff simple por
 * líneas (no un diff de caracteres) — suficiente para dar contexto visual.
 */
export interface LineDiff {
  added: string[];
  removed: string[];
}

function splitLines(text: string): string[] {
  return text.split(/\r?\n/);
}

/**
 * Diff por líneas entre `before` y `after`. Usa el algoritmo LCS para marcar
 * las líneas que se agregaron y las que se eliminaron. Devuelve listas de
 * líneas (con su texto) para renderizar.
 */
export function diffLines(before: string, after: string): LineDiff {
  const a = splitLines(before);
  const b = splitLines(after);
  const n = a.length;
  const m = b.length;
  // LCS table.
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const added: string[] = [];
  const removed: string[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      removed.push(a[i]);
      i++;
    } else {
      added.push(b[j]);
      j++;
    }
  }
  while (i < n) {
    removed.push(a[i]);
    i++;
  }
  while (j < m) {
    added.push(b[j]);
    j++;
  }
  return { added, removed };
}
