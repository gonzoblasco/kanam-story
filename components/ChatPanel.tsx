'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '@/lib/store';
import { buildAgentContext, buildAgentPrompt } from '@/lib/agentPrompts';
import { parseAgentReply, filterValidActions } from '@/lib/agentReply';
import { ollamaChatStream } from '@/lib/ollama';
import type { ContentAction } from '@/types';

export default function ChatPanel() {
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
    applyContentActions,
  } = useApp();

  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [pendingActions, setPendingActions] = useState<ContentAction[]>([]);
  const [lastUndo, setLastUndo] = useState<(() => Promise<void>) | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingText]);

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

    const context = buildAgentContext({
      project: currentProject,
      characters,
      world,
      chapters,
      scenes,
      beats,
      storyBible,
    });
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

      if (actions.length > 0) {
        setPendingActions(actions);
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      await createMessage({
        conversationId: convId,
        role: 'assistant',
        content: `⚠️ Error: ${e instanceof Error ? e.message : 'La petición a la IA falló'}`,
        actions: [],
      });
    } finally {
      setBusy(false);
      setStreamingText('');
      abortRef.current = null;
    }
  }

  async function acceptActions() {
    const undo = await applyContentActions(pendingActions);
    setLastUndo(() => undo);
    setPendingActions([]);
  }

  async function undoLast() {
    if (!lastUndo) return;
    await lastUndo();
    setLastUndo(null);
  }

  function rejectActions() {
    setPendingActions([]);
  }

  function describeAction(a: ContentAction): string {
    switch (a.type) {
      case 'rewrite_scene':
        return `Reescribir escena: ${a.summary || a.sceneId}`;
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
            <div className="chat-msg-bubble">{m.content}</div>
            {m.actions.length > 0 ? (
              <div className="chat-actions-applied">
                <i className="bi bi-check2-circle me-1" />
                {m.actions.length} cambio{m.actions.length > 1 ? 's' : ''} aplicado
                {m.actions.length > 1 ? 's' : ''}
              </div>
            ) : null}
          </div>
        ))}

        {streamingText ? (
          <div className="chat-msg chat-msg-assistant">
            <div className="chat-msg-bubble">
              {streamingText}
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
            <ul className="chat-pending-list">
              {pendingActions.map((a, i) => (
                <li key={i}>{describeAction(a)}</li>
              ))}
            </ul>
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
        <textarea
          className="form-control"
          rows={2}
          placeholder="Escribí tu idea, pregunta o pedido…"
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
