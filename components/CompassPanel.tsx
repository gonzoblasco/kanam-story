'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/store';
import { POV_LABELS, TENSE_LABELS } from '@/lib/labels';
import type { Project } from '@/types';

export default function CompassPanel() {
  const { currentProject, characters, updateProject } = useApp();
  const [draft, setDraft] = useState({
    premise: currentProject?.premise ?? '',
    promise: currentProject?.promise ?? '',
    theme: currentProject?.theme ?? '',
    protagonist: currentProject?.protagonist ?? '',
    pov: currentProject?.pov ?? 'third-limited',
    tense: currentProject?.tense ?? 'past',
  });

  // Reset the local draft when switching projects.
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- sync local draft to the selected project */
  useEffect(() => {
    if (!currentProject) return;
    setDraft({
      premise: currentProject.premise ?? '',
      promise: currentProject.promise ?? '',
      theme: currentProject.theme ?? '',
      protagonist: currentProject.protagonist ?? '',
      pov: currentProject.pov,
      tense: currentProject.tense ?? 'past',
    });
  }, [currentProject?.id]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  if (!currentProject) {
    return <div className="text-muted small">No hay proyecto seleccionado.</div>;
  }

  const commit = (patch: Partial<typeof draft>) => {
    updateProject(currentProject.id, patch);
  };

  return (
    <div className="sidebar-section">
      <div className="sidebar-section-title">Brújula Narrativa</div>
      <div className="small text-muted mb-2">
        Orientación: qué prometiste contar. El co-writer la respeta al debatir.
      </div>
      <div className="d-flex flex-column gap-2">
        <div>
          <label className="form-label small">Premisa</label>
          <textarea
            className="form-control form-control-sm"
            rows={2}
            placeholder="La idea en 1-2 frases"
            value={draft.premise}
            onChange={(e) => setDraft((d) => ({ ...d, premise: e.target.value }))}
            onBlur={() => commit({ premise: draft.premise })}
          />
        </div>
        <div>
          <label className="form-label small">Promesa al lector</label>
          <textarea
            className="form-control form-control-sm"
            rows={2}
            placeholder="Qué le prometés al lector"
            value={draft.promise}
            onChange={(e) => setDraft((d) => ({ ...d, promise: e.target.value }))}
            onBlur={() => commit({ promise: draft.promise })}
          />
        </div>
        <div>
          <label className="form-label small">Tema</label>
          <input
            className="form-control form-control-sm"
            value={draft.theme}
            onChange={(e) => setDraft((d) => ({ ...d, theme: e.target.value }))}
            onBlur={() => commit({ theme: draft.theme })}
          />
        </div>
        <div>
          <label className="form-label small">Protagonista</label>
          <select
            className="form-select form-select-sm"
            value={draft.protagonist}
            onChange={(e) => {
              const v = e.target.value;
              setDraft((d) => ({ ...d, protagonist: v }));
              commit({ protagonist: v });
            }}
          >
            <option value="">—</option>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label small">Punto de vista</label>
          <select
            className="form-select form-select-sm"
            value={draft.pov}
            onChange={(e) => {
              const v = e.target.value as Project['pov'];
              setDraft((d) => ({ ...d, pov: v }));
              commit({ pov: v });
            }}
          >
            {Object.entries(POV_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label small">Tiempo verbal</label>
          <select
            className="form-select form-select-sm"
            value={draft.tense}
            onChange={(e) => {
              const v = e.target.value as NonNullable<Project['tense']>;
              setDraft((d) => ({ ...d, tense: v }));
              commit({ tense: v });
            }}
          >
            {Object.entries(TENSE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
