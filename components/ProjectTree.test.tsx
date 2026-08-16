/**
 * Component tests for ProjectTree scene/chapter selection flow.
 *
 * Verifies that clicking a scene opens it in the editor (selectScene + setView('editor')),
 * that clicking a chapter opens the chapter reader, and that rename/delete actions are
 * triggered by explicit buttons rather than by the item title.
 */
// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Project, Chapter, Scene, StorySectionKey } from '@/types';
import ProjectTree from './ProjectTree';

// --- Mocks ---

const selectScene = vi.fn();
const setView = vi.fn();
const setActiveStorySection = vi.fn();
const setCurrentOutlineChapterId = vi.fn();
const setCurrentChapterId = vi.fn();
const createScene = vi.fn(async (data: Omit<Scene, 'id' | 'createdAt' | 'updatedAt'>) => ({
  id: 'new-scene',
  ...data,
  createdAt: 0,
  updatedAt: 0,
}));
const updateScene = vi.fn(async () => {});
const deleteScene = vi.fn(async () => {});
const updateChapter = vi.fn(async () => {});
const deleteChapter = vi.fn(async () => {});

const mockProject: Project = {
  id: 'p1',
  name: 'Proyecto',
  description: '',
  genre: '',
  genres: [],
  tone: '',
  style: { mode: 'custom', custom: '' },
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

const chapter1: Chapter = {
  id: 'c1',
  projectId: 'p1',
  title: 'Capítulo 1',
  order: 0,
  createdAt: 0,
  updatedAt: 0,
};

const chapter2: Chapter = {
  id: 'c2',
  projectId: 'p1',
  title: 'Capítulo 2',
  order: 1,
  createdAt: 0,
  updatedAt: 0,
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
  chapterId: 'c1',
  title: 'Escena 2',
  content: '',
  summary: '',
  order: 1,
  createdAt: 0,
  updatedAt: 0,
};

const setSettings = vi.fn((patch: Partial<typeof mockApp.settings>) => {
  mockApp.settings = { ...mockApp.settings, ...patch };
});

const mockApp = {
  projects: [mockProject],
  currentProject: mockProject,
  selectProject: vi.fn(),
  createChapter: vi.fn(async () => ({})),
  createScene,
  updateChapter,
  deleteChapter,
  updateScene,
  deleteScene,
  chapters: [chapter1, chapter2],
  scenes: [scene1, scene2],
  currentSceneId: 's1',
  selectScene,
  settings: { sidebarCollapsed: false, ollamaUrl: '', ollamaModel: '', theme: 'dark', collapsedChapterIds: [] as string[] },
  setSettings,
  view: 'story' as const,
  setView,
  activeStorySection: 'chat' as StorySectionKey,
  setActiveStorySection,
  setCurrentOutlineChapterId,
  setCurrentChapterId,
};

vi.mock('@/lib/store', () => ({
  useApp: () => {
    const [settings, setSettingsState] = React.useState(mockApp.settings);
    mockApp.settings = settings;
    mockApp.setSettings = (patch: Partial<typeof mockApp.settings>) => setSettingsState((s) => ({ ...s, ...patch }));
    return mockApp;
  },
}));

vi.mock('@/lib/storySections', () => ({
  STORY_SECTIONS: [
    { key: 'chat', label: 'Co-writer', icon: 'bi-chat' },
  ],
}));

// --- Tests ---

describe('ProjectTree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApp.settings = { sidebarCollapsed: false, ollamaUrl: '', ollamaModel: '', theme: 'dark', collapsedChapterIds: [] };
  });

  it('opens the selected scene in the editor when clicking a scene item', async () => {
    const user = userEvent.setup();
    render(<ProjectTree />);

    const scene2Item = screen.getByText('Escena 2');
    await user.click(scene2Item);

    expect(selectScene).toHaveBeenCalledWith('s2');
    expect(setView).toHaveBeenCalledWith('editor');
  });

  it('toggles chapter expansion when clicking the chapter title', async () => {
    const user = userEvent.setup();
    render(<ProjectTree />);

    expect(screen.getByText('Escena 1')).toBeInTheDocument();
    const chapterTitle = screen.getByText('Capítulo 1');
    await user.click(chapterTitle);

    expect(screen.queryByText('Escena 1')).not.toBeInTheDocument();
    await user.click(chapterTitle);
    expect(screen.getByText('Escena 1')).toBeInTheDocument();
  });

  it('opens the chapter reader from the chapter action menu', async () => {
    const user = userEvent.setup();
    render(<ProjectTree />);

    await user.click(screen.getByTitle('Acciones de Capítulo 1'));
    await user.click(within(screen.getByLabelText('Acciones de Capítulo 1')).getByRole('menuitem', { name: /Ver capítulo/i }));

    expect(setCurrentChapterId).toHaveBeenCalledWith('c1');
    expect(selectScene).not.toHaveBeenCalled();
  });

  it('opens the first scene via the chapter action menu', async () => {
    const user = userEvent.setup();
    render(<ProjectTree />);

    await user.click(screen.getByTitle('Acciones de Capítulo 1'));
    await user.click(within(screen.getByLabelText('Acciones de Capítulo 1')).getByRole('menuitem', { name: /Abrir primera escena/i }));

    expect(selectScene).toHaveBeenCalledWith('s1');
    expect(setView).toHaveBeenCalledWith('editor');
  });

  it('creates and opens a new scene when the chapter has no scenes', async () => {
    const user = userEvent.setup();
    render(<ProjectTree />);

    await user.click(screen.getByTitle('Acciones de Capítulo 2'));
    await user.click(within(screen.getByLabelText('Acciones de Capítulo 2')).getByRole('menuitem', { name: /Abrir primera escena/i }));

    expect(createScene).toHaveBeenCalledWith(expect.objectContaining({ chapterId: 'c2' }));
    expect(selectScene).toHaveBeenCalledWith('new-scene');
    expect(setView).toHaveBeenCalledWith('editor');
  });

  it('renames a scene via the scene action menu without selecting it', async () => {
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValueOnce('Nuevo título');
    const user = userEvent.setup();
    render(<ProjectTree />);

    await user.click(screen.getByTitle('Acciones de Escena 2'));
    await user.click(within(screen.getByLabelText('Acciones de Escena 2')).getByRole('menuitem', { name: /Renombrar escena/i }));

    expect(updateScene).toHaveBeenCalledWith('s2', { title: 'Nuevo título' });
    expect(selectScene).not.toHaveBeenCalled();
    expect(setView).not.toHaveBeenCalled();

    promptSpy.mockRestore();
  });

  it('deletes a scene via the scene action menu without selecting it', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    const user = userEvent.setup();
    render(<ProjectTree />);

    await user.click(screen.getByTitle('Acciones de Escena 2'));
    await user.click(within(screen.getByLabelText('Acciones de Escena 2')).getByRole('menuitem', { name: /Eliminar escena/i }));

    expect(deleteScene).toHaveBeenCalledWith('s2');
    expect(selectScene).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });
});
