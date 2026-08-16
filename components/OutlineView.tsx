'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '@/lib/store';
import { moveBeatInList } from '@/lib/outline';
import { planGenerateScene } from '@/lib/sceneFromBeat';
import { generateSceneContent } from '@/lib/generateSceneContent';
import { POV_LABELS, TENSE_LABELS } from '@/lib/labels';
import type { Beat, BeatKind, BeatStatus, Scene } from '@/types';

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
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onGenerateScene,
  generating,
  chapterGenerating,
  canUp,
  canDown,
}: {
  beat: Beat;
  onUpdate: (id: string, patch: Partial<Beat>) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onGenerateScene: (id: string) => void;
  generating: boolean;
  chapterGenerating: boolean;
  canUp: boolean;
  canDown: boolean;
}) {
  const [draft, setDraft] = useState({
    title: beat.title,
    kind: beat.kind,
    status: beat.status,
    description: beat.description,
    notes: beat.notes,
  });

  // Sync the local draft when the beat changes externally (reorder/reload).
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

  return (
    <div className="outline-beat">
      <div className="outline-beat-head">
        <span className={`outline-kind outline-kind-${draft.kind}`}>{KIND_LABELS[draft.kind]}</span>
        <input
          className="form-control form-control-sm outline-beat-title"
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          onBlur={commit}
        />
        <select
          className="form-select form-select-sm outline-beat-status"
          value={draft.status}
          onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as BeatStatus }))}
          onBlur={commit}
        >
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <div className="outline-beat-actions">
          <button className="icon-btn" title="Subir" disabled={!canUp} onClick={() => onMoveUp(beat.id)}>
            <i className="bi bi-arrow-up" />
          </button>
          <button className="icon-btn" title="Bajar" disabled={!canDown} onClick={() => onMoveDown(beat.id)}>
            <i className="bi bi-arrow-down" />
          </button>
          <button className="icon-btn" title="Eliminar beat" onClick={() => onDelete(beat.id)}>
            <i className="bi bi-trash" />
          </button>
        </div>
        {/* U4: generar una escena dedicada para este beat y abrirla en el editor. */}
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
        />
        <textarea
          className="form-control form-control-sm"
          rows={2}
          placeholder="Notas: intención, tono, elementos a cuidar"
          value={draft.notes}
          onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
          onBlur={commit}
        />
      </div>
    </div>
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
    suggestBeats,
    createChapter,
    createScene,
    updateScene,
    selectScene,
    setView,
    requestEditorFocus,
    announce,
  } = useApp();

  const [suggesting, setSuggesting] = useState(false);
  const [suggested, setSuggested] = useState<Beat[] | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  // U4: id del beat cuyo botón "Generar escena" está en progreso. El feedback
  // de éxito/error se anuncia por la live region global (`announce`), que vive
  // a nivel de página para seguir presente tras cambiar a la vista editor.
  const [generatingBeatId, setGeneratingBeatId] = useState<string | null>(null);
  // U4+: progreso de generación masiva del capítulo.
  const [chapterGeneration, setChapterGeneration] = useState<{
    running: boolean;
    done: number;
    total: number;
  } | null>(null);
  // U4+: abort controller para cancelar la generación masiva del capítulo.
  const chapterAbortRef = useRef<AbortController | null>(null);

  // Slice 10: outline filters (POV and tense).
  const [filterPov, setFilterPov] = useState<string>('all');
  const [filterTense, setFilterTense] = useState<string>('all');

  const chapter = chapters.find((c) => c.id === currentOutlineChapterId) ?? chapters[0] ?? null;

  // Reset the suggestion preview when the chapter changes, so a stale
  // preview from another chapter never lingers.
  /* eslint-disable react-hooks/set-state-in-effect -- reset derived UI state on prop change */
  useEffect(() => {
    setSuggested(null);
    setSuggestError(null);
  }, [currentOutlineChapterId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const chapterBeats = useMemo(() => {
    if (!chapter) return [];
    return beats
      .filter((b) => b.chapterId === chapter.id && !b.sceneId)
      .sort((a, b) => a.position - b.position);
  }, [beats, chapter]);

  const sceneBeats = useMemo(() => {
    if (!chapter) return {};
    const map: Record<string, Beat[]> = {};
    for (const s of scenes.filter((s) => s.chapterId === chapter.id)) {
      map[s.id] = beats.filter((b) => b.sceneId === s.id).sort((a, b) => a.position - b.position);
    }
    return map;
  }, [beats, scenes, chapter]);

  // Slice 10: scenes without beats in the current chapter (orphan scenes).
  const orphanScenes = useMemo(() => {
    if (!chapter) return [];
    return scenes
      .filter((s) => s.chapterId === chapter.id)
      .filter((s) => (sceneBeats[s.id] ?? []).length === 0);
  }, [scenes, chapter, sceneBeats]);

  // Slice 10: show a filter banner when the project has POV/tense set.
  const hasProjectFilters = Boolean(currentProject?.pov) || Boolean(currentProject?.tense);
  const filterActive = filterPov !== 'all' || filterTense !== 'all';

  // Slice 10: filter beats by the selected POV/tense (cosmetic filter —
  // beats don't store POV/tense, so the filter shows/hides the whole chapter
  // section when the project's POV/tense doesn't match the filter).
  const chapterVisible = useMemo(() => {
    if (!filterActive) return true;
    const povMatch = filterPov === 'all' || currentProject?.pov === filterPov;
    const tenseMatch = filterTense === 'all' || currentProject?.tense === filterTense;
    return povMatch && tenseMatch;
  }, [filterActive, filterPov, filterTense, currentProject]);

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
  if (!chapter) {
    return (
      <div className="empty-state">
        <div>
          <i className="bi bi-list-nested fs-1 d-block mb-2" />
          <div className="small">Creá un capítulo para armar el outline.</div>
        </div>
      </div>
    );
  }

  const addBeat = async (chapterId: string, sceneId?: string) => {
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
      if (!key || existingTitles.has(key)) continue; // avoid duplicates
      await createBeat(b);
      existingTitles.add(key);
    }
    setSuggested(null);
  };

  // U4: crea la escena dedicada para un beat (y el capítulo si falta).
  // Devuelve la escena creada/reutilizada, o null si falló.
  const runGenerateScene = async (beatId: string): Promise<Scene | null> => {
    const beat = beats.find((b) => b.id === beatId);
    if (!beat || !currentProject) return null;
    try {
      const plan = planGenerateScene({
        beat,
        projectId: currentProject.id,
        chapters,
        scenes,
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

  // U4: crea la escena dedicada para un beat (y el capítulo si falta), la
  // selecciona, relinkea el beat dentro de ella y abre el editor con el foco.
  // Si el beat ya pertenece a una escena, la reutiliza en lugar de duplicarla.
  const generateScene = async (beatId: string) => {
    if (generatingBeatId || (chapterGeneration?.running ?? false)) return;
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

  // U4+: genera el texto de cada escena del capítulo a partir de sus beats,
  // manteniendo continuidad con la escena anterior. Crea las escenas si no
  // existen y las rellena con prosa generada por IA.
  const cancelChapterGeneration = () => {
    chapterAbortRef.current?.abort();
  };
  const generateChapter = async () => {
    if (!chapter || generatingBeatId || (chapterGeneration?.running ?? false)) return;
    const targets = chapterBeats.filter((b) => !b.sceneId);
    if (targets.length === 0) {
      announce('Todas las escenas del capítulo ya están generadas.');
      return;
    }
    chapterAbortRef.current = new AbortController();
    setChapterGeneration({ running: true, done: 0, total: targets.length });
    let completed = 0;
    let failed = 0;
    try {
      for (let i = 0; i < targets.length; i++) {
        const beat = targets[i];
        setChapterGeneration((prev) => (prev ? { ...prev, done: completed } : prev));
        const scene = await runGenerateScene(beat.id);
        if (!scene) {
          failed++;
          continue;
        }
        const previousScene = scenes
          .filter((s) => s.chapterId === chapter.id && s.order < scene.order)
          .sort((a, b) => b.order - a.order)[0];
        try {
          const content = await generateSceneContent({
            project: currentProject,
            scene,
            beat,
            chapter,
            previousScene,
            characters,
            world,
            settings,
            signal: chapterAbortRef.current.signal,
          });
          await updateScene(scene.id, { content });
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

  const renderBeatList = (list: Beat[], chapterId: string, sceneId?: string) => (
    <div className="outline-beat-list">
      {list.map((b, i) => (
        <BeatCard
          key={b.id}
          beat={b}
          onUpdate={updateBeat}
          onDelete={deleteBeat}
          onMoveUp={(id) => moveBeat(id, -1)}
          onMoveDown={(id) => moveBeat(id, 1)}
          onGenerateScene={generateScene}
          generating={generatingBeatId === b.id}
          chapterGenerating={chapterGeneration?.running ?? false}
          canUp={i > 0}
          canDown={i < list.length - 1}
        />
      ))}
      <button
        className="btn btn-sm btn-outline-primary"
        onClick={() => addBeat(chapterId, sceneId)}
        aria-label={`Agregar beat a ${sceneId ? 'escena' : 'capítulo'}`}
      >
        <i className="bi bi-plus-lg me-1" aria-hidden="true" /> Beat
      </button>
    </div>
  );

  return (
    <div className="outline-view">
      <h1 className="view-title">Outline</h1>
      <div className="outline-toolbar">
        <select
          className="form-select form-select-sm"
          value={chapter.id}
          onChange={(e) => setCurrentOutlineChapterId(e.target.value)}
        >
          {chapters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <button className="btn btn-sm btn-ai" onClick={suggest} disabled={suggesting}>
          <i className="bi bi-magic me-1" />
          {suggesting ? 'Sugiriendo…' : 'Sugerir outline'}
        </button>
        {/* U4+: genera todas las escenas del capítulo a partir de sus beats. */}
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
            onClick={generateChapter}
            aria-label="Generar todas las escenas del capítulo"
          >
            <i className="bi bi-magic me-1" aria-hidden="true" />
            Generar capítulo
          </button>
        )}
      </div>

      {/* Slice 10: outline filters */}
      {hasProjectFilters ? (
        <div className="outline-filters d-flex gap-1 align-items-center mb-2">
          <span className="small text-muted">Filtrar:</span>
          <select
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
            value={filterPov}
            onChange={(e) => setFilterPov(e.target.value)}
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

      {filterActive && !chapterVisible ? (
        <div className="small text-muted mb-2">
          <i className="bi bi-funnel me-1" />
          Este capítulo no coincide con el filtro (POV/tiempo del proyecto).
        </div>
      ) : (
        <>
      {suggested ? (
        <div className="outline-suggested">
          <div className="outline-suggested-title">
            <i className="bi bi-magic me-1" /> Outline sugerido por el co-writer
          </div>
          {suggestError ? (
            <div className="alert alert-danger py-1 small mb-2">
              <i className="bi bi-exclamation-triangle me-1" />
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
              <i className="bi bi-check-lg me-1" /> Agregar
            </button>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => setSuggested(null)}>
              Descartar
            </button>
          </div>
        </div>
      ) : null}

      <div className="outline-chapter">
        <h2 className="outline-chapter-title">
          <i className="bi bi-bookmark me-1" /> {chapter.title}
        </h2>
        {renderBeatList(chapterBeats, chapter.id)}
      </div>

      {scenes
        .filter((s) => s.chapterId === chapter.id)
        .map((s) => (
          <div key={s.id} className="outline-scene">
            <h3 className="outline-scene-title">
              <i className="bi bi-file-text me-1" /> {s.title}
            </h3>
            {renderBeatList(sceneBeats[s.id] ?? [], chapter.id, s.id)}
          </div>
        ))}
    </>
      )}

      {/* Slice 10: orphan scenes (without beats) — suggest linking (always visible) */}
      {orphanScenes.length > 0 ? (
        <div className="outline-orphans mt-3">
          <div className="small text-muted mb-1">
            <i className="bi bi-link me-1" />
            Escenas sin vincular al outline ({orphanScenes.length}):
          </div>
          {orphanScenes.map((s) => (
            <div key={s.id} className="d-flex align-items-center gap-1 mb-1">
              <span className="small flex-grow-1">{s.title}</span>
              <button
                className="btn btn-sm btn-outline-secondary"
                title="Crear un beat para esta escena"
                onClick={() => addBeat(chapter.id, s.id)}
                aria-label={`Vincular escena "${s.title}" al outline`}
              >
                <i className="bi bi-plus-lg me-1" aria-hidden="true" /> Vincular
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
