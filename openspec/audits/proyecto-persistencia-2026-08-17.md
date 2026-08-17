# Auditoría de Proyecto y Persistencia — 2026-08-17

> Verificación del comportamiento real de la persistencia contra su spec (`openspec/specs/proyecto-persistencia/spec.md`).
> Objetivo: encontrar la deuda silenciosa - cosas que "funcionan" pero con el contexto equivocado.

## Resumen

La persistencia cumple **todos** los requirements del spec. No se encontraron bugs ni deuda silenciosa.
Es la capa más testeada del proyecto (B1/B2 con revisión cruzada A/B).

## Requirements verificados

### ✅ Requirement 1: El usuario crea y gestiona proyectos
- **Crear proyecto** con punto de partida (outline/biblia/plantilla/vacío) + título/género/sinopsis/tono/POV/estilo.
- **Seleccionar/cambiar** de proyecto preservando la conversación activa.
- **Borrar proyecto** con confirmación (diálogo accesible) y **cascade completo**: capítulos, escenas,
  personajes, mundo, brainstorm, biblia, conversaciones + mensajes, beats, snapshots (verificado en
  `lib/db.ts` líneas 197-242).

### ✅ Requirement 2: Los datos persisten en IndexedDB
- **Persistencia local** - un store por entidad, sobrevive al recargar.
- **Migraciones** - `lib/migrations.ts` (funciones puras: `migrateProjectStyle`, `migrateCharacterRole`,
  `migrateWorldCategory`, `migrateProjectTense`), DB_VERSION 9, testeables con fake-indexeddb.

### ✅ Requirement 3: El usuario configura la app
- **Configuración de Ollama** - URL + modelo con auto-detección (primero instalado).
- **Tema claro/oscuro** - persistido, sin flash al recargar (script inline en `layout.tsx`).

### ✅ Requirement 4: El usuario busca y versiona
- **Búsqueda entre escenas** - `SearchPanel` + `lib/search.ts` (agrupa por capítulo, snippet, find/replace con confirmación).
- **Versionado** - snapshot del estado previo al guardar con dedupe (`shouldSnapshot`), historial, diff, restaurar.

### ✅ Requirement 5: El usuario exporta el manuscrito
- **Export MD/TXT/PDF/DOCX** - `buildManuscriptMarkdown` incluye solo la historia (título, capítulos,
  escenas, word count), no personajes/mundo.
- **Portada** con metadata narrativa (género/tono/POV/estilo).
- **Pie** con word count real (prosa, no títulos/metadata).

## Hallazgos

**Sin hallazgos.** La persistencia es sólida. Todos los requirements se cumplen.

## Conclusión

La persistencia es la capa más robusta del proyecto. No requiere acción.
