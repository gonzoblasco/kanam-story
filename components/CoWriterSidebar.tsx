'use client';

import { useEffect, useRef } from 'react';
import ChatPanel from '@/components/ChatPanel';

interface CoWriterSidebarProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Sidebar de co-writer expandible desde la vista de escritura. Reutiliza el
 * ChatPanel en modo 'scene': el agente ve SOLO la escena activa + biblia +
 * personajes + mundo + outline del capítulo actual, y puede editar la escena
 * actual (no las demás). Se desliza como overlay desde la derecha.
 */
export default function CoWriterSidebar({ open, onClose }: CoWriterSidebarProps) {
  const panelRef = useRef<HTMLElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Cerrar con Escape cuando está abierto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Al abrir, mover el foco al botón de cerrar (a11y, WCAG 2.4.3).
  useEffect(() => {
    if (open) closeBtnRef.current?.focus();
  }, [open]);

  return (
    <aside
      id="cowriter-sidebar"
      ref={panelRef}
      className={`cowriter-overlay ${open ? 'open' : ''}`}
      aria-label="Co-writer de la escena actual"
      aria-hidden={!open}
    >
      <div className="cowriter-header">
        <i className="bi bi-magic" aria-hidden="true" />
        <span className="fw-semibold small">Co-writer · escena actual</span>
        <button
          ref={closeBtnRef}
          type="button"
          className="icon-btn ms-auto"
          onClick={onClose}
          aria-label="Cerrar co-writer"
        >
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
      </div>
      <div className="cowriter-body">
        <ChatPanel contextScope="scene" />
      </div>
    </aside>
  );
}
