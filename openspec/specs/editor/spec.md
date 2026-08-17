# Spec: Editor

## Purpose

El editor delgado: existe para escribir a mano, no es el protagonista. Con barra de formato,
selección contextual IA, streaming y autosave.

## Requirements

### Requirement: El usuario escribe a mano con formato
El sistema SHALL proveer una barra de formato (negrita, cursiva, subrayado, tachado, enlaces,
listas, H1/H2/H3, deshacer/rehacer) y permitir escritura libre (no todo generado por IA).

#### Scenario: Barra de formato
- **WHEN** el usuario selecciona texto
- **THEN** puede aplicar negrita, cursiva, subrayado, tachado, enlaces, listas, H1/H2/H3
- **AND** puede deshacer/rehacer

#### Scenario: Escritura libre
- **WHEN** el usuario escribe, copia o pega
- **THEN** puede editar libremente (no todo generado por IA)

### Requirement: El usuario usa herramientas IA sobre el texto
El sistema SHALL proveer herramientas IA: Write (continuar desde el cursor), Describe (expandir
la selección con detalle sensorial), Rewrite (reescribir con estilo seleccionable), Expand (expandir
la escena desde el beat/summary), Dialogue (variantes de diálogo) y Tension (subir el conflicto).

#### Scenario: Write (continuar desde el cursor)
- **WHEN** el usuario pide "Write"
- **THEN** el texto se continúa desde el cursor, respetando el contexto

#### Scenario: Describe (expandir la selección)
- **WHEN** el usuario pide "Describe" sobre una selección
- **THEN** la selección se expande con detalle sensorial

#### Scenario: Rewrite (reescribir la selección)
- **WHEN** el usuario pide "Rewrite" sobre una selección
- **THEN** la selección se reescribe con un estilo seleccionable

#### Scenario: Expand (expandir la escena)
- **WHEN** el usuario pide "Expand"
- **THEN** la escena se reemplaza con una versión expandida desde el beat/summary (corto/medio/largo)

#### Scenario: Dialogue (variantes de diálogo)
- **WHEN** el usuario pide "Dialogue" sobre una línea de diálogo
- **THEN** se generan N variantes de la línea

#### Scenario: Tension (subir el conflicto)
- **WHEN** el usuario pide "Tension"
- **THEN** el final de la escena se reescribe subiendo el conflicto

### Requirement: El usuario puede abortar la generación
El sistema SHALL permitir abortar una generación en curso, revirtiendo el contenido parcial.

#### Scenario: Stop (abortar)
- **WHEN** el usuario pide "Stop" durante una generación
- **THEN** la generación se aborta (AbortController)
- **AND** el contenido parcial se revierte (el editor queda como estaba)

### Requirement: El usuario ve la generación en vivo
El sistema SHALL insertar el texto en vivo mientras se genera (SSE streaming), suprimir el autosave
durante el stream (no persistir texto parcial) y guardar el contenido final al terminar.

#### Scenario: Streaming en el editor
- **WHEN** el texto se genera
- **THEN** se inserta en vivo mientras se genera (SSE streaming)
- **AND** el autosave se suprime durante el stream (no se persiste texto parcial)
- **AND** el contenido final se guarda explícitamente al terminar

### Requirement: El trabajo se guarda automáticamente
El sistema SHALL guardar el contenido con autosave (debounce 600ms), guardar título/resumen on blur,
y mostrar un contador de palabras y caracteres.

#### Scenario: Autosave con debounce
- **WHEN** el usuario edita una escena y deja de escribir (600ms)
- **THEN** el contenido se guarda automáticamente
- **AND** el título y resumen se guardan on blur

#### Scenario: Contador de palabras
- **WHEN** el usuario escribe
- **THEN** ve el contador de palabras y caracteres en el footer

### Requirement: El editor se sincroniza con cambios externos
El sistema SHALL reflejar en el editor los cambios externos a la escena activa (ej. aceptar un
`rewrite_scene` del co-writer) sin necesidad de cambiar de escena.

#### Scenario: Aceptar un rewrite_scene del co-writer
- **WHEN** el usuario acepta un `rewrite_scene` del co-writer sobre la escena activa
- **THEN** el editor refleja el cambio inmediatamente (sin cambiar de escena)

## Notas de auditoría (2026-08-17)

Puntos a verificar en la auditoría del editor:

- [ ] ¿El streaming revierte el contenido parcial ante abort/error?
- [ ] ¿El autosave se suprime correctamente durante el stream (sin guardados parciales)?
- [ ] ¿El editor se sincroniza con cambios externos (aceptar rewrite_scene)?
- [ ] ¿El diálogo multi-párrafo no pierde el wrapper de apertura?
- [ ] ¿El contador de palabras cuenta la prosa real (no títulos/metadata)?
