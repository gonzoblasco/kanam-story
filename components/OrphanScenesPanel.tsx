'use client';

import { useState } from 'react';
import type { Chapter, Scene } from '@/types';

interface OrphanScenesPanelProps {
  scenes: Scene[];
  chapters: Chapter[];
  onMoveScene: (sceneId: string, chapterId: string) => void;
  onMoveAndLink: (sceneId: string, chapterId: string) => void;
  onDeleteScene: (sceneId: string) => void;
  onViewScene: (sceneId: string) => void;
}

export default function OrphanScenesPanel({
  scenes,
  chapters,
  onMoveScene,
  onMoveAndLink,
  onDeleteScene,
  onViewScene,
}: OrphanScenesPanelProps) {
  const [selectedChapterByScene, setSelectedChapterByScene] = useState<Record<string, string>>({});

  if (scenes.length === 0) return null;

  const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);

  const selectedChapter = (sceneId: string) => selectedChapterByScene[sceneId] ?? (sortedChapters[0]?.id ?? '');

  const setSelected = (sceneId: string, chapterId: string) => {
    setSelectedChapterByScene((prev) => ({ ...prev, [sceneId]: chapterId }));
  };

  return (
    <section className="outline-chapter" aria-label="Escenas sin capítulo">
      <h2 className="outline-chapter-title">
        <i className="bi bi-question-circle me-1" aria-hidden="true" /> Escenas sin capítulo ({scenes.length})
      </h2>
      <p className="small text-muted mb-2">
        Estas escenas no pertenecen a ningún capítulo. Podés moverlas a un capítulo, vincularlas a un beat o eliminarlas.
      </p>
      {scenes.map((s) => (
        <div key={s.id} className="outline-orphan-scene">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className="small flex-grow-1">{s.title}</span>
            <select
              className="form-select form-select-sm"
              style={{ width: 'auto', minWidth: '140px', maxWidth: '260px' }}
              value={selectedChapter(s.id)}
              onChange={(e) => setSelected(s.id, e.target.value)}
              aria-label={`Capítulo destino para ${s.title}`}
            >
              {sortedChapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={() => onMoveScene(s.id, selectedChapter(s.id))}
              aria-label={`Mover escena "${s.title}" al capítulo seleccionado`}
              disabled={!selectedChapter(s.id)}
            >
              Mover
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => onMoveAndLink(s.id, selectedChapter(s.id))}
              aria-label={`Mover y crear beat para "${s.title}"`}
              disabled={!selectedChapter(s.id)}
            >
              Vincular
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={() => onViewScene(s.id)}
              aria-label={`Ver escena "${s.title}" en el editor`}
            >
              Ver
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => onDeleteScene(s.id)}
              aria-label={`Eliminar escena "${s.title}"`}
            >
              Eliminar
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
