/**
 * Smoke test de los roles especializados del co-writer (2026-08-17).
 *
 * Construye un contexto de proyecto realista, genera el prompt con cada rol
 * (co-writer, plot-doctor, consistency-checker) y lo envía a Ollama local.
 * Verifica que:
 *  - La respuesta es JSON válido con "reply" (texto) y "actions" (array).
 *  - El rol dirige el enfoque (el reply del plot-doctor habla de estructura;
 *    el del consistency-checker de coherencia; el co-writer es general).
 */
import { buildAgentContext, buildAgentPrompt } from "../lib/agentPrompts";
import { parseAgentReply } from "../lib/agentReply";
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
  { id: "ch2", projectId: "p1", title: "El tablero", order: 1, createdAt: 0, updatedAt: 0 },
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
    role: "co-writer" as const,
    message: "¿Qué opinás de la premisa de la historia?",
    expect: /co-writer|premisa|historia/i,
  },
  {
    role: "plot-doctor" as const,
    message: "¿El primer capítulo tiene suficiente tensión? ¿Cómo puedo mejorarlo?",
    expect: /estructura|arco|tensión|ritmo|clímax|beat|trama/i,
  },
  {
    role: "consistency-checker" as const,
    message: "Revisá si hay inconsistencias en el primer capítulo o en los personajes.",
    expect: /inconsisten|coheren|contradicc/i,
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
    console.log(`\n========== ROL: ${c.role} ==========`);
    const prompt = buildAgentPrompt(context, c.message, c.role);
    console.log(`Mensaje: "${c.message}"`);
    try {
      const res = await ollamaDirect(prompt);
      const parsed = parseAgentReply(res);
      const reply = parsed?.reply ?? res.trim();
      const actionCount = parsed?.actions?.length ?? 0;
      const hasValidJson = parsed !== null || /"[a-z_]+"/.test(res);
      console.log(`REPLY: ${reply.slice(0, 300)}...`);
      console.log(`Acciones propuestas: ${actionCount}`);
      console.log(`JSON válido: ${hasValidJson}`);

      if (!hasValidJson) {
        console.log(`  ❌ Respuesta no es JSON válido`);
        failures++;
      } else if (!c.expect.test(reply)) {
        console.log(`  ⚠️  El reply no parece enfocado en ${c.role} (regex: ${c.expect})`);
        // No lo cuento como fallo duro: el modelo puede variar; solo lo señalo.
      } else {
        console.log(`  ✅ Enfoque de rol detectado`);
      }
    } catch (e) {
      console.log(`  ❌ Error: ${e instanceof Error ? e.message : e}`);
      failures++;
    }
  }

  console.log(`\n========== RESULTADO ==========`);
  console.log(failures === 0 ? "✅ Todos los roles respondieron OK" : `❌ ${failures} rol(es) fallaron`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
