'use client';

import { useState } from 'react';
import { useApp } from '@/lib/store';
import { ollamaChat } from '@/lib/ollama';
import { buildContext, buildBrainstormPrompt } from '@/lib/prompts';
import type { BrainstormNote } from '@/types';
import MarkdownView from '@/components/MarkdownView';

export default function BrainstormPanel() {
  const { currentProject, brainstorm, characters, world, settings, createNote, updateNote, deleteNote } = useApp();
  const [topic, setTopic] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!currentProject) {
    return <div className="text-muted small">No hay proyecto seleccionado.</div>;
  }

  async function generate() {
    if (!topic.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const ctx = buildContext(currentProject!, characters, world);
      const prompt = buildBrainstormPrompt(ctx, topic);
      const text = await ollamaChat({
        ollamaUrl: settings.ollamaUrl,
        model: settings.ollamaModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
      });
      const note = await createNote({
        projectId: currentProject!.id,
        title: topic,
        content: text.trim(),
      });
      setTopic('');
      setEditingId(note.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falló la generación');
    } finally {
      setBusy(false);
    }
  }

  async function appendToNote(note: BrainstormNote) {
    if (!topic.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const ctx = buildContext(currentProject!, characters, world);
      const prompt = `${ctx}\nHacé un brainstorm sobre: ${topic}\nEn el mismo estilo y espíritu de esta nota existente:\n---\n${note.content}\n---\nMás ideas en español (usá formato markdown si ayuda):`;
      const text = await ollamaChat({
        ollamaUrl: settings.ollamaUrl,
        model: settings.ollamaModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
      });
      const sep = note.content.trim() ? '\n\n' : '';
      await updateNote(note.id, {
        title: note.title || topic,
        content: note.content + sep + text.trim(),
      });
      setTopic('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falló la generación');
    } finally {
      setBusy(false);
    }
  }

  function renameNote(n: BrainstormNote) {
    const next = window.prompt('Título de la nota', n.title);
    if (next != null && next !== n.title) updateNote(n.id, { title: next });
  }

  function removeNote(n: BrainstormNote) {
    if (window.confirm(`¿Eliminar "${n.title || 'Sin título'}"?`)) deleteNote(n.id);
    if (editingId === n.id) setEditingId(null);
  }

  return (
    <div>
      <div className="mb-3">
        <label className="form-label small text-muted">Tema</label>
        <textarea
          className="form-control"
          rows={2}
          placeholder="ej. Giro para el tercer acto, nombres de personajes secundarios, …"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          disabled={busy}
        />
        <div className="d-flex gap-2 mt-2">
          <button className="btn btn-sm btn-ai flex-grow-1" disabled={busy || !topic.trim()} onClick={generate}>
            {busy ? (
              <>
                <span className="spinner-inline me-2" /> Generando…
              </>
            ) : (
              <>
                <i className="bi bi-stars me-1" /> Brainstormear
              </>
            )}
          </button>
        </div>
        {error ? (
          <div className="alert alert-danger small py-2 mt-2 mb-0">{error}</div>
        ) : null}
      </div>

      <div className="sidebar-section-title">
        <span>Notas ({brainstorm.length})</span>
      </div>
      {brainstorm.length === 0 ? (
        <div className="text-muted small">Todavía no hay notas.</div>
      ) : null}
      {brainstorm.map((n) => {
        const isEditing = editingId === n.id;
        return (
          <div key={n.id} className="brainstorm-note">
            <div className="d-flex align-items-center mb-1 gap-1">
              <strong className="flex-grow-1 text-truncate" onClick={() => renameNote(n)}>
                {n.title || 'Sin título'}
              </strong>
              <button
                className="icon-btn"
                title={isEditing ? 'Ver vista previa' : 'Editar'}
                onClick={() => setEditingId(isEditing ? null : n.id)}
              >
                <i className={`bi bi-${isEditing ? 'eye' : 'pencil'}`} />
              </button>
              <button
                className="icon-btn"
                title="Sumar más ideas sobre el mismo tema"
                onClick={() => appendToNote(n)}
                disabled={busy || !topic.trim()}
              >
                <i className="bi bi-plus-circle" />
              </button>
              <button className="icon-btn" title="Eliminar" onClick={() => removeNote(n)}>
                <i className="bi bi-trash" />
              </button>
            </div>
            {isEditing ? (
              <textarea
                rows={8}
                value={n.content}
                onChange={(e) => updateNote(n.id, { content: e.target.value })}
                placeholder="Markdown: **negrita**, *itálica*, - listas, > citas, # títulos…"
              />
            ) : (
              <MarkdownView source={n.content} />
            )}
          </div>
        );
      })}
    </div>
  );
}