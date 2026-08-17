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
 * - Si el beat ya pertenece a una escena existente, se **reutiliza** esa escena
 *   (no se crea otra): el handler la selecciona y la abre, evitando duplicados
 *   por clicks repetidos.
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
  /**
   * Id de la escena existente a la que ya pertenece el beat, o `null` si hay
   * que crear una nueva. Cuando no es nulo, el handler la selecciona y abre en
   * vez de crear otra (evita duplicados por clicks repetidos).
   */
  existingSceneId: string | null;
  /** Capítulo a crear si el beat no pertenece a ninguno existente (null = reutilizar). */
  createChapter: ChapterInput | null;
  scene: SceneInput;
}

export function planGenerateScene(input: {
  beat: Beat;
  projectId: string;
  chapters: Chapter[];
  scenes: Scene[];
  nextOrder?: number;
}): GenerateScenePlan {
  const { beat, projectId, chapters, scenes, nextOrder } = input;

  // Reutiliza la escena a la que el beat ya pertenece (si sigue existiendo).
  const existingSceneId = beat.sceneId
    ? (scenes.find((s) => s.id === beat.sceneId)?.id ?? null)
    : null;

  const existingChapter = beat.chapterId
    ? chapters.find((c) => c.id === beat.chapterId)
    : undefined;

  // Si el beat no está vinculado a una escena pero el capítulo tiene EXACTAMENTE
  // una escena, asumimos que el beat pertenece a ella: generar sobre esa escena
  // en lugar de crear una nueva (fix: "generar la escena" creaba una segunda).
  const chapterScenes = existingChapter
    ? scenes.filter((s) => s.chapterId === existingChapter.id)
    : [];
  const singleChapterSceneId = !existingSceneId && chapterScenes.length === 1 ? chapterScenes[0].id : null;
  const resolvedSceneId = existingSceneId ?? singleChapterSceneId;

  let createChapter: ChapterInput | null = null;
  let chapterId: string | null;
  let sceneOrder: number;

  if (existingChapter) {
    chapterId = existingChapter.id;
    sceneOrder = nextOrder ?? scenes.filter((s) => s.chapterId === existingChapter.id).length;
  } else {
    createChapter = {
      projectId,
      title: beat.title.trim() || 'Capítulo nuevo',
      order: chapters.length,
    };
    chapterId = null; // se resuelve tras crear el capítulo
    sceneOrder = nextOrder ?? 0;
  }

  return {
    beatId: beat.id,
    existingSceneId: resolvedSceneId,
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
