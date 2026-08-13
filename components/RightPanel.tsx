'use client';

import { useState } from 'react';
import { useApp } from '@/lib/store';
import BrainstormPanel from '@/components/BrainstormPanel';
import CharactersPanel from '@/components/CharactersPanel';
import WorldPanel from '@/components/WorldPanel';
import StoryBiblePanel from '@/components/StoryBiblePanel';

type Tab = 'brainstorm' | 'characters' | 'world' | 'bible';

export default function RightPanel() {
  const { settings, setSettings } = useApp();
  const [tab, setTab] = useState<Tab>('brainstorm');

  function selectTab(next: Tab) {
    setTab(next);
    if (settings.rightPanelCollapsed) setSettings({ rightPanelCollapsed: false });
  }

  if (settings.rightPanelCollapsed) {
    return (
      <div className="d-flex flex-column align-items-center pt-2">
        <button
          className="icon-btn mb-2"
          title="Expandir panel"
          onClick={() => setSettings({ rightPanelCollapsed: false })}
        >
          <i className="bi bi-chevron-double-left" />
        </button>
        <button
          className="icon-btn mb-2"
          title="Brainstorm"
          onClick={() => selectTab('brainstorm')}
        >
          <i className="bi bi-lightbulb" />
        </button>
        <button
          className="icon-btn mb-2"
          title="Personajes"
          onClick={() => selectTab('characters')}
        >
          <i className="bi bi-people" />
        </button>
        <button
          className="icon-btn mb-2"
          title="Mundo"
          onClick={() => selectTab('world')}
        >
          <i className="bi bi-globe" />
        </button>
        <button
          className="icon-btn mb-2"
          title="Biblia"
          onClick={() => selectTab('bible')}
        >
          <i className="bi bi-book" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="right-panel-tabs">
        <button
          className={`right-panel-tab ${tab === 'brainstorm' ? 'active' : ''}`}
          onClick={() => setTab('brainstorm')}
        >
          <i className="bi bi-lightbulb me-1" /> Brainstorm
        </button>
        <button
          className={`right-panel-tab ${tab === 'characters' ? 'active' : ''}`}
          onClick={() => setTab('characters')}
        >
          <i className="bi bi-people me-1" /> Personajes
        </button>
        <button
          className={`right-panel-tab ${tab === 'world' ? 'active' : ''}`}
          onClick={() => setTab('world')}
        >
          <i className="bi bi-globe me-1" /> Mundo
        </button>
        <button
          className={`right-panel-tab ${tab === 'bible' ? 'active' : ''}`}
          onClick={() => setTab('bible')}
        >
          <i className="bi bi-book me-1" /> Biblia
        </button>
        <button
          className="icon-btn ms-auto me-1"
          title="Colapsar panel"
          onClick={() => setSettings({ rightPanelCollapsed: true })}
        >
          <i className="bi bi-chevron-double-right" />
        </button>
      </div>
      <div className="right-panel-content">
        {tab === 'brainstorm' ? <BrainstormPanel /> : null}
        {tab === 'characters' ? <CharactersPanel /> : null}
        {tab === 'world' ? <WorldPanel /> : null}
        {tab === 'bible' ? <StoryBiblePanel /> : null}
      </div>
    </>
  );
}