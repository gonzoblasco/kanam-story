/**
 * Component tests (B2 follow-up) for the CharactersPanel "Revertir import"
 * button (U7). The panel renders each character as a card; the revert action is
 * only available while editing a character whose `source === 'biblia'`.
 */
// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Character } from '@/types';

// Mock the store hook. CharactersPanel also reads localStorage via readAutoFill
// (a best-effort auto-fill guard); with characters already present it short-
// circuits and never calls ensureStoryBible/regenerateStoryBible.
vi.mock('@/lib/store', () => ({
  useApp: () => mockApp,
}));

import CharactersPanel from '@/components/CharactersPanel';

const mockApp = {
  currentProject: { id: 'p1', name: 'Proyecto' },
  characters: [] as Character[],
  createCharacter: vi.fn(),
  updateCharacter: vi.fn(),
  deleteCharacter: vi.fn(),
  generateCharacter: vi.fn(),
  revertBibleImport: vi.fn(),
  ensureStoryBible: vi.fn(),
  regenerateStoryBible: vi.fn(),
};

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'c1',
    projectId: 'p1',
    name: 'Ada',
    type: 'protagonist',
    age: '',
    appearance: '',
    personality: '',
    voice: '',
    backstory: '',
    goals: '',
    source: 'manual',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mockApp.characters = [makeCharacter({ source: 'biblia' })];
  mockApp.revertBibleImport.mockResolvedValue(undefined);
  // The auto-fill effect only fires when there are no characters; keep the guard
  // simple by ensuring the resolved-promise signatures are present.
  mockApp.ensureStoryBible.mockResolvedValue(null);
  mockApp.regenerateStoryBible.mockResolvedValue(undefined);
});

describe('CharactersPanel: revert bible import (U7)', () => {
  it('shows the "Revertir import" button when editing a bible-sourced character', async () => {
    const user = userEvent.setup();
    render(<CharactersPanel />);

    // Click the card to enter edit mode.
    await user.click(screen.getByText('Ada'));

    expect(screen.getByRole('button', { name: /revertir import/i })).toBeInTheDocument();
  });

  it('calls revertBibleImport("character", id) when clicked', async () => {
    const user = userEvent.setup();
    render(<CharactersPanel />);

    await user.click(screen.getByText('Ada'));
    await user.click(screen.getByRole('button', { name: /revertir import/i }));

    expect(mockApp.revertBibleImport).toHaveBeenCalledTimes(1);
    expect(mockApp.revertBibleImport).toHaveBeenCalledWith('character', 'c1');
  });

  it('hides the revert button for a manually-added character', async () => {
    mockApp.characters = [makeCharacter({ id: 'c2', source: 'manual' })];
    const user = userEvent.setup();
    render(<CharactersPanel />);

    await user.click(screen.getByText('Ada'));

    expect(screen.queryByRole('button', { name: /revertir import/i })).not.toBeInTheDocument();
  });
});
