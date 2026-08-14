'use client';

import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/lib/store';
import { WORLD_KIND_LABELS } from '@/lib/labels';
import type { WorldEntity, WorldKind } from '@/types';

const KINDS: WorldKind[] = [
  'place',
  'organization',
  'lore',
  'key_event',
  'clue',
  'magic_system',
  'item',
  'rule',
  'other',
];

const TAG_FIELDS: { key: 'otherNames' | 'traits'; label: string }[] = [
  { key: 'otherNames', label: 'Otros nombres' },
  { key: 'traits', label: 'Rasgos' },
];

const AUTOFILL_KEY = (projectId: string): string => `kanam-story.autoFillBible:world:${projectId}`;

function readAutoFill(projectId: string): boolean {
  if (typeof window === 'undefined') return true;
  const v = window.localStorage.getItem(AUTOFILL_KEY(projectId));
  return v === null ? true : v === '1';
}

function TagEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState('');
  const add = () => {
    const t = input.trim();
    if (!t) return;
    if (!value.includes(t)) onChange([...value, t]);
    setInput('');
  };
  return (
    <div>
      <div className="d-flex flex-wrap gap-1 mb-1">
        {value.length === 0 ? (
          <span className="text-muted small">—</span>
        ) : (
          value.map((t) => (
            <span key={t} className="badge bg-secondary d-inline-flex align-items-center gap-1">
              {t}
              <button
                type="button"
                className="btn-close btn-close-white"
                style={{ fontSize: '0.5rem' }}
                aria-label={`Quitar ${t}`}
                onClick={() => onChange(value.filter((x) => x !== t))}
              />
            </span>
          ))
        )}
      </div>
      <div className="input-group input-group-sm">
        <input
          className="form-control"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <button className="btn btn-outline-secondary" type="button" onClick={add}>
          <i className="bi bi-plus" />
        </button>
      </div>
    </div>
  );
}

export default function WorldPanel() {
  const {
    currentProject,
    world,
    createWorld,
    updateWorld,
    deleteWorld,
    revertBibleImport,
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
      kind: 'place',
      description: '',
      otherNames: [],
      traits: [],
      inContext: true,
    });
  }

  function remove(w: WorldEntity) {
    if (window.confirm(`¿Eliminar "${w.name}"?`)) deleteWorld(w.id);
  }

  return (
    <div>
      <div className="stack-panel-header">
        <span className="stack-panel-count">Mundo ({world.length})</span>
        <div className="stack-panel-actions">
          <button className="btn btn-sm btn-outline-primary" onClick={add}>
            <i className="bi bi-plus-lg me-1" /> Agregar
          </button>
        </div>
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
                value={w.kind}
                onChange={(e) => updateWorld(w.id, { kind: e.target.value as WorldKind })}
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {WORLD_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
              <textarea
                className="form-control"
                rows={5}
                value={w.description}
                onChange={(e) => updateWorld(w.id, { description: e.target.value })}
              />
              {TAG_FIELDS.map((f) => (
                <div key={f.key} className="mb-2 mt-2">
                  <label className="form-label small text-muted mb-1">{f.label}</label>
                  <TagEditor
                    value={w[f.key] ?? []}
                    onChange={(v) => updateWorld(w.id, { [f.key]: v } as Partial<WorldEntity>)}
                    placeholder={`Agregar ${f.label.toLowerCase()}…`}
                  />
                </div>
              ))}
              <div className="form-check mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id={`inContext-${w.id}`}
                  checked={w.inContext !== false}
                  onChange={(e) => updateWorld(w.id, { inContext: e.target.checked })}
                />
                <label className="form-check-label small" htmlFor={`inContext-${w.id}`}>
                  Incluir en el contexto del co-writer
                </label>
              </div>
              <div className="d-flex gap-2 mt-2">
                <button className="btn btn-sm btn-primary" onClick={() => setEditing(null)}>
                  Listo
                </button>
                {w.source === 'biblia' ? (
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => revertBibleImport('world', w.id)}
                    title="Quitar la marca 'de biblia': el próximo sync ya no lo tocará"
                  >
                    <i className="bi bi-arrow-counterclockwise me-1" /> Revertir import
                  </button>
                ) : null}
                <button className="btn btn-sm btn-outline-danger" onClick={() => remove(w)}>
                  <i className="bi bi-trash" /> Eliminar
                </button>
              </div>
            </div>
          ) : (
            <div onClick={() => setEditing(w.id)}>
              <div className="d-flex align-items-center gap-2">
                <span className="name flex-grow-1">{w.name || 'Sin nombre'}</span>
                <span className="pill">{WORLD_KIND_LABELS[w.kind]}</span>
                {w.inContext === false ? (
                  <span className="badge bg-secondary" title="Excluido del contexto del co-writer">
                    <i className="bi bi-eye-slash" />
                  </span>
                ) : null}
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