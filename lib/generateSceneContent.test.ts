import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateSceneContent } from './generateSceneContent';
import * as ollama from './ollama';
import type { Beat, Chapter, Project, Scene, Settings } from '@/types';

vi.mock('./ollama', () => ({
  ollamaChatStream: vi.fn(),
}));

const project: Project = {
  id: 'p1',
  name: 'Proyecto',
  description: '',
  genre: 'thriller',
  tone: 'oscuro',
  pov: 'third-limited',
  style: { mode: 'featured', featured: 'tens' },
  createdAt: 1,
  updatedAt: 1,
};

const chapter: Chapter = { id: 'c1', projectId: 'p1', title: 'Capítulo 1', order: 0, createdAt: 1, updatedAt: 1 };

const beat: Beat = {
  id: 'b1',
  projectId: 'p1',
  chapterId: 'c1',
  kind: 'inciting',
  title: 'El teléfono suena',
  description: 'El protagonista recibe una llamada anónima que cambia todo.',
  notes: 'Tono de urgencia. No revelar quién llama.',
  characters: [],
  status: 'draft',
  source: 'manual',
  position: 0,
  createdAt: 1,
  updatedAt: 1,
};

const scene: Scene = {
  id: 's1',
  projectId: 'p1',
  chapterId: 'c1',
  title: 'El teléfono suena',
  content: '',
  summary: beat.description,
  order: 0,
  createdAt: 1,
  updatedAt: 1,
};

const settings: Settings = {
  id: 'singleton',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'deepseek-v4-flash:cloud',
  theme: 'dark',
  sidebarCollapsed: false,
  rightPanelCollapsed: false,
};

const previousScene: Scene = {
  id: 's0',
  projectId: 'p1',
  chapterId: 'c1',
  title: 'Anterior',
  content: '<p>Marcos cerró la puerta.</p>',
  summary: '',
  order: -1,
  createdAt: 1,
  updatedAt: 1,
};

describe('generateSceneContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls ollama with a prompt that includes beat title, description and notes', async () => {
    const ollamaChatStream = vi.mocked(ollama.ollamaChatStream);
    ollamaChatStream.mockImplementation(async (_opts, onChunk) => {
      onChunk?.('prosa');
    });

    await generateSceneContent({
      project,
      scene,
      beat,
      chapter,
      previousScene,
      characters: [],
      world: [],
      settings,
    });

    expect(ollamaChatStream).toHaveBeenCalledTimes(1);
    const prompt = ollamaChatStream.mock.calls[0][0].messages[0].content;
    expect(prompt).toContain('El teléfono suena');
    expect(prompt).toContain('recibe una llamada anónima');
    expect(prompt).toContain('Tono de urgencia');
    expect(prompt).toContain('continuidad');
    expect(prompt).toContain('Marcos cerró la puerta');
    // Enfatiza que debe cubrir exactamente este beat.
    expect(prompt).toContain('cubrir EXACTAMENTE el siguiente beat');
  });

  it('converts the streamed prose into TipTap HTML paragraphs', async () => {
    vi.mocked(ollama.ollamaChatStream).mockImplementation(async (_opts, onChunk) => {
      onChunk?.('Línea uno.\n\nLínea dos.');
    });

    const result = await generateSceneContent({
      project,
      scene,
      beat,
      chapter,
      characters: [],
      world: [],
      settings,
    });

    expect(result).toBe('<p>Línea uno.</p><p>Línea dos.</p>');
  });

  it('throws when the model returns empty content', async () => {
    vi.mocked(ollama.ollamaChatStream).mockImplementation(async () => {});

    await expect(
      generateSceneContent({
        project,
        scene,
        beat,
        chapter,
        characters: [],
        world: [],
        settings,
      }),
    ).rejects.toThrow('Respuesta vacía del modelo.');
  });

  it('respects the abort signal', async () => {
    const controller = new AbortController();
    vi.mocked(ollama.ollamaChatStream).mockImplementation(async () => {
      controller.abort();
      throw new Error('AbortError');
    });

    await expect(
      generateSceneContent({
        project,
        scene,
        beat,
        chapter,
        characters: [],
        world: [],
        settings,
        signal: controller.signal,
      }),
    ).rejects.toThrow('AbortError');
  });

  it('filters out HTML tags from previous scene content', async () => {
    const ollamaChatStream = vi.mocked(ollama.ollamaChatStream);
    ollamaChatStream.mockImplementation(async (_opts, onChunk) => {
      onChunk?.('prosa de continuidad');
    });

    await generateSceneContent({
      project,
      scene,
      beat,
      chapter,
      previousScene,
      characters: [],
      world: [],
      settings,
    });

    const prompt = ollamaChatStream.mock.calls[0][0].messages[0].content;
    expect(prompt).not.toContain('<p>');
    expect(prompt).toContain('Marcos cerró la puerta');
  });
});
