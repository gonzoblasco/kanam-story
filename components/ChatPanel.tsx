'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '@/lib/store';
import { buildAgentContext, buildSceneContext, buildAgentPrompt } from '@/lib/agentPrompts';
import { parseAgentReply, filterValidActions } from '@/lib/agentReply';
import { ollamaChatStream } from '@/lib/ollama';
import { getActionsTarget } from '@/lib/actionTargets';
import OutlineProposal from '@/components/OutlineProposal';
import MarkdownView from '@/components/MarkdownView';
import type { ContentAction } from '@/types';

interface ChatPanelProps {
  /**
   * 'full' (default): el agente ve todo el manuscrito + biblia + personajes +
   * mundo + outline, y puede editar cualquier escena.
   * 'scene': el agente ve SOLO la escena activa + biblia + personajes + mundo +
   * outline del capítulo actual. Puede editar la escena actual, no las demás.
   */
  contextScope?: 'full' | 'scene';
}

export default function ChatPanel({ contextScope = 'full' }: ChatPanelProps) {
  const {
    currentProject,
    conversations,
    currentConversationId,
    messages,
    createConversation,
    selectConversation,
    deleteConversation,
    createMessage,
    settings,
    characters,
    world,
    chapters,
    scenes,
    beats,
    storyBible,
    currentSceneId,
    applyContentActions,
    announce,
    setView,
    setActiveStorySection,
    requestSectionFocus,
  } = useApp();

  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [pendingActions, setPendingActions] = useState<ContentAction[]>([]);
  const [lastUndo, setLastUndo] = useState<(() => Promise<void>) | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [lastAssistantMessage, setLastAssistantMessage] = useState('');
  const assistantMsgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingText]);

  useEffect(() => {
    return () => {
      if (assistantMsgTimer.current) clearTimeout(assistantMsgTimer.current);
    };
  }, []);

  const startConversation = useCallback(async () => {
    if (!currentProject) return;
    const conv = await createConversation({
      projectId: currentProject.id,
      title: `Conversación ${conversations.length + 1}`,
    });
    await selectConversation(conv.id);
  }, [currentProject, conversations.length, createConversation, selectConversation]);

  async function send() {
    const text = input.trim();
    if (!text || busy || !currentProject) return;

    setInput('');
    setBusy(true);
    setStreamingText('');
    setPendingActions([]);

    // Ensure there is an active conversation to persist messages into.
    let convId = currentConversationId;
    if (!convId) {
      const conv = await createConversation({
        projectId: currentProject.id,
        title: `Conversación ${conversations.length + 1}`,
      });
      await selectConversation(conv.id);
      convId = conv.id;
    }

    // Persist the user message
    await createMessage({
      conversationId: convId,
      role: 'user',
      content: text,
      actions: [],
    });

    const controller = new AbortController();
    abortRef.current = controller;

    const context = buildAgentContext(
      contextScope === 'scene' && currentSceneId
        ? buildSceneContext({
            project: currentProject,
            characters,
            world,
            chapters,
            scenes,
            beats,
            storyBible,
            activeSceneId: currentSceneId,
          })
        : {
            project: currentProject,
            characters,
            world,
            chapters,
            scenes,
            beats,
            storyBible,
            activeSceneId: currentSceneId ?? undefined,
          },
    );
    const prompt = buildAgentPrompt(context, text);

    // Conversation history (last 10 messages)
    const history: { role: 'user' | 'assistant'; content: string }[] = messages
      .slice(-10)
      .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));

    let full = '';
    try {
      await ollamaChatStream(
        {
          ollamaUrl: settings.ollamaUrl,
          model: settings.ollamaModel,
          messages: [...history, { role: 'user', content: prompt }],
          signal: controller.signal,
          temperature: 0.7,
        },
        (chunk) => {
          full += chunk;
          setStreamingText(full);
        },
      );

      // Parse the structured response
      const parsed = parseAgentReply(full);
      const reply = parsed?.reply ?? full.trim();
      const actions = parsed ? filterValidActions(parsed.actions) : [];

      await createMessage({
        conversationId: convId,
        role: 'assistant',
        content: reply,
        actions,
      });

      // Live region: anuncia la respuesta del co-writer (se reinicia tras 6s).
      if (assistantMsgTimer.current) clearTimeout(assistantMsgTimer.current);
      setLastAssistantMessage(reply);
      assistantMsgTimer.current = setTimeout(() => setLastAssistantMessage(''), 6000);

      if (actions.length > 0) {
        setPendingActions(actions);
        announce(
          `El co-writer propone ${actions.length} cambio${actions.length > 1 ? 's' : ''}. Usá los botones Aceptar o Descartar.`,
        );
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      await createMessage({
        conversationId: convId,
        role: 'assistant',
        content: `⚠️ Error: ${e instanceof Error ? e.message : 'La petición a la IA falló'}`,
        actions: [],
      });
      announce('Ocurrió un error al pedir la respuesta al co-writer.');
    } finally {
      setBusy(false);
      setStreamingText('');
      abortRef.current = null;
      // Foco gestionado: al terminar de enviar, el foco vuelve al input para
      // continuar escribiendo sin tener que volver a tabular hasta él. El
      // textarea está `disabled` mientras `busy`, así que `focus()` debe
      // diferirse al re-render que lo habilita (si no, es un no-op y el foco
      // queda perdido).
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  async function acceptActions() {
    // U7 — inserción contextual: navegar a la sección donde el cambio se aplica
    // (personaje → Personajes, beat → Outline, mundo → Mundo, etc.) para que el
    // usuario vea el resultado "en contexto" tras aceptar la propuesta.
    const target = getActionsTarget(pendingActions);
    const { undo, failed } = await applyContentActions(pendingActions);
    setLastUndo(() => undo);
    setPendingActions([]);
    if (failed.length > 0) {
      announce(
        `No se pudo aplicar: ${failed.join(', ')}. Esos elementos ya no existen o no se encontraron.`,
      );
    }
    if (target) {
      if (target.view === 'story' && target.section) {
        setActiveStorySection(target.section);
        setView('story');
        // U8: enfoca el heading de la sección destino para que el foco no caiga
        // a <body> al desmontarse el botón Aceptar (WCAG 2.4.3).
        requestSectionFocus(target.section);
        announce(`Cambios aplicados en ${target.label}.`);
      } else if (target.view === 'outline') {
        setView('outline');
        announce('Cambios aplicados en el outline.');
      } else {
        setView('editor');
        announce('Cambios aplicados en el editor.');
      }
    } else {
      announce('Cambios aplicados.');
    }
  }

  async function undoLast() {
    if (!lastUndo) return;
    await lastUndo();
    setLastUndo(null);
    announce('Cambios deshechos.');
    // U8: devuelve el foco al input (el botón Deshacer se desmonta).
    inputRef.current?.focus();
  }

  function rejectActions() {
    setPendingActions([]);
    announce('Propuesta descartada.');
    // U8: devuelve el foco al input (el botón Descartar se desmonta).
    inputRef.current?.focus();
  }

  function describeAction(a: ContentAction): string {
    switch (a.type) {
      case 'rewrite_scene':
        return `Reescribir escena: ${a.summary || a.sceneId}`;
      case 'update_scene_notes':
        return `Actualizar notas de continuidad: ${a.summary || a.sceneId}`;
      case 'update_beat':
        return `Actualizar beat: ${a.summary || a.beatId}`;
      case 'add_beat':
        return `Agregar beat: ${a.summary || a.beat.title}`;
      case 'update_character':
        return `Actualizar personaje: ${a.summary || a.characterId}`;
      case 'add_character':
        return `Agregar personaje: ${a.summary || a.character.name}`;
      case 'update_world':
        return `Actualizar mundo: ${a.summary || a.entityId}`;
      case 'update_bible':
        return `Actualizar biblia (${a.section}): ${a.summary}`;
      case 'append_scene':
        return `Agregar escena: ${a.summary || a.chapterId}`;
      case 'replace_outline': {
        const chapterCount = a.chapters.length;
        const beatCount = a.beats.length;
        return `Reemplazar outline global (${chapterCount} capítulo${chapterCount > 1 ? 's' : ''}, ${beatCount} beat${beatCount > 1 ? 's' : ''})`;
      }
      case 'update_outline':
        return `Editar outline: ${a.summary || 'cambios parciales'}`;
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  if (!currentProject) {
    return (
      <div className="empty-state">
        <div>
          <i className="bi bi-chat-dots fs-1 d-block mb-2" />
          <div className="small">Seleccioná un proyecto para conversar con tu co-writer.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-panel">
      <div className="stack-panel-header">
        <div className="stack-panel-actions">
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={startConversation}
            disabled={busy}
            title="Nueva conversación"
          >
            <i className="bi bi-plus-lg me-1" /> Nueva
          </button>
        </div>
      </div>

      {conversations.length > 0 ? (
        <div className="chat-conv-list">
          {conversations.map((c) => (
            <div
              key={c.id}
              className={`chat-conv-item ${c.id === currentConversationId ? 'active' : ''}${busy ? ' disabled' : ''}`}
              onClick={() => {
                if (!busy) selectConversation(c.id);
              }}
            >
              <span className="text-truncate">{c.title}</span>
              <button
                className="icon-btn ms-auto"
                title="Eliminar conversación"
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(c.id);
                }}
              >
                <i className="bi bi-trash" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="chat-messages" ref={scrollRef}>
        {/* U7 — live region de mensajes: anuncia la llegada de una respuesta
            del co-writer. El texto se reinicia tras un timeout para que el AT
            vuelva a anunciar respuestas consecutivas con el mismo contenido. */}
        <div role="log" aria-live="polite" className="visually-hidden">
          {lastAssistantMessage}
        </div>
        {messages.length === 0 && !streamingText ? (
          <div className="empty-state">
            <div>
              <i className="bi bi-chat-square-text fs-1 d-block mb-2" />
              <div className="small">
                Conversá con tu co-writer: debatí ideas, explorá finales, pedí cambios.
              </div>
            </div>
          </div>
        ) : null}

        {messages.map((m) => (
          <div key={m.id} className={`chat-msg chat-msg-${m.role}`}>
            <div className="chat-msg-bubble">
              <MarkdownView source={m.content} />
            </div>
            {m.actions.length > 0 ? (
              <div className="chat-actions-applied">
                <i className="bi bi-check2-circle me-1" />
                {m.actions.length} cambio{m.actions.length > 1 ? 's' : ''} aplicado
                {m.actions.length > 1 ? 's' : ''}
              </div>
            ) : null}
          </div>
        ))}

        {busy && !streamingText ? (
          <div className="chat-msg chat-msg-assistant">
            <div className="chat-msg-bubble chat-thinking">
              <span className="spinner-inline me-2" aria-hidden="true" />
              <span>Pensando…</span>
            </div>
          </div>
        ) : null}

        {streamingText ? (
          <div className="chat-msg chat-msg-assistant">
            <div className="chat-msg-bubble">
              <MarkdownView source={streamingText} />
              <span className="chat-cursor" />
            </div>
          </div>
        ) : null}

        {pendingActions.length > 0 ? (
          <div className="chat-pending">
            <div className="chat-pending-title">
              <i className="bi bi-magic me-1" />
              El co-writer propone cambios
            </div>
            {pendingActions.length === 1 && pendingActions[0].type === 'replace_outline' ? (
              <OutlineProposal action={pendingActions[0]} />
            ) : (
              <ul className="chat-pending-list">
                {pendingActions.map((a, i) => (
                  <li key={i}>{describeAction(a)}</li>
                ))}
              </ul>
            )}
            <div className="d-flex gap-2 mt-2">
              <button className="btn btn-sm btn-primary" onClick={acceptActions}>
                <i className="bi bi-check-lg me-1" /> Aceptar
              </button>
              <button className="btn btn-sm btn-outline-secondary" onClick={rejectActions}>
                <i className="bi bi-x-lg me-1" /> Descartar
              </button>
            </div>
          </div>
        ) : null}

        {lastUndo ? (
          <div className="chat-undo">
            <span className="small">Cambios aplicados.</span>
            <button className="btn btn-sm btn-outline-secondary" onClick={undoLast}>
              <i className="bi bi-arrow-counterclockwise me-1" /> Deshacer
            </button>
          </div>
        ) : null}
      </div>

      <div className="chat-input">
        <label htmlFor="chat-input" className="visually-hidden">
          Mensaje al co-writer
        </label>
        <textarea
          id="chat-input"
          ref={inputRef}
          className="form-control"
          rows={2}
          placeholder="Escribí tu idea, pregunta o pedido…"
          aria-label="Escribí tu idea, pregunta o pedido para el co-writer"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          disabled={busy}
        />
        <div className="d-flex gap-2 mt-2">
          {busy ? (
            <button className="btn btn-sm btn-outline-secondary" onClick={stop}>
              <i className="bi bi-stop-circle me-1" /> Detener
            </button>
          ) : (
            <button
              className="btn btn-sm btn-primary ms-auto"
              onClick={send}
              disabled={!input.trim()}
            >
              <i className="bi bi-send me-1" /> Enviar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
