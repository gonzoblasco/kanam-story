# Kanam Story

> Co-writer de ficción local-first en español donde la conversación ES el producto.

## Visión

Un co-writer de ficción donde el usuario conversa con un agente que conoce toda la obra
(manuscrito, biblia, outline, brújula) y que **aplica** cambios al contenido cuando se aceptan.
No es un asistente pasivo de botones: es un co-autor con manos.

## Problema que resuelve

Los intentos previos de clonar Sudowrite (umbrawriter v1, sudolab, umbrawriter-v2) fracasaron
no por la tecnología ni por la calidad de los modelos, sino por la **interfaz**: el editor era
el centro y la IA un asistente pasivo. Lo que faltaba era un **colaborador con quien conversar**.

## Principios

- **El Chat es la puerta de entrada (el corazón).** Conversás con un agente que conoce la obra
  y la aplica. Co-autor, no asistente pasivo.
- **Modelo de aceptación.** El agente propone, el usuario ve diff/resumen, acepta o deshace.
  Nada se aplica sin OK.
- **Local-first.** Todo vive en IndexedDB del navegador. Privacidad, offline, gratis.
- **BYOK.** El usuario trae su LLM (Ollama / cualquier endpoint OpenAI-compatible).
- **Español.** UI y prompts en español. El usuario escribe ficción en español.

## Stack

- Next.js 16 (App Router, Turbopack)
- TipTap 3 (editor)
- Bootstrap 5 + tokens CSS custom (`--sl-*`)
- IndexedDB via `idb` (un store por entidad)
- Ollama como motor de IA, proxied via `/api/ollama`
- Vitest 4 (379 tests)

## Modelo de dominio

- **Project** - brújula narrativa (premise, promise, theme, protagonist, pov, tense, style)
- **Chapter / Scene** - manuscrito (tipTap JSON)
- **Beat** - mapa de estructura (inciting/rising/climax/falling/resolution/custom)
- **Character** - fichas ricas (type, pronouns, groups, traits, inContext)
- **WorldEntity** - worldbuilding tipado (place/organization/lore/key_event/clue/magic_system/item/rule/other)
- **StoryBible** - 5 secciones auto-generadas + overrides manuales
- **Conversation / Message / ContentAction** - el chat con manos

## Estrategia de producto (3 públicos)

1. **Open source (gratis, local-first)** - producto completo, BYOK → Ollama. Embajador de marca.
2. **SaaS BYOK (5 USD/mes)** - mismo producto + sync en la nube + multi-dispositivo + registro.
3. **SaaS premium (con LLM incluido)** - DeepSeek V4 Flash server-side.

**Bonus de pago:** el co-writer (el corazón) es exclusivo de pago. El open source conserva el
producto de escritura completo pero sin el chat con manos. Feature flag `NEXT_PUBLIC_ENABLE_COWRITER`
(hoy habilitado en open source; se deshabilita cuando exista el backend SaaS).

## Estado

- **v0.17.0** (2026-08-17) - Fase A completa: release, smoke tests de acciones, onboarding, README BYOK.
- 379 tests, build + tsc + lint verdes.
- Roadmap completo en `.knowledge/ROADMAP.md` (fases 0-4 + backlog B1-B7 + feature block).
