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
const selectChapter = vi.fn();
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

const setSettings = vi.fn((patch: Partial<{ sidebarCollapsed: boolean; ollamaUrl: string; ollamaModel: string; theme: string; collapsedChapterIds: string[] }>) => {
  mockApp.settings = { ...mockApp.settings, ...patch };
});

interface MockApp {
  projects: Project[];
  currentProject: Project | null;
  selectProject: () => void;
  deleteProject: () => Promise<void>;
  createChapter: () => Promise<unknown>;
  createScene: (data: Omit<Scene, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Scene>;
  updateChapter: () => Promise<void>;
  deleteChapter: () => Promise<void>;
  updateScene: () => Promise<void>;
  deleteScene: () => Promise<void>;
  chapters: Chapter[];
  scenes: Scene[];
  currentSceneId: string | null;
  selectScene: (id: string) => void;
  settings: { sidebarCollapsed: boolean; ollamaUrl: string; ollamaModel: string; theme: string; collapsedChapterIds: string[] };
  setSettings: (patch: Partial<{ sidebarCollapsed: boolean; ollamaUrl: string; ollamaModel: string; theme: string; collapsedChapterIds: string[] }>) => void;
  view: 'story';
  setView: (v: string) => void;
  activeStorySection: StorySectionKey;
  setActiveStorySection: (s: StorySectionKey) => void;
  setCurrentOutlineChapterId: (id: string) => void;
  setCurrentChapterId: (id: string) => void;
  selectChapter: (id: string) => void;
}

const mockApp: MockApp = {
  projects: [mockProject],
  currentProject: mockProject,
  selectProject: vi.fn(),
  deleteProject: vi.fn(async () => {}),
  createChapter: vi.fn(async () => ({})),
  createScene,
  updateChapter,
  deleteChapter,
  updateScene,
  deleteScene,
  chapters: [chapter1, chapter2],
  scenes: [scene1, scene2],
  currentSceneId: null,
  selectScene,
  settings: { sidebarCollapsed: false, ollamaUrl: '', ollamaModel: '', theme: 'dark', collapsedChapterIds: [] as string[] },
  setSettings: setSettings as (patch: Partial<{ sidebarCollapsed: boolean; ollamaUrl: string; ollamaModel: string; theme: string; collapsedChapterIds: string[] }>) => void,
  view: 'story' as const,
  setView,
  activeStorySection: 'chat' as StorySectionKey,
  setActiveStorySection,
  setCurrentOutlineChapterId,
  setCurrentChapterId,
  selectChapter,
};

vi.mock('@/lib/store', () => ({
  useApp: () => {
    const [settings, setSettingsState] = React.useState(mockApp.settings);
    mockApp.settings = settings;
    mockApp.setSettings = (patch: Partial<{ sidebarCollapsed: boolean; ollamaUrl: string; ollamaModel: string; theme: string; collapsedChapterIds: string[] }>) => {
      setSettingsState((s: { sidebarCollapsed: boolean; ollamaUrl: string; ollamaModel: string; theme: string; collapsedChapterIds: string[] }) => ({ ...s, ...patch }));
    };
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
    mockApp.currentSceneId = null;
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

  it('opens the chapter as a direct chapter when it has no scenes', async () => {
    const user = userEvent.setup();
    render(<ProjectTree />);

    await user.click(screen.getByTitle('Acciones de Capítulo 2'));
    await user.click(within(screen.getByLabelText('Acciones de Capítulo 2')).getByRole('menuitem', { name: /Abrir primera escena/i }));

    expect(selectChapter).toHaveBeenCalledWith('c2');
    expect(createScene).not.toHaveBeenCalled();
    expect(selectScene).not.toHaveBeenCalled();
  });

  it('renames a scene via the scene action menu without selecting it', async () => {
    const user = userEvent.setup();
    render(<ProjectTree />);

    await user.click(screen.getByTitle('Acciones de Escena 2'));
    await user.click(within(screen.getByLabelText('Acciones de Escena 2')).getByRole('menuitem', { name: /Renombrar escena/i }));

    // El diálogo accesible reemplaza window.prompt.
    const input = screen.getByLabelText('Título de la escena');
    await user.clear(input);
    await user.type(input, 'Nuevo título');
    await user.click(screen.getByRole('button', { name: 'Renombrar' }));

    expect(updateScene).toHaveBeenCalledWith('s2', { title: 'Nuevo título' });
    expect(selectScene).not.toHaveBeenCalled();
    expect(setView).not.toHaveBeenCalled();
  });

  it('deletes a scene via the scene action menu without selecting it', async () => {
    const user = userEvent.setup();
    render(<ProjectTree />);

    await user.click(screen.getByTitle('Acciones de Escena 2'));
    await user.click(within(screen.getByLabelText('Acciones de Escena 2')).getByRole('menuitem', { name: /Eliminar escena/i }));

    // El diálogo accesible reemplaza window.confirm.
    await user.click(screen.getByRole('button', { name: 'Eliminar' }));

    expect(deleteScene).toHaveBeenCalledWith('s2');
    expect(selectScene).not.toHaveBeenCalled();
  });

  it('elimina un proyecto tras confirmar', async () => {
    const user = userEvent.setup();
    render(<ProjectTree />);

    await user.click(screen.getByTitle('Eliminar proyecto Proyecto'));

    // El diálogo accesible reemplaza window.confirm.
    await user.click(screen.getByRole('button', { name: 'Eliminar' }));

    expect(mockApp.deleteProject).toHaveBeenCalledWith('p1');
  });
});
