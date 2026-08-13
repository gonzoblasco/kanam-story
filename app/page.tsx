'use client';

import { useState } from 'react';
import { useApp } from '@/lib/store';
import NewProjectModal from '@/components/NewProjectModal';
import SettingsModal from '@/components/SettingsModal';
import ProjectTree from '@/components/ProjectTree';
import Editor from '@/components/Editor';
import OutlineView from '@/components/OutlineView';
import RightPanel from '@/components/RightPanel';

export default function HomePage() {
  const { ready, currentProject, settings, setSettings, view, setView } = useApp();
  const [showNewProject, setShowNewProject] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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

  const shellClass = [
    'app-shell',
    settings.sidebarCollapsed ? 'sidebar-collapsed' : '',
    settings.rightPanelCollapsed ? 'right-collapsed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={shellClass}>
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
            title={view === 'outline' ? 'Volver al editor' : 'Ver el outline'}
            onClick={() => setView(view === 'outline' ? 'editor' : 'outline')}
          >
            <i className={`bi ${view === 'outline' ? 'bi-pencil' : 'bi-list-nested'} me-1`} />
            {view === 'outline' ? 'Editor' : 'Outline'}
          </button>
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={() => setShowNewProject(true)}
          >
            <i className="bi bi-plus-lg me-1" />
            Nuevo proyecto
          </button>
          <button
            className="icon-btn"
            title="Configuración"
            onClick={() => setShowSettings(true)}
          >
            <i className="bi bi-gear" />
          </button>
          <button
            className="icon-btn"
            title="Cambiar tema"
            onClick={() =>
              setSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })
            }
          >
            <i className={`bi bi-${settings.theme === 'dark' ? 'sun' : 'moon-stars'}`} />
          </button>
        </div>
      </header>

      <aside className="sidebar">
        <ProjectTree />
      </aside>

      <main className="main">{view === 'outline' ? <OutlineView /> : <Editor />}</main>

      <aside className="right-panel">
        <RightPanel />
      </aside>

      <NewProjectModal show={showNewProject} onClose={() => setShowNewProject(false)} />
      <SettingsModal show={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}