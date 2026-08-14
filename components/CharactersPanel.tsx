'use client';

import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/lib/store';
import { CHARACTER_TYPE_LABELS, characterTypeLabel } from '@/lib/labels';
import type { Character, CharacterType } from '@/types';

const TEXT_FIELDS: { key: keyof Character; label: string; rows?: number }[] = [
  { key: 'pronouns', label: 'Pronombres', rows: 1 },
  { key: 'age', label: 'Edad', rows: 1 },
  { key: 'appearance', label: 'Apariencia', rows: 2 },
  { key: 'personality', label: 'Personalidad', rows: 3 },
  { key: 'voice', label: 'Voz / forma de hablar', rows: 2 },
  { key: 'goals', label: 'Objetivos y motivaciones', rows: 2 },
  { key: 'backstory', label: 'Historia previa', rows: 4 },
];

const TAG_FIELDS: { key: 'groups' | 'otherNames' | 'traits'; label: string }[] = [
  { key: 'groups', label: 'Grupos' },
  { key: 'otherNames', label: 'Otros nombres' },
  { key: 'traits', label: 'Rasgos' },
];

const AUTOFILL_KEY = (projectId: string): string => `kanam-story.autoFillBible:characters:${projectId}`;

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

export default function CharactersPanel() {
  const {
    currentProject,
    characters,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    generateCharacter,
    revertBibleImport,
    ensureStoryBible,
    regenerateStoryBible,
    announce,
  } = useApp();
  const [editing, setEditing] = useState<string | null>(null);
  const autoFillAttemptedRef = useRef<string | null>(null);

  // Generate-character flow
  const [genOpen, setGenOpen] = useState(false);
  const [genType, setGenType] = useState('');
  const [genInstructions, setGenInstructions] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<Partial<Character>[] | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

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
      type: 'supporting',
      pronouns: '',
      age: '',
      appearance: '',
      personality: '',
      voice: '',
      backstory: '',
      goals: '',
      groups: [],
      otherNames: [],
      traits: [],
      inContext: true,
    });
    announce('Personaje en blanco creado. Escribí el nombre y detalles.');
  }

  function remove(c: Character) {
    if (window.confirm(`¿Eliminar el personaje "${c.name}"?`)) deleteCharacter(c.id);
  }

  async function runGenerate(surprise = false) {
    if (!currentProject) return;
    setGenerating(true);
    setGenError(null);
    setGenerated(null);
    try {
      const type = surprise ? '' : genType || undefined;
      const instructions = surprise ? '' : genInstructions || undefined;
      setGenerated(await generateCharacter(type, instructions));
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'Falló la generación');
      setGenerated([]);
    } finally {
      setGenerating(false);
    }
  }

  async function acceptGenerated() {
    if (!generated) return;
    for (const g of generated) {
      if (!g.name) continue;
      await createCharacter({
        projectId: currentProject!.id,
        name: g.name,
        type: g.type ?? 'supporting',
        pronouns: g.pronouns ?? '',
        age: g.age ?? '',
        appearance: g.appearance ?? '',
        personality: g.personality ?? '',
        voice: g.voice ?? '',
        backstory: g.backstory ?? '',
        goals: g.goals ?? '',
        groups: g.groups ?? [],
        otherNames: g.otherNames ?? [],
        traits: g.traits ?? [],
        inContext: true,
        source: 'ai',
      });
    }
    setGenerated(null);
    setGenOpen(false);
  }

  return (
    <div>
      <div className="stack-panel-header">
        <span className="stack-panel-count">Personajes ({characters.length})</span>
        <div className="stack-panel-actions">
          <button className="btn btn-sm btn-ai" onClick={() => setGenOpen((o) => !o)}>
            <i className="bi bi-magic me-1" /> Generar
          </button>
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={add}
            aria-label="Agregar personaje en blanco"
          >
            <i className="bi bi-plus-lg me-1" aria-hidden="true" /> Agregar
          </button>
        </div>
      </div>

      {genOpen ? (
        <div className="entity-card mb-2">
          <div className="small fw-semibold mb-1">Generar personaje</div>
          <select
            className="form-select form-select-sm mb-1"
            value={genType}
            onChange={(e) => setGenType(e.target.value)}
          >
            <option value="">Cualquier tipo</option>
            {Object.entries(CHARACTER_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <textarea
            className="form-control form-control-sm mb-1"
            rows={2}
            placeholder="Instrucciones (opcional): un detective cínico, voz seca…"
            value={genInstructions}
            onChange={(e) => setGenInstructions(e.target.value)}
          />
          <div className="d-flex gap-1">
            <button className="btn btn-sm btn-primary" onClick={() => runGenerate(false)} disabled={generating}>
              {generating ? 'Generando…' : 'Generar'}
            </button>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => runGenerate(true)} disabled={generating}>
              <i className="bi bi-shuffle me-1" /> Surprise Me
            </button>
          </div>

          {genError ? <div className="small text-danger mt-1">{genError}</div> : null}

          {generated ? (
            <div className="mt-2">
              {generated.length === 0 ? (
                <div className="small text-muted">No se pudo generar. Probá de nuevo.</div>
              ) : (
                <ul className="mb-1 ps-3">
                  {generated.map((g, i) => (
                    <li key={i} className="small">
                      <strong>{g.name}</strong>
                      {g.type ? ` (${characterTypeLabel(g.type)})` : ''}
                      {g.personality ? <span className="text-muted"> — {g.personality}</span> : null}
                    </li>
                  ))}
                </ul>
              )}
              <div className="d-flex gap-1">
                <button className="btn btn-sm btn-primary" onClick={acceptGenerated} disabled={generated.length === 0}>
                  <i className="bi bi-check-lg me-1" /> Agregar
                </button>
                <button className="btn btn-sm btn-outline-secondary" onClick={() => runGenerate(false)} disabled={generating}>
                  Regenerar
                </button>
                <button className="btn btn-sm btn-outline-secondary" onClick={() => setGenerated(null)}>
                  Descartar
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

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
              <div className="mb-2">
                <label className="form-label small text-muted mb-1">Tipo</label>
                <select
                  className="form-select"
                  value={c.type}
                  onChange={(e) => updateCharacter(c.id, { type: e.target.value as CharacterType })}
                >
                  {Object.entries(CHARACTER_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              {TEXT_FIELDS.map((f) => (
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
              {TAG_FIELDS.map((f) => (
                <div key={f.key} className="mb-2">
                  <label className="form-label small text-muted mb-1">{f.label}</label>
                  <TagEditor
                    value={c[f.key] ?? []}
                    onChange={(v) => updateCharacter(c.id, { [f.key]: v } as Partial<Character>)}
                    placeholder={`Agregar ${f.label.toLowerCase()}…`}
                  />
                </div>
              ))}
              <div className="form-check mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id={`inContext-${c.id}`}
                  checked={c.inContext !== false}
                  onChange={(e) => updateCharacter(c.id, { inContext: e.target.checked })}
                />
                <label className="form-check-label small" htmlFor={`inContext-${c.id}`}>
                  Incluir en el contexto del co-writer
                </label>
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-primary" onClick={() => setEditing(null)}>
                  Listo
                </button>
                {c.source === 'biblia' ? (
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => revertBibleImport('character', c.id)}
                    title="Quitar la marca 'de biblia': el próximo sync ya no lo tocará"
                  >
                    <i className="bi bi-arrow-counterclockwise me-1" /> Revertir import
                  </button>
                ) : null}
                <button className="btn btn-sm btn-outline-danger" onClick={() => remove(c)}>
                  <i className="bi bi-trash" /> Eliminar
                </button>
              </div>
            </div>
          ) : (
            <div onClick={() => setEditing(c.id)}>
              <div className="d-flex align-items-center gap-2">
                <span className="name flex-grow-1">{c.name || 'Sin nombre'}</span>
                {c.inContext === false ? (
                  <span className="badge bg-secondary" title="Excluido del contexto del co-writer">
                    <i className="bi bi-eye-slash" />
                  </span>
                ) : null}
                {c.source === 'biblia' ? (
                  <span
                    className="badge bg-info-subtle text-info-emphasis"
                    title={`Importado desde la Biblia el ${new Date(c.createdAt).toLocaleDateString()}`}
                  >
                    de biblia
                  </span>
                ) : null}
              </div>
              <div className="meta">{c.type ? characterTypeLabel(c.type) : 'Sin tipo'}</div>
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
