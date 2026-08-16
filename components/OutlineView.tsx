'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '@/lib/store';
import { moveBeatInList } from '@/lib/outline';
import { planGenerateScene } from '@/lib/sceneFromBeat';
import { generateSceneContent } from '@/lib/generateSceneContent';
import { POV_LABELS, TENSE_LABELS } from '@/lib/labels';
import type { Beat, BeatKind, BeatStatus, Chapter, Scene } from '@/types';
import type { SuggestedChapter } from '@/lib/outlineGeneration';

const KIND_LABELS: Record<BeatKind, string> = {
  inciting: 'Incitante',
  rising: 'Ascenso',
  climax: 'Clímax',
  falling: 'Caída',
  resolution: 'Resolución',
  custom: 'Personalizado',
};

const STATUS_LABELS: Record<BeatStatus, string> = {
  draft: 'Borrador',
  done: 'Hecho',
  revising: 'Revisando',
};

function BeatCard({
  beat,
  chapters,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onGenerateScene,
  onMoveToChapter,
  generating,
  chapterGenerating,
  canUp,
  canDown,
  showChapterMove,
}: {
  beat: Beat;
  chapters: Chapter[];
  onUpdate: (id: string, patch: Partial<Beat>) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onGenerateScene: (id: string) => void;
  onMoveToChapter?: (beatId: string, chapterId: string) => void;
  generating: boolean;
  chapterGenerating: boolean;
  canUp: boolean;
  canDown: boolean;
  showChapterMove?: boolean;
}) {
  const [draft, setDraft] = useState({
    title: beat.title,
    kind: beat.kind,
    status: beat.status,
    description: beat.description,
    notes: beat.notes,
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- derived state from a prop
    setDraft({
      title: beat.title,
      kind: beat.kind,
      status: beat.status,
      description: beat.description,
      notes: beat.notes,
    });
  }, [beat.id, beat.title, beat.kind, beat.status, beat.description, beat.notes]);

  const commit = () => onUpdate(beat.id, draft);
  const currentChapterId = beat.chapterId ?? '';

  return (
    <div className="outline-beat">
      <div className="outline-beat-head">
        <span className={`outline-kind outline-kind-${draft.kind}`}>{KIND_LABELS[draft.kind]}</span>
        <input
          className="form-control form-control-sm outline-beat-title"
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          onBlur={commit}
          aria-label="Título del beat"
        />
        <select
          className="form-select form-select-sm outline-beat-status"
          value={draft.status}
          onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as BeatStatus }))}
          onBlur={commit}
          aria-label="Estado del beat"
        >
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <div className="outline-beat-actions">
          <button
            className="icon-btn"
            title="Subir"
            disabled={!canUp}
            onClick={() => onMoveUp(beat.id)}
            aria-label="Subir beat"
          >
            <i className="bi bi-arrow-up" aria-hidden="true" />
          </button>
          <button
            className="icon-btn"
            title="Bajar"
            disabled={!canDown}
            onClick={() => onMoveDown(beat.id)}
            aria-label="Bajar beat"
          >
            <i className="bi bi-arrow-down" aria-hidden="true" />
          </button>
          <button
            className="icon-btn"
            title="Eliminar beat"
            onClick={() => onDelete(beat.id)}
            aria-label="Eliminar beat"
          >
            <i className="bi bi-trash" aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-outline-primary outline-generate"
          onClick={() => onGenerateScene(beat.id)}
          disabled={generating || chapterGenerating}
          aria-label={`Generar escena para "${draft.title || 'sin título'}"`}
        >
          {generating ? (
            <span className="spinner-inline me-1" aria-hidden="true" />
          ) : (
            <i className="bi bi-file-earmark-plus me-1" aria-hidden="true" />
          )}
          Generar escena
        </button>
      </div>
      <div className="outline-beat-body">
        <select
          className="form-select form-select-sm"
          value={draft.kind}
          onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value as BeatKind }))}
          onBlur={commit}
          aria-label="Tipo de beat"
        >
          {Object.entries(KIND_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <textarea
          className="form-control form-control-sm"
          rows={2}
          placeholder="Qué pasa en este beat"
          value={draft.description}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          onBlur={commit}
          aria-label="Descripción del beat"
        />
        <textarea
          className="form-control form-control-sm"
          rows={2}
          placeholder="Notas: intención, tono, elementos a cuidar"
          value={draft.notes}
          onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
          onBlur={commit}
          aria-label="Notas del beat"
        />
        {showChapterMove && onMoveToChapter ? (
          <div className="d-flex align-items-center gap-2 mt-1">
            <label htmlFor={`move-beat-${beat.id}`} className="small text-muted mb-0">
              Mover a capítulo:
            </label>
            <select
              id={`move-beat-${beat.id}`}
              className="form-select form-select-sm"
              style={{ width: 'auto' }}
              value={currentChapterId}
              onChange={(e) => onMoveToChapter(beat.id, e.target.value)}
              aria-label="Mover beat a otro capítulo"
            >
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ChapterSection({
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
  onAddSceneBeat,
  onUpdateBeat,
  onDeleteBeat,
  onMoveBeat,
  onMoveBeatToChapter,
  onGenerateScene,
  onGenerateChapter,
  onLinkOrphan,
  generatingBeatId,
  chapterGeneration,
}: {
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
  onAddBeat: (chapterId: string) => void;
  onAddSceneBeat: (chapterId: string, sceneId: string) => void;
  onUpdateBeat: (id: string, data: Partial<Beat>) => void;
  onDeleteBeat: (id: string) => void;
  onMoveBeat: (id: string, dir: -1 | 1) => void;
  onMoveBeatToChapter: (beatId: string, chapterId: string) => void;
  onGenerateScene: (id: string) => void;
  onGenerateChapter?: (chapterId: string) => void;
  onLinkOrphan: (chapterId: string, sceneId: string) => void;
  generatingBeatId: string | null;
  chapterGeneration: { running: boolean; done: number; total: number } | null;
}) {
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
        onClick={() => (sceneId ? onAddSceneBeat(chapter.id, sceneId) : onAddBeat(chapter.id))}
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

export default function OutlineView() {
  const {
    currentProject,
    chapters,
    scenes,
    beats,
    characters,
    world,
    settings,
    currentOutlineChapterId,
    setCurrentOutlineChapterId,
    createBeat,
    updateBeat,
    deleteBeat,
    moveBeatToChapter,
    suggestBeats,
    createChapter,
    updateChapter,
    deleteChapter,
    reorderChapters,
    createScene,
    updateScene,
    selectScene,
    setView,
    requestEditorFocus,
    announce,
    suggestGlobalOutline,
    applyGlobalOutline,
  } = useApp();

  const [mode, setMode] = useState<'chapter' | 'global'>('chapter');
  const [suggesting, setSuggesting] = useState(false);
  const [suggested, setSuggested] = useState<Beat[] | null>(null);
  const [globalSuggested, setGlobalSuggested] = useState<SuggestedChapter[] | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [generatingBeatId, setGeneratingBeatId] = useState<string | null>(null);
  const [chapterGeneration, setChapterGeneration] = useState<{
    running: boolean;
    done: number;
    total: number;
  } | null>(null);
  const chapterAbortRef = useRef<AbortController | null>(null);

  // Slice 10: outline filters (POV and tense).
  const [filterPov, setFilterPov] = useState<string>('all');
  const [filterTense, setFilterTense] = useState<string>('all');

  const chapter = chapters.find((c) => c.id === currentOutlineChapterId) ?? chapters[0] ?? null;

  useEffect(() => {
    setSuggested(null);
    setGlobalSuggested(null);
    setSuggestError(null);
  }, [currentOutlineChapterId, mode]);

  const sortedChapters = useMemo(
    () => [...chapters].sort((a, b) => a.order - b.order),
    [chapters],
  );

  const hasProjectFilters = Boolean(currentProject?.pov) || Boolean(currentProject?.tense);
  const filterActive = filterPov !== 'all' || filterTense !== 'all';

  const chapterVisible = (c: Chapter) => {
    if (!filterActive) return true;
    const povMatch = filterPov === 'all' || currentProject?.pov === filterPov;
    const tenseMatch = filterTense === 'all' || currentProject?.tense === filterTense;
    return povMatch && tenseMatch;
  };

  const addBeat = async (chapterId: string, sceneId?: string) => {
    if (!currentProject) return;
    const siblings = beats.filter((b) =>
      sceneId ? b.sceneId === sceneId : b.chapterId === chapterId && !b.sceneId,
    );
    const beat = await createBeat({
      projectId: currentProject.id,
      chapterId,
      sceneId,
      kind: 'custom',
      title: 'Nuevo beat',
      description: '',
      notes: '',
      characters: [],
      status: 'draft',
      source: 'manual',
      position: siblings.length,
    });
    announce(`Beat "${beat.title}" agregado al ${sceneId ? 'escena' : 'capítulo'}.`);
  };

  const addChapter = async () => {
    if (!currentProject) return;
    const c = await createChapter({
      projectId: currentProject.id,
      title: `Capítulo ${chapters.length + 1}`,
      order: chapters.length,
    });
    setCurrentOutlineChapterId(c.id);
    announce(`Capítulo "${c.title}" creado.`);
  };

  const moveBeat = async (id: string, dir: -1 | 1) => {
    const beat = beats.find((b) => b.id === id);
    if (!beat) return;
    const group = beats.filter((b) =>
      beat.sceneId ? b.sceneId === beat.sceneId : b.chapterId === beat.chapterId && !b.sceneId,
    );
    const swaps = moveBeatInList(group, id, dir);
    if (!swaps) return;
    for (const s of swaps) {
      await updateBeat(s.id, { position: s.position });
    }
  };

  const handleMoveBeatToChapter = async (beatId: string, targetChapterId: string) => {
    await moveBeatToChapter(beatId, targetChapterId);
    announce('Beat movido de capítulo.');
  };

  const suggestGlobal = async () => {
    if (!currentProject) return;
    setSuggesting(true);
    setGlobalSuggested(null);
    setSuggestError(null);
    try {
      setGlobalSuggested(await suggestGlobalOutline());
    } catch (e) {
      setSuggestError(e instanceof Error ? e.message : 'No se pudo generar la estructura');
      setGlobalSuggested([]);
    } finally {
      setSuggesting(false);
    }
  };

  const acceptGlobalSuggested = async () => {
    if (!globalSuggested) return;
    await applyGlobalOutline(globalSuggested);
    setGlobalSuggested(null);
    announce('Estructura global aplicada.');
  };

  const suggest = async () => {
    if (!chapter) return;
    setSuggesting(true);
    setSuggested(null);
    setSuggestError(null);
    try {
      setSuggested(await suggestBeats(chapter.id));
    } catch (e) {
      setSuggestError(e instanceof Error ? e.message : 'No se pudieron generar beats');
      setSuggested([]);
    } finally {
      setSuggesting(false);
    }
  };

  const acceptSuggested = async () => {
    if (!suggested || !chapter) return;
    const existingTitles = new Set(
      beats
        .filter((b) => b.chapterId === chapter.id && !b.sceneId)
        .map((b) => b.title.trim().toLowerCase()),
    );
    for (const b of suggested) {
      const key = b.title.trim().toLowerCase();
      if (!key || existingTitles.has(key)) continue;
      await createBeat(b);
      existingTitles.add(key);
    }
    setSuggested(null);
  };

  const runGenerateScene = async (beatId: string, nextOrder?: number): Promise<Scene | null> => {
    const beat = beats.find((b) => b.id === beatId);
    if (!beat || !currentProject) return null;
    try {
      const plan = planGenerateScene({
        beat,
        projectId: currentProject.id,
        chapters,
        scenes,
        nextOrder,
      });

      if (plan.existingSceneId) {
        return scenes.find((s) => s.id === plan.existingSceneId) ?? null;
      }

      let chapterId = plan.scene.chapterId;
      if (plan.createChapter) {
        const created = await createChapter(plan.createChapter);
        chapterId = created.id;
      }
      const scene = await createScene({
        ...plan.scene,
        chapterId: chapterId!,
      });
      if (beat.sceneId !== scene.id) {
        await updateBeat(beat.id, { sceneId: scene.id, chapterId: chapterId! });
      }
      return scene;
    } catch (e) {
      announce(e instanceof Error ? e.message : 'No se pudo generar la escena.');
      return null;
    }
  };

  const generateScene = async (beatId: string) => {
    if (generatingBeatId || chapterGeneration?.running) return;
    setGeneratingBeatId(beatId);
    try {
      const scene = await runGenerateScene(beatId);
      if (!scene) return;
      selectScene(scene.id);
      setView('editor');
      requestEditorFocus();
      announce(`Escena "${scene.title.trim() || 'Escena nueva'}" ${scene.content ? 'abierta' : 'generada'}.`);
    } catch (e) {
      announce(e instanceof Error ? e.message : 'No se pudo generar la escena.');
    } finally {
      setGeneratingBeatId(null);
    }
  };

  const cancelChapterGeneration = () => {
    chapterAbortRef.current?.abort();
  };

  const generateChapter = async (chapterId: string) => {
    if (!currentProject || generatingBeatId || chapterGeneration?.running) return;
    const targetChapter = chapters.find((c) => c.id === chapterId);
    if (!targetChapter) return;
    const targetBeats = beats
      .filter((b) => b.chapterId === targetChapter.id && !b.sceneId)
      .sort((a, b) => a.position - b.position);
    if (targetBeats.length === 0) {
      announce('Todas las escenas del capítulo ya están generadas.');
      return;
    }
    const baseSceneOrder = scenes.filter((s) => s.chapterId === targetChapter.id).length;
    chapterAbortRef.current = new AbortController();
    setChapterGeneration({ running: true, done: 0, total: targetBeats.length });
    let completed = 0;
    let failed = 0;
    const generatedScenes: Scene[] = [];
    try {
      for (let i = 0; i < targetBeats.length; i++) {
        const beat = targetBeats[i];
        setChapterGeneration((prev) => (prev ? { ...prev, done: completed } : prev));
        const scene = await runGenerateScene(beat.id, baseSceneOrder + i);
        if (!scene) {
          failed++;
          continue;
        }
        const previousScene = [...scenes, ...generatedScenes]
          .filter((s) => s.chapterId === targetChapter.id && s.order < scene.order)
          .sort((a, b) => b.order - a.order)[0];
        try {
          const content = await generateSceneContent({
            project: currentProject,
            scene,
            beat,
            chapter: targetChapter,
            previousScene,
            characters,
            world,
            settings,
            signal: chapterAbortRef.current.signal,
          });
          await updateScene(scene.id, { content });
          generatedScenes.push({ ...scene, content });
          completed++;
        } catch (genErr) {
          if ((genErr as Error).name === 'AbortError') {
            announce('Generación del capítulo cancelada.');
            return;
          }
          failed++;
          announce(genErr instanceof Error ? genErr.message : 'No se pudo generar una escena.');
        }
      }
      if (failed === 0) {
        announce(`Capítulo generado: ${completed} ${completed === 1 ? 'escena escrita' : 'escenas escritas'}.`);
      } else {
        announce(`Capítulo generado parcialmente: ${completed} escenas escritas, ${failed} fallos.`);
      }
    } catch (e) {
      announce(e instanceof Error ? e.message : 'No se pudo generar el capítulo.');
    } finally {
      chapterAbortRef.current = null;
      setChapterGeneration(null);
    }
  };

  if (!currentProject) {
    return (
      <div className="empty-state">
        <div>
          <i className="bi bi-list-nested fs-1 d-block mb-2" />
          <div className="small">Seleccioná un proyecto para armar el outline.</div>
        </div>
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <div className="empty-state">
        <div>
          <i className="bi bi-list-nested fs-1 d-block mb-2" />
          <div className="small">Creá un capítulo para armar el outline.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="outline-view">
      <h1 className="view-title">Outline</h1>
      <div className="outline-toolbar">
        {mode === 'chapter' ? (
          <select
            className="form-select form-select-sm"
            value={chapter?.id ?? ''}
            onChange={(e) => setCurrentOutlineChapterId(e.target.value)}
            aria-label="Capítulo activo"
          >
            {sortedChapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        ) : null}

        <div className="btn-group" role="group" aria-label="Vista del outline">
          <button
            className={`btn btn-sm ${mode === 'chapter' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setMode('chapter')}
            aria-pressed={mode === 'chapter'}
          >
            Capítulo
          </button>
          <button
            className={`btn btn-sm ${mode === 'global' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setMode('global')}
            aria-pressed={mode === 'global'}
          >
            Global
          </button>
        </div>

        {mode === 'chapter' ? (
          <>
            <button className="btn btn-sm btn-ai" onClick={suggest} disabled={suggesting}>
              <i className="bi bi-magic me-1" aria-hidden="true" />
              {suggesting ? 'Sugiriendo…' : 'Sugerir outline'}
            </button>
            {chapterGeneration?.running ? (
              <button
                className="btn btn-sm btn-outline-danger"
                onClick={cancelChapterGeneration}
                aria-label="Cancelar generación del capítulo"
              >
                <span className="spinner-inline me-1" aria-hidden="true" />
                {chapterGeneration.done}/{chapterGeneration.total} · Cancelar
              </button>
            ) : (
              <button
                className="btn btn-sm btn-primary"
                onClick={() => chapter && generateChapter(chapter.id)}
                aria-label="Generar todas las escenas del capítulo"
              >
                <i className="bi bi-magic me-1" aria-hidden="true" />
                Generar capítulo
              </button>
            )}
          </>
        ) : (
          <>
            <button className="btn btn-sm btn-outline-primary" onClick={addChapter}>
              <i className="bi bi-plus-lg me-1" aria-hidden="true" /> Nuevo capítulo
            </button>
            <button className="btn btn-sm btn-ai" onClick={suggestGlobal} disabled={suggesting}>
              <i className="bi bi-magic me-1" aria-hidden="true" />
              {suggesting ? 'Sugiriendo…' : 'Sugerir estructura'}
            </button>
          </>
        )}
      </div>

      {hasProjectFilters ? (
        <div className="outline-filters d-flex gap-1 align-items-center mb-2">
          <span className="small text-muted">Filtrar:</span>
          <select
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
            value={filterPov}
            onChange={(e) => setFilterPov(e.target.value)}
            aria-label="Filtrar por punto de vista"
          >
            <option value="all">Todo POV</option>
            {Object.entries(POV_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
            value={filterTense}
            onChange={(e) => setFilterTense(e.target.value)}
            aria-label="Filtrar por tiempo verbal"
          >
            <option value="all">Todo tiempo</option>
            {Object.entries(TENSE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {suggested ? (
        <div className="outline-suggested">
          <div className="outline-suggested-title">
            <i className="bi bi-magic me-1" aria-hidden="true" /> Outline sugerido por el co-writer
          </div>
          {suggestError ? (
            <div className="alert alert-danger py-1 small mb-2">
              <i className="bi bi-exclamation-triangle me-1" aria-hidden="true" />
              {suggestError}
            </div>
          ) : suggested.length === 0 ? (
            <div className="small text-muted">No se pudieron generar beats. Probá de nuevo.</div>
          ) : (
            <ul className="outline-suggested-list">
              {suggested.map((b, i) => (
                <li key={i}>
                  <span className={`outline-kind outline-kind-${b.kind}`}>{KIND_LABELS[b.kind]}</span>
                  <strong>{b.title}</strong>
                  {b.description ? <span className="text-muted"> — {b.description}</span> : null}
                </li>
              ))}
            </ul>
          )}
          <div className="d-flex gap-2 mt-2">
            <button
              className="btn btn-sm btn-primary"
              onClick={acceptSuggested}
              disabled={suggested.length === 0}
            >
              <i className="bi bi-check-lg me-1" aria-hidden="true" /> Agregar
            </button>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => setSuggested(null)}>
              Descartar
            </button>
          </div>
        </div>
      ) : null}

      {globalSuggested ? (
        <div className="outline-suggested">
          <div className="outline-suggested-title">
            <i className="bi bi-magic me-1" aria-hidden="true" /> Estructura global sugerida
          </div>
          {suggestError ? (
            <div className="alert alert-danger py-1 small mb-2">
              <i className="bi bi-exclamation-triangle me-1" aria-hidden="true" />
              {suggestError}
            </div>
          ) : globalSuggested.length === 0 ? (
            <div className="small text-muted">No se pudo generar una estructura. Probá de nuevo.</div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {globalSuggested.map((c, ci) => (
                <div key={ci}>
                  <strong className="d-block mb-1">{c.title}</strong>
                  <ul className="outline-suggested-list">
                    {c.beats.map((b, bi) => (
                      <li key={bi}>
                        <span className={`outline-kind outline-kind-${b.kind}`}>{KIND_LABELS[b.kind]}</span>
                        <strong>{b.title}</strong>
                        {b.description ? <span className="text-muted"> — {b.description}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          <div className="d-flex gap-2 mt-2">
            <button
              className="btn btn-sm btn-primary"
              onClick={acceptGlobalSuggested}
              disabled={globalSuggested.length === 0}
            >
              <i className="bi bi-check-lg me-1" aria-hidden="true" /> Aplicar
            </button>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => setGlobalSuggested(null)}>
              Descartar
            </button>
          </div>
        </div>
      ) : null}

      {mode === 'chapter' ? (
        chapterVisible(chapter!) ? (
          <ChapterSection
            key={chapter!.id}
            chapter={chapter!}
            chapters={chapters}
            beats={beats}
            scenes={scenes}
            isGlobal={false}
            canMoveUp={false}
            canMoveDown={false}
            onUpdateChapter={updateChapter}
            onMoveChapter={() => {}}
            onDeleteChapter={deleteChapter}
            onAddBeat={addBeat}
            onAddSceneBeat={addBeat}
            onUpdateBeat={updateBeat}
            onDeleteBeat={deleteBeat}
            onMoveBeat={moveBeat}
            onMoveBeatToChapter={handleMoveBeatToChapter}
            onGenerateScene={generateScene}
            onGenerateChapter={generateChapter}
            onLinkOrphan={addBeat}
            generatingBeatId={generatingBeatId}
            chapterGeneration={chapterGeneration}
          />
        ) : (
          <div className="small text-muted mb-2">
            <i className="bi bi-funnel me-1" aria-hidden="true" />
            Este capítulo no coincide con el filtro (POV/tiempo del proyecto).
          </div>
        )
      ) : (
        <div className="d-flex flex-column gap-4">
          {sortedChapters.map((c, i) => (
            <ChapterSection
              key={c.id}
              chapter={c}
              chapters={chapters}
              beats={beats}
              scenes={scenes}
              isGlobal
              canMoveUp={i > 0}
              canMoveDown={i < sortedChapters.length - 1}
              onUpdateChapter={updateChapter}
              onMoveChapter={reorderChapters}
              onDeleteChapter={deleteChapter}
              onAddBeat={addBeat}
              onAddSceneBeat={addBeat}
              onUpdateBeat={updateBeat}
              onDeleteBeat={deleteBeat}
              onMoveBeat={moveBeat}
              onMoveBeatToChapter={handleMoveBeatToChapter}
              onGenerateScene={generateScene}
              onGenerateChapter={generateChapter}
              onLinkOrphan={addBeat}
              generatingBeatId={generatingBeatId}
              chapterGeneration={chapterGeneration}
            />
          ))}
        </div>
      )}
    </div>
  );
}
