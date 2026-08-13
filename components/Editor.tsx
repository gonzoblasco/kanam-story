'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useApp } from '@/lib/store';
import {
  buildContext,
  buildWritePrompt,
  buildDescribePrompt,
  buildRewritePrompt,
  buildBrainstormPrompt,
  buildExpandPrompt,
  buildDialoguePrompt,
  buildTensionPrompt,
  type ExpandLength,
} from '@/lib/prompts';
import { ollamaChat } from '@/lib/ollama';

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
    scenes,
    chapters,
    characters,
    world,
    settings,
    updateScene,
    beats,
  } = useApp();

  const scene = scenes.find((s) => s.id === currentSceneId) || null;

  const sceneBeats = currentSceneId
    ? beats.filter((b) => b.sceneId === currentSceneId).sort((a, b) => a.position - b.position)
    : [];

  const [titleDraft, setTitleDraft] = useState('');
  const [summaryDraft, setSummaryDraft] = useState('');
  const [busy, setBusy] = useState<'write' | 'describe' | 'rewrite' | 'expand' | 'dialogue' | 'tension' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rewriteStyle, setRewriteStyle] = useState(REWRITE_STYLES[0]);
  const [expandLength, setExpandLength] = useState<ExpandLength>('medium');
  const [dialogueCharacter, setDialogueCharacter] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Placeholder.configure({
        placeholder: 'Empezá a escribir tu escena…',
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

  useEffect(() => {
    if (!scene || !editor) return;
    editor.commands.setContent(scene.content || '', { emitUpdate: false });
    setTitleDraft(scene.title);
    setSummaryDraft(scene.summary);
  }, [scene?.id, editor]);

  const saveContent = useCallback(
    (html: string) => {
      if (!scene) return;
      updateScene(scene.id, { content: html });
    },
    [scene, updateScene],
  );

  function handleEditorUpdate() {
    if (!scene || !editor) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveContent(editor.getHTML());
    }, 600);
  }

  useEffect(() => {
    if (!editor) return;
    editor.on('update', handleEditorUpdate);
    return () => {
      editor.off('update', handleEditorUpdate);
    };
  }, [editor, scene?.id]);

  function buildContextNow() {
    if (!currentProject) return '';
    return buildContext(currentProject, characters, world);
  }

  async function runAI(kind: 'write' | 'describe' | 'rewrite' | 'expand' | 'dialogue' | 'tension') {
    if (!editor || !currentProject || !scene) return;
    if (busy) {
      abortRef.current?.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(kind);
    setError(null);

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
        const chapter = chapters.find((c) => c.id === scene.chapterId);
        prompt = buildExpandPrompt(ctx, scene, chapter, expandLength);
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
        if (!scene.content?.trim()) {
          setError('La escena está vacía. Escribí algo antes de tensar el cierre.');
          setBusy(null);
          return;
        }
        const chapter = chapters.find((c) => c.id === scene.chapterId);
        prompt = buildTensionPrompt(ctx, scene, chapter);
        temperature = 0.8;
      }

      const content = await ollamaChat({
        ollamaUrl: settings.ollamaUrl,
        model: settings.ollamaModel,
        messages: [{ role: 'user', content: prompt }],
        signal: controller.signal,
        temperature,
      });

      const clean = content.trim();
      if (!clean) {
        setError('Respuesta vacía del modelo.');
      } else if (kind === 'write') {
        editor.chain().focus().insertContent(clean).run();
      } else if (kind === 'describe' || kind === 'rewrite') {
        editor.chain().focus().deleteSelection().insertContent(clean).run();
      } else if (kind === 'expand' || kind === 'tension') {
        editor.commands.setContent(clean, { emitUpdate: false });
        updateScene(scene.id, { content: clean });
      } else if (kind === 'dialogue') {
        const block = `\n\n${clean}\n`;
        editor.chain().focus().deleteSelection().insertContent(block).run();
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setError(e instanceof Error ? e.message : 'La petición a la IA falló');
    } finally {
      setBusy(null);
      abortRef.current = null;
    }
  }

  function saveTitleBlur() {
    if (!scene) return;
    if (titleDraft !== scene.title) updateScene(scene.id, { title: titleDraft });
  }
  function saveSummaryBlur() {
    if (!scene) return;
    if (summaryDraft !== scene.summary) updateScene(scene.id, { summary: summaryDraft });
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

  if (!scene) {
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

  const wordCount = editor ? editor.getText().trim().split(/\s+/).filter(Boolean).length : 0;

  return (
    <div className="main-content">
      <div className="editor-shell">
        <input
          className="editor-title"
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={saveTitleBlur}
          placeholder="Título de la escena"
        />
        <textarea
          className="editor-summary"
          rows={2}
          value={summaryDraft}
          onChange={(e) => setSummaryDraft(e.target.value)}
          onBlur={saveSummaryBlur}
          placeholder="Resumen de la escena (un beat en una oración)…"
        />

        {sceneBeats.length > 0 ? (
          <div className="editor-beats">
            {sceneBeats.map((b) => (
              <span key={b.id} className={`editor-beat editor-beat-${b.status}`} title={b.description}>
                {b.title}
              </span>
            ))}
          </div>
        ) : null}

        {currentProject?.promise ? (
          <div className="editor-compass">
            <i className="bi bi-compass me-1" />
            <span className="editor-compass-label">Promesa:</span> {currentProject.promise}
          </div>
        ) : null}

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

        <EditorContent editor={editor} />
        <div className="d-flex justify-content-between text-muted small mt-3">
          <span>
            <i className="bi bi-bookmark me-1" />
            {wordCount} palabras · {editor?.getText().length || 0} caracteres
          </span>
          <span>Modelo: {settings.ollamaModel}</span>
        </div>
      </div>
    </div>
  );
}