// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Project, Chapter, Scene, Beat, StorySectionKey, Character, WorldEntity, Settings } from '@/types';
import type { SuggestedChapter } from '@/lib/outlineGeneration';
import OutlineView from './OutlineView';

const createBeat = vi.fn(async (data: Omit<Beat, 'id' | 'createdAt' | 'updatedAt'>) => ({
  id: 'new-beat',
  ...data,
  createdAt: 0,
  updatedAt: 0,
}));
const updateBeat = vi.fn(async () => {});
const deleteBeat = vi.fn(async () => {});
const moveBeatToChapter = vi.fn(async () => {});
const suggestBeats = vi.fn(async () => []);
const createChapter = vi.fn(async (data: Omit<Chapter, 'id' | 'createdAt' | 'updatedAt'>) => ({
  id: 'new-chapter',
  ...data,
  createdAt: 0,
  updatedAt: 0,
}));
const updateChapter = vi.fn(async () => {});
const deleteChapter = vi.fn(async () => {});
const reorderChapters = vi.fn(async () => {});
const setCurrentOutlineChapterId = vi.fn();
const announce = vi.fn();

const suggestGlobalOutline = vi.fn(async (): Promise<SuggestedChapter[]> => []);
const applyGlobalOutline = vi.fn(async () => {});

const mockProject: Project = {
  id: 'p1',
  name: 'Proyecto',
  description: '',
  genre: 'thriller',
  genres: [],
  tone: 'oscuro',
  style: { mode: 'featured', featured: 'tens' },
  braindump: '',
  synopsis: '',
  premise: '',
  promise: '',
  theme: '',
  protagonist: '',
  pov: 'third-limited',
  tense: 'past',
  createdAt: 0,
  updatedAt: 0,
};

const chapter1: Chapter = { id: 'c1', projectId: 'p1', title: 'Capítulo 1', order: 0, createdAt: 0, updatedAt: 0 };
const chapter2: Chapter = { id: 'c2', projectId: 'p1', title: 'Capítulo 2', order: 1, createdAt: 0, updatedAt: 0 };

const beat1: Beat = {
  id: 'b1',
  projectId: 'p1',
  chapterId: 'c1',
  kind: 'inciting',
  title: 'Beat 1',
  description: '',
  notes: '',
  characters: [],
  status: 'draft',
  source: 'manual',
  position: 0,
  createdAt: 0,
  updatedAt: 0,
};

const settings: Settings = {
  id: 'singleton',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: '',
  theme: 'dark',
  sidebarCollapsed: false,
  rightPanelCollapsed: false,
};

const mockApp = {
  currentProject: mockProject,
  chapters: [chapter1, chapter2],
  scenes: [] as Scene[],
  beats: [beat1],
  characters: [] as Character[],
  world: [] as WorldEntity[],
  settings,
  currentOutlineChapterId: 'c1',
  setCurrentOutlineChapterId,
  createBeat,
  updateBeat,
  deleteBeat,
  moveBeatToChapter,
  suggestBeats,
  createChapter,
  updateChapter,
  deleteChapter,
  reorderChapters,
  createScene: vi.fn(),
  updateScene: vi.fn(),
  selectScene: vi.fn(),
  setView: vi.fn(),
  requestEditorFocus: vi.fn(),
  announce,
  settings,
  suggestGlobalOutline,
  applyGlobalOutline,
  setSettings: vi.fn(),
};

vi.mock('@/lib/store', () => ({
  useApp: () => mockApp,
}));

describe('OutlineView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the current chapter in chapter mode', () => {
    render(<OutlineView />);

    expect(screen.getByRole('heading', { name: /Outline/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Capítulo activo/i })).toHaveValue('c1');
    expect(screen.getByRole('heading', { name: /Capítulo 1/i })).toBeInTheDocument();
  });

  it('switches to global mode and shows all chapters', async () => {
    const user = userEvent.setup();
    render(<OutlineView />);

    const globalButton = screen.getByRole('button', { name: /Global/i });
    await user.click(globalButton);

    expect(screen.getAllByDisplayValue('Capítulo 1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByDisplayValue('Capítulo 2')).toBeInTheDocument();
  });

  it('adds a chapter in global mode', async () => {
    const user = userEvent.setup();
    render(<OutlineView />);

    await user.click(screen.getByRole('button', { name: /Global/i }));
    await user.click(screen.getByRole('button', { name: /Nuevo capítulo/i }));

    expect(createChapter).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'p1' }));
    expect(announce).toHaveBeenCalled();
  });

  it('moves a beat to another chapter in global mode', async () => {
    const user = userEvent.setup();
    render(<OutlineView />);

    await user.click(screen.getByRole('button', { name: /Global/i }));
    const moveSelect = screen.getByLabelText(/Mover beat a otro capítulo/i);
    await user.selectOptions(moveSelect, 'c2');

    expect(moveBeatToChapter).toHaveBeenCalledWith('b1', 'c2');
  });

  it('suggests and applies a global outline in global mode', async () => {
    suggestGlobalOutline.mockResolvedValueOnce([
      {
        title: 'Capítulo nuevo',
        beats: [{ title: 'Beat nuevo', kind: 'inciting' as const, description: 'Descripción' }],
      },
    ]);
    const user = userEvent.setup();
    render(<OutlineView />);

    await user.click(screen.getByRole('button', { name: /Global/i }));
    await user.click(screen.getByRole('button', { name: /Sugerir estructura/i }));

    expect(suggestGlobalOutline).toHaveBeenCalled();
    expect(await screen.findByText('Estructura global sugerida')).toBeInTheDocument();
    expect(screen.getByText('Capítulo nuevo')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Aplicar/i }));
    expect(applyGlobalOutline).toHaveBeenCalled();
  });
});
