# Kanam Story

> **Estado:** `0.1.0` — bootstrap sobre `sudolab`. Funciona end-to-end con Ollama local, pero está en transición hacia **chat-first**: el corazón del producto será un agente con quien conversar que **aplica** cambios al manuscrito (Slice 1). El editor actual es el punto de partida, no el destino.

Co-writer de ficción local-first (BYOK → Ollama) en español, donde **la conversación es el producto**. Toda la IA corre en tu máquina vía Ollama; todo el manuscrito vive en IndexedDB. UI y prompts en español.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **TipTap 3** para el editor
- **Bootstrap 5** + tokens CSS propios (sin Tailwind)
- **IndexedDB** vía `idb` — un store por entidad
- **Ollama** como motor de IA, proxy a través de rutas API de Next.js (`/api/ollama`, `/api/ollama/models`) para evitar CORS

## Requisitos

- Node.js ≥ 20
- Ollama corriendo en `http://localhost:11434` con al menos un modelo de chat instalado. Probados en esta máquina: `qwen3:14b`, `qwen3.6:latest`, `gemma4:latest`. Para calidad de ficción se recomienda `qwen3:14b`; para velocidad, `gemma4:latest`.

## Scripts

```bash
npm install
npm run dev        # dev server (Turbopack), default :3000
npm run build      # build de producción
npm run start      # serve el build
npm run lint       # eslint
npm test           # vitest, una corrida
npm run test:watch # vitest en watch mode
```

## Cómo arrancar

1. Levantá Ollama: `ollama serve` (o el daemon del sistema).
2. Asegurate de tener al menos un modelo: `ollama pull qwen3:14b`.
3. `npm install && npm run dev` y abrí `http://localhost:3000`.
4. Al primer arranque la app autocompleta el modelo (toma el primero de `/api/ollama/models`) y crea un proyecto vacío.
5. Ajustá URL de Ollama y modelo en **Ajustes** si querés cambiarlo.

## Qué funciona hoy (MVP)

### Editor con barra de IA

- **Escribir** — continúa desde el cursor, respetando el contexto.
- **Describir** — expande la selección con detalle sensorial.
- **Reescribir** — reescribe la selección con un estilo elegible.
- **Expandir** — reemplaza la escena con una versión expandida a partir del beat/resumen (corto/medio/largo).
- **Dialogar** — genera N variantes de la línea de diálogo seleccionada.
- **Tensar** — reescribe el cierre de la escena subiendo el conflicto.
- **Detener** — aborta cualquier comando en curso vía `AbortController`.
- Autoguardado debounced 600ms; título y resumen se guardan en `blur`.
- Contador de palabras y caracteres en el pie.

### Panel derecho (tabs)

- **Brainstorm** — pide ideas sobre un tema, guarda notas, soporta "append" para extender una nota existente.
- **Personajes** — cards editables inline (rol, edad, apariencia, personalidad, voz, backstory, objetivos).
- **Mundo** — entries editables inline (lugar / lore / regla / objeto / otro).
- **Biblia** — 5 secciones auto-generadas desde el manuscrito (Resumen / Temas / Personajes / Mundo / Reglas), con override manual por sección y botón para volver al contenido auto.
- Pestañas colapsables a la derecha; `selectTab()` se ocupa de expandir + cambiar.

### Proyecto

- Sidebar con árbol de capítulos y escenas, switcher de proyectos, modal para crear proyecto.
- Settings modal con URL de Ollama, selector de modelo (auto-detecta los instalados) y tema.
- Tema oscuro por defecto vía `data-bs-theme="dark"`.

### Modelo

- Detección automática del primer modelo instalado al boot (no hardcodea nombres para evitar 502 con modelos faltantes).
- Re-selección en cualquier momento desde el modal de Ajustes.

## Cómo está organizado

```
kanam-story/
├── app/                 # App Router: layout, page, /api/ollama, /api/ollama/models
├── components/          # UI (Editor, RightPanel, BrainstormPanel, CharactersPanel, WorldPanel, StoryBiblePanel, ...)
├── lib/
│   ├── db.ts            # IndexedDB schema + helpers por entidad
│   ├── store.tsx        # AppProvider + CRUD wrappers
│   ├── ollama.ts        # ollamaChat + checkOllama (siempre via /api/ollama)
│   ├── prompts.ts       # buildContext + builders por comando
│   ├── bibleParse.ts    # parser de las 5 secciones de la Biblia
│   └── *.test.ts        # tests vitest
├── types/               # Project, Chapter, Scene, Character, WorldEntity, BrainstormNote, StoryBible, Settings, AICommand
└── vitest.config.ts
```

Conventions clave (resumen):

- Toda la persistencia pasa por `lib/db.ts` y `lib/store.tsx`. Los componentes no tocan `idb` directo.
- Toda llamada a IA pasa por `lib/ollama.ts`. Los componentes arman el prompt y manejan `AbortController` + busy state.
- `stream: false` hoy — para streaming hay que cambiar la ruta y `ollamaChat` juntos.
- Español en toda la UI y en todos los prompts a Ollama. Campos de dominio (`Project.pov`, `Character.voice`) se quedan en inglés porque están serializados en IndexedDB.
- Etiquetas de las secciones de la Biblia están sincronizadas en `BIBLE_SECTION_DEFAULTS`, `buildStoryBiblePrompt` y `StoryBiblePanel` (parseo). Cambiar una sin las demás rompe el regenerado.

## Testing

- Runner: **Vitest 4** (`vitest@^4.1.9`).
- Cobertura actual: **38 tests** sobre funciones puras.
  - `lib/prompts.test.ts` — 30 tests sobre `buildContext`, `buildExpandPrompt`, `buildStoryBiblePrompt`, `buildDialoguePrompt`, `buildTensionPrompt`.
  - `lib/bibleParse.test.ts` — 8 tests sobre `parseBibleSections`.
- Solo se testea código puro; los componentes React, `lib/db.ts` (IndexedDB) y las rutas API no tienen tests todavía.
- Correr: `npm test`. Ver cobertura crecerá con la beta.

## Conocidas / por hacer (no en `0.1.0-beta`)

- **Streaming de respuestas.** Hoy `ollamaChat` espera la respuesta entera. Implementar va a requerir cambiar la ruta `/api/ollama` y `ollamaChat` para exponer un `AsyncIterable<string>` o SSE.
- **Export.** Sin export a PDF / Markdown / DOCX todavía. El manuscrito está atrapado en IndexedDB.
- **Multi-usuario / sync.** No hay login, ni sync entre dispositivos. Es estrictamente local y single-user.
- **Mobile / responsive.** La layout está optimizada para desktop con la sidebar de capítulos + panel derecho. En mobile la grilla no se adapta bien.
- **Temas.** Solo oscuro. Claro vendría después.
- **Tests de componentes.** Sin jsdom todavía. Para los componentes más complejos (Editor, StoryBiblePanel) haría falta `@testing-library/react` + `jsdom`.
- **Tests de IndexedDB.** Sin `fake-indexeddb`. Cuando se agregue cobertura de store/db, va a hacer falta.
- **Lint limpio.** Hay 10 errores pre-existentes en `components/ProjectTree.tsx`, `components/SettingsModal.tsx`, `components/WorldPanel.tsx` que no son blockers pero deberían irse antes de 1.0.
- **Búsqueda en el manuscrito.** No hay find/replace entre escenas.
- **Versionado / snapshots.** No hay forma de ver versiones anteriores de una escena.

## Decisiones que ya están tomadas y no se revierten fácil

- **Next.js 16 con Turbopack.** No es "el Next.js que conocés". Antes de asumir una API, leer `node_modules/next/dist/docs/01-app/`.
- **Bootstrap, no Tailwind.** Los componentes usan clases Bootstrap + tokens CSS propios (`--sl-*`).
- **UI/prompts en español.** El usuario escribe ficción en español. Romper esto es romper el producto.
- **`ollamaModel` default `''` con auto-fill.** Hardcodear `llama3.1` (o cualquier modelo) como default rompe setups donde ese modelo no está instalado. El primer modelo de `/api/tags` es el default.
- **Type fields en inglés.** Estructuras serializadas en IndexedDB (`pov`, `voice`, `key`). Traducirlas rompe datos del usuario.

## Notas operativas

- `curl localhost:3000 → 200` no prueba que tu código esté sirviéndose: un `next dev` viejo puede estar squat en el puerto. Antes de smoke-test, `lsof -i :3000` y matá zombies. Lanzá con `PORT=3100 npm run dev` para evitar ambigüedad.
- Ollama caído → 502 en `/api/ollama/models`. Es esperable, no un bug.