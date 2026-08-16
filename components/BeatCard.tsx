'use client';

import { useState, useEffect } from 'react';
import { KIND_LABELS, STATUS_LABELS } from '@/lib/outlineLabels';
import type { Beat, BeatKind, BeatStatus, Chapter } from '@/types';

interface BeatCardProps {
  beat: Beat;
  chapters: Chapter[];
  onUpdate: (id: string, patch: Partial<Beat>) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onGenerateScene: (id: string) => void;
  onMoveToChapter?: (beatId: string, chapterId: string) => void;
  generating: boolean;
  chapterGenerating: boolean;
  canUp: boolean;
  canDown: boolean;
  showChapterMove?: boolean;
}

export default function BeatCard({
  beat,
  chapters,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onGenerateScene,
  onMoveToChapter,
  generating,
  chapterGenerating,
  canUp,
  canDown,
  showChapterMove,
}: BeatCardProps) {
  const [draft, setDraft] = useState({
    title: beat.title,
    kind: beat.kind,
    status: beat.status,
    description: beat.description,
    notes: beat.notes,
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- derived state from a prop
    setDraft({
      title: beat.title,
      kind: beat.kind,
      status: beat.status,
      description: beat.description,
      notes: beat.notes,
    });
  }, [beat.id, beat.title, beat.kind, beat.status, beat.description, beat.notes]);

  const commit = () => onUpdate(beat.id, draft);
  const currentChapterId = beat.chapterId ?? '';

  return (
    <div className="outline-beat">
      <div className="outline-beat-head">
        <span className={`outline-kind outline-kind-${draft.kind}`}>{KIND_LABELS[draft.kind]}</span>
        <input
          className="form-control form-control-sm outline-beat-title"
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          onBlur={commit}
          aria-label="Título del beat"
        />
        <select
          className="form-select form-select-sm outline-beat-status"
          value={draft.status}
          onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as BeatStatus }))}
          onBlur={commit}
          aria-label="Estado del beat"
        >
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <div className="outline-beat-actions">
          <button
            className="icon-btn"
            title="Subir"
            disabled={!canUp}
            onClick={() => onMoveUp(beat.id)}
            aria-label="Subir beat"
          >
            <i className="bi bi-arrow-up" aria-hidden="true" />
          </button>
          <button
            className="icon-btn"
            title="Bajar"
            disabled={!canDown}
            onClick={() => onMoveDown(beat.id)}
            aria-label="Bajar beat"
          >
            <i className="bi bi-arrow-down" aria-hidden="true" />
          </button>
          <button
            className="icon-btn"
            title="Eliminar beat"
            onClick={() => onDelete(beat.id)}
            aria-label="Eliminar beat"
          >
            <i className="bi bi-trash" aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-outline-primary outline-generate"
          onClick={() => onGenerateScene(beat.id)}
          disabled={generating || chapterGenerating}
          aria-label={`Generar escena para "${draft.title || 'sin título'}"`}
        >
          {generating ? (
            <span className="spinner-inline me-1" aria-hidden="true" />
          ) : (
            <i className="bi bi-file-earmark-plus me-1" aria-hidden="true" />
          )}
          Generar escena
        </button>
      </div>
      <div className="outline-beat-body">
        <select
          className="form-select form-select-sm"
          value={draft.kind}
          onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value as BeatKind }))}
          onBlur={commit}
          aria-label="Tipo de beat"
        >
          {Object.entries(KIND_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <textarea
          className="form-control form-control-sm"
          rows={2}
          placeholder="Qué pasa en este beat"
          value={draft.description}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          onBlur={commit}
          aria-label="Descripción del beat"
        />
        <textarea
          className="form-control form-control-sm"
          rows={2}
          placeholder="Notas: intención, tono, elementos a cuidar"
          value={draft.notes}
          onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
          onBlur={commit}
          aria-label="Notas del beat"
        />
        {showChapterMove && onMoveToChapter ? (
          <div className="d-flex align-items-center gap-2 mt-1">
            <label htmlFor={`move-beat-${beat.id}`} className="small text-muted mb-0">
              Mover a capítulo:
            </label>
            <select
              id={`move-beat-${beat.id}`}
              className="form-select form-select-sm"
              style={{ width: 'auto' }}
              value={currentChapterId}
              onChange={(e) => onMoveToChapter(beat.id, e.target.value)}
              aria-label="Mover beat a otro capítulo"
            >
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
    </div>
  );
}
