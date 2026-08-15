/**
 * Component tests (U8) for the stacked-sections layout (Fase 4).
 *
 * Covers the accessible accordion (aria-expanded / aria-controls + hidden body),
 * the scrollspy (IntersectionObserver updates the active section), and the U8
 * section-focus mechanism (requestSectionFocus moves focus to the target
 * section's heading toggle after a contextual navigation).
 */
// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { StorySectionKey } from '@/types';

// Mock the store hook. StorySections only needs the section state + focus nonce.
vi.mock('@/lib/store', () => ({
  useApp: () => mockApp,
}));

// Mock the section panels so the test only exercises the layout shell, not the
// heavy panels (chat, brainstorm, etc.).
vi.mock('@/components/ChatPanel', () => ({ default: () => <div data-testid="panel-co-writer" /> }));
vi.mock('@/components/BrainstormPanel', () => ({ default: () => <div data-testid="panel-brainstorm" /> }));
vi.mock('@/components/CharactersPanel', () => ({ default: () => <div data-testid="panel-characters" /> }));
vi.mock('@/components/WorldPanel', () => ({ default: () => <div data-testid="panel-world" /> }));
vi.mock('@/components/StoryBiblePanel', () => ({ default: () => <div data-testid="panel-bible" /> }));
vi.mock('@/components/StoryBibleSettingsPanel', () => ({ default: () => <div data-testid="panel-bible-settings" /> }));
vi.mock('@/components/CompassPanel', () => ({ default: () => <div data-testid="panel-compass" /> }));

import StorySections from '@/components/StorySections';

const mockApp = {
  activeStorySection: 'co-writer' as StorySectionKey,
  setActiveStorySection: vi.fn(),
  sectionFocusNonce: 0,
  sectionFocusTarget: null as StorySectionKey | null,
};

// jsdom lacks IntersectionObserver and scrollIntoView; provide stubs.
class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  constructor(cb: IntersectionObserverCallback) {
    this.callback = cb;
    MockIntersectionObserver.instances.push(this);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  root = null;
  rootMargin = '';
  thresholds = [];
}

beforeEach(() => {
  vi.resetAllMocks();
  mockApp.activeStorySection = 'co-writer';
  mockApp.sectionFocusNonce = 0;
  mockApp.sectionFocusTarget = null;
  MockIntersectionObserver.instances = [];
  globalThis.IntersectionObserver = MockIntersectionObserver;
  Element.prototype.scrollIntoView = vi.fn();
});

describe('StorySections: acordeón accesible (U2)', () => {
  it('todas las secciones arrancan expandidas con aria-expanded true', () => {
    render(
      <div id="contenido-principal">
        <StorySections />
      </div>,
    );
    const toggles = screen.getAllByRole('button', { name: /co-writer|brainstorm|personajes|mundo|biblia|ajustes|brújula/i });
    // 7 secciones apiladas.
    expect(toggles).toHaveLength(7);
    for (const t of toggles) {
      expect(t).toHaveAttribute('aria-expanded', 'true');
    }
  });

  it('colapsar una sección pone aria-expanded false y oculta el body', async () => {
    const user = userEvent.setup();
    render(
      <div id="contenido-principal">
        <StorySections />
      </div>,
    );
    const personajes = screen.getByRole('button', { name: /personajes/i });
    await user.click(personajes);
    expect(personajes).toHaveAttribute('aria-expanded', 'false');
    // El body de la sección queda hidden pero el heading (h2) permanece.
    const body = document.getElementById('body-characters');
    expect(body).toHaveAttribute('hidden');
    expect(screen.getByRole('button', { name: /personajes/i })).toBeInTheDocument();
  });

  it('cada toggle expone aria-controls apuntando a su body', () => {
    render(
      <div id="contenido-principal">
        <StorySections />
      </div>,
    );
    const coWriter = screen.getByRole('button', { name: /co-writer/i });
    expect(coWriter).toHaveAttribute('aria-controls', 'body-co-writer');
  });
});

describe('StorySections: scrollspy (U2)', () => {
  it('el IntersectionObserver marca la sección más visible como activa', () => {
    render(
      <div id="contenido-principal">
        <StorySections />
      </div>,
    );
    expect(MockIntersectionObserver.instances.length).toBe(1);
    const observer = MockIntersectionObserver.instances[0];

    const fakeEntry = {
      isIntersecting: true,
      intersectionRatio: 0.9,
      target: document.getElementById('section-world') as HTMLElement,
    } as unknown as IntersectionObserverEntry;
    observer.callback([fakeEntry], observer as unknown as IntersectionObserver);

    expect(mockApp.setActiveStorySection).toHaveBeenCalledWith('world');
  });
});

describe('StorySections: foco de sección tras navegación contextual (U8)', () => {
  it('requestSectionFocus mueve el foco al toggle del heading de la sección', () => {
    mockApp.sectionFocusNonce = 1;
    mockApp.sectionFocusTarget = 'characters';
    render(
      <div id="contenido-principal">
        <StorySections />
      </div>,
    );
    const toggle = screen.getByRole('button', { name: /personajes/i });
    expect(toggle).toHaveFocus();
  });
});
