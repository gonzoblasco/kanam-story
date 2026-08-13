# Kanam Story

> **Status:** `0.2.0` — editable Story Bible. Local-first fiction co-writer where **the conversation is the product**: an agent you converse with that knows the manuscript, bible, outline and compass, and that **applies** changes to the content when you accept them.

Local-first fiction co-writer (BYOK → Ollama) in Spanish. All AI runs on your machine via Ollama; the whole manuscript lives in IndexedDB. UI and prompts in Spanish.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **TipTap 3** for the editor
- **Bootstrap 5** + custom CSS tokens (no Tailwind)
- **IndexedDB** via `idb` — one store per entity
- **Ollama** as the AI engine, proxied through Next.js API routes (`/api/ollama`, `/api/ollama/models`) to avoid CORS

## Requirements

- Node.js ≥ 20
- Ollama running at `http://localhost:11434` with at least one chat model installed. Tested on this machine: `qwen3:14b`, `qwen3.6:latest`, `gemma4:latest`. For fiction quality `qwen3:14b` is recommended; for speed, `gemma4:latest`.

## Scripts

```bash
npm install
npm run dev        # dev server (Turbopack), default :3000
npm run build      # production build
npm run start      # serve the build
npm run lint       # eslint
npm test           # vitest, single run
npm run test:watch # vitest in watch mode
```

## Getting started

1. Start Ollama: `ollama serve` (or the system daemon).
2. Make sure you have at least one model: `ollama pull qwen3:14b`.
3. `npm install && npm run dev` and open `http://localhost:3000`.
4. On first boot the app auto-fills the model (takes the first from `/api/ollama/models`) and creates an empty project.
5. Adjust the Ollama URL and model in **Settings** if you want to change them.

## What works today (MVP)

### Editor with AI bar

- **Write** — continues from the cursor, respecting context.
- **Describe** — expands the selection with sensory detail.
- **Rewrite** — rewrites the selection with a selectable style.
- **Expand** — replaces the scene with an expanded version from the beat/summary (short/medium/long).
- **Dialogue** — generates N variants of the selected dialogue line.
- **Tension** — rewrites the scene's ending raising the conflict.
- **Stop** — aborts any running command via `AbortController`.
- Debounced autosave (600ms); title and summary save on `blur`.
- Word and character counter in the footer.

### Right panel (tabs)

- **Brainstorm** — asks for ideas on a topic, saves notes, supports "append" to extend an existing note.
- **Characters** — inline editable cards (role, age, appearance, personality, voice, backstory, goals).
- **World** — inline editable entries (place / lore / rule / object / other).
- **Bible** — 5 auto-generated sections from the manuscript (Summary / Themes / Characters / World / Rules), with per-section manual override and a button to revert to auto content.
- Collapsible tabs on the right; `selectTab()` handles expand + switch.

### Project

- Sidebar with chapter/scene tree, project switcher, create-project modal.
- Settings modal with Ollama URL, model selector (auto-detects installed) and theme.
- Dark theme by default via `data-bs-theme="dark"`.

### Model

- Auto-detects the first installed model at boot (does not hardcode names to avoid 502s with missing models).
- Re-selectable at any time from the Settings modal.

## How it's organized

```
kanam-story/
├── app/                 # App Router: layout, page, /api/ollama, /api/ollama/models
├── components/          # UI (Editor, RightPanel, BrainstormPanel, CharactersPanel, WorldPanel, StoryBiblePanel, ...)
├── lib/
│   ├── db.ts            # IndexedDB schema + per-entity helpers
│   ├── store.tsx        # AppProvider + CRUD wrappers
│   ├── ollama.ts        # ollamaChat + checkOllama (always via /api/ollama)
│   ├── prompts.ts       # buildContext + per-command builders
│   ├── bibleParse.ts    # parser for the 5 Bible sections
│   └── *.test.ts        # vitest tests
├── types/               # Project, Chapter, Scene, Character, WorldEntity, BrainstormNote, StoryBible, Settings, AICommand
└── vitest.config.ts
```

Key conventions (summary):

- All persistence goes through `lib/db.ts` and `lib/store.tsx`. Components never touch `idb` directly.
- All AI calls go through `lib/ollama.ts`. Components build the prompt and handle `AbortController` + busy state.
- `stream: false` today — for streaming you must change the route and `ollamaChat` together.
- Spanish in all UI and all Ollama prompts. Domain fields (`Project.pov`, `Character.voice`) stay in English because they are serialized in IndexedDB.
- Bible section labels are kept in sync across `BIBLE_SECTION_DEFAULTS`, `buildStoryBiblePrompt` and `StoryBiblePanel` (parsing). Changing one without the others breaks regeneration.

## Testing

- Runner: **Vitest 4** (`vitest@^4.1.9`).
- Current coverage: **92 tests** on pure functions.
  - `lib/prompts.test.ts` — tests on `buildContext`, `buildExpandPrompt`, `buildStoryBiblePrompt`, `buildDialoguePrompt`, `buildTensionPrompt`.
  - `lib/bibleParse.test.ts` — tests on `parseBibleSections`.
  - `lib/agentReply.test.ts` — tests on `parseAgentReply`, `isValidAction`, `filterValidActions`.
  - `lib/agentPrompts.test.ts` — tests on `buildAgentContext`, `buildAgentPrompt`.
  - `lib/actions.test.ts` — tests on `applyAction`, `applyActions`.
  - `lib/ollamaStream.test.ts` — tests on `createOllamaStreamParser`.
- Only pure code is tested; React components, `lib/db.ts` (IndexedDB) and API routes have no tests yet.
- Run: `npm test`.

## Known / TODO (not in `0.1.0`)

- **Streaming.** `ollamaChatStream` (SSE) is implemented and tested; the editor still uses the non-streaming `ollamaChat`. The chat panel uses streaming.
- **Export.** No PDF / Markdown / DOCX export yet. The manuscript is trapped in IndexedDB.
- **Multi-user / sync.** No login, no cross-device sync. Strictly local and single-user.
- **Mobile / responsive.** The layout is optimized for desktop with the chapter sidebar + right panel. On mobile the grid does not adapt well.
- **Themes.** Only dark. Light would come later.
- **Component tests.** No jsdom yet. For the more complex components (Editor, StoryBiblePanel) `@testing-library/react` + `jsdom` would be needed.
- **IndexedDB tests.** No `fake-indexeddb`. Needed when store/db coverage is added.
- **Clean lint.** There are pre-existing errors in `components/ProjectTree.tsx`, `components/SettingsModal.tsx`, `components/WorldPanel.tsx` that are not blockers but should go before 1.0.
- **Manuscript search.** No find/replace across scenes.
- **Versioning / snapshots.** No way to see previous versions of a scene.

## Decisions already made (not easily reverted)

- **Next.js 16 with Turbopack.** Not "the Next.js you know". Before assuming an API, read `node_modules/next/dist/docs/01-app/`.
- **Bootstrap, not Tailwind.** Components use Bootstrap classes + custom CSS tokens (`--sl-*`).
- **UI/prompts in Spanish.** The user writes fiction in Spanish. Breaking this breaks the product.
- **`ollamaModel` default `''` with auto-fill.** Hardcoding `llama3.1` (or any model) as default breaks setups where that model is not installed. The first model from `/api/tags` is the default.
- **Type fields in English.** Structures serialized in IndexedDB (`pov`, `voice`, `key`). Translating them breaks user data.

## Operational notes

- `curl localhost:3000 → 200` does not prove your code is being served: an old `next dev` may be squatting on the port. Before smoke-testing, `lsof -i :3000` and kill zombies. Launch with `PORT=3100 npm run dev` to avoid ambiguity.
- Ollama down → 502 on `/api/ollama/models`. Expected, not a bug.