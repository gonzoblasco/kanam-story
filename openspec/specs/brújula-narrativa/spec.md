# Spec: Brújula Narrativa

## Purpose

Orientación: premisa, promesa al lector, arco del protagonista y tema. Visible al escribir
y al discutir, para no desviarte del "qué prometiste contar".

## Requirements

### Requirement: El usuario define la brújula del proyecto
El sistema SHALL permitir editar premise, promise, theme, protagonist, pov y tense del proyecto,
persistiendo los cambios.

#### Scenario: Campos de brújula editables
- **WHEN** el usuario abre la sección Brújula
- **THEN** puede editar premise, promise, theme, protagonist, pov y tense
- **AND** los cambios se guardan (onChange)

#### Scenario: Selector de POV y tiempo verbal
- **WHEN** el usuario cambia el POV o el tense
- **THEN** el cambio se persiste en el proyecto
- **AND** el POV se valida contra los valores permitidos

### Requirement: La brújula orienta la escritura
El sistema SHALL mostrar la promesa (strip) en el editor mientras el usuario escribe.

#### Scenario: Strip de promesa en el editor
- **WHEN** el usuario está en el editor de un proyecto con promesa definida
- **THEN** ve la promesa (strip) mientras escribe

### Requirement: La brújula orienta al agente
El sistema SHALL incluir la brújula en el contexto del agente, y el agente SHALL poder refinar
la brújula vía `update_project` (con validación de POV).

#### Scenario: El agente usa la brújula
- **WHEN** el agente genera una respuesta para un proyecto con brújula definida
- **THEN** la brújula se incluye en el contexto del agente
- **AND** el agente no se desvía del "qué prometiste contar"

#### Scenario: El agente puede refinar la brújula
- **WHEN** el agente propone `update_project` (refina premise/promise/theme/pov/tense) y el usuario acepta
- **THEN** los campos se actualizan
- **AND** el POV se valida contra los valores permitidos

### Requirement: El protagonista se mantiene consistente
El sistema SHALL limpiar el campo `protagonist` cuando el personaje protagonista se borra.

#### Scenario: Protagonista huérfano al borrar personaje
- **WHEN** el personaje protagonista se borra
- **THEN** el campo `protagonist` se limpia (no queda un id huérfano)

## Notas de auditoría (2026-08-17)

> **Auditoría realizada 2026-08-17** - ver `openspec/audits/brújula-narrativa-2026-08-17.md`.

**Resultado: TODOS los requirements cumplidos. 1 hallazgo menor.**

- ✅ Campos editables (premise/promise/theme/protagonist/pov/tense).
- ✅ Strip de promesa en el editor.
- ✅ Brújula orienta al agente (contexto + update_project con validación de POV).
- ✅ Protagonista consistente (se limpia al borrar).

**Hallazgo menor:** los textareas (premise/promesa/tema) commiteaban en **onBlur**, los selects
(protagonista/POV/tense) en **onChange**. ✅ **APLICADO** (commit `9df57e3`): los textareas ahora
commitean en onChange, consistente con el spec.
