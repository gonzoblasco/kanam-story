// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Project, Chapter, Scene, Beat, Character, WorldEntity, Settings } from '@/types';
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

const scene3: Scene = {
  id: 's3',
  projectId: 'p1',
  chapterId: 'c1',
  title: 'Escena con capítulo sin beats',
  content: '',
  summary: '',
  order: 2,
  createdAt: 0,
  updatedAt: 0,
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
  deleteScene: vi.fn(),
  selectScene: vi.fn(),
  setView: vi.fn(),
  requestEditorFocus: vi.fn(),
  announce,
  suggestGlobalOutline,
  applyGlobalOutline,
  setSettings: vi.fn(),
};

const scene1: Scene = {
  id: 's1',
  projectId: 'p1',
  chapterId: 'c1',
  title: 'Escena 1',
  content: '',
  summary: '',
  order: 0,
  createdAt: 0,
  updatedAt: 0,
};

const scene2: Scene = {
  id: 's2',
  projectId: 'p1',
  chapterId: '',
  title: 'Escena huérfana',
  content: '',
  summary: '',
  order: 1,
  createdAt: 0,
  updatedAt: 0,
};

vi.mock('@/lib/store', () => ({
  useApp: () => mockApp,
}));

describe('OutlineView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApp.scenes = [];
    mockApp.beats = [beat1];
    mockApp.createScene = vi.fn();
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

  it('does not render orphan panel when there are no orphan scenes', () => {
    mockApp.scenes = [scene1, scene3];
    render(<OutlineView />);
    expect(screen.queryByRole('heading', { name: /Escenas sin capítulo/i })).not.toBeInTheDocument();
  });

  it('renders orphan panel in global mode and moves an orphan scene to a chapter', async () => {
    mockApp.scenes = [scene1, scene2];
    const user = userEvent.setup();
    render(<OutlineView />);

    await user.click(screen.getByRole('button', { name: /Global/i }));
    expect(screen.getByRole('heading', { name: /Escenas sin capítulo/i })).toBeInTheDocument();
    expect(screen.getByText('Escena huérfana')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Mover escena "Escena huérfana" al capítulo seleccionado/i }));
    expect(mockApp.updateScene).toHaveBeenCalledWith('s2', { chapterId: 'c1' });
  });

  it('links an orphan scene to a chapter creating a beat', async () => {
    mockApp.scenes = [scene2];
    const user = userEvent.setup();
    render(<OutlineView />);

    await user.click(screen.getByRole('button', { name: /Global/i }));
    await user.click(screen.getByRole('button', { name: /Mover y crear beat para "Escena huérfana"/i }));
    expect(mockApp.updateScene).toHaveBeenCalledWith('s2', { chapterId: 'c1' });
    expect(createBeat).toHaveBeenCalledWith(expect.objectContaining({ chapterId: 'c1', sceneId: 's2' }));
  });

  it('deletes an orphan scene', async () => {
    mockApp.scenes = [scene2];
    vi.stubGlobal('confirm', () => true);
    const user = userEvent.setup();
    render(<OutlineView />);

    await user.click(screen.getByRole('button', { name: /Global/i }));
    await user.click(screen.getByRole('button', { name: /Eliminar escena "Escena huérfana"/i }));
    expect(mockApp.deleteScene).toHaveBeenCalledWith('s2');
    vi.unstubAllGlobals();
  });

  it('opens an orphan scene in the editor', async () => {
    mockApp.scenes = [scene2];
    const user = userEvent.setup();
    render(<OutlineView />);

    await user.click(screen.getByRole('button', { name: /Global/i }));
    await user.click(screen.getByRole('button', { name: /Ver escena "Escena huérfana" en el editor/i }));
    expect(mockApp.selectScene).toHaveBeenCalledWith('s2');
    expect(mockApp.setView).toHaveBeenCalledWith('editor');
  });

  // --- U4: chapter-direct mode (chapter without scenes) ---

  it('shows chapter-level beats for a chapter-direct chapter (no scenes)', () => {
    mockApp.scenes = [];
    render(<OutlineView />);

    // The chapter-level beat (no sceneId) is rendered in the chapter section.
    expect(screen.getByDisplayValue('Beat 1')).toBeInTheDocument();
    // No scene sections are rendered.
    expect(screen.queryByRole('heading', { name: /Escena 1/i })).not.toBeInTheDocument();
  });

  it('adds a chapter-level beat to a chapter-direct chapter', async () => {
    mockApp.scenes = [];
    const user = userEvent.setup();
    render(<OutlineView />);

    await user.click(screen.getByRole('button', { name: /Agregar beat a capítulo/i }));

    expect(createBeat).toHaveBeenCalledWith(
      expect.objectContaining({
        chapterId: 'c1',
        sceneId: undefined,
        title: 'Nuevo beat',
      }),
    );
    expect(announce).toHaveBeenCalled();
  });

  it('edits a chapter-level beat of a chapter-direct chapter', async () => {
    mockApp.scenes = [];
    const user = userEvent.setup();
    render(<OutlineView />);

    const titleInput = screen.getByDisplayValue('Beat 1');
    await user.clear(titleInput);
    await user.type(titleInput, 'Beat editado');
    await user.tab();

    expect(updateBeat).toHaveBeenCalledWith('b1', expect.objectContaining({ title: 'Beat editado' }));
  });

  it('moves a chapter-level beat up/down within a chapter-direct chapter', async () => {
    mockApp.scenes = [];
    mockApp.beats = [
      { ...beat1, id: 'b1', position: 0 },
      { ...beat1, id: 'b2', title: 'Beat 2', position: 1 },
    ];
    const user = userEvent.setup();
    render(<OutlineView />);

    // Move the second beat up.
    const downButtons = screen.getAllByRole('button', { name: /Subir beat/i });
    await user.click(downButtons[1]);

    expect(updateBeat).toHaveBeenCalledWith('b2', { position: 0 });
    expect(updateBeat).toHaveBeenCalledWith('b1', { position: 1 });
  });

  it('generates a scene from a chapter-direct beat, creating the scene inside the chapter', async () => {
    mockApp.scenes = [];
    mockApp.createScene = vi.fn(async (data) => ({
      id: 'new-scene',
      ...data,
      createdAt: 0,
      updatedAt: 0,
    }));
    const user = userEvent.setup();
    render(<OutlineView />);

    await user.click(screen.getByRole('button', { name: /Generar escena para "Beat 1"/i }));

    expect(mockApp.createScene).toHaveBeenCalledWith(
      expect.objectContaining({
        chapterId: 'c1',
        title: 'Beat 1',
      }),
    );
    // The beat is relinked to the new scene.
    expect(updateBeat).toHaveBeenCalledWith('b1', expect.objectContaining({ sceneId: 'new-scene' }));
    expect(mockApp.selectScene).toHaveBeenCalledWith('new-scene');
    expect(mockApp.setView).toHaveBeenCalledWith('editor');
  });
});
