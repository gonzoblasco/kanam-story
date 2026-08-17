# Kanam Story

> **Status:** `0.15.0` — chat-assisted global outline + automatic structure generation + orphan scene panel + accessible consistent buttons + partial outline edits (update_outline) + beats from the author's manuscript via chat + co-writer sidebar from the writing view + project management (delete) + enrich character/world profiles. Local-first fiction co-writer where **the conversation is the product**: an agent you converse with that knows the manuscript, bible, outline and compass, and that **applies** changes to the content when you accept them.

Local-first fiction co-writer (BYOK → Ollama) in Spanish. All AI runs on your machine via Ollama; the whole manuscript lives in IndexedDB. UI and prompts in Spanish.

> **Roadmap:** phases 0-4 done (chat with hands, outline & beats, living bible, compass, export, editable story bible, rich character sheets, typed worldbuilding, match my style, outline filters + linking, accessible navigation redesign). The project stays in the `0.x` line (pre-production) - as an open-source, non-production tool it may never reach `1.0.0`. See `.knowledge/ROADMAP.md` for the full plan.

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

## What works today

### Accessible navigation (Phase 4)

- **Stacked story sections.** The 7 story sections (Co-writer, Brainstorm, Characters, World, Bible, Settings, Compass) stack vertically in the main area instead of right-panel tabs. The sidebar navigates Writing / Outline / Story.
- **Scrollspy + collapsible sections.** An `IntersectionObserver` highlights the active section in the sidebar as you scroll; each section is an accessible accordion.
- **Generate scene from outline beat.** Each beat in the outline has a "Generate scene" button that creates the scene (and the chapter automatically if the beat has none - optional structures), links the beat and opens the editor with focus. Re-generating a beat that already has a scene reuses it.
- **Genre-template onboarding.** Creating a project offers 4 optional starting points: blank outline, story bible, genre template (thriller/romance/sci-fi) or empty project.
- **Contextual inline creation.** "＋" buttons in each view (brainstorm note, character, world entry, outline beat, orphan-scene link).
- **Sticky chat input + contextual insertion.** The co-writer input stays anchored to the bottom of the chat card; accepting a proposal navigates to the section where the change applies.
- **Accessibility integrated from the design (WCAG).** Skip link, landmarks, h1→h2→h3 heading hierarchy, global `:focus-visible`, WCAG AA contrast, live regions for chat and creation feedback, managed focus on accept/discard/undo.

### Co-writer chat (the heart)

- **Chat panel** per project, persisted in IndexedDB. Converse with an agent that knows the manuscript, bible, outline and compass.
- **The agent has hands** — it proposes `ContentAction`s (rewrite scene, add/update beat, add/update character, update world, update bible, append scene).
- **Acceptance model** — the agent proposes a change, you see a diff/summary, then **accept or undo**. Nothing is applied without your OK.
- **Streaming** responses from Ollama (SSE).

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

### Outline & Beats

- **Outline view** in the main area (toggle Editor/Outline) — a map of beats per chapter/scene.
- **Manual editing** — title, kind, status, description, notes; reorder, add, delete.
- **"Suggest outline"** — the agent proposes beats from the bible/compass/what's written, with a preview (Add/Discard).
- **Filters by POV/tense** and **orphan-scene linking**.

### Story sections (stacked in the main area)

- **Co-writer** — the chat with hands (see above).
- **Brainstorm** — asks for ideas on a topic, saves notes, supports "append" to extend an existing note.
- **Characters** — rich sheets: typed role (`type`), pronouns, groups, other names, traits, and a context toggle (`inContext`). AI-assisted generation (Generate / Surprise Me / preview).
- **World** — typed entries (`kind`: place / organization / lore / key event / clue / magic system / item / rule / other), other names, traits, and a context toggle.
- **Bible** — 5 auto-generated sections from the manuscript (Summary / Themes / Characters / World / Rules), with per-section manual override, stale tracking and a button to revert to auto content.
- **Settings** — editable: braindump, genre tags, style (featured presets / custom / match my style), and an editable synopsis.
- **Compass** — narrative orientation: premise, promise, theme, protagonist, POV.

### Project

- Sidebar with chapter/scene tree, project switcher, create-project modal (with genre-template onboarding).
- Settings modal with Ollama URL, model selector (auto-detects installed) and theme (dark/light).
- **Export** the manuscript to Markdown (`.md`), plain text (`.txt`), PDF or DOCX from the top bar.
- **Search across scenes** with find/replace and confirmation.
- **Versioning / snapshots** of scenes with history, diff and restore.

### Model

- Auto-detects the first installed model at boot (does not hardcode names to avoid 502s with missing models).
- Re-selectable at any time from the Settings modal.

## How it's organized

```
kanam-story/
├── app/                 # App Router: layout, page, /api/ollama, /api/ollama/models
├── components/          # UI (Editor, ChatPanel, OutlineView, StorySections, CharactersPanel, WorldPanel, StoryBiblePanel, CompassPanel, StarterPicker, ExportMenu, ...)
├── lib/
│   ├── db.ts            # IndexedDB schema + per-entity helpers + migrations
│   ├── store.tsx        # AppProvider + CRUD wrappers
│   ├── ollama.ts        # ollamaChat + checkOllama (always via /api/ollama)
│   ├── ollamaStream.ts  # SSE streaming parser
│   ├── agentPrompts.ts  # buildAgentContext + agent prompt + suggest beats + generate character
│   ├── agentReply.ts    # parse/validate agent JSON actions
│   ├── actions.ts       # pure, reversible ContentAction application
│   ├── prompts.ts       # buildContext + per-command builders + bible prompts
│   ├── bibleExtract.ts  # extract characters/world from bible markdown
│   ├── bibleParse.ts    # parser for the 5 Bible sections
│   ├── bibleSync.ts     # pure dedupe/merge for bible → characters/world sync
│   ├── sceneFromBeat.ts # pure plan for generating a scene from an outline beat
│   ├── actionTargets.ts # pure resolution of the destination section for accepted actions
│   ├── projectTemplates.ts # pure genre-template data for onboarding
│   ├── snapshots.ts     # scene versioning (dedupe + LCS diff)
│   ├── search.ts        # find/replace across scenes
│   ├── export.ts        # manuscript export (md/txt/pdf/docx)
│   ├── labels.ts        # shared labels (POV, character type, world kind, style)
│   └── *.test.ts        # vitest tests
├── types/               # Project, Chapter, Scene, Character, WorldEntity, Beat, StoryBible, Conversation, Message, ContentAction, ...
└── vitest.config.ts
```

Key conventions (summary):

- All persistence goes through `lib/db.ts` and `lib/store.tsx`. Components never touch `idb` directly.
- All AI calls go through `lib/ollama.ts`. Components build the prompt and handle `AbortController` + busy state.
- The chat uses streaming (`ollamaChatStream`); the editor's AI bar uses non-streaming `ollamaChat`.
- Spanish in all UI and all Ollama prompts. Domain fields (`Project.pov`, `Character.type`, `WorldEntity.kind`) stay in English because they are serialized in IndexedDB.
- Bible section labels are kept in sync across `BIBLE_SECTION_DEFAULTS`, `buildStoryBiblePrompt` and `StoryBiblePanel` (parsing). Changing one without the others breaks regeneration.
- DB migrations bump `DB_VERSION` and map existing data (v2→v3 beats, v3→v4 style, v4→v5 character type, v5→v6 world kind, v6→v7 tense, v7→v8 snapshots).
- Pure, testable logic is extracted to `lib/*.ts` (no DB/DOM): `bibleSync.ts`, `sceneFromBeat.ts`, `actionTargets.ts`, `projectTemplates.ts`, `snapshots.ts`, `search.ts`.

## Testing

- Runner: **Vitest 4** (`vitest@^4.1.9`).
- Current coverage: **282 tests** on pure functions and components.
  - Pure logic: `prompts`, `bibleParse`, `bibleExtract`, `bibleSync`, `agentReply`, `agentPrompts`, `actions`, `ollamaStream`, `export`, `labels`, `outline`, `sceneFromBeat`, `actionTargets`, `projectTemplates`, `snapshots`, `search`, `db` (fake-indexeddb).
  - Components (jsdom + `@testing-library/react`): `StoryBiblePanel`, `CharactersPanel`, `WorldPanel`, `StorySections` (accordion, scrollspy, section focus), `ChatPanel` (sticky input, live region, contextual insertion), `StarterPicker` (radio group).
- Run: `npm test`.

## Known / TODO (not in the current release)

- **Multi-user / sync.** No login, no cross-device sync. Strictly local and single-user.
- **Mobile / responsive.** The layout is optimized for desktop with the chapter sidebar + stacked sections. On mobile the grid does not adapt well.
- **Manual AT validation.** The live region of the chat and the onboarding radio group need final validation with VoiceOver/NVDA (the green tests do not cover the timing of the announcement).

## Decisions already made (not easily reverted)

- **Next.js 16 with Turbopack.** Not "the Next.js you know". Before assuming an API, read `node_modules/next/dist/docs/01-app/`.
- **Bootstrap, not Tailwind.** Components use Bootstrap classes + custom CSS tokens (`--sl-*`).
- **UI/prompts in Spanish.** The user writes fiction in Spanish. Breaking this breaks the product.
- **`ollamaModel` default `''` with auto-fill.** Hardcoding `llama3.1` (or any model) as default breaks setups where that model is not installed. The first model from `/api/tags` is the default.
- **Type fields in English.** Structures serialized in IndexedDB (`pov`, `type`, `kind`, `key`). Translating them breaks user data.

## Operational notes

- `curl localhost:3000 → 200` does not prove your code is being served: an old `next dev` may be squatting on the port. Before smoke-testing, `lsof -i :3000` and kill zombies. Launch with `PORT=3100 npm run dev` to avoid ambiguity.
- Ollama down → 502 on `/api/ollama/models`. Expected, not a bug.
