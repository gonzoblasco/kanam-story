'use client';

import { useEffect, useRef } from 'react';

/**
 * Diálogo de confirmación accesible (reemplaza window.confirm).
 *
 * a11y:
 * - Foco movido al botón de confirmar al abrir (WCAG 2.4.3).
 * - Foco restaurado al elemento que abrió el diálogo al cerrar.
 * - Escape cierra (equivale a cancelar).
 * - aria-modal + role="dialog" + aria-labelledby.
 * - Click en el backdrop cierra (equivale a cancelar).
 */
export default function ConfirmDialog({
  show,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  onConfirm,
  onCancel,
}: {
  show: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const titleId = useRef(`confirm-title-${Math.random().toString(36).slice(2, 8)}`).current;

  // Foco al confirmar al abrir; restaurar al cerrar.
  useEffect(() => {
    if (show) {
      confirmRef.current?.focus();
      const prev = document.activeElement as HTMLElement | null;
      return () => {
        prev?.focus?.();
      };
    }
  }, [show]);

  // Escape cierra.
  useEffect(() => {
    if (!show) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [show, onCancel]);

  if (!show) return null;

  return (
    <>
      <div className="modal-backdrop fade show" onClick={onCancel} />
      <div
        className="modal fade show d-block"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id={titleId}>
                {title}
              </h5>
              <button type="button" className="btn-close" onClick={onCancel} aria-label="Cerrar" />
            </div>
            <div className="modal-body">{message}</div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onCancel}>
                {cancelLabel}
              </button>
              <button
                ref={confirmRef}
                type="button"
                className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
                onClick={onConfirm}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
