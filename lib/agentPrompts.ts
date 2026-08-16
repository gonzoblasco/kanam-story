import type { Project, Character, WorldEntity, Scene, Chapter, Beat, StoryBible } from '@/types';
import { povLabel, styleText, characterTypeLabel, worldKindLabel, tenseLabel } from '@/lib/labels';

export interface AgentSources {
  project: Project;
  characters: Character[];
  world: WorldEntity[];
  chapters: Chapter[];
  scenes: Scene[];
  beats: Beat[];
  storyBible: StoryBible | null;
}

function stripHtml(html: string): string {
  return (html ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function beatKindLabel(k: Beat['kind']): string {
  switch (k) {
    case 'inciting':
      return 'incitante';
    case 'rising':
      return 'ascenso';
    case 'climax':
      return 'clímax';
    case 'falling':
      return 'caída';
    case 'resolution':
      return 'resolución';
    case 'custom':
      return 'personalizado';
  }
}

/**
 * Builds the full context the agent knows: project, characters, world,
 * manuscript (by chapter/scene), outline (beats) and bible.
 */
export function buildAgentContext(sources: AgentSources): string {
  const { project, characters, world, chapters, scenes, beats, storyBible } = sources;
  const parts: string[] = [];

  parts.push(`Título: ${project.name}`);
  if (project.genre) parts.push(`Género: ${project.genre}`);
  if (project.genres && project.genres.length > 0) parts.push(`Géneros: ${project.genres.join(', ')}`);
  if (project.tone) parts.push(`Tono: ${project.tone}`);
  if (project.pov) parts.push(`Punto de vista: ${povLabel(project.pov)}`);
  if (project.tense) parts.push(`Tiempo verbal: ${tenseLabel(project.tense)}`);
  const style = styleText(project.style);
  if (style) parts.push(`Estilo: ${style}`);
  const synopsis = project.synopsis || project.description;
  if (synopsis) parts.push(`Sinopsis: ${synopsis}`);

  // Braindump: volcado libre de ideas del autor (contexto de bajo peso, no regla).
  if (project.braindump) parts.push(`\nBRAINDUMP (ideas del autor, contexto de bajo peso):\n${project.braindump}`);

  // Brújula Narrativa: orientación que el agente debe respetar.
  if (project.premise || project.promise || project.theme || project.protagonist) {
    parts.push('\nBRÚJULA NARRATIVA:');
    if (project.premise) parts.push(`Premisa: ${project.premise}`);
    if (project.promise) parts.push(`Promesa al lector: ${project.promise}`);
    if (project.theme) parts.push(`Tema: ${project.theme}`);
    if (project.protagonist) {
      const proto = characters.find((c) => c.id === project.protagonist);
      parts.push(`Protagonista: ${proto?.name ?? project.protagonist}`);
    }
  }

  if (characters.length > 0) {
    parts.push('\nPERSONAJES:');
    for (const c of characters) {
      // Characters excluded from context (inContext === false) are skipped.
      if (c.inContext === false) continue;
      parts.push(`- ${c.name}${c.type ? ` (${characterTypeLabel(c.type)})` : ''}`);
      if (c.pronouns) parts.push(`  Pronombres: ${c.pronouns}`);
      if (c.otherNames && c.otherNames.length > 0) parts.push(`  Otros nombres: ${c.otherNames.join(', ')}`);
      if (c.groups && c.groups.length > 0) parts.push(`  Grupos: ${c.groups.join(', ')}`);
      if (c.personality) parts.push(`  Personalidad: ${c.personality}`);
      if (c.voice) parts.push(`  Voz: ${c.voice}`);
      if (c.goals) parts.push(`  Objetivos: ${c.goals}`);
      if (c.backstory) parts.push(`  Backstory: ${c.backstory}`);
      if (c.traits && c.traits.length > 0) parts.push(`  Rasgos: ${c.traits.join(', ')}`);
    }
  }

  if (world.length > 0) {
    parts.push('\nMUNDO:');
    for (const w of world) {
      // Entities excluded from context (inContext === false) are skipped.
      if (w.inContext === false) continue;
      parts.push(`- ${w.name} [${worldKindLabel(w.kind)}]: ${w.description}`);
      if (w.otherNames && w.otherNames.length > 0) parts.push(`  Otros nombres: ${w.otherNames.join(', ')}`);
      if (w.traits && w.traits.length > 0) parts.push(`  Rasgos: ${w.traits.join(', ')}`);
    }
  }

  if (beats.length > 0) {
    parts.push('\nOUTLINE (beats):');
    const sorted = [...beats].sort((a, b) => a.position - b.position);
    for (const b of sorted) {
      const scope = b.chapterId ? `capítulo ${b.chapterId}` : b.sceneId ? `escena ${b.sceneId}` : 'proyecto';
      parts.push(
        `- [${beatKindLabel(b.kind)}] ${b.title} (${scope}): ${b.description}${b.notes ? ` — ${b.notes}` : ''}`,
      );
    }
  }

  if (chapters.length > 0) {
    parts.push('\nMANUSCRITO:');
    const byChapter = new Map<string, Scene[]>();
    for (const s of scenes) {
      const arr = byChapter.get(s.chapterId) ?? [];
      arr.push(s);
      byChapter.set(s.chapterId, arr);
    }
    for (const ch of [...chapters].sort((a, b) => a.order - b.order)) {
      parts.push(`## ${ch.title}`);
      const scs = (byChapter.get(ch.id) ?? []).sort((a, b) => a.order - b.order);
      for (const s of scs) {
        const text = stripHtml(s.content);
        const hasText = text.length > 0;
        if (s.summary || hasText) {
          parts.push(`- **${s.title}** (id: ${s.id})${s.summary ? `: ${s.summary}` : ''}`);
        }
        if (hasText) {
          const snippet = text.length > 500 ? text.slice(0, 500) + '…' : text;
          parts.push(`  Texto: ${snippet}`);
        }
      }
    }
  }

  if (storyBible) {
    parts.push('\nBIBLIA:');
    for (const section of storyBible.sections) {
      const content = section.manual || section.auto;
      if (content) {
        parts.push(`## ${section.label}\n${content}`);
      }
    }
  }

  return parts.join('\n');
}

/**
 * Builds the agent prompt. Instructs the model to respond with structured
 * JSON: `{"reply": "...", "actions": [...]}`.
 */
export function buildAgentPrompt(context: string, userMessage: string): string {
  return `${context}

Sos el co-writer de ficción de esta obra. Conocés el manuscrito, los personajes, el mundo, el outline y la biblia. Tu rol es conversar con el autor: debatir ideas, estudiar casos, explorar finales alternativos, y cuando haya un acuerdo, proponer cambios concretos al contenido.

El autor te escribe: "${userMessage}"

Respondé SIEMPRE con un JSON válido con esta forma exacta:
{"reply": "tu respuesta conversacional al autor, en español", "actions": [ ... ]}

Reglas:
- "reply" es lo que le decís al autor. Puede incluir preguntas, análisis, opciones, markdown.
- "actions" es un array de cambios que proponés aplicar. Cada acción debe tener "type" y los campos que correspondan:
  - {"type":"rewrite_scene","sceneId":"<id>","before":"<texto actual>","after":"<texto nuevo>","summary":"<qué cambió>"}
  - {"type":"add_beat","chapterId":"<id>","beat":{"kind":"inciting|rising|climax|falling|resolution|custom","title":"...","description":"...","notes":"...","characters":[],"status":"draft","source":"ai","position":<n>},"summary":"..."}
  - {"type":"update_beat","beatId":"<id>","changes":{...},"summary":"..."}
  - {"type":"update_character","characterId":"<id>","changes":{...},"summary":"..."}
  - {"type":"add_character","character":{"name":"...","type":"protagonist|antagonist|supporting|minor|love_interest|custom","pronouns":"...","age":"...","appearance":"...","personality":"...","voice":"...","goals":"...","backstory":"...","groups":["..."],"otherNames":["..."],"traits":["..."]},"summary":"..."}
  - {"type":"update_world","entityId":"<id>","changes":{...},"summary":"..."}
  - {"type":"update_bible","section":"summary|themes|characters|world|rules","value":"<texto nuevo de la sección>","summary":"..."}
  - {"type":"append_scene","chapterId":"<id>","content":"<prosa nueva>","summary":"..."}
  - {"type":"replace_outline","summary":"...","chapters":[{"title":"Capítulo 1","order":0}],"beats":[{"title":"...","kind":"inciting|rising|climax|falling|resolution|custom","description":"...","notes":"...","chapterIndex":0,"position":0,"status":"draft"}]}
- "replace_outline" reemplaza TODO el outline actual por una nueva estructura de capítulos y beats. "chapterIndex" es el índice (0-based) del capítulo dentro de "chapters". Usala solo cuando el autor pida reorganizar el outline global. No combines "replace_outline" con otras acciones en la misma respuesta.
- Para "kind" de beats usá EXACTAMENTE uno de estos valores en inglés: "inciting", "rising", "climax", "falling", "resolution", "custom". No uses sinónimos como "giro", "setup" o "desenlace"; mapeá esos conceptos al kind oficial más cercano.
- Si no proponés cambios, usá "actions": [].
- Los IDs de escenas, beats, personajes y entidades deben ser los que aparecen en el contexto. Si no conocés un ID, no inventes una acción que lo requiera.
- Respondé SOLO con el JSON. Sin prosa fuera del JSON, sin fences markdown, sin comentarios.`;
}

/**
 * Builds the prompt for the "suggest outline" flow: asks the model to propose
 * a sequence of beats for a given chapter, coherent with the bible, characters,
 * world and what is already written. Returns a JSON array of beats.
 */
export function buildSuggestBeatsPrompt(context: string, chapterTitle: string): string {
  return `${context}

Sos el co-writer de ficción de esta obra. El autor quiere armar el outline (mapa de beats) del capítulo "${chapterTitle}".

Proponé una secuencia de beats para ese capítulo, coherente con la biblia, los personajes, el mundo y lo ya escrito. Cada beat debe tener:
- "kind": uno de "inciting" | "rising" | "climax" | "falling" | "resolution" | "custom"
- "title": nombre corto del beat
- "description": qué pasa en este beat
- "notes": intención, tono, elementos a cuidar (puede ser "")
- "characters": array de nombres de personajes involucrados (puede ser [])
- "status": "draft"

Respondé SOLO con un array JSON de beats, sin prosa, sin fences markdown, sin comentarios. Ejemplo:
[{"kind":"inciting","title":"La invitación","description":"recibe una carta","notes":"","characters":[],"status":"draft"}]`;
}

/**
 * Builds the prompt for the "generate character" flow: asks the model to
 * propose one or more characters coherent with the bible, world and what is
 * already written. Returns a JSON array of characters.
 */
export function buildGenerateCharacterPrompt(
  context: string,
  type?: string,
  instructions?: string,
): string {
  const typeLine = type ? ` El personaje debe ser de tipo "${type}".` : '';
  const instrLine = instructions?.trim() ? `\nInstrucciones del autor: ${instructions.trim()}` : '';
  return `${context}

Sos el co-writer de ficción de esta obra. El autor quiere crear un personaje nuevo, coherente con la biblia, el mundo y lo ya escrito.${typeLine}${instrLine}

Cada personaje debe tener:
- "name": nombre propio
- "type": uno de "protagonist" | "antagonist" | "supporting" | "minor" | "love_interest" | "custom"
- "pronouns": pronombres (puede ser "")
- "age": edad (puede ser "")
- "appearance": apariencia física
- "personality": personalidad
- "voice": cómo habla (estilo de diálogo)
- "backstory": historia previa
- "goals": qué quiere
- "traits": array de rasgos (puede ser [])

Respondé SOLO con un array JSON de personajes, sin prosa, sin fences markdown, sin comentarios. Ejemplo:
[{"name":"Renzo","type":"protagonist","pronouns":"él","age":"58","appearance":"...","personality":"orgulloso, terco","voice":"seco, cortante","backstory":"...","goals":"recuperar su honor","traits":["terco","orgulloso"]}]`;
}

/**
 * Builds the prompt for the "Match My Style" flow: asks the model to extract a
 * structured style profile from a sample of the author's writing. Returns a
 * JSON object (StyleProfile).
 */
export function buildStyleProfilePrompt(sample: string): string {
  return `Analizá el siguiente extracto de escritura del autor y extraé su perfil de estilo narrativo.

Extracto:
---
${sample}
---

Respondé SOLO con un JSON con esta forma exacta:
{"tone":"...","rhythm":"...","sentenceLength":"...","vocabulary":"...","dialogue":"...","imagery":"...","subtext":"..."}

- "tone": tono emocional dominante
- "rhythm": ritmo (pausado, rápido, entrecortado…)
- "sentenceLength": longitud típica de las frases
- "vocabulary": tipo de vocabulario (coloquial, culto, sensorial…)
- "dialogue": cómo usa el diálogo
- "imagery": uso de imágenes y metáforas
- "subtext": uso de subtexto y lo no dicho

Sin prosa, sin fences markdown, sin comentarios.`;
}
