'use client';

import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/lib/store';
import { STORY_SECTIONS } from '@/lib/storySections';
import ActionMenu from '@/components/ActionMenu';
import type { Chapter, StorySectionKey } from '@/types';

export default function ProjectTree() {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const seenChapterIds = useRef<Set<string>>(new Set());
  const {
    projects,
    currentProject,
    selectProject,
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
    setSettings,
  } = useApp();

  useEffect(() => {
    setExpanded((prev) => {
      if (prev.size > 0) return prev;
      const collapsed = new Set(settings.collapsedChapterIds ?? []);
      const initial = new Set(chapters.filter((c) => !collapsed.has(c.id)).map((c) => c.id));
      // Si no hay persistencia, expandir el capítulo de la escena activa.
      if (initial.size === 0 && currentSceneId) {
        const chapterId = scenes.find((s) => s.id === currentSceneId)?.chapterId;
        if (chapterId) initial.add(chapterId);
      }
      return initial;
    });
  }, []);

  useEffect(() => {
    setExpanded((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const c of chapters) {
        if (!seenChapterIds.current.has(c.id)) {
          seenChapterIds.current.add(c.id);
          if (!next.has(c.id)) {
            next.add(c.id);
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [chapters]);

  const collapsed = settings.sidebarCollapsed;

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
      void addScene(chapterId, true);
    }
  }

  function renameChapter(c: Chapter) {
    const next = window.prompt('Título del capítulo', c.title);
    if (next && next !== c.title) updateChapter(c.id, { title: next });
  }

  function removeChapter(c: Chapter) {
    if (window.confirm(`¿Eliminar "${c.title}" y todas sus escenas?`)) {
      deleteChapter(c.id);
    }
  }

  function renameScene(id: string, title: string) {
    const next = window.prompt('Título de la escena', title);
    if (next && next !== title) updateScene(id, { title: next });
  }

  function removeScene(id: string, title: string) {
    if (window.confirm(`¿Eliminar "${title}"?`)) deleteScene(id);
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
            setExpanded((prev) => {
              const next = new Set(prev);
              if (next.has(c.id)) next.delete(c.id);
              else next.add(c.id);
              const collapsed = chapters.map((ch) => ch.id).filter((id) => !next.has(id));
              void setSettings({ collapsedChapterIds: collapsed });
              return next;
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
                <span
                  id={chapterLabelId}
                  className="text-truncate"
                  onClick={toggle}
                >
                  {c.title}
                </span>
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
                      className={`tree-item ${s.id === currentSceneId ? 'active' : ''}`}
                      onClick={() => openScene(s.id)}
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
    </>
  );
}
