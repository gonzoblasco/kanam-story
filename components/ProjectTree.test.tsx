/**
 * Component tests for ProjectTree scene/chapter selection flow.
 *
 * Verifies that clicking a scene opens it in the editor (selectScene + setView('editor')),
 * that clicking a chapter opens its first scene, and that rename/delete actions are
 * triggered by explicit buttons rather than by the item title.
 */
// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Project, Chapter, Scene, StorySectionKey } from '@/types';
import ProjectTree from './ProjectTree';

// --- Mocks ---

const selectScene = vi.fn();
const setView = vi.fn();
const setActiveStorySection = vi.fn();
const setCurrentOutlineChapterId = vi.fn();
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
  settings: { sidebarCollapsed: false, ollamaUrl: '', ollamaModel: '', theme: 'dark' },
  view: 'story' as const,
  setView,
  activeStorySection: 'chat' as StorySectionKey,
  setActiveStorySection,
  setCurrentOutlineChapterId,
};

vi.mock('@/lib/store', () => ({
  useApp: () => mockApp,
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
  });

  it('opens the selected scene in the editor when clicking a scene item', async () => {
    const user = userEvent.setup();
    render(<ProjectTree />);

    const scene2Item = screen.getByText('Escena 2');
    await user.click(scene2Item);

    expect(selectScene).toHaveBeenCalledWith('s2');
    expect(setView).toHaveBeenCalledWith('editor');
  });

  it('opens the first scene of a chapter when clicking the chapter title', async () => {
    const user = userEvent.setup();
    render(<ProjectTree />);

    const chapter1Item = screen.getByText('Capítulo 1');
    await user.click(chapter1Item);

    expect(selectScene).toHaveBeenCalledWith('s1');
    expect(setView).toHaveBeenCalledWith('editor');
  });

  it('creates and opens a new scene when clicking a chapter with no scenes', async () => {
    const user = userEvent.setup();
    render(<ProjectTree />);

    const chapter2Item = screen.getByText('Capítulo 2');
    await user.click(chapter2Item);

    expect(createScene).toHaveBeenCalledWith(expect.objectContaining({ chapterId: 'c2' }));
    expect(selectScene).toHaveBeenCalledWith('new-scene');
    expect(setView).toHaveBeenCalledWith('editor');
  });

  it('renames a scene via an explicit edit button without selecting it', async () => {
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValueOnce('Nuevo título');
    const user = userEvent.setup();
    render(<ProjectTree />);

    const editButtons = screen.getAllByTitle('Renombrar escena');
    expect(editButtons.length).toBeGreaterThan(0);
    await user.click(editButtons[1]);

    expect(updateScene).toHaveBeenCalledWith('s2', { title: 'Nuevo título' });
    expect(selectScene).not.toHaveBeenCalled();
    expect(setView).not.toHaveBeenCalled();

    promptSpy.mockRestore();
  });

  it('deletes a scene via an explicit delete button without selecting it', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    const user = userEvent.setup();
    render(<ProjectTree />);

    const deleteButtons = screen.getAllByTitle('Eliminar escena');
    await user.click(deleteButtons[1]);

    expect(deleteScene).toHaveBeenCalledWith('s2');
    expect(selectScene).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });
});
