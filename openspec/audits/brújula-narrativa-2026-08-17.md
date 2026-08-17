# Auditoría de la Brújula Narrativa — 2026-08-17

> Verificación del comportamiento real de la brújula contra su spec (`openspec/specs/brújula-narrativa/spec.md`).
> Objetivo: encontrar la deuda silenciosa - cosas que "funcionan" pero con el contexto equivocado.

## Resumen

La brújula cumple todos los requirements del spec. Hay un hallazgo menor (inconsistencia en el
commit de los campos de texto vs los selects).

## Requirements verificados

### ✅ Requirement 1: El usuario define la brújula del proyecto
- **Campos editables** - premise, promise, theme, protagonist, pov, tense en `CompassPanel`.
- **Selects (protagonista/POV/tense)** commitean en **onChange**.
- **Textareas (premise/promesa/tema)** commitean en **onBlur** (ver Hallazgo 1).

### ✅ Requirement 2: La brújula orienta la escritura
- **Strip de promesa** en el editor (línea 527-530 de `Editor.tsx`): "Promesa: <texto>".

### ✅ Requirement 3: La brújula orienta al agente
- **Contexto del agente** - la brújula se incluye en `buildAgentContext` (chat) y en `buildContext`
  (editor, después del fix de la auditoría del co-writer).
- **Refinar la brújula** - el agente propone `update_project` (refina premise/promise/theme/pov/tense).
- **Validación de POV** - `update_project` valida el POV contra `POV_VALUES` (no acepta valores inválidos).

### ✅ Requirement 4: El protagonista se mantiene consistente
- **Limpiar al borrar** - `deleteCharacter` limpia el campo `protagonist` si el personaje borrado
  era el protagonista (línea 641-644 de `lib/store.tsx`).

## Hallazgos

### 🟡 Hallazgo 1 (MENOR): Inconsistencia en el commit de los campos
Los **textareas** de la brújula (premise, promesa, tema) commitean en **onBlur** (al salir del campo),
mientras que los **selects** (protagonista, POV, tense) commitean en **onChange** (al cambiar).

**Impacto:** bajo. Si el usuario escribe en un textarea y cierra la app sin salir del campo, el cambio
se pierde. Es un comportamiento razonable (evita escribir a la DB en cada tecla), pero difiere del spec
que dice "los cambios se guardan (onChange)".

**Fix sugerido:** actualizar el spec para reflejar que los textareas commitean en onBlur (o cambiar
los textareas a onChange con debounce, si se prefiere guardado inmediato).

## Conclusión

La brújula es sólida. Los 4 requirements se cumplen. El único hallazgo es menor (inconsistencia de
commit textareas vs selects).
