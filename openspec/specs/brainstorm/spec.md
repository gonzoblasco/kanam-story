# Spec: Brainstorm

## Purpose

Notas de ideas generadas con IA o escritas a mano. El usuario pide ideas sobre un tema, las
guarda como notas, y puede extenderlas con más ideas del mismo tema.

## Requirements

### Requirement: El usuario genera ideas con IA
El sistema SHALL permitir brainstormear sobre un tema con IA, generando una nota con las ideas
propuestas, coherentes con el contexto del proyecto (biblia, personajes, mundo).

#### Scenario: Brainstormear sobre un tema
- **WHEN** el usuario escribe un tema y hace click en "Brainstormear"
- **THEN** el agente genera ideas sobre el tema, coherentes con el contexto del proyecto
- **AND** se crea una nota con el tema como título y las ideas como contenido
- **AND** la nota se abre en modo edición

#### Scenario: Error en la generación
- **WHEN** la generación falla
- **THEN** se muestra un error visible (no silencioso)

### Requirement: El usuario extiende una nota con más ideas
El sistema SHALL permitir sumar más ideas a una nota existente sobre el mismo tema, en el mismo
estilo y espíritu de la nota.

#### Scenario: Append a una nota
- **WHEN** el usuario tiene un tema y hace click en "sumar más ideas" en una nota
- **THEN** el agente genera más ideas en el mismo estilo de la nota
- **AND** las ideas se agregan al final de la nota

### Requirement: El usuario gestiona notas
El sistema SHALL permitir crear notas en blanco, editar el contenido (markdown), renombrar y
eliminar notas, con confirmación para las acciones destructivas.

#### Scenario: Crear nota en blanco
- **WHEN** el usuario hace click en "Nueva nota"
- **THEN** se crea una nota en blanco
- **AND** se anuncia la creación (live region)

#### Scenario: Editar contenido de una nota
- **WHEN** el usuario edita una nota
- **THEN** puede editar el contenido en markdown
- **AND** los cambios se persisten

#### Scenario: Renombrar nota
- **WHEN** el usuario renombra una nota
- **THEN** se pide el nuevo título (PromptDialog accesible)
- **AND** el título se actualiza

#### Scenario: Eliminar nota
- **WHEN** el usuario elimina una nota
- **THEN** se pide confirmación (ConfirmDialog accesible)
- **AND** la nota se elimina

### Requirement: Las notas se renderizan en markdown
El sistema SHALL renderizar el contenido de las notas en markdown (negrita, itálica, listas,
citas, títulos).

#### Scenario: Render markdown
- **WHEN** el usuario ve una nota (no en edición)
- **THEN** el contenido se renderiza en markdown

## Notas de auditoría (2026-08-17)

> **Auditoría realizada 2026-08-17** - ver `openspec/audits/brainstorm-2026-08-17.md`.

**Resultado: TODOS los requirements cumplidos. Sin hallazgos.**

- ✅ Generar ideas con IA (coherentes con el contexto, error visible).
- ✅ Append a una nota (mismo estilo y espíritu).
- ✅ CRUD de notas (crear, editar, renombrar, eliminar con confirmación).
- ✅ Render markdown.
