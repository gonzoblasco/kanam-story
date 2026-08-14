'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/lib/store';
import { searchScenes, buildReplacePlan, type SceneSearchHit } from '@/lib/search';

const FIELD_LABELS: Record<string, string> = {
  content: 'Contenido',
  title: 'Título',
  summary: 'Resumen',
};

export default function SearchPanel({ onClose }: { onClose: () => void }) {
  const { scenes, chapters, currentProject, selectScene, setView, updateScene } = useApp();
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [replaced, setReplaced] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const hits = useMemo(
    () => searchScenes(scenes, chapters, query),
    [scenes, chapters, query],
  );

  // Agrupar hits por capítulo, preservando el orden de los capítulos.
  const grouped = useMemo(() => {
    const map = new Map<string, SceneSearchHit[]>();
    for (const hit of hits) {
      const list = map.get(hit.chapterId) ?? [];
      list.push(hit);
      map.set(hit.chapterId, list);
    }
    return Array.from(map.entries());
  }, [hits]);

  const totalMatches = useMemo(
    () => hits.reduce((acc, h) => acc + h.matches.reduce((a, m) => a + m.count, 0), 0),
    [hits],
  );

  function goToScene(sceneId: string) {
    selectScene(sceneId);
    setView('editor');
    onClose();
  }

  function handleReplace() {
    if (!currentProject) return;
    const q = query.trim();
    if (!q) return;
    const plan = buildReplacePlan(scenes, q, replacement);
    if (plan.length === 0) {
      setError('No hay coincidencias para reemplazar.');
      return;
    }
    const total = plan.reduce(
      (acc, p) => acc + p.changes.reduce((a, c) => a + countIn(c.before, q), 0),
      0,
    );
    const ok = window.confirm(
      `¿Reemplazar "${q}" por "${replacement}" en ${plan.length} escena(s) (${total} ocurrencia(s))?`,
    );
    if (!ok) return;
    setError(null);
    let done = 0;
    for (const p of plan) {
      for (const c of p.changes) {
        if (c.field === 'content') updateScene(p.sceneId, { content: c.after });
        else if (c.field === 'title') updateScene(p.sceneId, { title: c.after });
        else if (c.field === 'summary') updateScene(p.sceneId, { summary: c.after });
      }
      done += 1;
    }
    setReplaced(done);
  }

  return (
    <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
      <div className="modal-backdrop fade show" onClick={onClose} />
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-search me-2" />
              Buscar en el manuscrito
            </h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Cerrar" />
          </div>
          <div className="modal-body">
            <div className="d-flex gap-2 mb-2">
              <input
                type="text"
                className="form-control"
                placeholder="Buscar en contenido, títulos y resúmenes…"
                value={query}
                autoFocus
                onChange={(e) => {
                  setQuery(e.target.value);
                  setReplaced(0);
                }}
              />
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setShowReplace((v) => !v)}
                title="Mostrar/ocultar reemplazo"
              >
                <i className="bi bi-arrow-repeat me-1" />
                Reemplazar
              </button>
            </div>

            {showReplace ? (
              <div className="d-flex gap-2 mb-2">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Reemplazar por…"
                  value={replacement}
                  onChange={(e) => setReplacement(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={handleReplace}
                  title="Reemplazar todas las ocurrencias (pide confirmación)"
                >
                  <i className="bi bi-check2-all me-1" />
                  Reemplazar todo
                </button>
              </div>
            ) : null}

            {error ? (
              <div className="alert alert-danger py-2 small mb-2">
                <i className="bi bi-exclamation-triangle me-1" />
                {error}
              </div>
            ) : null}

            {replaced > 0 ? (
              <div className="alert alert-success py-2 small mb-2">
                <i className="bi bi-check-circle me-1" />
                Se reemplazó en {replaced} escena(s).
              </div>
            ) : null}

            {query.trim() === '' ? (
              <div className="text-muted small py-4 text-center">
                Escribí un término para buscar en todas las escenas del proyecto.
              </div>
            ) : hits.length === 0 ? (
              <div className="text-muted small py-4 text-center">
                Sin resultados para &quot;{query}&quot;.
              </div>
            ) : (
              <>
                <div className="text-muted small mb-2">
                  {hits.length} escena(s) · {totalMatches} coincidencia(s)
                </div>
                {grouped.map(([chapterId, chapterHits]) => (
                  <div key={chapterId} className="mb-3">
                    <div className="search-chapter-title">
                      <i className="bi bi-bookmark me-1" />
                      {chapterHits[0].chapterTitle}
                    </div>
                    {chapterHits.map((hit) => (
                      <div key={hit.sceneId} className="search-result">
                        <button
                          type="button"
                          className="search-result-title"
                          onClick={() => goToScene(hit.sceneId)}
                          title="Abrir esta escena en el editor"
                        >
                          <i className="bi bi-file-earmark-text me-1" />
                          {hit.sceneTitle}
                        </button>
                        {hit.matches.map((m, i) => (
                          <div key={i} className="search-result-match">
                            <span className="search-result-field">{FIELD_LABELS[m.field]}</span>
                            <span className="search-result-snippet">{m.snippet}</span>
                            <span className="search-result-count">{m.count}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function countIn(text: string, query: string): number {
  const q = query.toLowerCase();
  const lower = text.toLowerCase();
  let count = 0;
  let idx = lower.indexOf(q);
  while (idx !== -1) {
    count++;
    idx = lower.indexOf(q, idx + q.length);
  }
  return count;
}
