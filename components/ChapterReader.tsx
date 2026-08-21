'use client';

import { useMemo } from 'react';
import { useApp } from '@/lib/store';

export default function ChapterReader() {
  const { currentProject, chapters, scenes, currentChapterId, setCurrentChapterId, selectScene, setView } = useApp();

  const chapter = chapters.find((c) => c.id === currentChapterId) ?? chapters[0] ?? null;

  const chapterScenes = useMemo(() => {
    if (!chapter) return [];
    return scenes
      .filter((s) => s.chapterId === chapter.id)
      .sort((a, b) => a.order - b.order);
  }, [scenes, chapter]);

  if (!currentProject) {
    return (
      <div className="empty-state">
        <div>
          <i className="bi bi-book fs-1 d-block mb-2" />
          <div className="small">Seleccioná un proyecto para leer el capítulo.</div>
        </div>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="empty-state">
        <div>
          <i className="bi bi-book fs-1 d-block mb-2" />
          <div className="small">No hay capítulo seleccionado.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="chapter-reader">
      <div className="chapter-reader-toolbar">
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => {
            setCurrentChapterId(null);
          }}
          aria-label="Volver al editor"
        >
          <i className="bi bi-arrow-left me-1" aria-hidden="true" /> Volver al editor
        </button>
        <span className="small text-muted">
          {chapter.title} · {chapterScenes.length} {chapterScenes.length === 1 ? 'escena' : 'escenas'}
        </span>
      </div>
      <h1 className="chapter-reader-title">{chapter.title}</h1>
      {chapter.content ? (
        <div
          className="chapter-reader-content"
          dangerouslySetInnerHTML={{ __html: chapter.content || '<p>(Sin contenido)</p>' }}
        />
      ) : null}
      {chapterScenes.length === 0 && !chapter.content ? (
        <div className="small text-muted">Este capítulo todavía no tiene escenas escritas.</div>
      ) : (
        chapterScenes.map((scene, index) => (
          <article key={scene.id} className="chapter-reader-scene">
            <h2 className="chapter-reader-scene-title">
              <button
                className="btn btn-link p-0 text-start"
                onClick={() => {
                  selectScene(scene.id);
                  setView('editor');
                }}
                aria-label={`Editar ${scene.title}`}
              >
                {scene.title}
              </button>
            </h2>
            {scene.summary ? <p className="chapter-reader-summary">{scene.summary}</p> : null}
            <div
              className="chapter-reader-content"
              dangerouslySetInnerHTML={{ __html: scene.content || '<p>(Sin contenido)</p>' }}
            />
            {index < chapterScenes.length - 1 ? <hr className="chapter-reader-divider" /> : null}
          </article>
        ))
      )}
    </div>
  );
}
