'use client';

import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/lib/store';
import type { Character } from '@/types';

const FIELDS: { key: keyof Character; label: string; rows?: number }[] = [
  { key: 'role', label: 'Rol', rows: 1 },
  { key: 'age', label: 'Edad', rows: 1 },
  { key: 'appearance', label: 'Apariencia', rows: 2 },
  { key: 'personality', label: 'Personalidad', rows: 3 },
  { key: 'voice', label: 'Voz / forma de hablar', rows: 2 },
  { key: 'goals', label: 'Objetivos y motivaciones', rows: 2 },
  { key: 'backstory', label: 'Historia previa', rows: 4 },
];

const AUTOFILL_KEY = (projectId: string): string => `kanam-story.autoFillBible:characters:${projectId}`;

function readAutoFill(projectId: string): boolean {
  if (typeof window === 'undefined') return true;
  const v = window.localStorage.getItem(AUTOFILL_KEY(projectId));
  return v === null ? true : v === '1';
}

export default function CharactersPanel() {
  const {
    currentProject,
    characters,
    createCharacter,
    updateCharacter,
    deleteCharacter,
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
    if (characters.length > 0) return;

    (async () => {
      try {
        await ensureStoryBible(currentProject.id);
        await regenerateStoryBible();
      } catch {
        // silencioso: el auto-fill es best-effort
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject?.id]);

  if (!currentProject) {
    return <div className="text-muted small">No hay proyecto seleccionado.</div>;
  }

  function add() {
    createCharacter({
      projectId: currentProject!.id,
      name: 'Nuevo personaje',
      role: '',
      age: '',
      appearance: '',
      personality: '',
      voice: '',
      backstory: '',
      goals: '',
    });
  }

  function remove(c: Character) {
    if (window.confirm(`¿Eliminar el personaje "${c.name}"?`)) deleteCharacter(c.id);
  }

  return (
    <div>
      <div className="d-flex align-items-center mb-2">
        <strong>Personajes ({characters.length})</strong>
        <button className="btn btn-sm btn-outline-primary ms-auto" onClick={add}>
          <i className="bi bi-plus-lg me-1" /> Agregar
        </button>
      </div>
      {characters.length === 0 ? (
        <div className="text-muted small">Todavía no hay personajes.</div>
      ) : null}
      {characters.map((c) => (
        <div key={c.id} className="entity-card">
          {editing === c.id ? (
            <div>
              <input
                className="form-control mb-2"
                value={c.name}
                onChange={(e) => updateCharacter(c.id, { name: e.target.value })}
              />
              {FIELDS.map((f) => (
                <div key={f.key as string} className="mb-2">
                  <label className="form-label small text-muted mb-1">{f.label}</label>
                  <textarea
                    className="form-control"
                    rows={f.rows || 2}
                    value={(c[f.key] as string) || ''}
                    onChange={(e) => updateCharacter(c.id, { [f.key]: e.target.value } as Partial<Character>)}
                  />
                </div>
              ))}
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-primary" onClick={() => setEditing(null)}>
                  Listo
                </button>
                <button className="btn btn-sm btn-outline-danger" onClick={() => remove(c)}>
                  <i className="bi bi-trash" /> Eliminar
                </button>
              </div>
            </div>
          ) : (
            <div onClick={() => setEditing(c.id)}>
              <div className="d-flex align-items-center gap-2">
                <span className="name flex-grow-1">{c.name || 'Sin nombre'}</span>
                {c.source === 'biblia' ? (
                  <span
                    className="badge bg-info-subtle text-info-emphasis"
                    title={`Importado desde la Biblia el ${new Date(c.createdAt).toLocaleDateString()}`}
                  >
                    de biblia
                  </span>
                ) : null}
              </div>
              <div className="meta">{c.role || 'Sin rol'}</div>
              {c.personality ? (
                <div className="small mt-1 text-muted text-truncate">{c.personality}</div>
              ) : null}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}