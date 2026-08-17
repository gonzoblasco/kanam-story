/**
 * Component tests for CoWriterSidebar.
 *
 * Verifies the expandable co-writer sidebar: renders the ChatPanel, reflects
 * the open/closed state via aria-hidden, closes with Escape, and focuses the
 * close button when opened.
 */
// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CoWriterSidebar from './CoWriterSidebar';

const mockApp = {
  currentProject: { id: 'p1', name: 'Proyecto' },
  conversations: [],
  currentConversationId: null,
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
  currentSceneId: null,
  applyContentActions: vi.fn(async () => async () => {}),
  announce: vi.fn(),
  setView: vi.fn(),
  setActiveStorySection: vi.fn(),
  requestSectionFocus: vi.fn(),
};

vi.mock('@/lib/store', () => ({
  useApp: () => mockApp,
}));

describe('CoWriterSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza el panel de co-writer con el ChatPanel', () => {
    render(<CoWriterSidebar open onClose={() => {}} />);
    expect(screen.getByLabelText('Co-writer de la escena actual')).toBeInTheDocument();
  });

  it('marca el panel como aria-hidden cuando está cerrado', () => {
    render(<CoWriterSidebar open={false} onClose={() => {}} />);
    const panel = screen.getByLabelText('Co-writer de la escena actual');
    expect(panel).toHaveAttribute('aria-hidden', 'true');
    expect(panel).not.toHaveClass('open');
  });

  it('abre el panel con clase open y no aria-hidden', () => {
    render(<CoWriterSidebar open onClose={() => {}} />);
    const panel = screen.getByLabelText('Co-writer de la escena actual');
    expect(panel).toHaveClass('open');
    expect(panel).toHaveAttribute('aria-hidden', 'false');
  });

  it('cierra con Escape llamando a onClose', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<CoWriterSidebar open onClose={onClose} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('enfoca el botón de cerrar al abrir', async () => {
    render(<CoWriterSidebar open onClose={() => {}} />);
    const closeBtn = screen.getByLabelText('Cerrar co-writer');
    await waitFor(() => expect(closeBtn).toHaveFocus());
  });
});
