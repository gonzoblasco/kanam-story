# Changelog

All notable changes to Kanam Story are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) (relaxed during beta).

## [0.15.0] - 2026-08-17

### Added
- **Enrich character profiles.** Each character card now has an "Enriquecer" button that asks the co-writer to deepen the existing profile (personality, voice, goals, backstory, traits, etc.) while respecting the current literary world and without contradicting the bible, world, or manuscript. Implemented as `enrichCharacter` (store) + `buildEnrichCharacterPrompt` (agent prompt) + `parseEnrichedCharacter` (parser), merging the enriched fields back into the existing character.
- **Enrich world entities.** Each world card (places, organizations, magic systems, events, items, etc.) has an "Enriquecer" button that deepens the description while respecting the world. Implemented as `enrichWorld` + `buildEnrichWorldPrompt` + `parseEnrichedWorld`.

### Tests
- 349 tests passing (added parser and prompt coverage).

## [0.14.0] - 2026-08-17

### Fixed
- **Generating a scene no longer creates a duplicate when the chapter has one scene.** If a beat has no linked scene but its chapter has exactly one scene, "generate scene" now writes that scene and links the beat to it, instead of creating a second scene. (Regression: starting a story, chapter 1 / scene 1, then "generate scene" produced a "scene 2".)

### Added
- **Delete project.** Projects can now be deleted from the sidebar (trash icon on each project row) with a confirmation dialog. The project and all its content (chapters, scenes, beats, characters, world, bible, conversations, messages, snapshots) are removed in a DB cascade, and if the deleted project was active, the app clears to the empty state and forgets it as the last-selected project.

### Tests
- 341 tests passing (added single-scene reuse and project deletion coverage).

## [0.13.1] - 2026-08-17

### Fixed
- **Markdown now renders in the co-writer chat.** The assistant and user messages (and the live stream) were rendered as plain text, so `*negrita*` appeared literally instead of **negrita**. They now render through `MarkdownView` (headings, bold, italic, lists, code, links).
- **Visible feedback while the AI is thinking.** Added a "Pensando…" indicator with a spinner while the agent is working before the first stream chunk arrives, so it's clear you must wait.
- **Feedback when a proposed action cannot be applied.** `applyContentActions` now returns `{ undo, failed }`; if a proposed action references an id that no longer exists (scene, beat, character, world entity), the chat announces which ones failed instead of silently showing "Cambios aplicados". This surfaces cases where the agent proposed an edit to an id that doesn't exist.

### Tests
- 338 tests passing (added failed-action announcement coverage).

## [0.13.0] - 2026-08-16

### Added
- **Co-writer sidebar from the writing view.** A new expandable/collapsible sidebar (overlay that slides from the right) lets you chat with the agent directly from the editor, without switching views. It reuses the full `ChatPanel` (agent with hands: `rewrite_scene`, `update_bible`, `add_beat`, `update_character`, etc.) with accept/undo. The open/closed state persists in settings.
- **Scene-scoped agent context.** The sidebar runs the agent in a `'scene'` scope: it sees only the active scene (full text) + bible + characters + world + outline of the current chapter. It can edit the current scene but not other scenes, matching the "no modifica otras escenas" requirement. Implemented as a pure `buildSceneContext` helper and tested.
- **Accessibility.** The sidebar is an `aside` with `aria-label`, the toggle button exposes `aria-expanded`/`aria-controls`, focus moves to the close button on open, and Escape closes it.

### Tests
- 337 tests passing (added scene-context and sidebar behavior coverage).

## [0.12.1] - 2026-08-16

### Added
- **Beats from the author's manuscript via chat.** The co-writer now receives the active scene's full text (under "ESCENA ACTIVA") instead of the previous 800-char truncation, and is instructed to extract beats from the author's actual content - keeping the ideas but free to reorder/respace them, without inventing new content. This enables flows like "generá el outline de esta escena" or "armá los beats de este texto" by pasting or working on the current scene.
- **Beat ids now exposed in the agent context.** The outline context now shows each beat's `id` (`(id: b1, capítulo ch1)`), so actions that reference a `beatId` (`update_beat`, `deleteBeat`, `moveBeatToChapter`, `updateBeat`) target real beats instead of falling back to scene/chapter ids.

### Fixed
- **Agent could not reference beats by id.** The outline context did not include beat ids, so the model emitted `beatId` values that pointed at scene or chapter ids (e.g. `"s1"`), which would fail or corrupt when applied. Now ids are visible and validated.

### Tests
- 331 tests passing (added active-scene context and beat-id context coverage).

## [0.12.0] - 2026-08-16

### Added
- **`update_outline` partial action (U5).** The co-writer can now make targeted edits to the outline without replacing it wholesale. Supported operations: rename a chapter, delete a chapter (its scenes become orphans, its beats are removed), add beats to a chapter or scene, delete a beat, move a beat to another chapter, and update a beat's fields. Applied to IndexedDB with full undo that restores chapters, beats, and scene-chapter assignments.
- **Validation and prompt support for `update_outline`.** `isValidAction` requires at least one operation and validates each present operation; `normalizeActionKinds` normalizes beat kinds inside `addBeats`/`updateBeat`; the agent prompt documents the partial-edit action and when to prefer it over `replace_outline`.

### Tests
- 330 tests passing (9 new: pure-state apply/undo, validation edge cases, action-target routing).

## [0.11.2] - 2026-08-16

### Fixed
- **Self-review of the orphan scene panel.** `OutlineView` filtered orphan scenes as "scenes without beats" instead of "scenes without a chapter" (`chapterId: ''`), which duplicated the local `ChapterSection` concept and showed scenes that actually had a chapter. Now the global panel only lists scenes with `chapterId === ''`.
- **Explicit `type="button"` on `btn-icon-label` buttons** in `BeatCard` and `ChapterSection`, so they never act as implicit form submit buttons.

## [0.11.1] - 2026-08-16

### Fixed
- **Button accessibility and consistency in the outline.** The primary button (`btn-primary`) used a background (`#7c5cff`) that failed WCAG AA contrast (4.35:1) with white text in dark mode. Added `--sl-btn-primary-bg`/`--sl-btn-primary-hover` tokens so the primary button now clears AA (5.82:1). Unified `btn-ai` with the primary button style (removed the inconsistent gradient).
- **Icon-only buttons now show visible labels.** Replaced `icon-btn` (icon-only, `aria-label` only) in `BeatCard` and `ChapterSection` with `btn-icon-label` buttons that show a short visible label (Subir / Bajar / Eliminar) plus the icon, improving comprehension and focus contrast.
- **Consistent button variants in the outline.** Standardized `btn-outline-secondary` usages to `btn-outline-primary` (orphan scene link, view) so the outline uses a single secondary style.
- **Unambiguous "Agregar beat" label.** The add-beat button now reads "Agregar beat" instead of just "Beat".

## [0.11.0] - 2026-08-16

### Added
- **Orphan scene panel in global outline (U4).** Scenes that lost their chapter after a `replace_outline` (or created without a chapter) now appear in an "Escenas sin capítulo" section at the bottom of the global outline. Each orphan scene can be moved to an existing chapter, linked to a new beat, opened in the editor, or deleted.

### Fixed
- **ProjectTree test reactivity for derived expanded state.** Updated `ProjectTree.test.tsx` mocks so that `setSettings` triggers a re-render, matching the new `useMemo`-derived `expanded` state.

## [0.10.2] - 2026-08-16

### Fixed
- **CI lint errors after v0.10.1.** Removed synchronous `setState` calls inside `useEffect` in `OutlineView` and `ProjectTree`, fixed missing `useCallback` dependencies in `store.tsx`, and cleaned up unused variables flagged by ESLint. All 316 tests pass and `npm run lint`, `npx biome check .`, TypeScript, and `npm run build` are green.

## [0.10.1] - 2026-08-16

### Fixed
- **Beat kind aliases in chat-assisted outline.** The model sometimes emitted non-official kind values like `"giro"` for `replace_outline`. `parseAgentReply` now normalizes known Spanish aliases (`ascenso`, `clímax`, `caída`, `resolución`, `personalizado`, etc.) and unknown values to `"custom"`. `buildAgentPrompt` explicitly forbids synonyms and requires the official English kinds.

## [0.10.0] - 2026-08-16

Post-v0.9.0 feature block: global outline, automatic structure generation, and chat-assisted outline redesign. Also hardens the chapter-generation flow and makes the manuscript tree state survive reloads.

### Added
- **Global outline view (U1).** `OutlineView` switches between Chapter and Global modes. Global mode shows all chapters with their beats, lets you reorder chapters, move beats between chapters, add chapters, and generate a full chapter from the outline.
- **Automatic global outline generation (U2).** `lib/outlineGeneration.ts` asks the model for a complete chapter+beat structure, parses aliases in Spanish, and presents a preview with Apply/Discard. Replacing the existing outline is explicit and reversible.
- **Chat-assisted global outline generation (U3).** The co-writer can propose a full outline replacement via the `replace_outline` action, shown as a structured preview in the chat. Accepting it swaps the outline in IndexedDB with full undo support.
- **Collapsible manuscript chapters.** Chapter rows in `ProjectTree` expand/collapse via the caret or title, hiding their scenes.
- **Persisted session state.** Last selected project, last selected scene, and collapsed chapter ids are stored in IndexedDB settings and restored on reload.
- **Action menus in the manuscript tree.** `ActionMenu.tsx` replaces inline chapter/scene action buttons with accessible `<details>`/`<summary>` dropdowns.

### Changed
- **Removed confusing POV/tense outline filters.** The filters compared against the project's own POV/tense, so any non-matching filter hid the whole outline. Removed until a useful filtering model is designed.
- **Refactored `OutlineView`.** Split the ~960-line component into `BeatCard`, `ChapterSection`, and `SuggestedOutlinePreview` with shared labels in `lib/outlineLabels.ts`.
- **Wider writing area.** Removed the `max-width: 820px` constraint from `.main-content` so the editor uses the available space.

### Fixed
- **Beat-specific chapter generation.** `generateSceneContent` now receives the explicit `Beat` and builds the prompt from its title, description, and notes, so generated scenes cover their own beat instead of repeating a generic premise.
- **Sequential scene ordering during chapter generation.** New scenes from a generated chapter now receive increasing `order` values instead of all defaulting to `0`.
- **Stale previous-scene reference during chapter generation.** `generateChapter` accumulates generated scenes and passes the latest one as `previousScene`, so each scene sees what came before it.
- **Hydration warning on theme attribute.** Added `suppressHydrationWarning` to the `data-bs-theme` root in `app/layout.tsx`.
- **Keyboard accessibility of tree rows.** Chapter titles are real `<button>` elements; scene items have `role="button"`, `tabIndex={0}`, and Enter/Space handlers.

## [0.9.0] - 2026-08-15

Accessible navigation redesign (Phase 4). The story sections move from right-panel tabs to stacked sections in the main area, with accessibility integrated from the design (WCAG), not added as a final layer. Developed with the multi-agent chain pipeline + cross-review.

### Added
- **Stacked story sections (U1).** The 7 story sections (Co-writer, Brainstorm, Characters, World, Bible, Settings, Compass) now stack vertically in the main area instead of living in right-panel tabs. Grid went from 3 to 2 columns and `RightPanel` was dropped as a tab container. Sidebar navigates Writing / Outline / Story with `aria-current`.
- **Scrollspy + collapsible sections (U2).** An `IntersectionObserver` highlights the active section in the sidebar as you scroll, updating `aria-current="true"`. Each section is an accessible accordion: a native `<button>` inside the h2 with `aria-expanded` and `aria-controls`; collapsing keeps the h2 visible to preserve the heading hierarchy.
- **Generate scene from outline beat (U4).** Each beat in the outline gets a "Generate scene" button that creates the scene (and the chapter automatically if the beat has none - optional structures), links the beat inside it and opens the editor with focus. Pure testable logic in `lib/sceneFromBeat.ts` (`planGenerateScene`). Re-generating a beat that already has a scene reuses it instead of duplicating.
- **Genre-template onboarding (U5).** Creating a project now offers 4 optional starting points: blank outline, story bible, genre template (thriller/romance/sci-fi) or empty project. Pure data in `lib/projectTemplates.ts`; applied via `createProjectWithStructure`.
- **Contextual inline creation (U6).** "+" buttons in each view (Brainstorm note, character, world entry, outline beat, orphan-scene link) with descriptive `aria-label` and creation announced via the global live region.
- **Sticky chat input + contextual insertion (U7).** The co-writer input stays anchored to the bottom of the chat card with internal message scroll. Accepting a proposal navigates to the section where the change applies (character, beat, world, bible, scene). Pure target resolution in `lib/actionTargets.ts` (`getActionsTarget`).
- **Accessibility integrated from the design.** Skip link, `<nav aria-label="Secciones">`, `<main id="contenido-principal">`, each section as `<section aria-labelledby>` with h2 under h1 (no heading jumps), global `:focus-visible` ring, WCAG AA contrast, accessible radio group for onboarding (roving tabindex + arrow keys), live regions for chat and creation feedback, and managed focus on accept/discard/undo.

### Changed
- **"Story Bible" renamed to "Ajustes" (U3).** The internal heading is gone; the stacked section shows a single coherent title. Unified card headers/hints (`.stack-panel-header`/`.stack-panel-hint`) across all 7 cards; removed the `<strong>` duplicates of the accordion h2.
- **OutlineView heading hierarchy (U3).** Added `<h1>Outline</h1>`; chapters/scenes moved to `<h2>`/`<h3>` for a consistent h1→h2→h3 tree.

### Fixed
- **Focus after sending (U7 review).** The `finally` of `send()` called `focus()` while the textarea was still `disabled`, so focus was lost; deferred with `setTimeout(0)`.
- **Focus loss on accept/discard/undo (U7 review).** Focus fell to `<body>` when the accept/discard/undo button unmounted; added `requestSectionFocus` to focus the destination section heading on accept, and return focus to the input on discard/undo (WCAG 2.4.3).
- **Flaky DB test.** The `beforeEach` of `lib/db.test.ts` is stable (5/5 runs); the `7c2432c` commit already removed the `updatedAt` sort flakiness.
- **tsc in tests.** Fixed 4 pre-existing type errors in test files (`StarterPicker.test.tsx`, `bibleSync.test.ts` x2, `export.test.ts`) so `tsc --noEmit` passes clean.

## [0.8.0] - 2026-08-14

Backlog de la Fase 3 (B1-B7): calidad de testeo, export de documentos, búsqueda entre escenas, tema claro, versionado de escenas y streaming en el editor. Desarrollado con pipeline multi-agente + revision cruzada.

### Added
- **Tests de la capa de datos (B1).** Migraciones de la DB extraídas a funciones puras (`lib/migrations.ts`) y cobertura CRUD de todos los stores con `fake-indexeddb` (`lib/db.test.ts`).
- **Tests de componentes (B2).** jsdom + `@testing-library/react` para StoryBiblePanel (auto-sync U5/U6), CharactersPanel y WorldPanel (revertir imports U7).
- **Export PDF y DOCX (B3).** `exportManuscriptPdf` (pdfmake) y `exportManuscriptDocx` (docx), client-side, con inline markdown parseado (negritas/cursivas) y errores visibles en el menu.
- **Busqueda entre escenas (B4).** `lib/search.ts` (busca en contenido/titulo/summary, reemplaza solo en nodos de texto) + `SearchPanel` con resultados agrupados por capitulo, navegacion y find/replace con confirmacion.
- **Tema claro (B5).** Toggle light/dark con preferencia persistida, contraste corregido (WCAG AA) y anti-flash al recargar (`ThemeToggle` + script inline en `layout.tsx`).
- **Versioning / snapshots de escenas (B6).** `lib/snapshots.ts` (dedupe + diff LCS) + store `sceneSnapshots` (DB v8) + `VersionHistoryPanel` con historial, diff y restauracion.
- **Streaming en el editor (B7).** `runAI` migrado a `ollamaChatStream` (SSE): el texto se inserta en vivo, autosave suprimido durante el stream, revert parcial en abort/error.

### Fixed
- PDF export crasheaba: `vfs_fonts` es un mapa plano, no `{ pdfMake: { vfs } }` (B3 review).
- Condicion de carrera en find/replace: escrituras read-modify-write concurrentes perdian cambios (B4 review).
- Anti-flash se anulaba: el effect de tema corria con el default 'dark' antes de cargar las settings (B5 review).
- Streaming: el cierre del dialogo caia al final del documento y el primer chunk con solo whitespace no reemplazaba la seleccion (B7 review).
- CI: jsdom 30 requiere `undici.markAsUncloneable`, ausente en Node 20 — el CI paso a Node 22 + `.nvmrc`.

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

[Unreleased]: https://github.com/gonzoblasco/kanam-story/compare/v0.9.0...HEAD
[0.9.0]: https://github.com/gonzoblasco/kanam-story/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/gonzoblasco/kanam-story/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/gonzoblasco/kanam-story/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/gonzoblasco/kanam-story/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/gonzoblasco/kanam-story/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/gonzoblasco/kanam-story/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/gonzoblasco/kanam-story/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/gonzoblasco/kanam-story/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/gonzoblasco/kanam-story/compare/v0.2.0-beta...v0.1.0
[0.2.0-beta]: https://github.com/gonzoblasco/kanam-story/compare/v0.1.0-beta...v0.2.0-beta
[0.1.0-beta]: https://github.com/gonzoblasco/kanam-story/releases/tag/v0.1.0-beta