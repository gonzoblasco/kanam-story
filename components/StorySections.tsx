'use client';

import { STORY_SECTIONS } from '@/lib/storySections';
import ChatPanel from '@/components/ChatPanel';
import BrainstormPanel from '@/components/BrainstormPanel';
import CharactersPanel from '@/components/CharactersPanel';
import WorldPanel from '@/components/WorldPanel';
import StoryBiblePanel from '@/components/StoryBiblePanel';
import StoryBibleSettingsPanel from '@/components/StoryBibleSettingsPanel';
import CompassPanel from '@/components/CompassPanel';

const SECTION_COMPONENT: Record<string, () => React.ReactNode> = {
  'co-writer': () => <ChatPanel />,
  brainstorm: () => <BrainstormPanel />,
  characters: () => <CharactersPanel />,
  world: () => <WorldPanel />,
  bible: () => <StoryBiblePanel />,
  'bible-settings': () => <StoryBibleSettingsPanel />,
  compass: () => <CompassPanel />,
};

/** Vista Historia (Fase 4, U1): las 7 secciones apiladas verticalmente en el
 *  main, una sobre otra con scroll. Sin pestañas. Cada sección es un
 *  `<section aria-labelledby>` con su heading (h2) para jerarquía correcta. */
export default function StorySections() {
  return (
    <div className="main-content">
      <h1 className="view-title">Historia</h1>
      <div className="stacked">
        {STORY_SECTIONS.map((s) => (
          <section
            key={s.key}
            className="stack-section"
            aria-labelledby={s.headingId}
            id={`section-${s.key}`}
          >
            <h2 id={s.headingId} className="stack-section-title">
              <i className={`bi ${s.icon} me-2`} aria-hidden="true" />
              {s.label}
            </h2>
            <div className="stack-section-body">{SECTION_COMPONENT[s.key]()}</div>
          </section>
        ))}
      </div>
    </div>
  );
}
