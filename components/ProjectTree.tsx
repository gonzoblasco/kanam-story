'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/lib/store';
import { STORY_SECTIONS } from '@/lib/storySections';
import ActionMenu from '@/components/ActionMenu';
import ConfirmDialog from '@/components/ConfirmDialog';
import PromptDialog from '@/components/PromptDialog';
import type { Chapter, StorySectionKey } from '@/types';

export default function ProjectTree() {
  const {
    projects,
    currentProject,
    selectProject,
    deleteProject,
    createChapter,
    createScene,
    updateChapter,
    deleteChapter,
    updateScene,
    deleteScene,
    chapters,
    scenes,
    currentSceneId,
    selectScene,
    settings,
    view,
    setView,
    activeStorySection,
    setActiveStorySection,
    setCurrentOutlineChapterId,
    setCurrentChapterId,
    selectChapter,
    setSettings,
  } = useApp();

  const collapsedIds = useMemo(
    () => new Set(settings.collapsedChapterIds ?? []),
    [settings.collapsedChapterIds],
  );

  const expanded = useMemo(() => {
    const next = new Set(chapters.map((c) => c.id));
    for (const id of collapsedIds) next.delete(id);
    // Auto-expand the active scene chapter if no chapter is expanded.
    if (next.size === 0 && currentSceneId) {
      const chapterId = scenes.find((s) => s.id === currentSceneId)?.chapterId;
      if (chapterId) next.add(chapterId);
    }
    return next;
  }, [chapters, collapsedIds, currentSceneId, scenes]);

  const collapsed = settings.sidebarCollapsed;

  // Diálogos accesibles (reemplazan window.prompt / window.confirm nativos).
  const [renameChapterTarget, setRenameChapterTarget] = useState<Chapter | null>(null);
  const [removeChapterTarget, setRemoveChapterTarget] = useState<Chapter | null>(null);
  const [removeProjectTarget, setRemoveProjectTarget] = useState<{ id: string; name: string } | null>(null);
  const [renameSceneTarget, setRenameSceneTarget] = useState<{ id: string; title: string } | null>(null);
  const [removeSceneTarget, setRemoveSceneTarget] = useState<{ id: string; title: string } | null>(null);

  if (projects.length === 0) {
    return (
      <div className="empty-state" style={{ minHeight: 200 }}>
        <div>
          <i className="bi bi-journal-plus fs-1 d-block mb-2" />
          <div className="small">Todavía no hay proyectos.</div>
          <div className="small text-muted">Hacé click en &quot;Nuevo proyecto&quot; arriba.</div>
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="sidebar-section">
        <div className="sidebar-section-title">
          <span>Proyectos</span>
        </div>
        {projects.map((p) => (
          <div
            key={p.id}
            className="tree-item"
            onClick={() => selectProject(p.id)}
          >
            <i className="bi bi-folder2" />
            <span className="text-truncate">{p.name}</span>
            <div className="actions">
              <button
                type="button"
                className="icon-btn"
                title={`Eliminar proyecto ${p.name}`}
                aria-label={`Eliminar proyecto ${p.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  removeProject(p);
                }}
              >
                <i className="bi bi-trash" aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  function addChapter() {
    if (!currentProject) return;
    const order = chapters.length;
    createChapter({
      projectId: currentProject.id,
      title: `Capítulo ${order + 1}`,
      order,
    });
  }

  function addScene(chapterId: string, focus = true) {
    if (!currentProject) return;
    const order = scenes.filter((s) => s.chapterId === chapterId).length;
    return createScene({
      projectId: currentProject.id,
      chapterId,
      title: `Escena ${order + 1}`,
      content: '',
      summary: '',
      order,
    }).then((scene) => {
      if (focus && scene?.id) openScene(scene.id);
      return scene;
    });
  }

  function openScene(id: string) {
    selectScene(id);
    setView('editor');
  }

  function openChapter(chapterId: string) {
    setCurrentChapterId(chapterId);
  }

  function openChapterFirstScene(chapterId: string) {
    const chapterScenes = scenes.filter((s) => s.chapterId === chapterId);
    const scene = chapterScenes[0];
    if (scene) {
      openScene(scene.id);
    } else {
      // U3: un capítulo sin escenas se abre como "capítulo directo" editable
      // (selectChapter) en vez de forzar la creación de una escena.
      selectChapter(chapterId);
    }
  }

  function renameChapter(c: Chapter) {
    setRenameChapterTarget(c);
  }

  function removeChapter(c: Chapter) {
    setRemoveChapterTarget(c);
  }

  function removeProject(p: { id: string; name: string }) {
    setRemoveProjectTarget(p);
  }

  function renameScene(id: string, title: string) {
    setRenameSceneTarget({ id, title });
  }

  function removeScene(id: string, title: string) {
    setRemoveSceneTarget({ id, title });
  }

  if (collapsed) {
    return (
      <div className="sidebar-section text-center">
        <div className="sidebar-section-title">
          <i className="bi bi-folder2" />
        </div>
        {chapters.map((c) => (
          <div
            key={c.id}
            className="tree-item justify-content-center"
            title={c.title}
            onClick={() => openChapter(c.id)}
          >
            <i className="bi bi-bookmark" />
          </div>
        ))}
        <button className="icon-btn mt-2" title="Agregar capítulo" onClick={addChapter}>
          <i className="bi bi-plus-lg" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="sidebar-section">
        <div className="sidebar-section-title">
          <span>Proyectos</span>
        </div>
        {projects.map((p) => (
          <div
            key={p.id}
            className={`tree-item ${p.id === currentProject.id ? 'active' : ''}`}
            onClick={() => selectProject(p.id)}
          >
            <i className="bi bi-folder2-open" />
            <span className="text-truncate">{p.name}</span>
            <div className="actions">
              <button
                type="button"
                className="icon-btn"
                title={`Eliminar proyecto ${p.name}`}
                aria-label={`Eliminar proyecto ${p.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  removeProject(p);
                }}
              >
                <i className="bi bi-trash" aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <nav className="sidebar-section" aria-label="Secciones">
        <div className="sidebar-section-title">
          <span>Navegación</span>
        </div>
        <button
          type="button"
          className={`tree-item sidebar-nav-item ${view === 'editor' ? 'active' : ''}`}
          aria-current={view === 'editor' ? 'true' : undefined}
          onClick={() => setView('editor')}
        >
          <i className="bi bi-pencil" />
          <span>Escritura</span>
        </button>
        <button
          type="button"
          className={`tree-item sidebar-nav-item ${view === 'outline' ? 'active' : ''}`}
          aria-current={view === 'outline' ? 'true' : undefined}
          onClick={() => setView('outline')}
        >
          <i className="bi bi-list-nested" />
          <span>Outline</span>
        </button>
        <div className="sidebar-nav-group">Historia</div>
        {STORY_SECTIONS.map((s) => {
          const isActive = view === 'story' && activeStorySection === s.key;
          return (
            <button
              key={s.key}
              type="button"
              className={`tree-item sidebar-nav-item ${isActive ? 'active' : ''}`}
              aria-current={isActive ? 'true' : undefined}
              onClick={() => {
                setActiveStorySection(s.key as StorySectionKey);
                setView('story');
              }}
            >
              <i className={`bi ${s.icon}`} />
              <span>{s.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-section">
        <div className="sidebar-section-title">
          <span>Manuscrito</span>
          <button className="icon-btn" title="Agregar capítulo" onClick={addChapter}>
            <i className="bi bi-plus-lg" />
          </button>
        </div>
        {chapters.length === 0 ? (
          <div className="small text-muted px-2">
            No hay capítulos todavía. Hacé click en + para agregar uno.
          </div>
        ) : null}
        {chapters.map((c) => {
          const chapterScenes = scenes.filter((s) => s.chapterId === c.id);
          const isExpanded = expanded.has(c.id);
          const chapterLabelId = `chapter-${c.id}-label`;
          const sceneListId = `chapter-${c.id}-scenes`;
          const toggle = () => {
            const isExpanded = expanded.has(c.id);
            void setSettings({
              collapsedChapterIds: isExpanded
                ? [...(settings.collapsedChapterIds ?? []), c.id]
                : (settings.collapsedChapterIds ?? []).filter((id) => id !== c.id),
            });
          };
          return (
            <div key={c.id}>
              <div className="tree-item">
                <button
                  type="button"
                  className="icon-btn chapter-toggle"
                  onClick={toggle}
                  aria-expanded={isExpanded}
                  aria-controls={sceneListId}
                  aria-labelledby={chapterLabelId}
                  title={isExpanded ? 'Colapsar capítulo' : 'Expandir capítulo'}
                >
                  <i className={`bi ${isExpanded ? 'bi-caret-down-fill' : 'bi-caret-right-fill'}`} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  id={chapterLabelId}
                  className="tree-item-label text-truncate"
                  onClick={toggle}
                  aria-expanded={isExpanded}
                >
                  {c.title}
                </button>
                {chapterScenes.length === 0 ? (
                  <span className="tree-chapter-direct" title="Capítulo directo (sin escenas)">
                    <i className="bi bi-book" aria-hidden="true" />
                  </span>
                ) : null}
                <div className="actions">
                  <ActionMenu trigger={<i className="bi bi-three-dots-vertical" />} triggerTitle={`Acciones de ${c.title}`}>
                    <button
                      type="button"
                      className="action-menu-item"
                      role="menuitem"
                      onClick={() => openChapter(c.id)}
                    >
                      <i className="bi bi-book" /> Ver capítulo
                    </button>
                    <button
                      type="button"
                      className="action-menu-item"
                      role="menuitem"
                      onClick={() => openChapterFirstScene(c.id)}
                    >
                      <i className="bi bi-file-earmark-text" /> Abrir primera escena
                    </button>
                    <button
                      type="button"
                      className="action-menu-item"
                      role="menuitem"
                      onClick={() => {
                        setCurrentOutlineChapterId(c.id);
                        setView('outline');
                      }}
                    >
                      <i className="bi bi-list-nested" /> Ver outline
                    </button>
                    <button
                      type="button"
                      className="action-menu-item"
                      role="menuitem"
                      onClick={() => renameChapter(c)}
                    >
                      <i className="bi bi-pencil" /> Renombrar capítulo
                    </button>
                    <button
                      type="button"
                      className="action-menu-item"
                      role="menuitem"
                      onClick={() => addScene(c.id)}
                    >
                      <i className="bi bi-plus-lg" /> Agregar escena
                    </button>
                    <button
                      type="button"
                      className="action-menu-item action-menu-item-danger"
                      role="menuitem"
                      onClick={() => removeChapter(c)}
                    >
                      <i className="bi bi-trash" /> Eliminar capítulo
                    </button>
                  </ActionMenu>
                </div>
              </div>
              {isExpanded ? (
                <div id={sceneListId} className="tree-children">
                  {chapterScenes.map((s) => (
                    <div
                      key={s.id}
                      role="button"
                      tabIndex={0}
                      className={`tree-item ${s.id === currentSceneId ? 'active' : ''}`}
                      onClick={() => openScene(s.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openScene(s.id);
                        }
                      }}
                    >
                      <i className="bi bi-file-earmark-text" />
                      <span className="text-truncate">
                        {s.title || 'Escena sin título'}
                      </span>
                      <div className="actions">
                        <ActionMenu trigger={<i className="bi bi-three-dots-vertical" />} triggerTitle={`Acciones de ${s.title || 'Escena sin título'}`}
                        >
                          <button
                            type="button"
                            className="action-menu-item"
                            role="menuitem"
                            onClick={(e) => { e.stopPropagation(); renameScene(s.id, s.title); }}
                          >
                            <i className="bi bi-pencil" /> Renombrar escena
                          </button>
                          <button
                            type="button"
                            className="action-menu-item action-menu-item-danger"
                            role="menuitem"
                            onClick={(e) => { e.stopPropagation(); removeScene(s.id, s.title); }}
                          >
                            <i className="bi bi-trash" /> Eliminar escena
                          </button>
                        </ActionMenu>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Diálogos accesibles (reemplazan window.prompt / window.confirm). */}
      <PromptDialog
        show={renameChapterTarget !== null}
        title="Renombrar capítulo"
        label="Título del capítulo"
        initialValue={renameChapterTarget?.title ?? ''}
        confirmLabel="Renombrar"
        onCancel={() => setRenameChapterTarget(null)}
        onConfirm={(next) => {
          if (renameChapterTarget && next && next !== renameChapterTarget.title) {
            updateChapter(renameChapterTarget.id, { title: next });
          }
          setRenameChapterTarget(null);
        }}
      />
      <ConfirmDialog
        show={removeChapterTarget !== null}
        title="Eliminar capítulo"
        message={`¿Eliminar "${removeChapterTarget?.title ?? ''}" y todas sus escenas?`}
        confirmLabel="Eliminar"
        danger
        onCancel={() => setRemoveChapterTarget(null)}
        onConfirm={() => {
          if (removeChapterTarget) deleteChapter(removeChapterTarget.id);
          setRemoveChapterTarget(null);
        }}
      />
      <ConfirmDialog
        show={removeProjectTarget !== null}
        title="Eliminar proyecto"
        message={`¿Eliminar el proyecto "${removeProjectTarget?.name ?? ''}" y TODO su contenido? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        onCancel={() => setRemoveProjectTarget(null)}
        onConfirm={() => {
          if (removeProjectTarget) void deleteProject(removeProjectTarget.id);
          setRemoveProjectTarget(null);
        }}
      />
      <PromptDialog
        show={renameSceneTarget !== null}
        title="Renombrar escena"
        label="Título de la escena"
        initialValue={renameSceneTarget?.title ?? ''}
        confirmLabel="Renombrar"
        onCancel={() => setRenameSceneTarget(null)}
        onConfirm={(next) => {
          if (renameSceneTarget && next && next !== renameSceneTarget.title) {
            updateScene(renameSceneTarget.id, { title: next });
          }
          setRenameSceneTarget(null);
        }}
      />
      <ConfirmDialog
        show={removeSceneTarget !== null}
        title="Eliminar escena"
        message={`¿Eliminar "${removeSceneTarget?.title ?? ''}"?`}
        confirmLabel="Eliminar"
        danger
        onCancel={() => setRemoveSceneTarget(null)}
        onConfirm={() => {
          if (removeSceneTarget) deleteScene(removeSceneTarget.id);
          setRemoveSceneTarget(null);
        }}
      />
    </>
  );
}
