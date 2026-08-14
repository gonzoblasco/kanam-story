'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/lib/store';
import type { StoryBible, Character, WorldEntity } from '@/types';
import MarkdownView from '@/components/MarkdownView';

type BibleEntry = Partial<Character> | Partial<WorldEntity>;

export default function StoryBiblePanel() {
  const {
    currentProject,
    storyBible,
    settings,
    regenerateStoryBible,
    regenerateBibleSection,
    ensureStoryBible,
    updateBibleSection,
    previewBibleCharacters,
    importCharactersFromBible,
    syncCharactersFromBible,
    previewBibleWorld,
    importWorldFromBible,
  } = useApp();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<StoryBible['sections'][number]['key'] | null>(null);

  const [charactersPreview, setCharactersPreview] = useState<Partial<Character>[] | null>(null);
  const [charactersPreviewing, setCharactersPreviewing] = useState(false);
  const [charactersImporting, setCharactersImporting] = useState(false);
  const [charactersImportMsg, setCharactersImportMsg] = useState<string | null>(null);

  const [worldPreview, setWorldPreview] = useState<Partial<WorldEntity>[] | null>(null);
  const [worldPreviewing, setWorldPreviewing] = useState(false);
  const [worldImporting, setWorldImporting] = useState(false);
  const [worldImportMsg, setWorldImportMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!currentProject || storyBible) return;
    ensureStoryBible(currentProject.id).catch(() => {});
  }, [currentProject, storyBible, ensureStoryBible]);

  if (!currentProject) {
    return <div className="text-muted small">No hay proyecto seleccionado.</div>;
  }

  async function regenerate() {
    if (!storyBible || busy) return;
    setBusy(true);
    setError(null);
    setCharactersPreview(null);
    setWorldPreview(null);
    try {
      // U5: auto-sync detected characters into the Characters tab.
      const { created, updated } = await syncCharactersFromBible();
      if (created > 0 || updated > 0) {
        setCharactersImportMsg(
          `Sincronizados ${created} personaje(s) nuevos y ${updated} actualizado(s) desde la Biblia.`,
        );
      }
      await regenerateStoryBible();
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setError(e instanceof Error ? e.message : 'Falló la regeneración');
    } finally {
      setBusy(false);
    }
  }

  async function regenerateSection(key: StoryBible['sections'][number]['key']) {
    if (!storyBible || busy) return;
    setBusy(true);
    setError(null);
    try {
      await regenerateBibleSection(key);
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setError(e instanceof Error ? e.message : `Falló la regeneración de "${key}"`);
    } finally {
      setBusy(false);
    }
  }

  async function loadCharactersPreview() {
    if (!storyBible) return;
    const raw = storyBible.sections.find((s) => s.key === 'characters');
    const text = (raw?.manual.trim() || raw?.auto || '').trim();
    if (!text) {
      setCharactersImportMsg('La sección "Personajes" está vacía. Regenerá la Biblia primero.');
      return;
    }
    setCharactersPreviewing(true);
    setCharactersImportMsg(null);
    try {
      const entries = await previewBibleCharacters(text);
      setCharactersPreview(entries);
      if (entries.length === 0) {
        setCharactersImportMsg(
          'No se detectaron personajes. Probá regenerar la Biblia o agregar manualmente.',
        );
      }
    } catch (e) {
      setCharactersImportMsg(e instanceof Error ? e.message : 'Falló la detección');
    } finally {
      setCharactersPreviewing(false);
    }
  }

  async function importAllCharacters() {
    if (!charactersPreview || charactersPreview.length === 0) return;
    setCharactersImporting(true);
    try {
      const created = await importCharactersFromBible(charactersPreview);
      setCharactersImportMsg(`Importados ${created.length} personajes con marca "de biblia".`);
      setCharactersPreview(null);
    } catch (e) {
      setCharactersImportMsg(e instanceof Error ? e.message : 'Falló la importación');
    } finally {
      setCharactersImporting(false);
    }
  }

  async function importOneCharacter(idx: number) {
    if (!charactersPreview || !charactersPreview[idx]) return;
    setCharactersImporting(true);
    try {
      const [created] = await importCharactersFromBible([charactersPreview[idx]]);
      setCharactersImportMsg(created ? `Personaje "${created.name}" importado.` : 'No se pudo importar.');
      setCharactersPreview((prev) => prev?.filter((_, i) => i !== idx) ?? null);
    } catch (e) {
      setCharactersImportMsg(e instanceof Error ? e.message : 'Falló la importación');
    } finally {
      setCharactersImporting(false);
    }
  }

  async function loadWorldPreview() {
    if (!storyBible) return;
    const raw = storyBible.sections.find((s) => s.key === 'world');
    const text = (raw?.manual.trim() || raw?.auto || '').trim();
    if (!text) {
      setWorldImportMsg('La sección "Mundo" está vacía. Regenerá la Biblia primero.');
      return;
    }
    setWorldPreviewing(true);
    setWorldImportMsg(null);
    try {
      const entries = await previewBibleWorld(text);
      setWorldPreview(entries);
      if (entries.length === 0) {
        setWorldImportMsg(
          'No se detectaron entradas de mundo. Probá regenerar la Biblia o agregar manualmente.',
        );
      }
    } catch (e) {
      setWorldImportMsg(e instanceof Error ? e.message : 'Falló la detección');
    } finally {
      setWorldPreviewing(false);
    }
  }

  async function importAllWorld() {
    if (!worldPreview || worldPreview.length === 0) return;
    setWorldImporting(true);
    try {
      const created = await importWorldFromBible(worldPreview);
      setWorldImportMsg(`Importadas ${created.length} entradas con marca "de biblia".`);
      setWorldPreview(null);
    } catch (e) {
      setWorldImportMsg(e instanceof Error ? e.message : 'Falló la importación');
    } finally {
      setWorldImporting(false);
    }
  }

  async function importOneWorld(idx: number) {
    if (!worldPreview || !worldPreview[idx]) return;
    setWorldImporting(true);
    try {
      const [created] = await importWorldFromBible([worldPreview[idx]]);
      setWorldImportMsg(created ? `Entrada "${created.name}" importada.` : 'No se pudo importar.');
      setWorldPreview((prev) => prev?.filter((_, i) => i !== idx) ?? null);
    } catch (e) {
      setWorldImportMsg(e instanceof Error ? e.message : 'Falló la importación');
    } finally {
      setWorldImporting(false);
    }
  }

  if (!storyBible) {
    return (
      <div className="text-muted small">
        <span className="spinner-inline me-2" /> Inicializando biblia…
      </div>
    );
  }

  const hasContent = storyBible.sections.some((s) => s.auto.trim() || s.manual.trim());

  return (
    <div>
      <div className="d-flex align-items-center mb-2 gap-1">
        <strong>Biblia de la historia</strong>
        <button
          className="btn btn-sm btn-ai ms-auto"
          onClick={regenerate}
          disabled={busy}
          title="Regenerar a partir del manuscrito actual"
        >
          {busy ? (
            <>
              <span className="spinner-inline me-2" /> Regenerando…
            </>
          ) : (
            <>
              <i className="bi bi-stars me-1" /> Regenerar
            </>
          )}
        </button>
      </div>
      <div className="small text-muted mb-3">
        Resumen auto-generado a partir del manuscrito. Editá cualquier sección para ajustar.
      </div>

      {error ? <div className="alert alert-danger small py-2 mb-2">{error}</div> : null}

      {!hasContent && !busy ? (
        <div className="alert alert-secondary small py-2">
          La biblia está vacía. Hacé click en <strong>Regenerar</strong> para generar las cinco secciones
          a partir del manuscrito actual.
        </div>
      ) : null}

      {storyBible.sections.map((s) => {
        const isEditing = editingKey === s.key;
        const content = (s.manual.trim() ? s.manual : s.auto).trim();
        const isCharactersSection = s.key === 'characters';
        const isWorldSection = s.key === 'world';
        const isStale = Boolean(s.staleAt);
        return (
          <div key={s.key} className="bible-section">
            <div className="d-flex align-items-center mb-1 gap-1">
              <strong className="flex-grow-1">{s.label}</strong>
              {isStale ? (
                <span className="badge bg-warning text-dark small" title="El manuscrito cambió desde que se generó esta sección">
                  <i className="bi bi-exclamation-triangle me-1" /> desactualizada
                </span>
              ) : null}
              {s.manual.trim() ? (
                <span className="badge bg-secondary small" title="Editado manualmente">
                  <i className="bi bi-pencil" />
                </span>
              ) : null}
              <button
                className="icon-btn"
                title="Regenerar solo esta sección"
                onClick={() => regenerateSection(s.key)}
                disabled={busy}
              >
                <i className="bi bi-arrow-repeat" />
              </button>
              <button
                className="icon-btn"
                title={isEditing ? 'Ver vista previa' : 'Editar manualmente'}
                onClick={() => setEditingKey(isEditing ? null : s.key)}
                disabled={!content && !isEditing}
              >
                <i className={`bi bi-${isEditing ? 'eye' : 'pencil'}`} />
              </button>
              {s.manual.trim() ? (
                <button
                  className="icon-btn"
                  title="Volver al contenido auto-generado"
                  onClick={() => updateBibleSection(storyBible.id, s.key, { manual: '' })}
                >
                  <i className="bi bi-arrow-counterclockwise" />
                </button>
              ) : null}
            </div>
            {isEditing ? (
              <textarea
                className="form-control"
                rows={6}
                value={s.manual}
                onChange={(e) =>
                  updateBibleSection(storyBible.id, s.key, { manual: e.target.value })
                }
                placeholder={`Escribí tu versión de "${s.label}"…`}
              />
            ) : content ? (
              <MarkdownView source={content} />
            ) : (
              <div className="text-muted small fst-italic">(vacío)</div>
            )}

            {isCharactersSection ? (
              <BibleBridge
                preview={charactersPreview}
                previewing={charactersPreviewing}
                importing={charactersImporting}
                message={charactersImportMsg}
                content={content}
                modelReady={Boolean(settings.ollamaModel)}
                onPreview={loadCharactersPreview}
                onImportAll={importAllCharacters}
                onImportOne={importOneCharacter}
                kind="character"
              />
            ) : null}
            {isWorldSection ? (
              <BibleBridge
                preview={worldPreview}
                previewing={worldPreviewing}
                importing={worldImporting}
                message={worldImportMsg}
                content={content}
                modelReady={Boolean(settings.ollamaModel)}
                onPreview={loadWorldPreview}
                onImportAll={importAllWorld}
                onImportOne={importOneWorld}
                kind="world"
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

interface BibleBridgeProps {
  content: string;
  preview: BibleEntry[] | null;
  previewing: boolean;
  importing: boolean;
  message: string | null;
  modelReady: boolean;
  onPreview: () => void;
  onImportAll: () => void;
  onImportOne: (idx: number) => void;
  kind: 'character' | 'world';
}

function BibleBridge(props: BibleBridgeProps) {
  const { preview, previewing, importing, message, modelReady, onPreview, onImportAll, onImportOne, kind } = props;
  const targetTab = kind === 'character' ? 'Personajes' : 'Mundo';
  const nameOf = (e: BibleEntry): string => e.name || '(sin nombre)';
  return (
    <div className="mt-2 small">
      <div className="d-flex align-items-center gap-1 flex-wrap">
        <button
          className="btn btn-sm btn-outline-primary"
          onClick={onPreview}
          disabled={previewing || !props.content}
          title="Detectar entradas en esta sección"
        >
          {previewing ? (
            <>
              <span className="spinner-inline me-2" /> Detectando…
            </>
          ) : (
            <>
              <i className="bi bi-search me-1" /> Detectar
            </>
          )}
        </button>
        {preview && preview.length > 0 ? (
          <button
            className="btn btn-sm btn-primary"
            onClick={onImportAll}
            disabled={importing}
            title={`Pasar todos al tab ${targetTab} marcados como "de biblia"`}
          >
            <i className="bi bi-box-arrow-in-right me-1" /> Importar todos ({preview.length})
          </button>
        ) : null}
      </div>
      {!modelReady ? (
        <div className="text-muted small mt-1">
          Sin modelo seleccionado; solo se detectan entradas desde markdown (sin fallback IA).
        </div>
      ) : null}
      {message ? <div className="text-muted small mt-1">{message}</div> : null}
      {preview && preview.length > 0 ? (
        <ul className="list-unstyled mt-2 mb-0">
          {preview.map((entry, i) => (
            <li
              key={`${nameOf(entry)}-${i}`}
              className="d-flex align-items-center gap-2 py-1 border-top border-secondary-subtle"
            >
              <span className="flex-grow-1 text-truncate" title={nameOf(entry)}>
                <strong>{nameOf(entry)}</strong>
                {kind === 'world' && (entry as Partial<WorldEntity>).kind ? (
                  <span className="pill ms-2">{(entry as Partial<WorldEntity>).kind}</span>
                ) : null}
              </span>
              <button
                className="btn btn-sm btn-outline-success"
                onClick={() => onImportOne(i)}
                disabled={importing}
                title={`Pasar "${nameOf(entry)}" al tab ${targetTab}`}
              >
                <i className="bi bi-arrow-right" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}