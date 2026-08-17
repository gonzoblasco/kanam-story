# Auditoría del Outline & Beats — 2026-08-17

> Verificación del comportamiento real del outline contra su spec (`openspec/specs/outline-beats/spec.md`).
> Objetivo: encontrar la deuda silenciosa - cosas que "funcionan" pero con el contexto equivocado.

## Resumen

El outline cumple 5 de los 6 requirements del spec. El requirement 5 (filtros de POV/tense)
**no se cumple** - la feature fue removida deliberadamente porque el modelo de filtrado era defectuoso.

## Requirements verificados

### ✅ Requirement 1: El usuario define la estructura como un mapa de beats
- **Vista de outline** por capítulo/escena, toggle Editor/Outline.
- **Edición manual** de beats (title/kind/status/desc/notes), reorder (↑/↓), add/delete.
- **Beats de la escena actual** en el editor (strip).
- Reorder implementado en `lib/outline.ts` (`moveBeatInList`, `reorderChapters`, `moveBeatToChapter`).

### ✅ Requirement 2: El usuario puede sugerir un outline con IA
- **Sugerir outline** - `buildSuggestBeatsPrompt` + `parseBeatList` + `store.suggestBeats` con preview (Agregar/Descartar).
- **Generación automática de estructura global** - `buildGlobalOutlinePrompt` + `parseGlobalOutline`.

### ✅ Requirement 3: El usuario puede generar una escena desde un beat
- **`planGenerateScene`** (función pura) maneja: reuso de escena existente, reuso de capítulo, creación de capítulo automática, y el caso de capítulo con exactamente 1 escena (asume que el beat pertenece a ella).
- **Re-generar** un beat que ya tiene escena reutiliza la escena (no duplica).

### ✅ Requirement 4: El usuario puede vincular escenas huérfanas
- **`OrphanScenesPanel`** detecta escenas sin capítulo y permite Mover/Vincular/Ver/Eliminar.
- "Vincular" crea un beat para la escena.

### ❌ Requirement 5: El outline se filtra por POV y tiempo verbal
- **NO IMPLEMENTADO.** Los filtros de POV/tense fueron **removidos deliberadamente** en el refactor
  `4349401` (2026-08-16) con esta justificación:
  > "UX: the POV/tense filters in OutlineView compared the selected filter to the project's own
  > POV/tense, so any non-matching filter hid everything. Remove the filters until a useful
  > filtering model is designed."
- El spec documenta esta feature como un requirement, pero ya no existe. **El spec está desactualizado.**

### ✅ Requirement 6: El chat puede armar/ajustar el outline
- El agente propone `add_beat`, `update_beat`, `update_outline` (cambios parciales) y `replace_outline`
  (reemplazo global). Implementados en el store con tests (`lib/actions.test.ts`).

## Hallazgos

### 🟠 Hallazgo 1 (MEDIO): Spec desactualizado - filtros de POV/tense removidos
El spec del outline documenta los filtros de POV/tense como un requirement, pero la feature fue
**removida deliberadamente** en el refactor `4349401` porque el modelo de filtrado era defectuoso
(comparaba el filtro con el POV/tense del proyecto, ocultando todo cuando no coincidían).

**Impacto:** el spec no refleja la realidad. Un desarrollador que lea el spec asumiría que los filtros
existen y funcionan, pero no es así.

**Acción:** actualizar el spec para reflejar que los filtros están **pendientes de rediseño** (no
implementados), o remover el requirement si no se van a reimplementar.

## Conclusión

El outline es sólido en 5 de 6 requirements. El único hallazgo es que el spec documenta una feature
(filtros de POV/tense) que fue removida deliberadamente. El spec debe actualizarse.
