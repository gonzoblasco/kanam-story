/**
 * Smoke test de las acciones nuevas del co-writer (2026-08-17).
 *
 * Valida con Ollama real que el modelo parsea correctamente las acciones
 * destructivas y de metadata agregadas en v0.17.0:
 *  - `delete_character` (borrar un personaje, solo si el autor lo pide)
 *  - `delete_world` (borrar una entidad de mundo)
 *  - `update_project` (refinar metadata: sinopsis, género, tono, POV, estilo)
 *
 * Construye un contexto de proyecto realista, genera el prompt con el rol
 * co-writer y verifica que la respuesta es JSON válido y que las acciones
 * propuestas pasan `isValidAction` (la misma validación que usa la app).
 */
import { buildAgentContext, buildAgentPrompt } from "../lib/agentPrompts";
import { parseAgentReply, isValidAction } from "../lib/agentReply";
import type { Project, Character, WorldEntity, Scene, Chapter, Beat, StoryBible } from "../types";

const MODEL = "deepseek-v4-flash:cloud";

const project: Project = {
  id: "p1",
  name: "El Último Turno",
  description: "Un veterano de ajedrez recibe una carta anónima que lo arrastra a una partida final.",
  genre: "thriller",
  tone: "oscuro",
  pov: "third-limited",
  tense: "past",
  style: { mode: "custom", custom: "prosa escueta" },
  createdAt: 0,
  updatedAt: 0,
};

const characters: Character[] = [
  {
    id: "c1",
    projectId: "p1",
    name: "Renzo",
    type: "protagonist",
    pronouns: "él",
    age: "60",
    appearance: "Cansado, manos marcadas",
    personality: "Rígido, orgulloso, obsesivo",
    voice: "Cortante",
    goals: "Cerrar la partida que perdió en 1992",
    backstory: "Campeón de ajedrez que se retiró tras una derrota humillante",
    groups: [],
    otherNames: [],
    traits: ["obsesivo", "orgulloso"],
    inContext: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: "c2",
    projectId: "p1",
    name: "Elena",
    type: "supporting",
    pronouns: "ella",
    age: "35",
    appearance: "Joven, calculadora",
    personality: "Fría, leal a Renzo",
    voice: "Serena",
    goals: "Proteger a Renzo de su propia obsesión",
    backstory: "Hija de un rival de Renzo",
    groups: [],
    otherNames: [],
    traits: ["leal"],
    inContext: true,
    createdAt: 0,
    updatedAt: 0,
  },
];

const world: WorldEntity[] = [
  {
    id: "w1",
    projectId: "p1",
    name: "Club Central",
    kind: "place",
    description: "Club de ajedrez donde Renzo perdió la partida de 1992",
    inContext: true,
    createdAt: 0,
    updatedAt: 0,
  },
];

const chapters: Chapter[] = [
  { id: "ch1", projectId: "p1", title: "La carta", order: 0, createdAt: 0, updatedAt: 0 },
];

const scenes: Scene[] = [
  {
    id: "s1",
    projectId: "p1",
    chapterId: "ch1",
    title: "La carta anónima",
    content: "<p>Renzo abrió el sobre. Dentro había una sola pieza: un alfil blanco.</p>",
    summary: "Renzo recibe la carta con el alfil",
    order: 0,
    createdAt: 0,
    updatedAt: 0,
    continuityNotes: "El alfil blanco aparece por primera vez - objeto clave.",
  },
];

const beats: Beat[] = [
  {
    id: "b1",
    projectId: "p1",
    chapterId: "ch1",
    kind: "inciting",
    title: "El alfil",
    description: "Renzo recibe la carta con el alfil blanco",
    notes: "Tensión creciente",
    characters: ["c1"],
    status: "draft",
    source: "ai",
    position: 0,
    createdAt: 0,
    updatedAt: 0,
  },
];

const bible: StoryBible = {
  id: "bible1",
  projectId: "p1",
  sections: [
    { key: "summary", label: "Resumen", manual: "Un veterano de ajedrez contra su pasado", auto: "", updatedAt: 0 },
    { key: "themes", label: "Temas", manual: "Redención, obsesión, el precio de ganar", auto: "", updatedAt: 0 },
    { key: "characters", label: "Personajes", manual: "", auto: "", updatedAt: 0 },
    { key: "world", label: "Mundo", manual: "", auto: "", updatedAt: 0 },
    { key: "rules", label: "Reglas", manual: "", auto: "", updatedAt: 0 },
  ],
  generatedAt: 0,
  updatedAt: 0,
};

const sources = { project, characters, world, chapters, scenes, beats, storyBible: bible };

const CASES = [
  {
    name: "delete_character",
    message: "Eliminá al personaje Elena de la historia, ya no la necesito.",
    expectAction: "delete_character",
  },
  {
    name: "delete_world",
    message: "Borrá la entrada del Club Central del mundo, ya no existe.",
    expectAction: "delete_world",
  },
  {
    name: "update_project",
    message: "Cambiá la sinopsis a 'Un maestro de ajedrez jubilado recibe un desafío que lo obliga a enfrentar la partida que perdió hace treinta años' y el tono a 'melancólico'.",
    expectAction: "update_project",
  },
];

async function ollamaDirect(prompt: string): Promise<string> {
  const res = await fetch("http://127.0.0.1:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      stream: false,
      options: { temperature: 0.7 },
    }),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.message?.content ?? "";
}

async function main() {
  const context = buildAgentContext(sources);
  console.log(`=== Contexto: ${context.length} chars ===\n`);

  let failures = 0;
  for (const c of CASES) {
    console.log(`\n========== ACCIÓN: ${c.name} ==========`);
    const prompt = buildAgentPrompt(context, c.message, "co-writer");
    console.log(`Mensaje: "${c.message}"`);
    try {
      const res = await ollamaDirect(prompt);
      const parsed = parseAgentReply(res);
      const reply = parsed?.reply ?? res.trim();
      const actions = parsed?.actions ?? [];
      console.log(`REPLY: ${reply.slice(0, 250)}...`);
      console.log(`Acciones propuestas: ${actions.length}`);

      if (parsed === null) {
        console.log(`  ❌ Respuesta no es JSON válido`);
        failures++;
        continue;
      }

      const valid = actions.filter(isValidAction);
      const hasExpected = valid.some((a) => a.type === c.expectAction);
      console.log(`Acciones válidas: ${valid.length}/${actions.length}`);
      console.log(`Acción esperada (${c.expectAction}): ${hasExpected ? "✅ presente" : "❌ ausente"}`);

      if (!hasExpected) {
        console.log(`  ❌ No se generó la acción ${c.expectAction}`);
        failures++;
      } else {
        console.log(`  ✅ ${c.name} parseada y válida`);
      }
    } catch (e) {
      console.log(`  ❌ Error: ${e instanceof Error ? e.message : e}`);
      failures++;
    }
  }

  console.log(`\n========== RESULTADO ==========`);
  console.log(failures === 0 ? "✅ Todas las acciones nuevas respondieron OK" : `❌ ${failures} caso(s) fallaron`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
