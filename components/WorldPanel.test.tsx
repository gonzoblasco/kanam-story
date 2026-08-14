/**
 * Component tests (B2 round 2) for the WorldPanel "Revertir import" button (U7).
 * Mirrors the CharactersPanel revert test for the world side — the action calls
 * `revertBibleImport('world', id)` and is only shown while editing an entity
 * whose `source === 'biblia'`.
 */
// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { WorldEntity } from '@/types';

// Mock the store hook. WorldPanel also reads localStorage via readAutoFill; with
// entities already present it short-circuits and never calls the bible helpers.
vi.mock('@/lib/store', () => ({
  useApp: () => mockApp,
}));

import WorldPanel from '@/components/WorldPanel';

const mockApp = {
  currentProject: { id: 'p1', name: 'Proyecto' },
  world: [] as WorldEntity[],
  createWorld: vi.fn(),
  updateWorld: vi.fn(),
  deleteWorld: vi.fn(),
  revertBibleImport: vi.fn(),
  ensureStoryBible: vi.fn(),
  regenerateStoryBible: vi.fn(),
};

function makeWorld(overrides: Partial<WorldEntity> = {}): WorldEntity {
  return {
    id: 'w1',
    projectId: 'p1',
    name: 'Club',
    kind: 'place',
    description: '',
    source: 'manual',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mockApp.world = [makeWorld({ source: 'biblia' })];
  mockApp.revertBibleImport.mockResolvedValue(undefined);
  mockApp.ensureStoryBible.mockResolvedValue(null);
  mockApp.regenerateStoryBible.mockResolvedValue(undefined);
});

describe('WorldPanel: revert bible import (U7)', () => {
  it('shows the "Revertir import" button when editing a bible-sourced entity', async () => {
    const user = userEvent.setup();
    render(<WorldPanel />);

    // Click the card to enter edit mode.
    await user.click(screen.getByText('Club'));

    expect(screen.getByRole('button', { name: /revertir import/i })).toBeInTheDocument();
  });

  it('calls revertBibleImport("world", id) when clicked', async () => {
    const user = userEvent.setup();
    render(<WorldPanel />);

    await user.click(screen.getByText('Club'));
    await user.click(screen.getByRole('button', { name: /revertir import/i }));

    expect(mockApp.revertBibleImport).toHaveBeenCalledTimes(1);
    expect(mockApp.revertBibleImport).toHaveBeenCalledWith('world', 'w1');
  });

  it('hides the revert button for a manually-added entity', async () => {
    mockApp.world = [makeWorld({ id: 'w2', source: 'manual' })];
    const user = userEvent.setup();
    render(<WorldPanel />);

    await user.click(screen.getByText('Club'));

    expect(screen.queryByRole('button', { name: /revertir import/i })).not.toBeInTheDocument();
  });
});
