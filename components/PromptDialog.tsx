'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Diálogo de entrada de texto accesible (reemplaza window.prompt).
 *
 * a11y:
 * - Foco en el input al abrir (WCAG 2.4.3).
 * - Foco restaurado al elemento que abrió el diálogo al cerrar.
 * - Escape cierra (equivale a cancelar).
 * - Enter en el input confirma.
 * - aria-modal + role="dialog" + aria-labelledby.
 * - Click en el backdrop cierra (equivale a cancelar).
 */
export default function PromptDialog({
  show,
  title,
  label,
  initialValue = '',
  placeholder,
  confirmLabel = 'Aceptar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
}: {
  show: boolean;
  title: string;
  label: string;
  initialValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialValue);
  const titleId = useRef(`prompt-title-${Math.random().toString(36).slice(2, 8)}`).current;
  const inputId = useRef(`prompt-input-${Math.random().toString(36).slice(2, 8)}`).current;

  // Sincronizar el valor cuando se abre con un initialValue nuevo.
  useEffect(() => {
    if (show) setValue(initialValue);
  }, [show, initialValue]);

  // Foco en el input al abrir; restaurar al cerrar.
  useEffect(() => {
    if (show) {
      inputRef.current?.focus();
      inputRef.current?.select();
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

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onConfirm(value);
  }

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
            <form onSubmit={handleSubmit}>
              <div className="modal-header">
                <h5 className="modal-title" id={titleId}>
                  {title}
                </h5>
                <button type="button" className="btn-close" onClick={onCancel} aria-label="Cerrar" />
              </div>
              <div className="modal-body">
                <label className="form-label" htmlFor={inputId}>
                  {label}
                </label>
                <input
                  ref={inputRef}
                  id={inputId}
                  className="form-control"
                  value={value}
                  placeholder={placeholder}
                  onChange={(e) => setValue(e.target.value)}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onCancel}>
                  {cancelLabel}
                </button>
                <button type="submit" className="btn btn-primary">
                  {confirmLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
