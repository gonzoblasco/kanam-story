'use client';

import { KIND_LABELS } from '@/lib/outlineLabels';
import type { Beat } from '@/types';
import type { SuggestedChapter } from '@/lib/outlineGeneration';

interface SuggestedOutlinePreviewProps {
  variant: 'chapter' | 'global';
  error: string | null;
  items: Beat[] | SuggestedChapter[];
  onAccept: () => void;
  onDiscard: () => void;
  acceptLabel: string;
}

export default function SuggestedOutlinePreview({
  variant,
  error,
  items,
  onAccept,
  onDiscard,
  acceptLabel,
}: SuggestedOutlinePreviewProps) {
  const isGlobal = variant === 'global';
  const title = isGlobal ? 'Estructura global sugerida' : 'Outline sugerido por el co-writer';
  const emptyMessage = isGlobal
    ? 'No se pudo generar una estructura. Probá de nuevo.'
    : 'No se pudieron generar beats. Probá de nuevo.';

  return (
    <div className="outline-suggested">
      <div className="outline-suggested-title">
        <i className="bi bi-magic me-1" aria-hidden="true" /> {title}
      </div>
      {error ? (
        <div className="alert alert-danger py-1 small mb-2">
          <i className="bi bi-exclamation-triangle me-1" aria-hidden="true" />
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="small text-muted">{emptyMessage}</div>
      ) : isGlobal ? (
        <div className="d-flex flex-column gap-3">
          {(items as SuggestedChapter[]).map((c, ci) => (
            <div key={ci}>
              <strong className="d-block mb-1">{c.title}</strong>
              <ul className="outline-suggested-list">
                {c.beats.map((b, bi) => (
                  <li key={bi}>
                    <span className={`outline-kind outline-kind-${b.kind}`}>{KIND_LABELS[b.kind]}</span>
                    <strong>{b.title}</strong>
                    {b.description ? <span className="text-muted"> — {b.description}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <ul className="outline-suggested-list">
          {(items as Beat[]).map((b, i) => (
            <li key={i}>
              <span className={`outline-kind outline-kind-${b.kind}`}>{KIND_LABELS[b.kind]}</span>
              <strong>{b.title}</strong>
              {b.description ? <span className="text-muted"> — {b.description}</span> : null}
            </li>
          ))}
        </ul>
      )}
      <div className="d-flex gap-2 mt-2">
        <button
          className="btn btn-sm btn-primary"
          onClick={onAccept}
          disabled={items.length === 0}
        >
          <i className="bi bi-check-lg me-1" aria-hidden="true" /> {acceptLabel}
        </button>
        <button className="btn btn-sm btn-outline-secondary" onClick={onDiscard}>
          Descartar
        </button>
      </div>
    </div>
  );
}
