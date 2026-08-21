'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useApp } from '@/lib/store';
import { resolveEditorTarget, chapterToSceneLike } from '@/lib/editorTarget';
import {
  buildContext,
  buildWritePrompt,
  buildDescribePrompt,
  buildRewritePrompt,
  buildExpandPrompt,
  buildDialoguePrompt,
  buildTensionPrompt,
  type ExpandLength,
} from '@/lib/prompts';
import { ollamaChatStream } from '@/lib/ollama';
import { proseToHtml } from '@/lib/proseToHtml';
import { countWords } from '@/lib/export';
import PromptDialog from '@/components/PromptDialog';

const REWRITE_STYLES = [
  'más evocativo y sensorial',
  'más conciso y punzante',
  'en un estilo más literario y elevado',
  'mostrar en vez de decir, con más subtexto',
  'en una voz más cruda y realista',
];

const EXPAND_LENGTHS: { key: ExpandLength; label: string }[] = [
  { key: 'short', label: 'Corto (~200)' },
  { key: 'medium', label: 'Medio (~500)' },
  { key: 'long', label: 'Largo (~1000)' },
];

const DIALOGUE_COUNT = 4;

export default function Editor() {
  const {
    currentProject,
    currentSceneId,
    currentChapterId,
    scenes,
    chapters,
    characters,
    world,
    settings,
    updateScene,
    updateChapter,
    beats,
    editorFocusNonce,
  } = useApp();

  // U3: the editor can target either a scene (classic flow) or a chapter's
  // direct content (a chapter with no scenes). Resolve which one is active.
  const target = resolveEditorTarget(currentSceneId, currentChapterId, scenes, chapters);
  const scene = target.mode === 'scene' ? target.scene : null;
  const chapter = target.mode === 'chapter' ? target.chapter : null;
  const isChapterMode = target.mode === 'chapter';

  const sceneBeats = currentSceneId
    ? beats.filter((b) => b.sceneId === currentSceneId).sort((a, b) => a.position - b.position)
    : [];

  const [titleDraft, setTitleDraft] = useState('');
  const [summaryDraft, setSummaryDraft] = useState('');
  const [continuityDraft, setContinuityDraft] = useState('');
  const [busy, setBusy] = useState<'write' | 'describe' | 'rewrite' | 'expand' | 'dialogue' | 'tension' | null>(null);
  const [linkDraft, setLinkDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rewriteStyle, setRewriteStyle] = useState(REWRITE_STYLES[0]);
  const [expandLength, setExpandLength] = useState<ExpandLength>('medium');
  const [dialogueCharacter, setDialogueCharacter] = useState('');
  // U1: bump to re-render the format bar when the selection/transaction changes.
  const [, setEditorVersion] = useState(0);
  // U3: contextual AI selection indicator.
  const [selectionInfo, setSelectionInfo] = useState<{ from: number; to: number; text: string } | null>(null);
  const [indicatorPos, setIndicatorPos] = useState<{ top: number; left: number } | null>(null);
  const indicatorRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetIdRef = useRef<string | null>(null);
  const targetModeRef = useRef<'scene' | 'chapter' | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // B7: while streaming, suppress the debounced autosave so partial AI text is
  // never persisted mid-generation.
  const streamingRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: isChapterMode ? 'Empezá a escribir tu capítulo…' : 'Empezá a escribir tu escena…',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
      },
    },
    immediatelyRender: false,
  });

  // Sync the local title/summary drafts when the selected target changes.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- derived state from the selected target */
    setTitleDraft(scene?.title ?? chapter?.title ?? '');
    setSummaryDraft(scene?.summary ?? chapter?.summary ?? '');
    setContinuityDraft(scene?.continuityNotes ?? chapter?.continuityNotes ?? '');
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [scene?.id, scene?.title, scene?.summary, scene?.continuityNotes, chapter?.id, chapter?.title, chapter?.summary, chapter?.continuityNotes]);

  // Keep a ref in sync with the current target id + mode so the debounced
  // autosave always writes to the target that was active when the edit
  // happened, even if the user switches targets before the timeout fires.
  useEffect(() => {
    targetIdRef.current = scene?.id ?? chapter?.id ?? null;
    targetModeRef.current = scene ? 'scene' : chapter ? 'chapter' : null;
  }, [scene?.id, chapter?.id]);

  // Keep the TipTap editor in sync with the selected target (scene or chapter).
  // Without this, switching targets leaves the previous target's content on
  // screen and the next autosave overwrites the newly-selected one. Also
  // re-syncs when the target content changes externally (e.g. accepting a
  // rewrite from the co-writer), since the id alone doesn't change in that case.
  useEffect(() => {
    if (!editor || !scene && !chapter) return;
    // Flush pending edits to the previous target before switching.
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
      const previousId = targetIdRef.current;
      const previousMode = targetModeRef.current;
      if (previousId && previousMode === 'scene') {
        updateScene(previousId, { content: editor.getHTML() });
      } else if (previousId && previousMode === 'chapter') {
        updateChapter(previousId, { content: editor.getHTML() });
      }
    }
    editor.commands.setContent(scene?.content ?? chapter?.content ?? '', { emitUpdate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, scene?.id, scene?.content, chapter?.id, chapter?.content, updateScene, updateChapter]);

  // U4: tomar el foco cuando `requestEditorFocus()` lo pide (p.ej. tras generar
  // una escena desde el outline), colocando el caret al final del contenido.
  useEffect(() => {
    if (editorFocusNonce > 0 && editor) {
      editor.commands.focus('end');
    }
  }, [editorFocusNonce, editor]);

  const saveContent = useCallback(
    (html: string) => {
      const targetId = targetIdRef.current;
      const targetMode = targetModeRef.current;
      if (!targetId) return;
      if (targetMode === 'chapter') {
        updateChapter(targetId, { content: html });
      } else {
        updateScene(targetId, { content: html });
      }
    },
    [updateScene, updateChapter],
  );

  const handleEditorUpdate = useCallback(() => {
    if (!editor) return;
    // B7: never autosave partial AI text while a stream is in progress. The
    // final content is saved explicitly once generation completes.
    if (streamingRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveContent(editor.getHTML());
    }, 600);
  }, [editor, saveContent]);

  useEffect(() => {
    if (!editor) return;
    editor.on('update', handleEditorUpdate);
    return () => {
      editor.off('update', handleEditorUpdate);
    };
  }, [editor, handleEditorUpdate]);

  // U1: re-render the format bar on every transaction so the active/disabled
  // state of the buttons stays in sync with the cursor/selection.
  useEffect(() => {
    if (!editor) return;
    const bump = () => setEditorVersion((v) => v + 1);
    editor.on('transaction', bump);
    return () => {
      editor.off('transaction', bump);
    };
  }, [editor]);

  // U3: detect text selection and position the contextual AI indicator.
  useEffect(() => {
    if (!editor) return;
    const updateSelection = () => {
      const { from, to } = editor.state.selection;
      const text = editor.state.doc.textBetween(from, to, '\n');
      if (from === to || !text.trim()) {
        setSelectionInfo(null);
        setIndicatorPos(null);
        return;
      }
      setSelectionInfo({ from, to, text });
      // Position the indicator near the start of the selection.
      const coords = editor.view.coordsAtPos(from);
      const editorEl = editor.view.dom.getBoundingClientRect();
      setIndicatorPos({
        top: coords.top - editorEl.top,
        left: coords.left - editorEl.left,
      });
    };
    editor.on('selectionUpdate', updateSelection);
    editor.on('transaction', updateSelection);
    return () => {
      editor.off('selectionUpdate', updateSelection);
      editor.off('transaction', updateSelection);
    };
  }, [editor]);

  // U3: hide the indicator when clicking outside the editor.
  useEffect(() => {
    if (!editor) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (indicatorRef.current?.contains(target)) return;
      if (editor.view.dom.contains(target)) return;
      setSelectionInfo(null);
      setIndicatorPos(null);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [editor]);

  // U1: formatting commands.
  function toggleMark(mark: 'bold' | 'italic' | 'strike' | 'underline') {
    if (!editor) return;
    const cmd =
      mark === 'bold'
        ? 'toggleBold'
        : mark === 'italic'
          ? 'toggleItalic'
          : mark === 'strike'
            ? 'toggleStrike'
            : 'toggleUnderline';
    editor.chain().focus()[cmd]().run();
  }
  function undo() {
    editor?.chain().focus().undo().run();
  }
  function redo() {
    editor?.chain().focus().redo().run();
  }
  // U2: lists, headings, links.
  function toggleList(kind: 'bullet' | 'ordered') {
    if (!editor) return;
    if (kind === 'bullet') editor.chain().focus().toggleBulletList().run();
    else editor.chain().focus().toggleOrderedList().run();
  }
  function toggleHeading(level: 1 | 2 | 3) {
    if (!editor) return;
    editor.chain().focus().toggleHeading({ level }).run();
  }
  function toggleLink() {
    if (!editor) return;
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const prev = (editor.getAttributes('link').href as string | undefined) ?? '';
    setLinkDraft(prev);
  }

  function buildContextNow() {
    if (!currentProject) return '';
    // Auditoría 2026-08-17: el editor ahora recibe el mismo contexto enriquecido
    // que el chat (IDs, inContext, brújula) + las notas de continuidad del
    // target activo (escena o capítulo directo).
    return buildContext(currentProject, characters, world, {
      continuityNotes: scene?.continuityNotes ?? chapter?.continuityNotes,
    });
  }

  async function runAI(kind: 'write' | 'describe' | 'rewrite' | 'expand' | 'dialogue' | 'tension') {
    if (!editor || !currentProject || (!scene && !chapter)) return;
    if (busy) {
      abortRef.current?.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(kind);
    setError(null);

    // B7: streaming state. `preStreamHtml` lets us revert the partial proposal
    // if the user aborts or the request fails; `started` tracks whether any
    // chunk has been inserted into the editor yet.
    let preStreamHtml = '';
    let full = '';
    let started = false;

    // B7: insert the first chunk (replacing the selection / whole scene where
    // the kind requires it) and append subsequent chunks at the end of the
    // growing text. `insertContent`/`insertContentAt` move the selection to the
    // end of the inserted content, so the next chunk lands right after it.
    const startInsert = (first: string) => {
      if (kind === 'expand' || kind === 'tension') {
        editor.commands.setContent(first, { emitUpdate: false });
        editor.commands.setTextSelection(editor.state.doc.content.size);
      } else if (kind === 'describe' || kind === 'rewrite' || kind === 'dialogue') {
        // B7: dialogue keeps the blank-line wrapper the non-streaming path used.
        const value = kind === 'dialogue' ? `\n\n${first}` : first;
        editor.chain().focus().deleteSelection().insertContent(value).run();
      } else {
        editor.chain().focus().insertContent(first).run();
      }
    };
    const appendInsert = (chunk: string) => {
      if (kind === 'expand' || kind === 'tension') {
        editor.chain().focus().insertContentAt(editor.state.doc.content.size, chunk).run();
      } else {
        editor.chain().focus().insertContent(chunk).run();
      }
    };

    try {
      const ctx = buildContextNow();
      const { from, to } = editor.state.selection;
      const before = editor.state.doc.textBetween(0, from, '\n');
      const after = editor.state.doc.textBetween(to, editor.state.doc.content.size, '\n');
      const selection = editor.state.doc.textBetween(from, to, '\n');

      let prompt = '';
      let temperature = 0.85;
      if (kind === 'write') {
        prompt = buildWritePrompt(ctx, before, after);
      } else if (kind === 'describe') {
        if (!selection) {
          setError('Seleccioná un pasaje para describir primero.');
          setBusy(null);
          return;
        }
        prompt = buildDescribePrompt(ctx, selection);
      } else if (kind === 'rewrite') {
        if (!selection) {
          setError('Seleccioná un pasaje para reescribir primero.');
          setBusy(null);
          return;
        }
        prompt = buildRewritePrompt(ctx, selection, rewriteStyle);
      } else if (kind === 'expand') {
        // U3: in chapter-direct mode, expand the chapter's own content as a
        // unit (no scene/previous-scene context).
        if (isChapterMode && chapter) {
          prompt = buildExpandPrompt(ctx, chapterToSceneLike(chapter), chapter, expandLength);
        } else if (scene) {
          const chapter = chapters.find((c) => c.id === scene.chapterId);
          const previousScene = scenes
            .filter((s) => s.chapterId === scene.chapterId && s.order < scene.order)
            .sort((a, b) => b.order - a.order)[0];
          prompt = buildExpandPrompt(ctx, scene, chapter, expandLength, previousScene);
        }
        temperature = 0.8;
      } else if (kind === 'dialogue') {
        if (!selection) {
          setError('Seleccioná el texto de la línea de diálogo primero.');
          setBusy(null);
          return;
        }
        const setup = `${before}\n[DIÁLOGO]\n${selection}\n[/DIÁLOGO]\n${after}`.trim();
        prompt = buildDialoguePrompt(ctx, dialogueCharacter, setup, DIALOGUE_COUNT);
      } else if (kind === 'tension') {
        const currentContent = scene?.content ?? chapter?.content;
        if (!currentContent?.trim()) {
          setError('El contenido está vacío. Escribí algo antes de tensar el cierre.');
          setBusy(null);
          return;
        }
        // U3: in chapter-direct mode, tension the chapter's own content.
        if (isChapterMode && chapter) {
          prompt = buildTensionPrompt(ctx, chapterToSceneLike(chapter), chapter);
        } else if (scene) {
          const chapter = chapters.find((c) => c.id === scene.chapterId);
          prompt = buildTensionPrompt(ctx, scene, chapter);
        }
        temperature = 0.8;
      }

      // B7: capture the pre-stream content and suppress autosave for the
      // duration of the stream. Clear any pending debounce so a stale save
      // can't fire mid-generation.
      preStreamHtml = editor.getHTML();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      streamingRef.current = true;

      await ollamaChatStream(
        {
          ollamaUrl: settings.ollamaUrl,
          model: settings.ollamaModel,
          messages: [{ role: 'user', content: prompt }],
          signal: controller.signal,
          temperature,
        },
        (chunk) => {
          full += chunk;
          if (!chunk) return;
          if (!started) {
            const first = chunk.trimStart();
            // Only mark the stream as started once real text is inserted. If a
            // whitespace-only leading chunk set `started` here, the selection
            // would never be replaced for describe/rewrite/dialogue.
            if (first) {
              started = true;
              startInsert(first);
            }
          } else {
            appendInsert(chunk);
          }
        },
      );

      const clean = full.trim();
      if (!clean) {
        setError('Respuesta vacía del modelo.');
      } else {
        // B7: autosave is suppressed while streaming, so persist the final
        // streamed content explicitly once generation completes.
        //
        // Para acciones que generan o reemplazan el texto completo de una
        // escena, normalizamos el texto plano del modelo a párrafos HTML. Sin
        // esto, los saltos de línea literales quedan dentro de un único nodo y
        // se pierden al guardar/recuperar la escena.
        const normalizesWholeScene = kind === 'write' || kind === 'expand' || kind === 'tension';
        if (normalizesWholeScene) {
          editor.commands.setContent(proseToHtml(full), { emitUpdate: false });
        }
        if (kind === 'dialogue') {
          // Preserve the trailing newline the non-streaming path appended.
          // Insert at the cursor (already right after the last streamed chunk)
          // rather than at the end of the whole document, which would be wrong
          // for a dialogue block inserted mid-scene.
          editor.chain().focus().insertContent('\n').run();
        }
        saveContent(editor.getHTML());
      }
    } catch (e) {
      // B7: revert any partial streamed proposal so the editor matches the
      // saved state (the old non-streaming path left the editor untouched on
      // error/abort).
      if (started) {
        editor.commands.setContent(preStreamHtml, { emitUpdate: false });
      }
      if ((e as Error).name === 'AbortError') return;
      setError(e instanceof Error ? e.message : 'La petición a la IA falló');
    } finally {
      streamingRef.current = false;
      setBusy(null);
      abortRef.current = null;
    }
  }

  function saveTitleBlur() {
    if (scene) {
      if (titleDraft !== scene.title) updateScene(scene.id, { title: titleDraft });
    } else if (chapter) {
      if (titleDraft !== chapter.title) updateChapter(chapter.id, { title: titleDraft });
    }
  }
  function saveSummaryBlur() {
    if (scene) {
      if (summaryDraft !== scene.summary) updateScene(scene.id, { summary: summaryDraft });
    } else if (chapter) {
      if (summaryDraft !== (chapter.summary ?? '')) updateChapter(chapter.id, { summary: summaryDraft });
    }
  }
  function saveContinuityBlur() {
    if (scene) {
      if (continuityDraft !== (scene.continuityNotes ?? '')) {
        updateScene(scene.id, { continuityNotes: continuityDraft });
      }
    } else if (chapter) {
      if (continuityDraft !== (chapter.continuityNotes ?? '')) {
        updateChapter(chapter.id, { continuityNotes: continuityDraft });
      }
    }
  }

  if (!currentProject) {
    return (
      <div className="empty-state">
        <div>
          <i className="bi bi-journal-text fs-1 d-block mb-3" />
          <h5>Bienvenido a Kanam Story</h5>
          <p>Creá un proyecto para empezar a escribir ficción con IA local.</p>
        </div>
      </div>
    );
  }

  if (!scene && !chapter) {
    return (
      <div className="empty-state">
        <div>
          <i className="bi bi-file-earmark-plus fs-1 d-block mb-3" />
          <h5>{currentProject.name}</h5>
          <p>{currentProject.description || 'Sumá un capítulo y una escena en la sidebar para empezar.'}</p>
        </div>
      </div>
    );
  }

  const wordCount = editor ? countWords(editor.getText()) : 0;

  return (
    <div className="main-content">
      <div className="editor-shell">
        <input
          className="editor-title"
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={saveTitleBlur}
          placeholder={isChapterMode ? 'Título del capítulo' : 'Título de la escena'}
        />
        <textarea
          className="editor-summary"
          rows={2}
          value={summaryDraft}
          onChange={(e) => setSummaryDraft(e.target.value)}
          onBlur={saveSummaryBlur}
          placeholder={isChapterMode ? 'Resumen del capítulo (un beat en una oración)…' : 'Resumen de la escena (un beat en una oración)…'}
        />

        <div className="editor-continuity">
          <label htmlFor="editor-continuity" className="editor-continuity-label">
            <i className="bi bi-link-45deg me-1" aria-hidden="true" />
            Notas de continuidad
          </label>
          <textarea
            id="editor-continuity"
            className="form-control form-control-sm"
            rows={3}
            value={continuityDraft}
            onChange={(e) => setContinuityDraft(e.target.value)}
            onBlur={saveContinuityBlur}
            placeholder="Ej: acá aparece por primera vez el diario de Renzo — objeto clave del capítulo 3."
            aria-label="Notas de continuidad"
          />
        </div>

        {!isChapterMode && sceneBeats.length > 0 ? (
          <div className="editor-beats">
            {sceneBeats.map((b) => (
              <span key={b.id} className={`editor-beat editor-beat-${b.status}`} title={b.description}>
                {b.title}
              </span>
            ))}
          </div>
        ) : null}

        {isChapterMode ? (
          <div className="editor-chapter-badge">
            <i className="bi bi-book me-1" />
            Capítulo directo
          </div>
        ) : null}

        {currentProject?.promise ? (
          <div className="editor-compass">
            <i className="bi bi-compass me-1" />
            <span className="editor-compass-label">Promesa:</span> {currentProject.promise}
          </div>
        ) : null}

        {/* U1: basic formatting toolbar (separate from the AI bar) */}
        <div className="format-bar" role="toolbar" aria-label="Formato de texto">
          <button
            type="button"
            className={`format-btn ${editor?.isActive('bold') ? 'active' : ''}`}
            disabled={!editor?.can().chain().focus().toggleBold().run()}
            onClick={() => toggleMark('bold')}
            title="Negrita"
            aria-label="Negrita"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            className={`format-btn ${editor?.isActive('italic') ? 'active' : ''}`}
            disabled={!editor?.can().chain().focus().toggleItalic().run()}
            onClick={() => toggleMark('italic')}
            title="Cursiva"
            aria-label="Cursiva"
          >
            <em>I</em>
          </button>
          <button
            type="button"
            className={`format-btn ${editor?.isActive('strike') ? 'active' : ''}`}
            disabled={!editor?.can().chain().focus().toggleStrike().run()}
            onClick={() => toggleMark('strike')}
            title="Tachado"
            aria-label="Tachado"
          >
            <s>S</s>
          </button>
          <button
            type="button"
            className={`format-btn ${editor?.isActive('underline') ? 'active' : ''}`}
            disabled={!editor?.can().chain().focus().toggleUnderline().run()}
            onClick={() => toggleMark('underline')}
            title="Subrayado"
            aria-label="Subrayado"
          >
            <u>U</u>
          </button>
          <span className="format-sep" aria-hidden="true" />
          {([1, 2, 3] as const).map((l) => (
            <button
              key={l}
              type="button"
              className={`format-btn format-btn-heading ${editor?.isActive('heading', { level: l }) ? 'active' : ''}`}
              disabled={!editor?.can().chain().focus().toggleHeading({ level: l }).run()}
              onClick={() => toggleHeading(l)}
              title={`Título ${l}`}
              aria-label={`Título ${l}`}
            >
              H{l}
            </button>
          ))}
          <span className="format-sep" aria-hidden="true" />
          <button
            type="button"
            className={`format-btn ${editor?.isActive('bulletList') ? 'active' : ''}`}
            disabled={!editor?.can().chain().focus().toggleBulletList().run()}
            onClick={() => toggleList('bullet')}
            title="Lista con viñetas"
            aria-label="Lista con viñetas"
          >
            <i className="bi bi-list-ul" />
          </button>
          <button
            type="button"
            className={`format-btn ${editor?.isActive('orderedList') ? 'active' : ''}`}
            disabled={!editor?.can().chain().focus().toggleOrderedList().run()}
            onClick={() => toggleList('ordered')}
            title="Lista numerada"
            aria-label="Lista numerada"
          >
            <i className="bi bi-list-ol" />
          </button>
          <span className="format-sep" aria-hidden="true" />
          <button
            type="button"
            className={`format-btn ${editor?.isActive('link') ? 'active' : ''}`}
            disabled={!editor || (editor.state.selection.empty && !editor.isActive('link'))}
            onClick={toggleLink}
            title="Insertar enlace"
            aria-label="Insertar enlace"
          >
            <i className="bi bi-link-45deg" />
          </button>
          <span className="format-sep" aria-hidden="true" />
          <button
            type="button"
            className="format-btn"
            disabled={!editor?.can().chain().focus().undo().run()}
            onClick={undo}
            title="Deshacer"
            aria-label="Deshacer"
          >
            <i className="bi bi-arrow-counterclockwise" />
          </button>
          <button
            type="button"
            className="format-btn"
            disabled={!editor?.can().chain().focus().redo().run()}
            onClick={redo}
            title="Rehacer"
            aria-label="Rehacer"
          >
            <i className="bi bi-arrow-clockwise" />
          </button>
        </div>

        <div className="ai-bar">
          <button
            className="btn btn-sm btn-ai"
            disabled={!!busy}
            onClick={() => runAI('write')}
            title="Continuar la escritura desde el cursor"
          >
            {busy === 'write' ? (
              <>
                <span className="spinner-inline me-2" /> Escribiendo…
              </>
            ) : (
              <>
                <i className="bi bi-stars me-1" /> Escribir
              </>
            )}
          </button>
          <button
            className="btn btn-sm btn-outline-primary"
            disabled={!!busy}
            onClick={() => runAI('describe')}
            title="Expandir la selección con detalle sensorial"
          >
            {busy === 'describe' ? (
              <>
                <span className="spinner-inline me-2" /> Describiendo…
              </>
            ) : (
              <>
                <i className="bi bi-eye me-1" /> Describir
              </>
            )}
          </button>
          <div className="d-flex align-items-center gap-1">
            <button
              className="btn btn-sm btn-outline-primary"
              disabled={!!busy}
              onClick={() => runAI('rewrite')}
              title="Reescribir la selección en el estilo elegido"
            >
              {busy === 'rewrite' ? (
                <>
                  <span className="spinner-inline me-2" /> Reescribiendo…
                </>
              ) : (
                <>
                  <i className="bi bi-pencil-square me-1" /> Reescribir
                </>
              )}
            </button>
            <select
              className="form-select form-select-sm"
              style={{ width: 'auto' }}
              value={rewriteStyle}
              onChange={(e) => setRewriteStyle(e.target.value)}
              disabled={!!busy}
              title="Rewrite style"
            >
              {REWRITE_STYLES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="d-flex align-items-center gap-1">
            <button
              className="btn btn-sm btn-ai"
              disabled={!!busy}
              onClick={() => runAI('expand')}
              title="Reemplazar la escena con una versión expandida a partir del beat/resumen"
            >
              {busy === 'expand' ? (
                <>
                  <span className="spinner-inline me-2" /> Expandiendo…
                </>
              ) : (
                <>
                  <i className="bi bi-arrows-fullscreen me-1" /> Expandir
                </>
              )}
            </button>
            <select
              className="form-select form-select-sm"
              style={{ width: 'auto' }}
              value={expandLength}
              onChange={(e) => setExpandLength(e.target.value as ExpandLength)}
              disabled={!!busy}
              title="Extensión objetivo"
            >
              {EXPAND_LENGTHS.map((l) => (
                <option key={l.key} value={l.key}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div className="d-flex align-items-center gap-1">
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ width: '10rem' }}
              placeholder="Personaje"
              value={dialogueCharacter}
              onChange={(e) => setDialogueCharacter(e.target.value)}
              disabled={!!busy}
              title="Nombre del personaje que habla (opcional)"
            />
            <button
              className="btn btn-sm btn-outline-primary"
              disabled={!!busy}
              onClick={() => runAI('dialogue')}
              title="Generar versiones alternativas del diálogo seleccionado"
            >
              {busy === 'dialogue' ? (
                <>
                  <span className="spinner-inline me-2" /> Dialogando…
                </>
              ) : (
                <>
                  <i className="bi bi-chat-quote me-1" /> Dialogar
                </>
              )}
            </button>
          </div>
          <button
            className="btn btn-sm btn-outline-primary"
            disabled={!!busy}
            onClick={() => runAI('tension')}
            title="Reescribir el cierre de la escena subiendo el conflicto"
          >
            {busy === 'tension' ? (
              <>
                <span className="spinner-inline me-2" /> Tensando…
              </>
            ) : (
              <>
                <i className="bi bi-lightning-charge me-1" /> Tensar
              </>
            )}
          </button>
          {busy ? (
            <button
              className="btn btn-sm btn-outline-secondary ms-auto"
              onClick={() => abortRef.current?.abort()}
            >
              <i className="bi bi-stop-circle me-1" /> Detener
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="alert alert-danger py-2 small mb-2">
            <i className="bi bi-exclamation-triangle me-1" />
            {error}
          </div>
        ) : null}

        <div className="editor-content-wrap">
          <EditorContent editor={editor} />
          {/* U3: contextual AI selection indicator */}
          {selectionInfo && indicatorPos ? (
            <div
              ref={indicatorRef}
              className="ai-selection-indicator"
              style={{ top: indicatorPos.top, left: indicatorPos.left }}
              role="toolbar"
              aria-label="Acciones de IA sobre la selección"
            >
              <span className="ai-selection-count">
                {selectionInfo.text.trim().split(/\s+/).filter(Boolean).length} palabras
              </span>
              <button
                type="button"
                className="ai-selection-btn"
                disabled={!!busy}
                onClick={() => runAI('rewrite')}
                title="Reescribir la selección"
                aria-label="Reescribir la selección"
              >
                <i className="bi bi-pencil-square" />
              </button>
              <button
                type="button"
                className="ai-selection-btn"
                disabled={!!busy}
                onClick={() => runAI('describe')}
                title="Describir la selección"
                aria-label="Describir la selección"
              >
                <i className="bi bi-eye" />
              </button>
            </div>
          ) : null}
        </div>
        <div className="d-flex justify-content-between text-muted small mt-3">
          <span>
            <i className="bi bi-bookmark me-1" />
            {wordCount} palabras · {editor?.getText().length || 0} caracteres
          </span>
          <span>Modelo: {settings.ollamaModel}</span>
        </div>
      </div>

      <PromptDialog
        show={linkDraft !== null}
        title="Insertar enlace"
        label="URL del enlace"
        initialValue={linkDraft ?? ''}
        placeholder="https://…"
        confirmLabel="Insertar"
        onCancel={() => setLinkDraft(null)}
        onConfirm={(url) => {
          setLinkDraft(null);
          if (!editor) return;
          if (url.trim() === '') {
            editor.chain().focus().unsetLink().run();
          } else {
            editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
          }
        }}
      />
    </div>
  );
}