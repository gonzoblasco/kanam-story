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
El sistema SHALL permitir filtrar el outline por POV y tiempo verbal.

#### Scenario: Filtros de outline
- **WHEN** el usuario filtra el outline
- **THEN** puede filtrar por POV y tiempo verbal

### Requirement: El chat puede armar/ajustar el outline
El agente SHALL poder proponer `add_beat` y `update_beat` desde el chat, aplicables al aceptar.

#### Scenario: El agente agrega o actualiza beats
- **WHEN** el agente propone `add_beat` o `update_beat` y el usuario acepta
- **THEN** el beat se agrega/actualiza
- **AND** el cambio es reversible

## Notas de auditoría (2026-08-17)

Puntos a verificar en la auditoría del outline:

- [ ] ¿Los beats creados por el chat (`add_beat`) siempre incluyen `chapterId`?
- [ ] ¿Al borrar un capítulo/escena se eliminan sus beats (cascade)?
- [ ] ¿El reorder de beats preserva el orden correcto?
- [ ] ¿La generación de escena desde beat maneja el caso de beat sin capítulo?
- [ ] ¿Los beats sugeridos se deduplican (no se agregan repetidos)?
