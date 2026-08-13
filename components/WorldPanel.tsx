'use client';

import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/lib/store';
import type { WorldEntity } from '@/types';

const CATEGORY_LABELS: Record<WorldEntity['category'], string> = {
  location: 'lugar',
  lore: 'lore',
  rule: 'regla',
  item: 'objeto',
  other: 'otro',
};

const CATEGORIES: WorldEntity['category'][] = ['location', 'lore', 'rule', 'item', 'other'];

const AUTOFILL_KEY = (projectId: string): string => `kanam-story.autoFillBible:world:${projectId}`;

function readAutoFill(projectId: string): boolean {
  if (typeof window === 'undefined') return true;
  const v = window.localStorage.getItem(AUTOFILL_KEY(projectId));
  return v === null ? true : v === '1';
}

export default function WorldPanel() {
  const {
    currentProject,
    world,
    createWorld,
    updateWorld,
    deleteWorld,
    ensureStoryBible,
    regenerateStoryBible,
  } = useApp();
  const [editing, setEditing] = useState<string | null>(null);
  const autoFillAttemptedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentProject) return;
    if (autoFillAttemptedRef.current === currentProject.id) return;
    autoFillAttemptedRef.current = currentProject.id;
    if (!readAutoFill(currentProject.id)) return;
    if (world.length > 0) return;

    (async () => {
      try {
        await ensureStoryBible(currentProject.id);
        await regenerateStoryBible();
      } catch {
        // silencioso
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject?.id]);

  if (!currentProject) {
    return <div className="text-muted small">No hay proyecto seleccionado.</div>;
  }

  function add() {
    createWorld({
      projectId: currentProject!.id,
      name: 'Nueva entrada',
      category: 'location',
      description: '',
    });
  }

  function remove(w: WorldEntity) {
    if (window.confirm(`¿Eliminar "${w.name}"?`)) deleteWorld(w.id);
  }

  return (
    <div>
      <div className="d-flex align-items-center mb-2">
        <strong>Mundo ({world.length})</strong>
        <button className="btn btn-sm btn-outline-primary ms-auto" onClick={add}>
          <i className="bi bi-plus-lg me-1" /> Agregar
        </button>
      </div>
      {world.length === 0 ? (
        <div className="text-muted small">Todavía no hay entradas.</div>
      ) : null}
      {world.map((w) => (
        <div key={w.id} className="entity-card">
          {editing === w.id ? (
            <div>
              <input
                className="form-control mb-2"
                value={w.name}
                onChange={(e) => updateWorld(w.id, { name: e.target.value })}
              />
              <select
                className="form-select mb-2"
                value={w.category}
                onChange={(e) => updateWorld(w.id, { category: e.target.value as WorldEntity['category'] })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
              <textarea
                className="form-control"
                rows={5}
                value={w.description}
                onChange={(e) => updateWorld(w.id, { description: e.target.value })}
              />
              <div className="d-flex gap-2 mt-2">
                <button className="btn btn-sm btn-primary" onClick={() => setEditing(null)}>
                  Listo
                </button>
                <button className="btn btn-sm btn-outline-danger" onClick={() => remove(w)}>
                  <i className="bi bi-trash" /> Eliminar
                </button>
              </div>
            </div>
          ) : (
            <div onClick={() => setEditing(w.id)}>
              <div className="d-flex align-items-center gap-2">
                <span className="name flex-grow-1">{w.name || 'Sin nombre'}</span>
                <span className="pill">{CATEGORY_LABELS[w.category]}</span>
                {w.source === 'biblia' ? (
                  <span
                    className="badge bg-info-subtle text-info-emphasis"
                    title={`Importado desde la Biblia el ${new Date(w.createdAt).toLocaleDateString()}`}
                  >
                    de biblia
                  </span>
                ) : null}
              </div>
              <div className="small mt-1 text-muted text-truncate">{w.description || 'Sin descripción'}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}