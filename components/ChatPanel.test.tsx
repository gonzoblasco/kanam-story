/**
 * Component tests (U8) for the sticky chat + contextual insertion (U7).
 *
 * Verifies the accessible input (aria-label), the role=log live region, that
 * focus returns to the input after sending, and that accepting a proposal
 * navigates to the target section (requestSectionFocus) without breaking the
 * accept/undo flow.
 */
// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ContentAction, Character } from '@/types';

// --- Mocks ---

const mockApp = {
  currentProject: { id: 'p1', name: 'Proyecto' },
  conversations: [],
  currentConversationId: 'conv1',
  messages: [],
  createConversation: vi.fn(async () => ({ id: 'conv1' })),
  selectConversation: vi.fn(async () => {}),
  deleteConversation: vi.fn(async () => {}),
  createMessage: vi.fn(async () => ({})),
  settings: { ollamaUrl: 'http://localhost:11434', ollamaModel: 'llama3' },
  setSettings: vi.fn(),
  characters: [],
  world: [],
  chapters: [],
  scenes: [],
  beats: [],
  storyBible: null,
  applyContentActions: vi.fn(async () => async () => {}),
  announce: vi.fn(),
  setView: vi.fn(),
  setActiveStorySection: vi.fn(),
  requestSectionFocus: vi.fn(),
};

vi.mock('@/lib/store', () => ({
  useApp: () => mockApp,
}));

vi.mock('@/lib/ollama', () => ({
  ollamaChatStream: vi.fn(async (_opts: unknown, onChunk: (c: string) => void) => {
    onChunk('Respuesta del co-writer');
  }),
}));

vi.mock('@/lib/agentPrompts', () => ({
  buildAgentContext: vi.fn(() => ({})),
  buildAgentPrompt: vi.fn(() => 'prompt'),
}));

const characterAction: ContentAction = {
  type: 'add_character',
  character: {
    id: 'c1',
    projectId: 'p1',
    name: 'Ana',
    type: 'protagonist',
    age: '',
    appearance: '',
    personality: '',
    voice: '',
    backstory: '',
    goals: '',
    traits: [],
    inContext: true,
    source: 'ai',
    createdAt: 0,
    updatedAt: 0,
  } as Character,
  summary: 'Agregar personaje Ana',
};

vi.mock('@/lib/agentReply', () => ({
  parseAgentReply: vi.fn(() => ({ reply: 'Respuesta del co-writer', actions: [characterAction] })),
  filterValidActions: vi.fn((a: ContentAction[]) => a),
}));

import ChatPanel from '@/components/ChatPanel';

beforeEach(() => {
  vi.clearAllMocks();
  mockApp.conversations = [];
  mockApp.currentConversationId = 'conv1';
  mockApp.messages = [];
});

describe('ChatPanel: input accesible + live region (U7)', () => {
  it('el textarea tiene aria-label descriptivo', () => {
    render(<ChatPanel />);
    const input = screen.getByRole('textbox', { name: /escribí tu idea, pregunta o pedido para el co-writer/i });
    expect(input).toBeInTheDocument();
  });

  it('expone una live region role=log para anunciar respuestas nuevas', () => {
    render(<ChatPanel />);
    const log = document.querySelector('[role="log"]');
    expect(log).not.toBeNull();
    expect(log).toHaveAttribute('aria-live', 'polite');
  });
});

describe('ChatPanel: foco gestionado (U7)', () => {
  it('devuelve el foco al input tras enviar', async () => {
    const user = userEvent.setup();
    render(<ChatPanel />);
    const input = screen.getByRole('textbox', { name: /escribí tu idea/i });
    await user.type(input, 'Hola co-writer');
    await user.click(screen.getByRole('button', { name: /enviar/i }));
    await waitFor(() => expect(input).toHaveFocus());
  });
});

describe('ChatPanel: inserción contextual (U7)', () => {
  it('aceptar una propuesta de personaje navega a Personajes y enfoca la sección', async () => {
    const user = userEvent.setup();
    render(<ChatPanel />);
    const input = screen.getByRole('textbox', { name: /escribí tu idea/i });
    await user.type(input, 'Agregá un personaje');
    await user.click(screen.getByRole('button', { name: /enviar/i }));

    // La propuesta aparece con sus botones Aceptar/Descartar.
    const accept = await screen.findByRole('button', { name: /aceptar/i });
    await user.click(accept);

    expect(mockApp.applyContentActions).toHaveBeenCalledTimes(1);
    expect(mockApp.setView).toHaveBeenCalledWith('story');
    expect(mockApp.setActiveStorySection).toHaveBeenCalledWith('characters');
    expect(mockApp.requestSectionFocus).toHaveBeenCalledWith('characters');
    expect(mockApp.announce).toHaveBeenCalledWith('Cambios aplicados en Personajes.');
  });

  it('descartar la propuesta devuelve el foco al input', async () => {
    const user = userEvent.setup();
    render(<ChatPanel />);
    const input = screen.getByRole('textbox', { name: /escribí tu idea/i });
    await user.type(input, 'Agregá un personaje');
    await user.click(screen.getByRole('button', { name: /enviar/i }));

    const reject = await screen.findByRole('button', { name: /descartar/i });
    await user.click(reject);

    expect(mockApp.announce).toHaveBeenCalledWith('Propuesta descartada.');
    expect(input).toHaveFocus();
  });
});
