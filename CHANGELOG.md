# Changelog

All notable changes to Kanam Story are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) (relaxed during beta).

## [0.1.0] - 2026-08-13

First usable release. Local-first fiction co-writer where the conversation is the product.

### Added
- **Agent chat with hands (Slice 1).** A chat panel where you converse with a co-writer agent that knows the manuscript, characters, world, outline and bible, and that **applies** changes to the content when you accept them.
  - `lib/agentReply.ts` — parses the agent's structured JSON response (`reply` + `actions`) and validates actions.
  - `lib/agentPrompts.ts` — builds the full agent context (project, characters, world, manuscript, beats, bible) and the structured-response prompt.
  - `lib/actions.ts` — pure, reversible application of `ContentAction`s to a `StoryState` snapshot.
  - `components/ChatPanel.tsx` — conversation list, streaming responses, and accept/discard for proposed changes.
  - `lib/store.tsx` — `applyContentActions` persists accepted actions to IndexedDB.
- **Ollama streaming (SSE).** `ollamaChatStream` + `lib/ollamaStream.ts` parser (tested) + `/api/ollama` route with `stream: true` via `ReadableStream`.
- **Silenced lockfile warning.** `turbopack.root` in `next.config.ts`.
- **Outline & Beats (Slice 2).** Outline view in the main area (toggle Editor/Outline), inline beat editing (title/kind/status/desc/notes), reorder, add/delete, and an AI "suggest outline" flow with preview.
- **Living Bible (Slice 3).** Per-section regeneration, stale tracking (`staleAt`), and auto-stale marking when the agent changes characters/world.
- **Narrative Compass (Slice 4).** `premise`/`promise`/`theme`/`protagonist` fields on the project, a Compass tab, a promise strip in the editor, and the compass included in the agent context.
- **Manuscript export (Slice 5).** Export the manuscript to Markdown (`.md`) or plain text (`.txt`) from the top bar.
- **Clean lint.** Fixed all pre-existing lint errors (unused imports, `any` types, unescaped entities, set-state-in-effect).

### Changed
- Default model prefers `deepseek-v4-flash` when available.
- Centralized POV labels in `lib/labels.ts` (shared across the UI and prompts).
- Renamed `BrújulaPanel` to `CompassPanel` (ASCII-safe filename).

### Fixed
- `add_beat` from the chat now propagates `chapterId` so beats appear in the outline.
- Deleting a character clears a dangling `project.protagonist` reference.
- Deleting a chapter/scene cascades to its beats (no orphaned beats).
- Suggested beats are deduplicated by title; the preview resets on chapter change.

### TODO
- Export to PDF / DOCX.
- Light theme (dark + light toggle).
- React component tests (jsdom + Testing Library).
- `lib/db.ts` tests (fake-indexeddb).
- Search across scenes.

## [0.2.0-beta] - 2026-06-29

Closes the gap between the auto-generated Bible and the editable tabs: detected content can now be promoted to structured entities with a source marker. Zero model change; the bridge runs locally.

### Added
- **Bible → Characters tab bridge**:
  - In the "Characters" section of the Bible panel: **Detect** button (parses the section markdown and/or calls the AI to extract structured JSON), **Import all (n)** to promote all at once, and a green `→` button per entry to promote one by one.
  - Imported characters get `source: 'biblia'` and show a light-blue **"from bible"** badge in the Characters tab.
- **Bible → World tab bridge**: the same flow for the "World" section of the Bible panel, with `category` detection by explicit tag `[place]`/`[lore]`/`[rule]`/`[object]` or by heuristic.
- **Auto-fill when opening the Characters/World tabs**: if the tab is empty and the corresponding Bible section is also empty, the Bible regenerates automatically the first time you open that tab. Opt-out via `localStorage.setItem('sudolab.autoFillBible:characters:<projectId>', '0')` (or `:world:`).
- **`buildBibleExtractPrompt`** in `lib/prompts.ts`: new prompt builder that asks for strict JSON when the markdown parser finds nothing structured.
- **`regenerateStoryBible`** moved to the store: any component can trigger regeneration without duplicating prompt/parse logic.
- **`storyBibleDB.get`** helper in `lib/db.ts`.

### Changed
- `Character` and `WorldEntity` gain `source?: 'manual' | 'biblia'`. Existing records stay `undefined` → treated as `'manual'`.
- `StoryBiblePanel` no longer makes the AI call inline — it uses `regenerateStoryBible` from the store and adds the detect/import bridge on top.

### Fixed
- The React 19 lint (`react-hooks/set-state-in-effect`) no longer complains about auto-fill: the ephemeral spinner was removed (the "from bible" badge still appears as a visual signal).

### Notes
- 21 new tests (`lib/bibleExtract.test.ts`: 18; `lib/prompts.test.ts`: +3 for `buildBibleExtractPrompt`). Total: 59/59 green.
- `tsc --noEmit` clean.
- Clean lint in the 10 files touched by this release (the 10 pre-existing errors in `ProjectTree.tsx`/`SettingsModal.tsx`/`WorldPanel.tsx` remain, out of scope).

[Unreleased]: https://github.com/gonzoblasco/kanam-story/compare/v0.2.0-beta...HEAD
[0.2.0-beta]: https://github.com/gonzoblasco/kanam-story/compare/v0.1.0-beta...v0.2.0-beta
[0.1.0-beta]: https://github.com/gonzoblasco/kanam-story/releases/tag/v0.1.0-beta