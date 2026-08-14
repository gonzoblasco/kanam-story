import type { Beat, Chapter, Scene } from '@/types';

/**
 * U4 — Plan de creación de escena desde un beat del outline.
 *
 * Lógica pura (sin DB/DOM): dado un beat y el estado actual, decide qué
 * capítulo y escena crear y con qué contenido. El handler de `OutlineView`
 * aplica el plan: crea el capítulo si hace falta, luego la escena, y relinkea
 * el beat dentro de ella (para que el outline quede coherente).
 *
 * Reglas (estructuras opcionales):
 * - Si el beat pertenece a un capítulo existente, se reutiliza.
 * - Si el beat no tiene capítulo, se planifica crearlo automáticamente.
 * - El título de la escena es el del beat (fallback "Escena nueva").
 * - El resumen de la escena es la descripción del beat (fallback: notas).
 * - El `order` de la escena es la cantidad de escenas ya presentes en el
 *   capítulo resuelto.
 */

export interface ChapterInput {
  projectId: string;
  title: string;
  order: number;
}

export interface SceneInput {
  projectId: string;
  /** Id del capítulo existente, o `null` si el capítulo debe crearse primero. */
  chapterId: string | null;
  title: string;
  content: string;
  summary: string;
  order: number;
}

export interface GenerateScenePlan {
  beatId: string;
  /** Capítulo a crear si el beat no pertenece a ninguno existente (null = reutilizar). */
  createChapter: ChapterInput | null;
  scene: SceneInput;
}

export function planGenerateScene(input: {
  beat: Beat;
  projectId: string;
  chapters: Chapter[];
  scenes: Scene[];
}): GenerateScenePlan {
  const { beat, projectId, chapters, scenes } = input;

  const existingChapter = beat.chapterId
    ? chapters.find((c) => c.id === beat.chapterId)
    : undefined;

  let createChapter: ChapterInput | null = null;
  let chapterId: string | null;
  let sceneOrder: number;

  if (existingChapter) {
    chapterId = existingChapter.id;
    sceneOrder = scenes.filter((s) => s.chapterId === existingChapter.id).length;
  } else {
    createChapter = {
      projectId,
      title: beat.title.trim() || 'Capítulo nuevo',
      order: chapters.length,
    };
    chapterId = null; // se resuelve tras crear el capítulo
    sceneOrder = 0;
  }

  return {
    beatId: beat.id,
    createChapter,
    scene: {
      projectId,
      chapterId,
      title: beat.title.trim() || 'Escena nueva',
      content: '',
      summary: beat.description.trim() || beat.notes.trim(),
      order: sceneOrder,
    },
  };
}
