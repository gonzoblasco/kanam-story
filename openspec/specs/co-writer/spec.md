# Spec: Co-writer

## Purpose

El corazón de Kanam Story. Un agente con el que el usuario conversa, que conoce toda la obra
(manuscrito, biblia, outline, brújula) y que **aplica** cambios al contenido cuando se aceptan.
Co-autor, no asistente pasivo.

## Requirements

### Requirement: El usuario conversa con un agente que conoce la obra
El agente SHALL recibir el contexto completo de la obra (manuscrito, biblia, outline, brújula)
en su prompt, incluyendo los IDs de escenas, personajes y entidades para poder referenciarlos.

#### Scenario: El agente recibe el contexto completo
- **WHEN** el usuario envía un mensaje al co-writer
- **THEN** el agente recibe el contexto de la obra en su prompt
- **AND** el contexto incluye los IDs de escenas, personajes y entidades

#### Scenario: El agente responde con texto y acciones
- **WHEN** el agente genera una respuesta
- **THEN** la respuesta es JSON válido con `reply` (texto) y `actions` (array de ContentAction)
- **AND** las acciones inválidas se filtran (no se aplican)

### Requirement: El agente propone cambios que el usuario acepta o deshace
El sistema SHALL aplicar el modelo de aceptación: el agente propone, el usuario ve diff/resumen,
y acepta o deshace. Nada se aplica sin OK.

#### Scenario: Propuesta → diff → aceptar
- **WHEN** el usuario acepta una propuesta del agente
- **THEN** el cambio se aplica al contenido (IndexedDB)
- **AND** el usuario ve un resumen/diff del cambio

#### Scenario: Propuesta → deshacer
- **WHEN** el usuario deshace una propuesta del agente
- **THEN** el cambio NO se aplica
- **AND** el contenido queda como estaba

#### Scenario: Nada se aplica sin OK
- **WHEN** el usuario no acepta una propuesta
- **THEN** el contenido no cambia

### Requirement: El agente tiene manos (aplica cambios al contenido)
El agente SHALL poder proponer y aplicar cambios al contenido: reescribir escenas, agregar/actualizar
beats, actualizar/agregar personajes, actualizar mundo, actualizar biblia, agregar escenas, borrar
personajes/entidades (solo si el autor lo pide) y actualizar metadata del proyecto. Todos los cambios
SHALL ser reversibles (undo).

#### Scenario: Reescribir una escena
- **WHEN** el usuario acepta una propuesta `rewrite_scene`
- **THEN** el contenido de la escena se reemplaza por el propuesto
- **AND** el cambio es reversible (undo)

#### Scenario: Agregar un beat al outline
- **WHEN** el usuario acepta una propuesta `add_beat`
- **THEN** se crea un beat en el capítulo
- **AND** el beat queda conectado con la escritura

#### Scenario: Actualizar un personaje
- **WHEN** el usuario acepta una propuesta `update_character`
- **THEN** los campos del personaje se actualizan
- **AND** el cambio es reversible

#### Scenario: Agregar una escena
- **WHEN** el usuario acepta una propuesta `append_scene`
- **THEN** se crea una escena nueva en el capítulo

#### Scenario: Actualizar la biblia
- **WHEN** el usuario acepta una propuesta `update_bible`
- **THEN** la sección se actualiza
- **AND** se marca como desactualizada si corresponde

#### Scenario: Borrar un personaje (destructivo, solo si el autor lo pide)
- **WHEN** el usuario pide explícitamente borrarlo y acepta la propuesta `delete_character`
- **THEN** el personaje se elimina
- **AND** el cambio es reversible

#### Scenario: Borrar una entidad de mundo (destructivo, solo si el autor lo pide)
- **WHEN** el usuario pide explícitamente borrarla y acepta la propuesta `delete_world`
- **THEN** la entidad se elimina
- **AND** el cambio es reversible

#### Scenario: Actualizar metadata del proyecto
- **WHEN** el usuario acepta una propuesta `update_project`
- **THEN** los campos del proyecto (sinopsis, género, tono, POV, estilo) se actualizan
- **AND** el POV se valida contra los valores permitidos

### Requirement: El agente navega contextualmente al aceptar un cambio
El sistema SHALL navegar a la sección donde el cambio aplica al aceptar una propuesta, y mover
el foco a la sección destino (a11y).

#### Scenario: Navegación a la sección destino
- **WHEN** el usuario acepta una propuesta que afecta a una sección (personaje, beat, mundo, biblia, escena)
- **THEN** la app navega a la sección donde el cambio aplica
- **AND** el foco se mueve a la sección destino

### Requirement: El agente tiene roles especializados
El agente SHALL poder especializarse en roles: co-writer (default, debate general), plot-doctor
(estructura, arco, ritmo, tensión) y consistency-checker (coherencia interna).

#### Scenario: Co-writer (default)
- **WHEN** el rol por defecto está activo
- **THEN** el agente debate creativamente de forma general

#### Scenario: Plot Doctor
- **WHEN** el rol `plot-doctor` está seleccionado
- **THEN** el agente enfoca en estructura narrativa, arco, ritmo y tensión
- **AND** propone fixes concretos

#### Scenario: Consistency Checker
- **WHEN** el rol `consistency-checker` está seleccionado
- **THEN** el agente audita coherencia interna (nombres, objetos, reglas, líneas de tiempo, rasgos)

### Requirement: El agente responde con streaming
El agente SHALL responder con streaming (SSE), mostrando la respuesta en vivo, y el usuario
SHALL poder abortar la generación.

#### Scenario: Respuesta en vivo
- **WHEN** el usuario envía un mensaje
- **THEN** la respuesta se muestra en vivo (SSE streaming)
- **AND** el usuario puede abortar la generación

### Requirement: El agente respeta el contexto de continuidad
El agente SHALL incluir las notas de continuidad de la escena activa en su contexto, y SHALL poder
proponer editarlas (`update_scene_notes`).

#### Scenario: Notas de continuidad de la escena
- **WHEN** el agente genera una respuesta para una escena con notas de continuidad
- **THEN** las notas se incluyen en el contexto del agente
- **AND** el agente puede proponer editarlas

### Requirement: El agente respeta el contexto de la brújula
El agente SHALL incluir la brújula (premise, promise, theme, protagonist, pov) en su contexto
y no desviarse del "qué prometiste contar".

#### Scenario: La brújula orienta la conversación
- **WHEN** el agente genera una respuesta para un proyecto con brújula definida
- **THEN** la brújula se incluye en el contexto del agente
- **AND** el agente no se desvía del "qué prometiste contar"

### Requirement: El agente respeta el filtro de contexto (inContext)
El agente SHALL excluir de su contexto los personajes/entidades con `inContext: false`.

#### Scenario: Personajes/entidades excluidos del contexto
- **WHEN** el agente genera una respuesta
- **THEN** los personajes/entidades con `inContext: false` NO se incluyen en el contexto

## Notas de auditoría (2026-08-17)

> **Auditoría realizada 2026-08-17** - ver `openspec/audits/co-writer-2026-08-17.md`.

**Hallazgos (4) - TODOS APLICADOS (commit `f618a38`):**
- ✅ **ALTO (IDs):** el contexto del chat ahora incluye IDs de personajes/mundo (antes solo escenas/beats).
- ✅ **MEDIO (inContext):** el filtro `inContext` ahora es consistente - personajes excluidos en chat Y editor.
- ✅ **MEDIO (brújula):** la brújula ahora se incluye en el editor (antes solo en el chat).
- ✅ **MEDIO (continuidad):** las notas de continuidad ahora se incluyen en el editor (antes solo en el chat).

**Nota sobre el modelo de aceptación:** el modelo de aceptación (propuesta → diff → aceptar/deshacer)
aplica al **chat** (el co-writer). El **editor** aplica directamente (solo undo + revert de streaming) -
es una distinción de diseño intencional, no un bug.
