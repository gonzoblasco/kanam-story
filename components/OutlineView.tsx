'use client';

import { useState, useMemo, useRef } from 'react';
import { useApp } from '@/lib/store';
import { moveBeatInList } from '@/lib/outline';
import { planGenerateScene } from '@/lib/sceneFromBeat';
import { generateSceneContent } from '@/lib/generateSceneContent';
import ChapterSection from '@/components/ChapterSection';
import SuggestedOutlinePreview from '@/components/SuggestedOutlinePreview';
import type { SuggestedChapter } from '@/lib/outlineGeneration';
import type { Beat, Scene } from '@/types';

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

  const chapter = chapters.find((c) => c.id === currentOutlineChapterId) ?? chapters[0] ?? null;

  const setOutlineChapter = (id: string) => {
    setCurrentOutlineChapterId(id);
    setSuggested(null);
    setGlobalSuggested(null);
    setSuggestError(null);
  };

  const setOutlineMode = (next: 'chapter' | 'global') => {
    setMode(next);
    setSuggested(null);
    setGlobalSuggested(null);
    setSuggestError(null);
  };

  const sortedChapters = useMemo(
    () => [...chapters].sort((a, b) => a.order - b.order),
    [chapters],
  );

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
    setOutlineChapter(c.id);
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
            onChange={(e) => setOutlineChapter(e.target.value)}
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
            onClick={() => setOutlineMode('chapter')}
            aria-pressed={mode === 'chapter'}
          >
            Capítulo
          </button>
          <button
            className={`btn btn-sm ${mode === 'global' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setOutlineMode('global')}
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

      {suggested ? (
        <SuggestedOutlinePreview
          variant="chapter"
          error={suggestError}
          items={suggested}
          onAccept={acceptSuggested}
          onDiscard={() => setSuggested(null)}
          acceptLabel="Agregar"
        />
      ) : null}

      {globalSuggested ? (
        <SuggestedOutlinePreview
          variant="global"
          error={suggestError}
          items={globalSuggested}
          onAccept={acceptGlobalSuggested}
          onDiscard={() => setGlobalSuggested(null)}
          acceptLabel="Aplicar"
        />
      ) : null}

      {mode === 'chapter' ? (
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
