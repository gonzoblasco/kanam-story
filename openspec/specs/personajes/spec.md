# Spec: Personajes

## Purpose

Fichas de personaje ricas y editables, con generación asistida por IA, enriquecimiento de perfil
y sincronización con la biblia. Los personajes alimentan el contexto del co-writer.

## Requirements

### Requirement: El usuario gestiona fichas de personaje ricas
El sistema SHALL permitir crear, editar y eliminar personajes con campos ricos: type (rol),
pronouns, age, appearance, personality, voice, goals, backstory, groups, otherNames, traits,
y un toggle `inContext` para incluir/excluir del contexto del co-writer.

#### Scenario: Crear personaje en blanco
- **WHEN** el usuario hace click en "Agregar"
- **THEN** se crea un personaje en blanco (type `supporting`, inContext true)
- **AND** se anuncia la creación (live region)

#### Scenario: Editar campos del personaje
- **WHEN** el usuario edita un personaje
- **THEN** puede cambiar nombre, type, y todos los campos ricos
- **AND** los cambios se persisten

#### Scenario: Eliminar personaje
- **WHEN** el usuario elimina un personaje
- **THEN** se pide confirmación (diálogo accesible)
- **AND** el personaje se elimina
- **AND** si era el protagonista, el campo `protagonist` del proyecto se limpia

#### Scenario: Toggle inContext
- **WHEN** el usuario desactiva `inContext` de un personaje
- **THEN** el personaje se excluye del contexto del co-writer
- **AND** se muestra un indicador visual (ojo tachado)

### Requirement: El usuario genera personajes con IA
El sistema SHALL permitir generar personajes con IA (Generate Character + Surprise Me), con
preview (Agregar/Regenerar/Descartar) antes de aplicarlos.

#### Scenario: Generar personaje con tipo e instrucciones
- **WHEN** el usuario elige un tipo y escribe instrucciones y hace click en "Generar"
- **THEN** el agente propone personajes coherentes con la biblia/mundo/lo escrito
- **AND** el usuario ve un preview (Agregar/Regenerar/Descartar)

#### Scenario: Surprise Me
- **WHEN** el usuario hace click en "Surprise Me"
- **THEN** el agente genera un personaje aleatorio/inspirado en el contexto del proyecto

#### Scenario: Aceptar personajes generados
- **WHEN** el usuario hace click en "Agregar" en el preview
- **THEN** los personajes generados se crean (con `source: 'ai'`)
- **AND** el modal de generación se cierra

### Requirement: El usuario enriquece el perfil de un personaje
El sistema SHALL permitir enriquecer el perfil de un personaje existente con el co-writer,
respetando el mundo de la obra y sin contradecir lo ya establecido.

#### Scenario: Enriquecer personaje
- **WHEN** el usuario hace click en "Enriquecer" en un personaje
- **THEN** el agente profundiza el perfil (personalidad, voz, objetivos, backstory, rasgos)
- **AND** mantiene consistencia con lo ya registrado y el mundo
- **AND** se anuncia el resultado (live region)

### Requirement: Los personajes se sincronizan con la biblia
El sistema SHALL auto-importar personajes desde la biblia (con marca `source: 'biblia'`),
sin duplicar entradas existentes, y SHALL permitir revertir el import.

#### Scenario: Auto-fill de biblia al abrir
- **WHEN** el usuario abre Personajes y no hay personajes
- **THEN** se regenera la biblia (best-effort) para detectar personajes
- **AND** los personajes detectados se importan (con marca "de biblia")

#### Scenario: Revertir import de biblia
- **WHEN** el usuario hace click en "Revertir import" en un personaje `source: 'biblia'`
- **THEN** el personaje pasa a `source: 'manual'`
- **AND** el próximo sync ya no lo toca

### Requirement: Los personajes alimentan el contexto del co-writer
El sistema SHALL incluir los personajes en el contexto del co-writer, excluyendo los de
`inContext: false`, y SHALL permitir que el agente los cree/actualice/borre vía chat.

#### Scenario: El contexto incluye los personajes
- **WHEN** el agente genera una respuesta
- **THEN** los personajes (con `inContext: true`) se incluyen en el contexto
- **AND** los de `inContext: false` se excluyen

#### Scenario: El agente crea/actualiza/borra personajes vía chat
- **WHEN** el usuario acepta una propuesta `add_character`/`update_character`/`delete_character`
- **THEN** el personaje se crea/actualiza/borra
- **AND** el cambio es reversible (undo)

## Notas de auditoría (2026-08-17)

> **Auditoría realizada 2026-08-17** - ver `openspec/audits/personajes-2026-08-17.md`.

**Resultado: TODOS los requirements cumplidos. Sin hallazgos.**

- ✅ Fichas ricas (type, pronouns, groups, otherNames, traits, inContext) + CRUD con confirmación.
- ✅ Generación asistida (Generate + Surprise Me + preview Agregar/Regenerar/Descartar).
- ✅ Enriquecer perfil (respetando el mundo, sin contradecir lo establecido).
- ✅ Sync con biblia (auto-fill + revertir import).
- ✅ Contexto del co-writer (filtro inContext + acciones del agente).
