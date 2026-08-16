import { buildContext } from '@/lib/prompts';
import { ollamaChatStream } from '@/lib/ollama';
import { proseToHtml } from '@/lib/proseToHtml';
import type { Project, Scene, Chapter, Character, WorldEntity, Settings } from '@/types';

export interface GenerateSceneContentInput {
  project: Project;
  scene: Scene;
  chapter?: Chapter;
  previousScene?: Scene;
  characters: Character[];
  world: WorldEntity[];
  settings: Settings;
  signal?: AbortSignal;
  onChunk?: (chunk: string) => void;
}

function buildSceneContentPrompt(
  project: Project,
  scene: Scene,
  chapter: Chapter | undefined,
  previousScene: Scene | undefined,
  characters: Character[],
  world: WorldEntity[],
): string {
  const context = buildContext(project, characters, world);
  const beat = scene.summary?.trim() || scene.title;
  const chapterHint = chapter ? `\nCapítulo: ${chapter.title}` : '';
  const previousText = previousScene?.content
    ?.replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const previousHint = previousText
    ? `\nEscena anterior (${previousScene?.title || 'anterior'}) para mantener continuidad:\n---\n${previousText.length > 800 ? previousText.slice(0, 800) + '…' : previousText}\n---`
    : '';
  return `${context}${chapterHint}${previousHint}

Tu tarea es escribir una escena de ficción en prosa a partir del siguiente beat/resumen.

Beat de la escena: ${beat}

Reglas:
- Punto de vista, tono y estilo del proyecto.
- Mostrar en vez de decir; usar detalle sensorial cuando sume.
- Personajes consistentes con sus fichas.
- Continuidad con la escena anterior (si se incluye) sin repetirla.
- Respondé SOLO con prosa en español, sin título, sin notas, sin meta-comentarios.
- Extensión: entre 300 y 600 palabras.`;
}

export async function generateSceneContent(input: GenerateSceneContentInput): Promise<string> {
  const { project, scene, chapter, previousScene, characters, world, settings, signal, onChunk } = input;
  const prompt = buildSceneContentPrompt(project, scene, chapter, previousScene, characters, world);

  let full = '';
  await ollamaChatStream(
    {
      ollamaUrl: settings.ollamaUrl,
      model: settings.ollamaModel,
      messages: [{ role: 'user', content: prompt }],
      signal,
      temperature: 0.85,
    },
    (chunk) => {
      full += chunk;
      onChunk?.(chunk);
    },
  );

  const clean = full.trim();
  if (!clean) throw new Error('Respuesta vacía del modelo.');
  return proseToHtml(clean);
}
