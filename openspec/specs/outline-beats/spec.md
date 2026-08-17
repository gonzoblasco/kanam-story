# Spec: Outline & Beats

## Purpose

La estructura de la historia: un mapa de beats por capítulo/escena, a mano o sugerido por IA.
Los beats son objetos editables conectados con la escritura y el chat.

## Requirements

### Requirement: El usuario define la estructura como un mapa de beats
El sistema SHALL mostrar el outline como un mapa de beats organizado por capítulo y escena,
con edición manual (título, kind, status, descripción, notas, reordenar, agregar, borrar).

#### Scenario: Vista de outline por capítulo y escena
- **WHEN** el usuario abre la vista Outline
- **THEN** ve el mapa de beats organizado por capítulo y escena
- **AND** puede alternar entre vista Editor y Outline

#### Scenario: Edición manual de beats
- **WHEN** el usuario edita un beat existente
- **THEN** puede cambiar título, kind, status, descripción y notas
- **AND** puede reordenar (↑/↓), agregar y borrar beats

#### Scenario: Beats de la escena actual en el editor
- **WHEN** el usuario está en el editor de una escena con beats
- **THEN** ve los beats de la escena actual (strip)

### Requirement: El usuario puede sugerir un outline con IA
El sistema SHALL permitir que el agente proponga beats desde la biblia/brújula/lo escrito,
con preview (Agregar/Descartar) antes de aplicarlos.

#### Scenario: Sugerir outline desde el contexto
- **WHEN** el usuario pide "sugerir outline"
- **THEN** el agente propone beats desde el contexto
- **AND** el usuario ve un preview (Agregar/Descartar) antes de aplicarlos

#### Scenario: Generación automática de estructura global
- **WHEN** el usuario pide generar la estructura global
- **THEN** el agente propone una estructura de capítulos y beats
- **AND** el usuario ve un preview antes de aplicarla

### Requirement: El usuario puede generar una escena desde un beat
El sistema SHALL permitir generar una escena desde un beat del outline, creando el capítulo
automáticamente si el beat no tiene ninguno, y reutilizando la escena existente si el beat ya tiene una.

#### Scenario: Generar escena desde beat del outline
- **WHEN** el usuario hace click en "Generar escena" en un beat
- **THEN** se crea la escena (y el capítulo automáticamente si el beat no tiene ninguno)
- **AND** el beat se vincula dentro de la escena
- **AND** el editor se abre con el foco en la escena nueva

#### Scenario: Re-generar un beat que ya tiene escena
- **WHEN** el usuario hace click en "Generar escena" en un beat que ya tiene una escena
- **THEN** se reutiliza la escena existente (se abre) en vez de crear una duplicada

### Requirement: El usuario puede vincular escenas huérfanas
El sistema SHALL detectar escenas sin beats y permitir vincularlas (crear un beat para la escena).

#### Scenario: Detectar y vincular escenas sin beats
- **WHEN** existe una escena sin beats
- **THEN** la escena se lista como huérfana en el outline
- **AND** el usuario puede "Vincular" (crea un beat para esa escena)

### Requirement: El outline se filtra por POV y tiempo verbal
> ⚠️ **PENDIENTE DE REDISEÑO (2026-08-17).** Los filtros de POV/tense fueron **removidos** en el
> refactor `4349401` porque el modelo de filtrado era defectuoso (comparaba el filtro con el POV/tense
> del proyecto, ocultando todo cuando no coincidían). Se removieron "hasta que se diseñe un modelo útil".
> Este requirement documenta la intención, no el estado actual.

El sistema SHALL permitir filtrar el outline por POV y tiempo verbal, con un modelo de filtrado
útil (no el defectuoso que se removió).

#### Scenario: Filtros de outline (pendiente de rediseño)
- **WHEN** el usuario filtra el outline
- **THEN** puede filtrar por POV y tiempo verbal
- **AND** el filtro no oculta todo cuando no coincide con el POV/tense del proyecto

### Requirement: El chat puede armar/ajustar el outline
El agente SHALL poder proponer `add_beat` y `update_beat` desde el chat, aplicables al aceptar.

#### Scenario: El agente agrega o actualiza beats
- **WHEN** el agente propone `add_beat` o `update_beat` y el usuario acepta
- **THEN** el beat se agrega/actualiza
- **AND** el cambio es reversible

## Notas de auditoría (2026-08-17)

> **Auditoría realizada 2026-08-17** - ver `openspec/audits/outline-beats-2026-08-17.md`.

**Resultado: 5/6 requirements cumplidos.**

- ✅ Mapa de beats (edición manual, reorder, add/delete).
- ✅ Sugerir outline con IA (preview Agregar/Descartar).
- ✅ Generar escena desde beat (reuso de escena/capítulo, creación automática).
- ✅ Vincular escenas huérfanas (Mover/Vincular/Ver/Eliminar).
- ❌ **Filtros de POV/tense REMOVIDOS** (refactor `4349401`) - el modelo era defectuoso. Spec actualizado a "pendiente de rediseño".
- ✅ Chat arma/ajusta el outline (add_beat/update_beat/update_outline/replace_outline).

**Hallazgo:** el spec documentaba los filtros de POV/tense como implementados, pero fueron removidos
deliberadamente. Spec actualizado para reflejar la realidad.
