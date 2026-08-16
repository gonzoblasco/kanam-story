import { ollamaChatStream } from '@/lib/ollama';
import { buildContext } from '@/lib/prompts';
import type { Project, Character, WorldEntity, Chapter, Beat, BeatKind, Settings } from '@/types';

export interface SuggestedChapter {
  title: string;
  beats: SuggestedBeat[];
}

export interface SuggestedBeat {
  title: string;
  kind: BeatKind;
  description?: string;
  notes?: string;
}

const VALID_KINDS: BeatKind[] = ['inciting', 'rising', 'climax', 'falling', 'resolution', 'custom'];

export const KIND_ALIASES: Record<string, BeatKind> = {
  inciting: 'inciting',
  incitante: 'inciting',
  rising: 'rising',
  ascenso: 'rising',
  climax: 'climax',
  clímax: 'climax',
  falling: 'falling',
  caida: 'falling',
  caída: 'falling',
  resolution: 'resolution',
  resolucion: 'resolution',
  resolución: 'resolution',
  custom: 'custom',
  personalizado: 'custom',
};

export function normalizeKind(raw: string): BeatKind {
  const key = raw.toLowerCase().trim().replace(/[:*]/g, '');
  return KIND_ALIASES[key] || 'custom';
}

function describeExistingOutline(chapters: Chapter[], beats: Beat[]): string {
  if (chapters.length === 0) return '';
  const byChapter = new Map<string, Beat[]>();
  for (const b of beats) {
    if (!b.chapterId || b.sceneId) continue;
    const arr = byChapter.get(b.chapterId) ?? [];
    arr.push(b);
    byChapter.set(b.chapterId, arr);
  }
  const parts: string[] = ['\nEstructura actual (conservá lo que funcione, completá o reordená el resto):'];
  for (const c of chapters.sort((a, b) => a.order - b.order)) {
    parts.push(`- ${c.title}`);
    for (const b of (byChapter.get(c.id) ?? []).sort((a, b) => a.position - b.position)) {
      parts.push(`  - ${b.kind}: ${b.title}${b.description ? ` — ${b.description}` : ''}`);
    }
  }
  return parts.join('\n');
}

export function buildGlobalOutlinePrompt(
  project: Project,
  characters: Character[],
  world: WorldEntity[],
  chapters: Chapter[],
  beats: Beat[],
): string {
  const context = buildContext(project, characters, world);
  const existing = describeExistingOutline(chapters, beats);
  return `${context}${existing}

Sos un planificador narrativo. Generá una estructura global completa de la historia: capítulos y, dentro de cada uno, beats concretos que cubran el arco de la trama.

Reglas:
- La estructura debe respetar el género, tono, punto de vista y tiempo verbal del proyecto.
- Cada capítulo debe tener un título claro y un propósito dramático.
- Cada beat debe ser un momento específico de la trama (no una meta-instrucción).
- Usá los tipos de beat exactos (claves en inglés): inciting, rising, climax, falling, resolution. Si ninguno encaja, usá custom.
- Podés mantener capítulos o beats existentes si encajan; también podés agregar, fusionar o reordenar.
- Respondé SOLO con el formato markdown que se indica abajo, sin prosa extra, sin fences, sin notas.

Formato obligatorio:

## Capítulo 1: Título del capítulo
- **inciting**: Título del beat — Descripción opcional del beat
- **rising**: Otro beat — Descripción opcional
- **climax**: Beat culminante — Descripción opcional

## Capítulo 2: Título del capítulo
...

Estructura global:`;
}

export function parseGlobalOutline(raw: string): SuggestedChapter[] {
  const chapters: SuggestedChapter[] = [];
  const lines = raw.split('\n');
  let current: SuggestedChapter | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const chapterMatch = trimmed.match(/^##\s*(?:Capítulo\s*\d+[:\-\.]\s*)?(.+)$/i);
    if (chapterMatch) {
      current = { title: chapterMatch[1].trim(), beats: [] };
      chapters.push(current);
      continue;
    }

    const beatMatch = trimmed.match(/^-\s*\*\*(\w+)\*\*[:\s]+(.+)$/i);
    if (beatMatch && current) {
      const kind = normalizeKind(beatMatch[1]);
      const rest = beatMatch[2].trim();
      const [title, ...descParts] = rest.split(/\s*[—–-]\s+/);
      const description = descParts.join(' — ').trim() || undefined;
      current.beats.push({
        title: title.trim(),
        kind,
        description,
      });
    }
  }

  return chapters.filter((c) => c.title && c.beats.length > 0);
}

export interface SuggestGlobalOutlineInput {
  project: Project;
  characters: Character[];
  world: WorldEntity[];
  chapters: Chapter[];
  beats: Beat[];
  settings: Settings;
  signal?: AbortSignal;
}

export async function suggestGlobalOutline(input: SuggestGlobalOutlineInput): Promise<SuggestedChapter[]> {
  const { project, characters, world, chapters, beats, settings, signal } = input;
  const prompt = buildGlobalOutlinePrompt(project, characters, world, chapters, beats);
  let raw = '';
  await ollamaChatStream(
    {
      ollamaUrl: settings.ollamaUrl,
      model: settings.ollamaModel,
      messages: [{ role: 'user', content: prompt }],
      signal,
      temperature: 0.8,
    },
    (chunk) => {
      raw += chunk;
    },
  );
  const parsed = parseGlobalOutline(raw.trim());
  if (parsed.length === 0) {
    throw new Error('No se pudo parsear la estructura sugerida. Probá de nuevo.');
  }
  return parsed;
}
