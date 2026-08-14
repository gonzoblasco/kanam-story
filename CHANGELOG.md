# Changelog

All notable changes to Kanam Story are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) (relaxed during beta).

## [0.7.0] - 2026-08-14

Refined editor + Bible ↔ tabs sync (Phase 3). The writing area gets a full formatting toolbar and a contextual AI selection indicator, and the Story Bible now auto-syncs its characters and world into their tabs.

### Added
- **Formatting toolbar (U1/U2).** Bold, italic, strikethrough, underline, undo/redo, bulleted and numbered lists, H1-H3 headings, and links (`setLink`/`unsetLink`). StarterKit 3.27.1 provides underline and link out of the box.
- **Contextual AI selection indicator (U3).** Selecting text in the editor shows a floating pill (like Sudowrite) with a selected-word counter and Rewrite/Describe buttons that reuse the existing `runAI` logic. Hides on deselect or click-outside.
- **Selected-word counter + toolbar polish (U4).** Precise word count (multi-line aware), `flex-wrap` on the toolbar to avoid overflow, active states for format buttons.
- **Auto-sync characters from Bible (U5).** Regenerating the Story Bible auto-imports detected characters into the Characters tab, deduped by name (case-insensitive), marked `source: 'biblia'`, never overwriting manual edits.
- **Auto-sync world from Bible (U6).** Same pattern for world entities into the World tab.
- **Revert bible imports (U7).** A "Revert import" button on character/world cards (visible when `source === 'biblia'`) detaches the entity from the bible non-destructively.
- **Pure sync-plan logic + tests (U8).** `lib/bibleSync.ts` extracts the dedupe/merge logic (DB-free, unit-testable); 8 new tests cover dedupe, no-overwrite, bible marking and revert.

### Fixed
- **Sync ran before regeneration (U5 review).** `syncCharactersFromBible` ran before `regenerateStoryBible`, syncing the stale bible. Now regeneration runs first and syncs read the fresh bible from the DB.

## [0.6.0] - 2026-08-13

Outline filters + orphan scene linking (Slice 10). The outline becomes navigable and filterable by POV and tense, and orphan scenes can be linked to chapters.

### Added
- **Outline filters by POV/tense.** Filter the outline by point-of-view and tense to focus on specific narrative threads.
- **Orphan scene linking.** Scenes not yet attached to a chapter can be linked to one, keeping the outline coherent.

### Changed
- `OutlineView` gained filter controls and orphan-scene linking UI.

## [0.5.0] - 2026-08-13

Match My Style (Slice 9). The co-writer can now learn the author's voice from a sample and apply it to generated prose.

### Added
- **Match My Style.** Extract a style profile from a sample of the author's writing and inject it into generation prompts, so the co-writer matches the author's voice.
- Style profile extraction and injection in `agentPrompts` / `agentReply`.

## [0.4.0] - 2026-08-13

Fine-grained typed worldbuilding (Slice 8). The World tab gets typed entities with a context toggle, mirroring the rich character sheets.

### Added
- **Typed worldbuilding.** World entities with typed `kind` (location, item, faction, etc.), rich fields and a context toggle to control what is injected into the agent context.
- `inferKind` extraction from the bible for world entities.

### Fixed
- Renamed `inferCategory` to `inferKind` and dropped a duplicate keyword in bible extraction (Slice 8 review).

## [0.3.0] - 2026-08-13

Rich character sheets (Slice 7). Characters get typed roles, a context toggle and AI-assisted generation.

### Added
- **Rich character sheets.** Typed roles (protagonist, supporting, antagonist, etc.), rich fields (age, appearance, personality, voice, backstory, goals) and a context toggle to control what is injected into the agent context.
- **AI character generation.** Generate or enrich a character with the co-writer.
- Role labels and mapping in `lib/labels.ts`.

### Fixed
- Validate character type in `update_character` and clean role mapping (Slice 7 review).
- Use `versionchange` transaction in the DB migration; disabled the non-functional match-style option (Slice 6 review).

## [0.2.0] - 2026-08-13

Editable Story Bible (Slice 6). The bible stops being only auto-generated: it becomes the editable, typed base of coherence that feeds the co-writer.

### Added
- **Braindump.** A free-form field on the project for dumping loose ideas, scenes and alternative endings. Injected into the agent context as low-weight context (not a rule).
- **Genre tags.** `genres: string[]` multi-select with removable tags on the project.
- **Style selector.** `style` is now a typed object with three modes: Featured presets, Custom free-form, and Match My Style (placeholder until Slice 9). The active style is injected into both the chat context and the generation prompts.
- **Editable Synopsis.** `synopsis` override on the project; when empty, the project description is used. Injected into the agent context.
- **Story Bible settings tab.** New `StoryBibleSettingsPanel` in the right panel (Braindump, Genres, Style, Synopsis), following the CompassPanel draft-and-commit pattern.

### Changed
- `Project.style` migrated from `string` to `ProjectStyle` object (DB v3 → v4). Existing string values are migrated to `{ mode: 'custom', custom: <string> }`.
- `buildAgentContext` and `buildContext` now inject genres, style, braindump and synopsis.
- Centralized style resolution in `lib/labels.ts` (`styleText` + `STYLE_PRESETS`).

### Fixed
- `buildContext` now uses the shared POV labels from `lib/labels.ts` (removed the duplicated local `povLabel`).

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