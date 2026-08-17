# Auditoría de la Biblia Viva — 2026-08-17

> Verificación del comportamiento real de la biblia contra su spec (`openspec/specs/biblia-viva/spec.md`).
> Objetivo: encontrar la deuda silenciosa - cosas que "funcionan" pero con el contexto equivocado.

## Resumen

La biblia cumple **todos** los requirements del spec. No se encontraron bugs ni deuda silenciosa.
Es la feature más sólida del proyecto (fue el foco de la Fase 3 con revisión cruzada A/B).

## Requirements verificados

### ✅ Requirement 1: La biblia se genera automáticamente desde el manuscrito
- **Regeneración por sección** - `regenerateBibleSection` regenera el contenido `auto` y **preserva
  el override manual** (solo actualiza `auto`, no toca `manual`).
- **5 secciones** - Resumen, Temas, Personajes, Mundo, Reglas.

### ✅ Requirement 2: La biblia se mantiene sincronizada con los cambios
- **Stale tracking** - `markBibleStale` marca secciones como stale cuando cambia el material fuente
  (manuscrito → summary/themes/rules; personajes → characters; mundo → world).
- **Limpieza al deshacer** - cada acción que marca stale tiene su `undos.push(() => clearBibleStale(...))`.
- **Auto-import** - `syncCharactersFromBible`/`syncWorldFromBible` crean/actualizan personajes y mundo
  con dedupe por nombre (case-insensitive, trimmed).
- **Orden correcto** - el sync corre DESPUÉS de regenerar (`regenerateStoryBible()` → `syncCharactersFromBible()` → `syncWorldFromBible()`), verificado en `StoryBiblePanel`.

### ✅ Requirement 3: Los overrides manuales se preservan
- **No pisa manual** - el sync solo toca entidades con `source: 'biblia'`, y solo rellena campos vacíos.
- **Revertir import** - el usuario puede pasar una entidad de `source: 'biblia'` a `source: 'manual'`
  (botón "Revertir import"), y el próximo sync ya no la toca.

### ✅ Requirement 4: La biblia alimenta el contexto del agente
- **Contexto del agente** - `buildAgentContext` incluye la biblia.
- **Filtro inContext** - los personajes/entidades con `inContext: false` se excluyen del contexto.

## Hallazgos

**Sin hallazgos.** La biblia es sólida. Todos los requirements se cumplen.

## Conclusión

La biblia es la feature más robusta del proyecto. No requiere acción.
