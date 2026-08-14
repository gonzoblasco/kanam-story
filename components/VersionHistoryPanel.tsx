'use client';

import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/lib/store';
import type { SceneSnapshot } from '@/types';
import {
  formatSnapshotTime,
  diffLines,
  sortSnapshotsNewestFirst,
} from '@/lib/snapshots';

/**
 * B6 — Versioning / snapshots.
 *
 * Modal que muestra el historial de versiones de la escena actual: lista de
 * snapshots con timestamp, un diff del contenido entre la versión seleccionada
 * y la actual, y la acción de restaurar (con confirmación).
 */
export default function VersionHistoryPanel({ onClose }: { onClose: () => void }) {
  const { currentSceneId, scenes, listSceneSnapshots, restoreSceneSnapshot } = useApp();
  const [snapshots, setSnapshots] = useState<SceneSnapshot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  const scene = scenes.find((s) => s.id === currentSceneId) || null;

  useEffect(() => {
    if (!currentSceneId) return;
    let cancelled = false;
    listSceneSnapshots(currentSceneId).then((list) => {
      if (cancelled) return;
      setSnapshots(sortSnapshotsNewestFirst(list));
      setSelectedId(list.length > 0 ? list[0].id : null);
      setRestored(false);
    });
    return () => {
      cancelled = true;
    };
  }, [currentSceneId, listSceneSnapshots]);

  const selected = useMemo(
    () => snapshots.find((s) => s.id === selectedId) ?? null,
    [snapshots, selectedId],
  );

  // Diff entre la versión seleccionada y el estado actual de la escena.
  const diff = useMemo(() => {
    if (!selected || !scene) return null;
    return diffLines(selected.content, scene.content ?? '');
  }, [selected, scene]);

  async function handleRestore() {
    if (!selected || !scene) return;
    const ok = window.confirm(
      `¿Restaurar la escena a la versión del ${formatSnapshotTime(selected.createdAt)}? ` +
        'Se guardará una snapshot del estado actual antes de restaurar.',
    );
    if (!ok) return;
    setError(null);
    try {
      await restoreSceneSnapshot(scene.id, selected);
      setRestored(true);
      // Refrescar el historial: la restauración genera una snapshot nueva del
      // estado previo, así que la lista cambia.
      const list = await listSceneSnapshots(scene.id);
      setSnapshots(sortSnapshotsNewestFirst(list));
      setSelectedId(list.length > 0 ? list[0].id : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo restaurar la versión.');
    }
  }

  return (
    <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
      <div className="modal-backdrop fade show" onClick={onClose} />
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-clock-history me-2" />
              Historial de versiones
            </h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Cerrar" />
          </div>
          <div className="modal-body">
            {!scene ? (
              <div className="text-muted small py-4 text-center">
                Seleccioná una escena para ver su historial.
              </div>
            ) : snapshots.length === 0 ? (
              <div className="text-muted small py-4 text-center">
                Todavía no hay versiones guardadas de esta escena. Se guarda una
                versión cada vez que la escena cambia.
              </div>
            ) : (
              <div className="row g-3">
                <div className="col-md-5">
                  <div className="text-muted small mb-2">
                    {snapshots.length} versión(es) · {scene.title || 'Escena sin título'}
                  </div>
                  <div className="version-list">
                    {snapshots.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={`version-item ${s.id === selectedId ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedId(s.id);
                          setRestored(false);
                        }}
                        title={`Ver versión del ${formatSnapshotTime(s.createdAt)}`}
                      >
                        <i className="bi bi-file-earmark-text me-2" />
                        {formatSnapshotTime(s.createdAt)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="col-md-7">
                  {selected ? (
                    <>
                      <div className="text-muted small mb-2">
                        Versión del {formatSnapshotTime(selected.createdAt)}
                      </div>
                      {selected.title ? (
                        <div className="version-title">{selected.title}</div>
                      ) : null}
                      <div className="version-diff">
                        {diff && (diff.added.length > 0 || diff.removed.length > 0) ? (
                          <>
                            {diff.removed.length > 0 ? (
                              <div className="diff-block">
                                <div className="diff-label diff-label-removed">Eliminado</div>
                                {diff.removed.map((line, i) => (
                                  <div key={i} className="diff-line diff-line-removed">
                                    <span className="diff-sign">−</span>
                                    {line || ' '}
                                  </div>
                                ))}
                              </div>
                            ) : null}
                            {diff.added.length > 0 ? (
                              <div className="diff-block">
                                <div className="diff-label diff-label-added">Agregado</div>
                                {diff.added.map((line, i) => (
                                  <div key={i} className="diff-line diff-line-added">
                                    <span className="diff-sign">+</span>
                                    {line || ' '}
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <div className="text-muted small">
                            Esta versión es idéntica al contenido actual de la escena.
                          </div>
                        )}
                      </div>
                      <div className="d-flex gap-2 mt-3">
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={handleRestore}
                          title="Volver a esta versión (pide confirmación)"
                        >
                          <i className="bi bi-arrow-counterclockwise me-1" />
                          Restaurar esta versión
                        </button>
                        {restored ? (
                          <span className="text-success small align-self-center">
                            <i className="bi bi-check-circle me-1" />
                            Escena restaurada.
                          </span>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            )}
            {error ? (
              <div className="alert alert-danger py-2 small mb-0 mt-2">
                <i className="bi bi-exclamation-triangle me-1" />
                {error}
              </div>
            ) : null}
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
