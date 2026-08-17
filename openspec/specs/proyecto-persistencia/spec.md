# Spec: Proyecto y Persistencia

## Purpose

El modelo de datos y la gestión de proyectos. Todo vive en IndexedDB (local-first, sin backend).
La persistencia es la base de todo: sin ella, nada funciona.

## Requirements

### Requirement: El usuario crea y gestiona proyectos
El sistema SHALL permitir crear proyectos con un punto de partida (outline en blanco, biblia,
plantilla de género, proyecto vacío), seleccionar/cambiar de proyecto preservando la conversación
activa, y borrar proyectos con confirmación y cascade de datos.

#### Scenario: Crear proyecto con punto de partida
- **WHEN** el usuario crea un proyecto
- **THEN** puede elegir un punto de partida: outline en blanco, biblia, plantilla de género (thriller/romance/sci-fi) o proyecto vacío
- **AND** puede definir título, género, sinopsis, tono, POV y estilo

#### Scenario: Seleccionar y cambiar de proyecto
- **WHEN** el usuario selecciona un proyecto
- **THEN** se carga el proyecto (manuscrito, biblia, outline, brújula)
- **AND** la conversación activa se preserva

#### Scenario: Borrar proyecto
- **WHEN** el usuario borra un proyecto (con confirmación)
- **THEN** se elimina el proyecto y todos sus datos (cascade: capítulos, escenas, beats, biblia, personajes, mundo, snapshots)

### Requirement: Los datos persisten en IndexedDB
El sistema SHALL persistir todos los datos en IndexedDB (un store por entidad), sobreviviendo
al recargar la página, y SHALL migrar el esquema sin romper los datos existentes.

#### Scenario: Persistencia local
- **WHEN** el usuario crea/edita datos
- **THEN** todo se guarda en IndexedDB (un store por entidad)
- **AND** los datos sobreviven al recargar la página

#### Scenario: Migraciones de esquema
- **WHEN** la app se actualiza a una versión nueva de la DB
- **THEN** los datos se migran a la versión nueva sin romperse
- **AND** las migraciones son puras y testeables

### Requirement: El usuario configura la app
El sistema SHALL permitir configurar la URL de Ollama y el modelo (con auto-detección), y
persistir el tema claro/oscuro sin flash al recargar.

#### Scenario: Configuración de Ollama
- **WHEN** el usuario abre Configuración
- **THEN** puede cambiar la URL de Ollama y el modelo
- **AND** el modelo se auto-detecta (primero instalado)

#### Scenario: Tema claro/oscuro
- **WHEN** el usuario cambia el tema
- **THEN** la preferencia se persiste
- **AND** no hay flash de tema al recargar

### Requirement: El usuario busca y versiona
El sistema SHALL permitir buscar texto en todas las escenas (agrupado por capítulo, con snippet)
con find/replace y confirmación, y SHALL versionar las escenas (snapshot al guardar, historial,
diff, restaurar).

#### Scenario: Búsqueda entre escenas
- **WHEN** el usuario busca
- **THEN** encuentra texto en todas las escenas (agrupado por capítulo, con snippet)
- **AND** puede hacer find/replace con confirmación

#### Scenario: Versionado de escenas
- **WHEN** se guarda una escena
- **THEN** se captura una snapshot del estado previo
- **AND** el usuario puede ver el historial, ver el diff y restaurar una versión

### Requirement: El usuario exporta el manuscrito
El sistema SHALL exportar el manuscrito a Markdown, texto plano, PDF o DOCX, con portada
(metadata narrativa: género, tono, POV, estilo) y pie con word count real.

#### Scenario: Export a MD/TXT/PDF/DOCX
- **WHEN** el usuario exporta
- **THEN** el manuscrito se exporta a Markdown, texto plano, PDF o DOCX
- **AND** la portada incluye metadata narrativa (género, tono, POV, estilo)
- **AND** el pie muestra el word count real

## Notas de auditoría (2026-08-17)

Puntos a verificar en la auditoría de persistencia:

- [ ] ¿El cascade delete cubre TODOS los datos dependientes (capítulos → escenas → beats → snapshots)?
- [ ] ¿Las migraciones preservan los datos existentes (no los rompen)?
- [ ] ¿La conversación activa se preserva al cambiar de proyecto?
- [ ] ¿El export incluye solo la historia (no personajes/mundo)?
- [ ] ¿El word count cuenta la prosa real (no títulos/metadata)?
