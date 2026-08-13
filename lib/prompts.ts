import type { Project, Character, WorldEntity, Scene, Chapter, StoryBible } from '@/types';
import { BIBLE_SECTION_DEFAULTS } from '@/lib/db';

export function buildContext(project: Project, characters: Character[], world: WorldEntity[]): string {
  const parts: string[] = [];
  parts.push(`Título: ${project.name}`);
  if (project.genre) parts.push(`Género: ${project.genre}`);
  if (project.tone) parts.push(`Tono: ${project.tone}`);
  if (project.pov) parts.push(`Punto de vista: ${povLabel(project.pov)}`);
  if (project.style) parts.push(`Estilo: ${project.style}`);
  if (project.description) parts.push(`Sinopsis: ${project.description}`);

  if (characters.length > 0) {
    parts.push('\nPersonajes:');
    for (const c of characters) {
      parts.push(`- ${c.name}${c.role ? ` (${c.role})` : ''}`);
      if (c.personality) parts.push(`  Personalidad: ${c.personality}`);
      if (c.voice) parts.push(`  Voz / forma de hablar: ${c.voice}`);
      if (c.goals) parts.push(`  Objetivos: ${c.goals}`);
    }
  }

  if (world.length > 0) {
    parts.push('\nMundo:');
    for (const w of world) {
      parts.push(`- ${w.name} [${categoryLabel(w.category)}]: ${w.description}`);
    }
  }

  return parts.join('\n');
}

function povLabel(pov: Project['pov']): string {
  switch (pov) {
    case 'first':
      return 'Primera persona';
    case 'third-limited':
      return 'Tercera persona (limitado)';
    case 'third-omniscient':
      return 'Tercera persona (omnisciente)';
    case 'second':
      return 'Segunda persona';
  }
}

function categoryLabel(c: WorldEntity['category']): string {
  switch (c) {
    case 'location':
      return 'lugar';
    case 'lore':
      return 'lore';
    case 'rule':
      return 'regla';
    case 'item':
      return 'objeto';
    case 'other':
      return 'otro';
  }
}

export function buildWritePrompt(context: string, before: string, after: string): string {
  return `${context}

Continuá la siguiente escena de ficción a partir del cursor. Mantené el tono, la voz y el punto de vista establecidos. Escribí únicamente la continuación (no repitas lo que ya está). Mantené el ritmo de la escena. Respondé SOLO con prosa en español, sin preámbulos, sin notas, sin títulos.

---
Texto antes del cursor:
${before}
---
Texto después del cursor (si lo hay, para mantener continuidad):
${after || '(fin de la escena)'}
---

Continuación:`;
}

export function buildDescribePrompt(context: string, selection: string): string {
  return `${context}

Expandí el siguiente pasaje con detalle sensorial rico a través de los cinco sentidos (vista, oído, olfato, tacto, gusto) e interioridad cuando sea apropiado. Mantené la estructura original de las oraciones pero agregá detalles concretos y evocadores. No cambies el significado. Respondé SOLO con prosa en español.

Pasaje:
${selection}

Pasaje expandido:`;
}

export function buildRewritePrompt(context: string, selection: string, style: string): string {
  return `${context}

Reescribí el siguiente pasaje con un estilo ${style}. Conservá el significado y los hechos. Respondé SOLO con prosa en español.

Original:
${selection}

Reescrito:`;
}

export function buildDialoguePrompt(
  context: string,
  characterName: string,
  setup: string,
  lineCount: number,
): string {
  const safeName = characterName.trim() || 'el personaje';
  const safeCount = Math.max(1, Math.min(lineCount | 0, 12));
  return `${context}

Generá exactamente ${safeCount} versiones alternativas de la línea de diálogo de ${safeName} en el contexto que sigue. Cada versión debe transmitir lo mismo esencialmente pero con un matiz emocional o intencionalidad diferente (más sutil, más agresivo, más evasivo, más vulnerable, más sarcástico, etc.). Numerá las versiones (1., 2., 3., ...). Respondé SOLO con las líneas de diálogo en español, una por versión, sin prosa adicional, sin acotaciones, sin comillas.

Contexto:
${setup}`;
}

export function buildTensionPrompt(
  context: string,
  scene: Scene,
  chapter: Chapter | undefined,
): string {
  const chapterHint = chapter ? `\nCapítulo: ${chapter.title}` : '';
  const existing = (scene.content ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return `${context}${chapterHint}

La siguiente escena ya tiene prosa. Tu tarea es REEMPLAZAR el último tercio de la escena con una versión que suba el conflicto, eleve los stakes y deje al lector con más tensión hacia lo que viene. Mantené el mismo punto de vista, la misma voz de los personajes y el tono del proyecto. El inicio y el cuerpo de la escena deben quedar prácticamente iguales; cambiá solo el cierre.

Prosa actual:
---
${existing}
---

Respondé SOLO con la escena completa reescrita en español, sin título, sin notas, sin meta-comentarios.`;
}

export function buildBrainstormPrompt(context: string, topic: string): string {
  return `${context}

Hacé un brainstorm sobre el siguiente tema para este proyecto de ficción. Producí una lista concisa y útil de ideas, ganchos, giros o beats. Sé específico y sorprendente, no genérico. Usá formato markdown cuando ayude a la claridad (viñetas con "- ", títulos con "## ", **negrita** para ideas clave). Respondé en español.

Tema: ${topic}

Ideas:`;
}

export type ExpandLength = 'short' | 'medium' | 'long';

export function buildExpandPrompt(
  context: string,
  scene: Scene,
  chapter: Chapter | undefined,
  length: ExpandLength,
): string {
  const wordTarget = length === 'short' ? 200 : length === 'medium' ? 500 : 1000;
  const beat = scene.summary?.trim() || scene.title;
  const existing = scene.content?.trim() || '';
  const chapterHint = chapter ? `\nCapítulo: ${chapter.title}` : '';
  const hasExisting = existing.length > 0;
  return `${context}${chapterHint}

${
    hasExisting
      ? `La siguiente escena ya tiene prosa escrita. Tu tarea es REEMPLAZAR el contenido existente con una versión expandida, coherente y mejorada, manteniendo lo esencial de la trama.`
      : `Tu tarea es escribir una escena de ficción en prosa a partir del siguiente beat/resumen.`
  }

Beat de la escena: ${beat}

${
  hasExisting
    ? `Prosa actual (referencia, podés reescribirla entera):\n---\n${existing}\n---`
    : ''
}

Reglas:
- Punto de vista, tono y estilo del proyecto.
- Mostrar en vez de decir; usar detalle sensorial cuando sume.
- Personajes consistentes con sus fichas.
- Respondé SOLO con prosa en español, sin título, sin notas, sin meta-comentarios.
- Extensión objetivo: ~${wordTarget} palabras (podés variar ±20%).`;
}

export interface BibleSources {
  project: Project;
  characters: Character[];
  world: WorldEntity[];
  chapters: Chapter[];
  scenes: Scene[];
}

function buildScenesDigest(scenes: Scene[], chapters: Chapter[]): string {
  const byChapter = new Map<string, Scene[]>();
  for (const s of scenes) {
    const arr = byChapter.get(s.chapterId) ?? [];
    arr.push(s);
    byChapter.set(s.chapterId, arr);
  }
  const parts: string[] = [];
  for (const ch of chapters.sort((a, b) => a.order - b.order)) {
    const scs = (byChapter.get(ch.id) ?? []).sort((a, b) => a.order - b.order);
    parts.push(`## ${ch.title}`);
    for (const s of scs) {
      const summary = s.summary?.trim();
      const text = s.content?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const hasText = text && text.length > 0;
      if (summary || hasText) {
        parts.push(`- **${s.title}**${summary ? `: ${summary}` : ''}`);
      }
      if (hasText) {
        const snippet = text.length > 400 ? text.slice(0, 400) + '…' : text;
        parts.push(`  Texto: ${snippet}`);
      }
    }
  }
  if (parts.length === 0) return '(Todavía no hay escenas escritas.)';
  return parts.join('\n');
}

export function buildStoryBiblePrompt(sources: BibleSources): string {
  const ctx = buildContext(sources.project, sources.characters, sources.world);
  const scenesDigest = buildScenesDigest(sources.scenes, sources.chapters);
  return `${ctx}

Escenas del manuscrito (resumen y extractos):
${scenesDigest}

A partir del material anterior, generá un Story Bible en español con EXACTAMENTE cinco secciones, en este orden, con estos encabezados literales (sin variantes):

## Resumen de la trama
(Síntesis de 1-3 párrafos de qué va la historia: protagonista, conflicto, arco, estado actual)

## Temas y tono
(Temas centrales, emociones dominantes, tono narrativo, estilo)

## Personajes (resumen)
(Lista de personajes con rol en la historia, motivación principal y arco. Si no hay personajes definidos aún, inferí de las escenas.)

## Mundo (resumen)
(Resumen del mundo ficticio: lugares claves, reglas, ambientación, lore)

## Reglas y consistencia
(Convenciones narrativas, POV, reglas del mundo que deben respetarse, posibles inconsistencias detectadas)

Reglas:
- Respondé en español.
- Sé específico, no genérico. Citá nombres propios cuando los haya.
- Si una sección no tiene material, igual completala con inferencias razonables.
- No agregues secciones extra. No escribas nada fuera de las cinco secciones.`;
}

/**
 * Builds a prompt to regenerate a single Bible section from the current
 * manuscript, characters and world. Used by the "Biblia Viva" flow to refresh
 * only the sections that went stale, preserving manual overrides elsewhere.
 */
export function buildBibleSectionPrompt(
  sources: BibleSources,
  key: StoryBible['sections'][number]['key'],
  currentContent: string,
): string {
  const ctx = buildContext(sources.project, sources.characters, sources.world);
  const scenesDigest = buildScenesDigest(sources.scenes, sources.chapters);
  const def = BIBLE_SECTION_DEFAULTS.find((d) => d.key === key);
  const label = def?.label ?? key;
  const instructions: Record<StoryBible['sections'][number]['key'], string> = {
    summary: 'Síntesis de 1-3 párrafos de qué va la historia: protagonista, conflicto, arco, estado actual.',
    themes: 'Temas centrales, emociones dominantes, tono narrativo, estilo.',
    characters: 'Lista de personajes con rol en la historia, motivación principal y arco. Si no hay personajes definidos aún, inferí de las escenas.',
    world: 'Resumen del mundo ficticio: lugares claves, reglas, ambientación, lore.',
    rules: 'Convenciones narrativas, POV, reglas del mundo que deben respetarse, posibles inconsistencias detectadas.',
  };
  return `${ctx}

Escenas del manuscrito (resumen y extractos):
${scenesDigest}

Regenerá SOLO la sección "${label}" del Story Bible en español.

Instrucciones para esta sección:
${instructions[key]}

Sección actual (referencia, podés reescribirla entera):
---
${currentContent || '(vacía)'}
---

Reglas:
- Respondé en español.
- Sé específico, no genérico. Citá nombres propios cuando los haya.
- Si la sección no tiene material, completala con inferencias razonables.
- Respondé SOLO con el contenido de la sección, sin encabezado, sin título, sin notas.`;
}

export function buildBibleExtractPrompt(
  section: 'characters' | 'world',
  rawMarkdown: string,
): string {
  const trimmed = (rawMarkdown ?? '').trim();
  const isCharacters = section === 'characters';
  const targetLabel = isCharacters ? 'personajes' : 'entradas de mundo';
  const schema = isCharacters
    ? `[{"name": string, "role": string, "personality": string, "voice": string, "goals": string}]`
    : `[{"name": string, "category": "location"|"lore"|"rule"|"item"|"other", "description": string}]`;
  return `Extraé los ${targetLabel} implícitos en la siguiente sección de un Story Bible y devolvelos como JSON ESTRICTO.

Reglas:
- Respondé ÚNICAMENTE con un JSON válido que sea un array. Sin texto antes ni después. Sin fences markdown.
- Si una entidad aparece mencionada, creá una entrada. No repitas entidades.
- Para category en entradas de mundo usá uno de: "location", "lore", "rule", "item", "other".
- Mantené los nombres propios tal como aparecen.
- Respondé en español para los campos descriptivos.

Esquema esperado:
${schema}

Sección del Story Bible (markdown):
"""
${trimmed}
"""

JSON:`;
}