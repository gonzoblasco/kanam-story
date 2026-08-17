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
  /** Si se pasa, la escena activa se incluye COMPLETA (no truncada) en el contexto. */
  activeSceneId?: string;
}

/**
 * Construye un contexto ACOTADO a la escena activa: incluye la escena actual
 * (completa), su capítulo, los beats de ese capítulo, y toda la biblia,
 * personajes y mundo. Excluye las demás escenas para que el agente solo pueda
 * editar la escena en la que el autor está trabajando.
 */
export function buildSceneContext(sources: AgentSources): AgentSources {
  const active = sources.scenes.find((s) => s.id === sources.activeSceneId);
  if (!active) return sources;
  const chapterId = active.chapterId;
  return {
    ...sources,
    scenes: [active],
    chapters: chapterId ? sources.chapters.filter((c) => c.id === chapterId) : [],
    beats: chapterId ? sources.beats.filter((b) => b.chapterId === chapterId) : [],
  };
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
  const { project, characters, world, chapters, scenes, beats, storyBible, activeSceneId } = sources;
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
        `- [${beatKindLabel(b.kind)}] ${b.title} (id: ${b.id}, ${scope}): ${b.description}${b.notes ? ` — ${b.notes}` : ''}`,
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
          const snippet = text.length > 800 ? text.slice(0, 800) + '…' : text;
          parts.push(`  Texto: ${snippet}`);
        }
      }
    }
  }

  // Escena activa: incluirla COMPLETA para que el agente pueda extraer beats
  // de lo que el autor está escribiendo, sin truncar a 800 chars.
  if (activeSceneId) {
    const active = scenes.find((s) => s.id === activeSceneId);
    if (active) {
      const activeText = stripHtml(active.content);
      if (activeText.length > 0) {
        parts.push('\nESCENA ACTIVA (texto completo del autor — extraé beats respetando SUS ideas):');
        parts.push(`## ${active.title || 'Escena sin título'} (id: ${active.id})`);
        parts.push(activeText);
      }
      // Notas de continuidad: elementos que el autor marcó como nuevos en esta
      // escena. El agente debe respetarlas y mantenerlas coherentes.
      if (active.continuityNotes?.trim()) {
        parts.push(`\nNOTAS DE CONTINUIDAD DE ESTA ESCENA (respetalas y mantenelas coherentes):\n${active.continuityNotes.trim()}`);
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
  - {"type":"update_scene_notes","sceneId":"<id>","notes":"<notas de continuidad>","summary":"<qué cambió>"}
  - {"type":"add_beat","chapterId":"<id>","beat":{"kind":"inciting|rising|climax|falling|resolution|custom","title":"...","description":"...","notes":"...","characters":[],"status":"draft","source":"ai","position":<n>},"summary":"..."}
  - {"type":"update_beat","beatId":"<id>","changes":{...},"summary":"..."}
  - {"type":"update_character","characterId":"<id>","changes":{...},"summary":"..."}
  - {"type":"add_character","character":{"name":"...","type":"protagonist|antagonist|supporting|minor|love_interest|custom","pronouns":"...","age":"...","appearance":"...","personality":"...","voice":"...","goals":"...","backstory":"...","groups":["..."],"otherNames":["..."],"traits":["..."]},"summary":"..."}
  - {"type":"update_world","entityId":"<id>","changes":{...},"summary":"..."}
  - {"type":"delete_character","characterId":"<id>","summary":"..."}
  - {"type":"delete_world","entityId":"<id>","summary":"..."}
  - {"type":"update_project","changes":{"description":"...","tone":"...","pov":"first|third-limited|third-omniscient|second"},"summary":"..."}
  - {"type":"update_bible","section":"summary|themes|characters|world|rules","value":"<texto nuevo de la sección>","summary":"..."}
  - {"type":"append_scene","chapterId":"<id>","content":"<prosa nueva>","summary":"..."}
  - {"type":"replace_outline","summary":"...","chapters":[{"title":"Capítulo 1","order":0}],"beats":[{"title":"...","kind":"inciting|rising|climax|falling|resolution|custom","description":"...","notes":"...","chapterIndex":0,"position":0,"status":"draft"}]}
  - {"type":"update_outline","summary":"...","renameChapter":{"chapterId":"<id>","title":"Nuevo título"},"deleteChapter":{"chapterId":"<id>"},"addBeats":[{"chapterId":"<id>","beat":{"title":"...","kind":"inciting|rising|climax|falling|resolution|custom","description":"...","notes":"...","status":"draft"}}],"deleteBeat":{"beatId":"<id>"},"moveBeatToChapter":{"beatId":"<id>","targetChapterId":"<id>"},"updateBeat":{"beatId":"<id>","changes":{"title":"..."}}}
- "replace_outline" reemplaza TODO el outline actual por una nueva estructura de capítulos y beats. "chapterIndex" es el índice (0-based) del capítulo dentro de "chapters". Usala solo cuando el autor pida reorganizar el outline global. No combines "replace_outline" con otras acciones en la misma respuesta.
- "update_outline" hace cambios parciales al outline SIN reemplazarlo completo: podés renombrar un capítulo, borrar un capítulo (sus escenas quedan sin capítulo, sus beats se borran), agregar beats a un capítulo o escena, borrar un beat, mover un beat a otro capítulo, o actualizar campos de un beat. Incluí solo las operaciones que necesites. Es ideal para ajustes puntuales: "agregá un beat de tensión al capítulo 2", "renombrá el capítulo 3", "mové el beat X al capítulo Y".
- Cuando el autor te pida generar beats a partir de una escena o texto que ÉL escribió (por ejemplo "armá el outline de esta escena" o "generá los beats de este texto"), usá "add_beat" (o "update_outline" con "addBeats") y EXTRAÉ los beats del contenido real del autor: tomá sus ideas, momentos y giros como base. No es necesario respetar el mismo orden ni ritmo; podés reestructurarlos si aporta, pero NO inventes contenido que no esté en el texto. La escena activa aparece completa bajo "ESCENA ACTIVA".
- Las "NOTAS DE CONTINUIDAD DE ESTA ESCENA" registran elementos que aparecen por primera vez en la escena actual (personajes, objetos, reglas, lugares, eventos) para mantener coherencia en escenas futuras. Si el autor te pide actualizarlas, o si detectás que algo nuevo e importante aparece en la escena, usá "update_scene_notes" para proponerlas/ajustarlas. Mantené coherencia con las notas existentes.
- Para "kind" de beats usá EXACTAMENTE uno de estos valores en inglés: "inciting", "rising", "climax", "falling", "resolution", "custom". No uses sinónimos como "giro", "setup" o "desenlace"; mapeá esos conceptos al kind oficial más cercano.
- Si no proponés cambios, usá "actions": [].
- "delete_character" elimina un personaje existente; "delete_world" elimina una entrada del mundo. Usalos solo cuando el autor lo pida explícitamente (son destructivos).
- "update_project" ajusta la metadata del proyecto (sinopsis, género, tono, POV, estilo). "pov" debe ser uno de: "first", "third-limited", "third-omniscient", "second". Usala para refinar la premisa o dirección de la historia.
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
 * Builds the prompt for the "enrich character" flow: asks the model to deepen
 * an EXISTING character's profile using what is already registered, coherent
 * with the bible, world and the manuscript. It must respect the current
 * literary world and not drift off-topic. Returns a JSON object (partial
 * character fields to merge).
 */
export function buildEnrichCharacterPrompt(context: string, character: Character): string {
  return `${context}

Sos el co-writer de ficción de esta obra. El autor quiere ENRIQUECER el perfil del personaje existente "${character.name}", agregándole profundidad sin contradecir lo ya establecido ni salirse del mundo literario de la obra (biblia, personajes, mundo, lo ya escrito).

Perfil ACTUAL del personaje:
${JSON.stringify(
  {
    name: character.name,
    type: character.type,
    age: character.age,
    appearance: character.appearance,
    personality: character.personality,
    voice: character.voice,
    goals: character.goals,
    backstory: character.backstory,
    pronouns: character.pronouns ?? '',
    groups: character.groups ?? [],
    otherNames: character.otherNames ?? [],
    traits: character.traits ?? [],
  },
  null,
  2,
)}

Completá y profundizá los campos que tengan contenido o estén vacíos, manteniendo SIEMPRE consistencia con lo ya registrado y con el mundo. NO inventes giros que contradigan la biblia o el manuscrito. Podés: agregar matices a personalidad/voz, desarrollar objetivos y conflicto, ampliar historia previa, sumar rasgos/otros nombres coherentes, darle edad/apariencia si faltan.

Respondé SOLO con un JSON de un único personaje (objeto, NO array) con los mismos campos que el perfil actual. Incluí TODOS los campos; lo que no cambie, devolvelo igual. Sin prosa, sin fences markdown, sin comentarios. Ejemplo:
{"name":"Renzo","type":"protagonist","age":"58","appearance":"...","personality":"orgulloso, terco, pero con miedo a la derrota","voice":"seco, cortante","goals":"recuperar su honor, reconciliarse con su hija","backstory":"...","pronouns":"él","groups":[],"otherNames":[],"traits":["terco","orgulloso","obstinado"]}`;
}

/**
 * Builds the prompt for the "enrich world" flow: asks the model to deepen an
 * EXISTING world entity (place, organization, magic system, event, item, etc.)
 * respecting the current literary world. Returns a JSON object to merge.
 */
export function buildEnrichWorldPrompt(context: string, entity: WorldEntity): string {
  return `${context}

Sos el co-writer de ficción de esta obra. El autor quiere ENRIQUECER el elemento del mundo "${entity.name}" (tipo: ${worldKindLabel(entity.kind)}), agregándole profundidad sin contradecir lo ya establecido ni salirse del mundo literario de la obra (biblia, personajes, mundo, lo ya escrito).

Descripción ACTUAL:
${entity.description || '(vacía)'}
Otros nombres: ${(entity.otherNames ?? []).join(', ') || '(ninguno)'}
Rasgos: ${(entity.traits ?? []).join(', ') || '(ninguno)'}

Ampliá la descripción con detalle y profundidad (origen, función, relación con otros elementos, detalles sensoriales, implicaciones en la trama), manteniendo SIEMPRE consistencia con el mundo. NO inventes elementos que contradigan la biblia o el manuscrito.

Respondé SOLO con un JSON de un único objeto con estos campos: {"name":"...","description":"...","otherNames":["..."],"traits":["..."]}. Incluí TODOS los campos; lo que no cambie, devolvelo igual. Sin prosa, sin fences markdown, sin comentarios.`;
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
