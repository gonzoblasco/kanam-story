'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/store';
import { STYLE_PRESETS } from '@/lib/labels';
import type { Project, ProjectStyle, StyleProfile } from '@/types';

/**
 * Editable Story Bible settings (Slice 6): Braindump, Genre tags, Style and
 * editable Synopsis. These feed the agent context so the co-writer stays
 * coherent with the author's intent.
 */
export default function StoryBibleSettingsPanel() {
  const { currentProject, updateProject, analyzeStyle } = useApp();

  const [braindump, setBraindump] = useState(currentProject?.braindump ?? '');
  const [synopsis, setSynopsis] = useState(currentProject?.synopsis ?? '');
  const [genreInput, setGenreInput] = useState('');
  const [styleMode, setStyleMode] = useState<ProjectStyle['mode']>('custom');
  const [styleFeatured, setStyleFeatured] = useState('');
  const [styleCustom, setStyleCustom] = useState('');
  // Match My Style (Slice 9)
  const [styleSample, setStyleSample] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null);
  const [styleError, setStyleError] = useState<string | null>(null);

  // Reset local draft when switching projects.
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- sync local draft to the selected project */
  useEffect(() => {
    if (!currentProject) return;
    setBraindump(currentProject.braindump ?? '');
    setSynopsis(currentProject.synopsis ?? '');
    setGenreInput('');
    setStyleMode(currentProject.style?.mode ?? 'custom');
    setStyleFeatured(currentProject.style?.featured ?? '');
    setStyleCustom(currentProject.style?.custom ?? '');
    setStyleSample('');
    setStyleProfile(currentProject.style?.profile ?? null);
    setStyleError(null);
  }, [currentProject?.id]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  if (!currentProject) {
    return <div className="text-muted small">No hay proyecto seleccionado.</div>;
  }

  const genres = currentProject.genres ?? [];

  const commit = (patch: Partial<Project>) => {
    updateProject(currentProject.id, patch);
  };

  const commitStyle = (patch: Partial<ProjectStyle>) => {
    commit({ style: { mode: styleMode, featured: styleFeatured, custom: styleCustom, ...patch } });
  };

  function addGenre() {
    const g = genreInput.trim();
    if (!g) return;
    if (genres.includes(g)) {
      setGenreInput('');
      return;
    }
    commit({ genres: [...genres, g] });
    setGenreInput('');
  }

  function removeGenre(g: string) {
    commit({ genres: genres.filter((x) => x !== g) });
  }

  async function analyze() {
    if (!styleSample.trim()) return;
    setAnalyzing(true);
    setStyleError(null);
    try {
      const profile = await analyzeStyle(styleSample);
      setStyleProfile(profile);
      if (!profile) setStyleError('No se pudo extraer el perfil. Probá con un extracto más largo.');
    } catch (e) {
      setStyleError(e instanceof Error ? e.message : 'Falló el análisis');
    } finally {
      setAnalyzing(false);
    }
  }

  function saveProfile() {
    if (!styleProfile) return;
    commitStyle({ mode: 'match', profile: styleProfile });
  }

  return (
    <div>
      <div className="stack-panel-hint">
        La base de coherencia: qué contás, cómo lo contás y qué ideas tenés en el tintero. El co-writer
        la respeta al escribir y debatir.
      </div>

      <div className="d-flex flex-column gap-3">
        {/* Braindump */}
        <div>
          <label className="form-label small">Braindump</label>
          <textarea
            className="form-control form-control-sm"
            rows={4}
            placeholder="Volcá ideas sueltas, escenas sueltas, finales alternativos… (contexto de bajo peso para el co-writer)"
            value={braindump}
            onChange={(e) => setBraindump(e.target.value)}
            onBlur={() => commit({ braindump })}
          />
        </div>

        {/* Genre tags */}
        <div>
          <label className="form-label small">Géneros</label>
          <div className="d-flex flex-wrap gap-1 mb-1">
            {genres.length === 0 ? (
              <span className="text-muted small">Sin géneros.</span>
            ) : (
              genres.map((g) => (
                <span key={g} className="badge bg-secondary d-inline-flex align-items-center gap-1">
                  {g}
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    style={{ fontSize: '0.5rem' }}
                    aria-label={`Quitar género ${g}`}
                    onClick={() => removeGenre(g)}
                  />
                </span>
              ))
            )}
          </div>
          <div className="input-group input-group-sm">
            <input
              className="form-control"
              placeholder="Agregar género…"
              value={genreInput}
              onChange={(e) => setGenreInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addGenre();
                }
              }}
            />
            <button className="btn btn-outline-secondary" type="button" onClick={addGenre}>
              <i className="bi bi-plus" />
            </button>
          </div>
        </div>

        {/* Style */}
        <div>
          <label className="form-label small">Estilo narrativo</label>
          <select
            className="form-select form-select-sm mb-1"
            value={styleMode}
            onChange={(e) => {
              const mode = e.target.value as ProjectStyle['mode'];
              setStyleMode(mode);
              commitStyle({ mode });
            }}
          >
            <option value="featured">Preset</option>
            <option value="custom">Personalizado</option>
            <option value="match">Match My Style</option>
          </select>
          {styleMode === 'featured' ? (
            <select
              className="form-select form-select-sm"
              value={styleFeatured}
              onChange={(e) => {
                setStyleFeatured(e.target.value);
                commitStyle({ featured: e.target.value });
              }}
            >
              <option value="">Elegí un preset…</option>
              {STYLE_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          ) : null}
          {styleMode === 'custom' ? (
            <textarea
              className="form-control form-control-sm"
              rows={2}
              placeholder="Instrucciones de estilo libres (prosa escueta, frases cortas, metáforas…)"
              value={styleCustom}
              onChange={(e) => setStyleCustom(e.target.value)}
              onBlur={() => commitStyle({ custom: styleCustom })}
            />
          ) : null}
          {styleMode === 'match' ? (
            <div>
              <div className="small text-muted mb-1">
                Pegá un extracto de tu escritura para que el co-writer aprenda tu estilo.
              </div>
              <textarea
                className="form-control form-control-sm mb-1"
                rows={4}
                placeholder="Pegá un pasaje tuyo (un párrafo o más)…"
                value={styleSample}
                onChange={(e) => setStyleSample(e.target.value)}
              />
              <button className="btn btn-sm btn-primary" onClick={analyze} disabled={analyzing || !styleSample.trim()}>
                {analyzing ? 'Analizando…' : 'Analizar estilo'}
              </button>
              {styleError ? <div className="small text-danger mt-1">{styleError}</div> : null}
              {styleProfile ? (
                <div className="mt-2">
                  <div className="small fw-semibold mb-1">Perfil detectado</div>
                  <ul className="small mb-1 ps-3">
                    <li><strong>Tono:</strong> {styleProfile.tone || '—'}</li>
                    <li><strong>Ritmo:</strong> {styleProfile.rhythm || '—'}</li>
                    <li><strong>Frases:</strong> {styleProfile.sentenceLength || '—'}</li>
                    <li><strong>Vocabulario:</strong> {styleProfile.vocabulary || '—'}</li>
                    <li><strong>Diálogo:</strong> {styleProfile.dialogue || '—'}</li>
                    <li><strong>Imágenes:</strong> {styleProfile.imagery || '—'}</li>
                    <li><strong>Subtexto:</strong> {styleProfile.subtext || '—'}</li>
                  </ul>
                  <button className="btn btn-sm btn-primary" onClick={saveProfile}>
                    <i className="bi bi-check-lg me-1" /> Guardar perfil
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Synopsis */}
        <div>
          <label className="form-label small">Sinopsis</label>
          <textarea
            className="form-control form-control-sm"
            rows={3}
            placeholder="Override manual de la sinopsis (si está vacía, se usa la descripción del proyecto)"
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            onBlur={() => commit({ synopsis })}
          />
        </div>
      </div>
    </div>
  );
}
