# Changelog

Todos los cambios notables de Sudolab se documentan acá. El formato sigue [Keep a Changelog](https://keepachangelog.com/es/1.1.0/) y el proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/) (relajado durante la beta).

## [Unreleased]

### Por hacer
- Streaming de respuestas del modelo (cambia `/api/ollama` y `ollamaChat`).
- Export a PDF / Markdown / DOCX.
- Temas (claro + oscuro toggle).
- Tests de componentes React (jsdom + Testing Library).
- Tests de `lib/db.ts` (fake-indexeddb).
- Búsqueda entre escenas.
- Limpiar los 10 errores de lint pre-existentes en `ProjectTree.tsx`, `SettingsModal.tsx`, `WorldPanel.tsx`.

## [0.2.0-beta] - 2026-06-29

Cierra el gap entre la Biblia auto-generada y los tabs editables: ahora se puede promover el contenido detectado a entidades estructuradas con marca de origen. Cero cambio de modelo; el bridge corre local.

### Added
- **Bridge Biblia → tab Personajes**:
  - En la sección "Personajes" del panel Biblia: botón **Detectar** (parsea el markdown de la sección y/o llama a la IA para extraer JSON estructurado), **Importar todos (n)** para promover todos de una, y un botón verde `→` por entry para promover uno a uno.
  - Al importarlos, los personajes quedan con `source: 'biblia'` y muestran un badge celeste **"de biblia"** en el tab Personajes.
- **Bridge Biblia → tab Mundo**: el mismo flujo para la sección "Mundo" del panel Biblia, con detección de `category` por tag explícito `[lugar]`/`[lore]`/`[regla]`/`[objeto]` o por heurística.
- **Auto-fill al abrir los tabs Personajes/Mundo**: si el tab está vacío y la sección correspondiente de la Biblia también, la Biblia se regenera automáticamente la primera vez que abrís ese tab. Opt-out por `localStorage.setItem('sudolab.autoFillBible:characters:<projectId>', '0')` (o `:world:`).
- **`buildBibleExtractPrompt`** en `lib/prompts.ts`: nuevo prompt builder que pide JSON estricto cuando el parser markdown no encuentra nada estructurado.
- **`regenerateStoryBible`** movido al store: cualquier componente puede disparar la regeneración sin duplicar la lógica de prompt/parseo.
- **`storyBibleDB.get`** helper en `lib/db.ts`.

### Changed
- `Character` y `WorldEntity` ganan `source?: 'manual' | 'biblia'`. Registros existentes quedan como `undefined` → tratados como `'manual'`.
- `StoryBiblePanel` ya no hace la llamada a IA inline — usa `regenerateStoryBible` del store y le agrega el bridge de detección/importación encima.

### Fixed
- El lint de React 19 (`react-hooks/set-state-in-effect`) ya no se queja del auto-fill: el spinner efímero se removió (el badge "de biblia" sigue apareciendo como señal visual).

### Notes
- 21 tests nuevos (`lib/bibleExtract.test.ts`: 18; `lib/prompts.test.ts`: +3 para `buildBibleExtractPrompt`). Total: 59/59 verde.
- `tsc --noEmit` clean.
- Lint limpio en los 10 archivos tocados por este release (los 10 errores pre-existentes en `ProjectTree.tsx`/`SettingsModal.tsx`/`WorldPanel.tsx` siguen, fuera de scope).

[Unreleased]: https://example.com/sudolab/compare/v0.2.0-beta...HEAD
[0.2.0-beta]: https://example.com/sudolab/compare/v0.1.0-beta...v0.2.0-beta
[0.1.0-beta]: https://example.com/sudolab/releases/tag/v0.1.0-beta