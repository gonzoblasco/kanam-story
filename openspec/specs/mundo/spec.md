# Spec: Mundo

## Purpose

Worldbuilding tipado y editable: lugares, organizaciones, lore, eventos clave, pistas, sistemas de
magia, objetos, reglas y otros. Las entidades alimentan el contexto del co-writer.

## Requirements

### Requirement: El usuario gestiona entidades de mundo tipadas
El sistema SHALL permitir crear, editar y eliminar entidades de mundo con un `kind` tipado
(place, organization, lore, key_event, clue, magic_system, item, rule, other) y campos ricos
(name, description, otherNames, traits, inContext).

#### Scenario: Crear entrada de mundo en blanco
- **WHEN** el usuario hace click en "Agregar"
- **THEN** se crea una entrada en blanco (kind `place`, inContext true)
- **AND** se anuncia la creación (live region)

#### Scenario: Editar campos de la entidad
- **WHEN** el usuario edita una entidad
- **THEN** puede cambiar nombre, kind, descripción, otherNames, traits e inContext
- **AND** los cambios se persisten

#### Scenario: Eliminar entidad
- **WHEN** el usuario elimina una entidad
- **THEN** se pide confirmación (diálogo accesible)
- **AND** la entidad se elimina

#### Scenario: Toggle inContext
- **WHEN** el usuario desactiva `inContext` de una entidad
- **THEN** la entidad se excluye del contexto del co-writer
- **AND** se muestra un indicador visual (ojo tachado)

### Requirement: El usuario enriquece la descripción de una entidad
El sistema SHALL permitir enriquecer la descripción de una entidad existente con el co-writer,
respetando el mundo de la obra y sin contradecir lo ya establecido.

#### Scenario: Enriquecer entidad
- **WHEN** el usuario hace click en "Enriquecer" en una entidad
- **THEN** el agente profundiza la descripción (origen, función, relación, detalles sensoriales)
- **AND** mantiene consistencia con el mundo
- **AND** se anuncia el resultado (live region)

### Requirement: Las entidades se sincronizan con la biblia
El sistema SHALL auto-importar entidades desde la biblia (con marca `source: 'biblia'`),
sin duplicar entradas existentes, y SHALL permitir revertir el import.

#### Scenario: Auto-fill de biblia al abrir
- **WHEN** el usuario abre Mundo y no hay entradas
- **THEN** se regenera la biblia (best-effort) para detectar entidades
- **AND** las entidades detectadas se importan (con marca "de biblia")

#### Scenario: Revertir import de biblia
- **WHEN** el usuario hace click en "Revertir import" en una entidad `source: 'biblia'`
- **THEN** la entidad pasa a `source: 'manual'`
- **AND** el próximo sync ya no la toca

### Requirement: Las entidades alimentan el contexto del co-writer
El sistema SHALL incluir las entidades en el contexto del co-writer, excluyendo las de
`inContext: false`, y SHALL permitir que el agente las cree/actualice/borre vía chat.

#### Scenario: El contexto incluye las entidades
- **WHEN** el agente genera una respuesta
- **THEN** las entidades (con `inContext: true`) se incluyen en el contexto
- **AND** las de `inContext: false` se excluyen

#### Scenario: El agente crea/actualiza/borra entidades vía chat
- **WHEN** el usuario acepta una propuesta `add_world`/`update_world`/`delete_world`
- **THEN** la entidad se crea/actualiza/borra
- **AND** el cambio es reversible (undo)

## Notas de auditoría (2026-08-17)

> **Auditoría realizada 2026-08-17** - ver `openspec/audits/mundo-2026-08-17.md`.

**Resultado: TODOS los requirements cumplidos. Sin hallazgos.**

- ✅ Worldbuilding tipado (9 kinds) + CRUD con confirmación.
- ✅ Enriquecer descripción (respetando el mundo, sin contradecir lo establecido).
- ✅ Sync con biblia (auto-fill + revertir import).
- ✅ Contexto del co-writer (filtro inContext + acciones del agente).
