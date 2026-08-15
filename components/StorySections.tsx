'use client';

import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/lib/store';
import { STORY_SECTIONS } from '@/lib/storySections';
import type { StorySectionKey } from '@/types';
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

/** Vista Historia (Fase 4): las 7 secciones apiladas verticalmente en el main.
 *  U1: cada sección es un `<section aria-labelledby>` con su h2 bajo el h1.
 *  U2: scrollspy (el sidebar resalta la sección activa al scroll, actualizando
 *  `aria-current`) + acordeón (cada sección se colapsa/expande con
 *  `aria-expanded`/`aria-controls` y un toggle operable por teclado). El h2 se
 *  mantiene siempre presente para no romper la jerarquía de headings. */
export default function StorySections() {
  const { activeStorySection, setActiveStorySection, sectionFocusNonce, sectionFocusTarget } = useApp();
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(STORY_SECTIONS.map((s) => [s.key, true])),
  );
  // Última sección marcada por el scrollspy. Sirve para distinguir un cambio de
  // `activeStorySection` provocado por scroll (no hay que re-posicionar) de uno
  // provocado por click en el sidebar (hay que hacer scroll hasta la sección).
  const scrollspyRef = useRef<StorySectionKey | null>(null);

  // Scrollspy: observa qué sección cruza la banda superior del main y la marca
  // como activa en el store (el sidebar la resalta y actualiza `aria-current`).
  useEffect(() => {
    const mainEl = document.getElementById('contenido-principal');
    if (!mainEl) return;
    const sections = STORY_SECTIONS.map((s) => ({
      key: s.key,
      el: document.getElementById(`section-${s.key}`),
    })).filter((x) => x.el);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let bestKey: StorySectionKey | null = null;
        let bestRatio = -1;
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestKey = (entry.target as HTMLElement).id.replace('section-', '') as StorySectionKey;
          }
        }
        if (bestKey && bestKey !== scrollspyRef.current) {
          scrollspyRef.current = bestKey;
          setActiveStorySection(bestKey);
        }
      },
      { root: mainEl, rootMargin: '0px 0px -80% 0px', threshold: [0, 0.1, 0.5, 1] },
    );
    sections.forEach((s) => observer.observe(s.el!));
    return () => observer.disconnect();
  }, [setActiveStorySection]);

  // Navegación desde el sidebar: si el cambio de sección no vino del scroll,
  // lleva la sección al inicio del main.
  useEffect(() => {
    if (scrollspyRef.current === activeStorySection) return;
    const el = document.getElementById(`section-${activeStorySection}`);
    const mainEl = document.getElementById('contenido-principal');
    if (el && mainEl) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      scrollspyRef.current = activeStorySection;
    }
  }, [activeStorySection]);

  // U8: cuando `requestSectionFocus()` pide enfocar una sección (p.ej. tras
  // aceptar una propuesta del co-writer que navega a Personajes/Mundo/Biblia),
  // mueve el foco al toggle del heading. Evita que el foco caiga a <body> al
  // desmontarse el botón Aceptar/Descartar (WCAG 2.4.3).
  useEffect(() => {
    if (sectionFocusNonce > 0 && sectionFocusTarget) {
      const toggle = document.querySelector<HTMLButtonElement>(
        `#section-${sectionFocusTarget} .stack-section-toggle`,
      );
      toggle?.focus();
    }
  }, [sectionFocusNonce, sectionFocusTarget]);

  function toggle(key: string) {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="main-content">
      <h1 className="view-title">Historia</h1>
      <div className="stacked">
        {STORY_SECTIONS.map((s) => {
          const isOpen = open[s.key];
          return (
            <section
              key={s.key}
              className="stack-section"
              aria-labelledby={s.headingId}
              id={`section-${s.key}`}
            >
              <h2 id={s.headingId} className="stack-section-title">
                <button
                  type="button"
                  className="stack-section-toggle"
                  aria-expanded={isOpen}
                  aria-controls={`body-${s.key}`}
                  onClick={() => toggle(s.key)}
                >
                  <i className={`bi ${s.icon} me-2`} aria-hidden="true" />
                  <span>{s.label}</span>
                  <i
                    className={`bi ${isOpen ? 'bi-chevron-up' : 'bi-chevron-down'} stack-chevron`}
                    aria-hidden="true"
                  />
                </button>
              </h2>
              <div id={`body-${s.key}`} className="stack-section-body" hidden={!isOpen}>
                {SECTION_COMPONENT[s.key]()}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
