// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import type { Project, Chapter, Scene } from '@/types';
import ChapterReader from './ChapterReader';

const setCurrentChapterId = vi.fn();
const selectScene = vi.fn();
const setView = vi.fn();

const mockProject: Project = {
  id: 'p1',
  name: 'Proyecto',
  description: '',
  genre: 'thriller',
  tone: 'oscuro',
  pov: 'third-limited',
  style: { mode: 'featured', featured: 'tens' },
  createdAt: 0,
  updatedAt: 0,
};

const directChapter: Chapter = {
  id: 'c1',
  projectId: 'p1',
  title: 'Capítulo directo',
  order: 0,
  content: '<p>Todo el capítulo, sin escenas.</p>',
  createdAt: 0,
  updatedAt: 0,
};

const sceneChapter: Chapter = {
  id: 'c2',
  projectId: 'p1',
  title: 'Capítulo con escenas',
  order: 1,
  createdAt: 0,
  updatedAt: 0,
};

const scene: Scene = {
  id: 's1',
  projectId: 'p1',
  chapterId: 'c2',
  title: 'Escena 1',
  content: '<p>Contenido de la escena.</p>',
  summary: 'Resumen',
  order: 0,
  createdAt: 0,
  updatedAt: 0,
};

const mockApp = {
  currentProject: mockProject,
  chapters: [directChapter, sceneChapter],
  scenes: [scene],
  currentChapterId: 'c1',
  setCurrentChapterId,
  selectScene,
  setView,
};

vi.mock('@/lib/store', () => ({
  useApp: () => mockApp,
}));

describe('ChapterReader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApp.currentChapterId = 'c1';
  });

  it('muestra el content directo de un capítulo sin escenas', () => {
    render(<ChapterReader />);
    expect(screen.getByRole('heading', { name: /Capítulo directo/i })).toBeInTheDocument();
    expect(screen.getByText('Todo el capítulo, sin escenas.')).toBeInTheDocument();
    expect(screen.queryByText(/no tiene escenas escritas/i)).not.toBeInTheDocument();
  });

  it('sigue mostrando las escenas de un capítulo con escenas', () => {
    mockApp.currentChapterId = 'c2';
    render(<ChapterReader />);
    expect(screen.getByRole('heading', { name: /Capítulo con escenas/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Escena 1/i })).toBeInTheDocument();
    expect(screen.getByText('Contenido de la escena.')).toBeInTheDocument();
  });

  it('muestra el aviso cuando el capítulo no tiene content ni escenas', () => {
    mockApp.currentChapterId = 'c2';
    mockApp.scenes = [];
    render(<ChapterReader />);
    expect(screen.getByText(/no tiene escenas escritas/i)).toBeInTheDocument();
  });
});
