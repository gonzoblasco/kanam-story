'use client';

import { useState, useRef } from 'react';
import { useApp } from '@/lib/store';
import NewProjectModal from '@/components/NewProjectModal';
import SettingsModal from '@/components/SettingsModal';
import ProjectTree from '@/components/ProjectTree';
import Editor from '@/components/Editor';
import OutlineView from '@/components/OutlineView';
import StorySections from '@/components/StorySections';
import ExportMenu from '@/components/ExportMenu';
import ThemeToggle from '@/components/ThemeToggle';
import SearchPanel from '@/components/SearchPanel';
import VersionHistoryPanel from '@/components/VersionHistoryPanel';
import ChapterReader from '@/components/ChapterReader';

export default function HomePage() {
  const { ready, currentProject, settings, setSettings, view, setView, announcement } = useApp();
  const [showNewProject, setShowNewProject] = useState(false);
  const newProjectTriggerRef = useRef<HTMLButtonElement>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  if (!ready) {
    return (
      <div className="empty-state" style={{ minHeight: '100vh' }}>
        <div>
          <div className="spinner-inline mb-2" />
          <div>Cargando Kanam Story…</div>
        </div>
      </div>
    );
  }

  const shellClass = ['app-shell', settings.sidebarCollapsed ? 'sidebar-collapsed' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={shellClass}>
      <a className="skip-link" href="#contenido-principal">
        Saltar al contenido principal
      </a>
      {/* U4: live region global persistente — anuncia feedback (p.ej. escena
          generada) aunque el componente que lo originó cambie de vista. */}
      <div role="status" aria-live="polite" className="visually-hidden">
        {announcement}
      </div>
      <header className="topbar">
        <button
          className="icon-btn"
          title="Mostrar/ocultar sidebar"
          onClick={() => setSettings({ sidebarCollapsed: !settings.sidebarCollapsed })}
        >
          <i className="bi bi-list" />
        </button>
        <div className="brand">
          <div className="brand-mark">K</div>
          <span>Kanam Story</span>
        </div>
        <div className="ms-auto d-flex align-items-center gap-2">
          {currentProject ? (
            <span className="text-muted small d-none d-md-inline">
              <i className="bi bi-folder2-open me-1" />
              {currentProject.name}
            </span>
          ) : null}
          <button
            className="btn btn-sm btn-outline-secondary"
            title="Alternar entre editor y outline"
            onClick={() => setView(view === 'outline' ? 'editor' : 'outline')}
            disabled={view === 'chapter-reader'}
          >
            <i className={`bi ${view === 'outline' ? 'bi-pencil' : 'bi-list-nested'} me-1`} />
            {view === 'outline' ? 'Editor' : 'Outline'}
          </button>
          <button
            ref={newProjectTriggerRef}
            className="btn btn-sm btn-outline-primary"
            onClick={() => setShowNewProject(true)}
          >
            <i className="bi bi-plus-lg me-1" />
            Nuevo proyecto
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            title="Buscar en todas las escenas"
            onClick={() => setShowSearch(true)}
          >
            <i className="bi bi-search me-1" />
            Buscar
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            title="Ver versiones previas de la escena actual"
            onClick={() => setShowVersionHistory(true)}
          >
            <i className="bi bi-clock-history me-1" />
            Versiones
          </button>
          <ExportMenu />
          <button
            className="icon-btn"
            title="Configuración"
            onClick={() => setShowSettings(true)}
          >
            <i className="bi bi-gear" />
          </button>
          <ThemeToggle />
        </div>
      </header>

      <aside className="sidebar">
        <ProjectTree />
      </aside>

      <main id="contenido-principal" className="main">
        {view === 'outline' ? (
          <OutlineView />
        ) : view === 'story' ? (
          <StorySections />
        ) : view === 'chapter-reader' ? (
          <ChapterReader />
        ) : (
          <Editor />
        )}
      </main>

      <NewProjectModal
        show={showNewProject}
        onClose={() => {
          setShowNewProject(false);
          // Restaura el foco al botón que abrió el modal para que no quede
          // atrapado en un nodo aria-hidden (a11y, WCAG 2.4.3).
          newProjectTriggerRef.current?.focus();
        }}
      />
      <SettingsModal show={showSettings} onClose={() => setShowSettings(false)} />
      {showSearch ? <SearchPanel onClose={() => setShowSearch(false)} /> : null}
      {showVersionHistory ? (
        <VersionHistoryPanel onClose={() => setShowVersionHistory(false)} />
      ) : null}
    </div>
  );
}