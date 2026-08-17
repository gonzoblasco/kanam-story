# Spec: Biblia Viva

## Purpose

Consistencia automática: personajes, mundo y reglas que se actualizan solos desde lo escrito
y desde los cambios del chat. La biblia es la base de la coherencia de la IA.

## Requirements

### Requirement: La biblia se genera automáticamente desde el manuscrito
El sistema SHALL generar 5 secciones de la biblia (Resumen, Temas, Personajes, Mundo, Reglas)
desde el contenido escrito, preservando los overrides manuales.

#### Scenario: Regeneración por sección
- **WHEN** el usuario regenera una sección de la biblia
- **THEN** la sección se regenera desde el contenido escrito
- **AND** los overrides manuales se preservan

#### Scenario: 5 secciones de la biblia
- **WHEN** se genera la biblia
- **THEN** se generan 5 secciones: Resumen, Temas, Personajes, Mundo, Reglas

### Requirement: La biblia se mantiene sincronizada con los cambios
El sistema SHALL marcar las secciones como "desactualizadas" (stale) cuando el agente cambia
personajes/mundo vía chat, y SHALL auto-importar personajes y mundo a las tabs correspondientes
sin duplicar entradas existentes.

#### Scenario: Stale tracking
- **WHEN** el agente cambia personajes/mundo vía chat
- **THEN** la sección correspondiente se marca como "desactualizada" (stale)
- **AND** el usuario ve un badge de desactualización

#### Scenario: Auto-import de personajes a la tab Personajes
- **WHEN** se regenera la biblia con personajes detectados
- **THEN** los personajes se crean/actualizan en la tab Personajes (con marca "de biblia")
- **AND** no se duplican entradas ya existentes (dedupe por nombre)

#### Scenario: Auto-import de mundo a la tab Mundo
- **WHEN** se regenera la biblia con entidades de mundo detectadas
- **THEN** las entidades se crean/actualizan en la tab Mundo (con marca "de biblia")
- **AND** no se duplican entradas ya existentes

### Requirement: Los overrides manuales se preservan
El sistema SHALL no pisar las ediciones manuales: el sync solo toca entidades con `source: 'biblia'`,
y el usuario SHALL poder revertir un import (pasar a `source: 'manual'`).

#### Scenario: No pisar ediciones manuales
- **WHEN** se regenera la biblia
- **THEN** el sync NO pisa las ediciones manuales
- **AND** solo toca entidades con `source: 'biblia'`

#### Scenario: Revertir import de biblia
- **WHEN** el usuario hace click en "Revertir import" en una entidad `source: 'biblia'`
- **THEN** la entidad pasa a `source: 'manual'`
- **AND** el próximo sync ya no la toca

### Requirement: La biblia alimenta el contexto del agente
El sistema SHALL incluir la biblia en el contexto del agente, excluyendo los personajes/entidades
con `inContext: false`.

#### Scenario: El contexto incluye la biblia
- **WHEN** el agente genera una respuesta
- **THEN** la biblia se incluye en el contexto del agente
- **AND** los personajes/entidades con `inContext: false` se excluyen

## Notas de auditoría (2026-08-17)

> **Auditoría realizada 2026-08-17** - ver `openspec/audits/biblia-viva-2026-08-17.md`.

**Resultado: TODOS los requirements cumplidos. Sin hallazgos.**

- ✅ Generación automática desde el manuscrito (5 secciones, overrides preservados).
- ✅ Sync + stale tracking (marca stale, limpia al deshacer, auto-import con dedupe).
- ✅ Overrides manuales preservados (solo toca `source: 'biblia'`, solo rellena vacíos).
- ✅ Biblia alimenta el contexto (filtro inContext aplicado).

**Nota:** el sync corre DESPUÉS de regenerar (bug de orden corregido en U5, verificado en `StoryBiblePanel`).
