'use client';

import { useMemo } from 'react';
import BeatCard from '@/components/BeatCard';
import type { Beat, Chapter, Scene } from '@/types';

interface ChapterSectionProps {
  chapter: Chapter;
  chapters: Chapter[];
  beats: Beat[];
  scenes: Scene[];
  isGlobal: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onUpdateChapter: (id: string, data: Partial<Chapter>) => void;
  onMoveChapter: (id: string, dir: -1 | 1) => void;
  onDeleteChapter: (id: string) => void;
  onAddBeat: (chapterId: string, sceneId?: string) => void;
  onUpdateBeat: (id: string, data: Partial<Beat>) => void;
  onDeleteBeat: (id: string) => void;
  onMoveBeat: (id: string, dir: -1 | 1) => void;
  onMoveBeatToChapter: (beatId: string, chapterId: string) => void;
  onGenerateScene: (id: string) => void;
  onGenerateChapter?: (chapterId: string) => void;
  onLinkOrphan: (chapterId: string, sceneId: string) => void;
  generatingBeatId: string | null;
  chapterGeneration: { running: boolean; done: number; total: number } | null;
}

export default function ChapterSection({
  chapter,
  chapters,
  beats,
  scenes,
  isGlobal,
  canMoveUp,
  canMoveDown,
  onUpdateChapter,
  onMoveChapter,
  onDeleteChapter,
  onAddBeat,
  onUpdateBeat,
  onDeleteBeat,
  onMoveBeat,
  onMoveBeatToChapter,
  onGenerateScene,
  onGenerateChapter,
  onLinkOrphan,
  generatingBeatId,
  chapterGeneration,
}: ChapterSectionProps) {
  const chapterScenes = useMemo(
    () => scenes.filter((s) => s.chapterId === chapter.id).sort((a, b) => a.order - b.order),
    [scenes, chapter.id],
  );

  const chapterBeats = useMemo(
    () =>
      beats
        .filter((b) => b.chapterId === chapter.id && !b.sceneId)
        .sort((a, b) => a.position - b.position),
    [beats, chapter.id],
  );

  const sceneBeats = useMemo(() => {
    const map: Record<string, Beat[]> = {};
    for (const s of chapterScenes) {
      map[s.id] = beats.filter((b) => b.sceneId === s.id).sort((a, b) => a.position - b.position);
    }
    return map;
  }, [beats, chapterScenes]);

  const orphanScenes = useMemo(
    () => chapterScenes.filter((s) => (sceneBeats[s.id] ?? []).length === 0),
    [chapterScenes, sceneBeats],
  );

  const isGeneratingChapter = chapterGeneration?.running && onGenerateChapter !== undefined;

  const renderBeatList = (list: Beat[], sceneId?: string) => (
    <div className="outline-beat-list">
      {list.map((b, i) => (
        <BeatCard
          key={b.id}
          beat={b}
          chapters={chapters}
          onUpdate={onUpdateBeat}
          onDelete={onDeleteBeat}
          onMoveUp={(id) => onMoveBeat(id, -1)}
          onMoveDown={(id) => onMoveBeat(id, 1)}
          onGenerateScene={onGenerateScene}
          onMoveToChapter={isGlobal ? onMoveBeatToChapter : undefined}
          generating={generatingBeatId === b.id}
          chapterGenerating={chapterGeneration?.running ?? false}
          canUp={i > 0}
          canDown={i < list.length - 1}
          showChapterMove={isGlobal}
        />
      ))}
      <button
        className="btn btn-sm btn-outline-primary"
        onClick={() => (sceneId ? onAddBeat(chapter.id, sceneId) : onAddBeat(chapter.id))}
        aria-label={`Agregar beat a ${sceneId ? 'escena' : 'capítulo'}`}
      >
        <i className="bi bi-plus-lg me-1" aria-hidden="true" /> Beat
      </button>
    </div>
  );

  return (
    <section className="outline-chapter" aria-labelledby={`chapter-title-${chapter.id}`}>
      <div className="d-flex align-items-center gap-2 flex-wrap">
        {isGlobal ? (
          <input
            className="form-control form-control-sm flex-grow-1"
            style={{ maxWidth: '420px' }}
            value={chapter.title}
            onChange={(e) => onUpdateChapter(chapter.id, { title: e.target.value })}
            aria-label={`Título de ${chapter.title}`}
          />
        ) : (
          <h2 id={`chapter-title-${chapter.id}`} className="outline-chapter-title">
            <i className="bi bi-bookmark me-1" aria-hidden="true" /> {chapter.title}
          </h2>
        )}
        {isGlobal ? (
          <>
            <button
              className="icon-btn"
              title="Subir capítulo"
              disabled={!canMoveUp}
              onClick={() => onMoveChapter(chapter.id, -1)}
              aria-label="Subir capítulo"
            >
              <i className="bi bi-arrow-up" aria-hidden="true" />
            </button>
            <button
              className="icon-btn"
              title="Bajar capítulo"
              disabled={!canMoveDown}
              onClick={() => onMoveChapter(chapter.id, 1)}
              aria-label="Bajar capítulo"
            >
              <i className="bi bi-arrow-down" aria-hidden="true" />
            </button>
            <button
              className="icon-btn"
              title="Eliminar capítulo"
              onClick={() => onDeleteChapter(chapter.id)}
              aria-label="Eliminar capítulo"
            >
              <i className="bi bi-trash" aria-hidden="true" />
            </button>
            {onGenerateChapter ? (
              isGeneratingChapter ? (
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => {}}
                  disabled
                  aria-label="Cancelar generación del capítulo"
                >
                  <span className="spinner-inline me-1" aria-hidden="true" />
                  {chapterGeneration!.done}/{chapterGeneration!.total} · Cancelar
                </button>
              ) : (
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => onGenerateChapter(chapter.id)}
                  aria-label="Generar todas las escenas del capítulo"
                >
                  <i className="bi bi-magic me-1" aria-hidden="true" />
                  Generar capítulo
                </button>
              )
            ) : null}
          </>
        ) : null}
      </div>

      {renderBeatList(chapterBeats)}

      {chapterScenes.map((s) => (
        <div key={s.id} className="outline-scene">
          <h3 className="outline-scene-title">
            <i className="bi bi-file-text me-1" aria-hidden="true" /> {s.title}
          </h3>
          {renderBeatList(sceneBeats[s.id] ?? [], s.id)}
        </div>
      ))}

      {orphanScenes.length > 0 ? (
        <div className="outline-orphans mt-3">
          <div className="small text-muted mb-1">
            <i className="bi bi-link me-1" aria-hidden="true" />
            Escenas sin vincular al outline ({orphanScenes.length}):
          </div>
          {orphanScenes.map((s) => (
            <div key={s.id} className="d-flex align-items-center gap-1 mb-1">
              <span className="small flex-grow-1">{s.title}</span>
              <button
                className="btn btn-sm btn-outline-secondary"
                title="Crear un beat para esta escena"
                onClick={() => onLinkOrphan(chapter.id, s.id)}
                aria-label={`Vincular escena "${s.title}" al outline`}
              >
                <i className="bi bi-plus-lg me-1" aria-hidden="true" /> Vincular
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
