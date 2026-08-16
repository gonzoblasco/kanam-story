/**
 * Component tests (B2) using jsdom + @testing-library/react.
 *
 * Focus on the Phase 3 features: StoryBiblePanel auto-sync of characters and
 * world after regeneration (U5/U6). The panel pulls everything from `useApp()`,
 * so we mock the store hook with a controlled state and assert the sync flow.
 */
// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { StoryBible } from '@/types';

// Mock the store hook and the MarkdownView child (renders markdown; not under test).
vi.mock('@/lib/store', () => ({
  useApp: () => mockApp,
}));
vi.mock('@/components/MarkdownView', () => ({
  default: () => <div data-testid="markdown-view" />,
}));

import StoryBiblePanel from '@/components/StoryBiblePanel';

// --- Mock state ---

const defaultBible: StoryBible = {
  id: 'b1',
  projectId: 'p1',
  generatedAt: 0,
  updatedAt: 0,
  sections: [
    { key: 'summary', label: 'Resumen', manual: '', auto: '', updatedAt: 0 },
    { key: 'themes', label: 'Temas', manual: '', auto: '', updatedAt: 0 },
    { key: 'characters', label: 'Personajes', manual: '', auto: '', updatedAt: 0 },
    { key: 'world', label: 'Mundo', manual: '', auto: '', updatedAt: 0 },
    { key: 'rules', label: 'Reglas', manual: '', auto: '', updatedAt: 0 },
  ],
};

const mockApp = {
  currentProject: { id: 'p1', name: 'Proyecto' },
  storyBible: defaultBible,
  settings: { theme: 'dark' },
  setSettings: vi.fn(),
  regenerateStoryBible: vi.fn(),
  regenerateBibleSection: vi.fn(),
  ensureStoryBible: vi.fn(),
  updateBibleSection: vi.fn(),
  previewBibleCharacters: vi.fn(),
  importCharactersFromBible: vi.fn(),
  syncCharactersFromBible: vi.fn(),
  previewBibleWorld: vi.fn(),
  importWorldFromBible: vi.fn(),
  syncWorldFromBible: vi.fn(),
};

beforeEach(() => {
  vi.resetAllMocks();
  mockApp.storyBible = defaultBible;
  mockApp.regenerateStoryBible.mockResolvedValue(undefined);
  // ensureStoryBible is called in a useEffect guarded by `storyBible`; give it a
  // resolved Promise to match the store signature so it never throws if reached.
  mockApp.ensureStoryBible.mockResolvedValue(defaultBible);
  mockApp.syncCharactersFromBible.mockResolvedValue({ created: 2, updated: 1 });
  mockApp.syncWorldFromBible.mockResolvedValue({ created: 0, updated: 0 });
});

const REGENERATE_TITLE = 'Regenerar a partir del manuscrito actual';

function regenerateButton() {
  return screen.getByTitle(REGENERATE_TITLE);
}

describe('StoryBiblePanel: auto-sync after regeneration (U5/U6)', () => {
  it('renders the Regenerate button', () => {
    render(<StoryBiblePanel />);
    expect(regenerateButton()).toBeInTheDocument();
  });

  it('calls regenerateStoryBible then syncs characters and world, and shows the message', async () => {
    const user = userEvent.setup();
    render(<StoryBiblePanel />);

    await user.click(regenerateButton());

    await waitFor(() => {
      expect(mockApp.regenerateStoryBible).toHaveBeenCalledTimes(1);
      expect(mockApp.syncCharactersFromBible).toHaveBeenCalledTimes(1);
      expect(mockApp.syncWorldFromBible).toHaveBeenCalledTimes(1);
    });

    // Characters created 2, updated 1 → message shown.
    expect(
      await screen.findByText(/Sincronizados 2 personaje\(s\) nuevos y 1 actualizado\(s\) desde la Biblia/i),
    ).toBeInTheDocument();
  });

  it('shows no world message when world sync is a no-op', async () => {
    mockApp.syncWorldFromBible.mockResolvedValue({ created: 0, updated: 0 });
    const user = userEvent.setup();
    render(<StoryBiblePanel />);

    await user.click(regenerateButton());

    await waitFor(() => {
      expect(mockApp.regenerateStoryBible).toHaveBeenCalledTimes(1);
    });

    // World sync returned 0/0 → no world import message.
    expect(screen.queryByText(/entrada\(s\) nueva/i)).not.toBeInTheDocument();
  });

  it('syncs run AFTER regeneration (order is preserved)', async () => {
    const calls: string[] = [];
    mockApp.regenerateStoryBible.mockImplementation(async () => {
      calls.push('regenerate');
    });
    mockApp.syncCharactersFromBible.mockImplementation(async () => {
      calls.push('sync-characters');
      return { created: 1, updated: 0 };
    });
    mockApp.syncWorldFromBible.mockImplementation(async () => {
      calls.push('sync-world');
      return { created: 0, updated: 0 };
    });

    const user = userEvent.setup();
    render(<StoryBiblePanel />);
    await user.click(regenerateButton());

    await waitFor(() => {
      expect(calls).toEqual(['regenerate', 'sync-characters', 'sync-world']);
    });
  });

  it('surfaces an error if regeneration fails', async () => {
    mockApp.regenerateStoryBible.mockRejectedValue(new Error('Ollama down'));
    const user = userEvent.setup();
    render(<StoryBiblePanel />);

    await user.click(regenerateButton());

    expect(await screen.findByText(/Ollama down/i)).toBeInTheDocument();
    // Syncs must NOT run after a failed regeneration.
    expect(mockApp.syncCharactersFromBible).not.toHaveBeenCalled();
    expect(mockApp.syncWorldFromBible).not.toHaveBeenCalled();
  });

  it('shows the empty-bible hint when sections are empty', () => {
    const emptyBible: StoryBible = {
      ...defaultBible,
      sections: defaultBible.sections.map((s) => ({ ...s, manual: '', auto: '' })),
    };
    mockApp.storyBible = emptyBible;
    render(<StoryBiblePanel />);
    expect(screen.getAllByText(/La biblia está vacía/i).length).toBeGreaterThan(0);
  });
});
