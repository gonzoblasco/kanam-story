'use client';

import { useEffect, useState, useCallback } from 'react';
import { useApp } from '@/lib/store';
import { checkOllama } from '@/lib/ollama';

export default function SettingsModal({
  show,
  onClose,
}: {
  show: boolean;
  onClose: () => void;
}) {
  const { settings, setSettings } = useApp();
  const [models, setModels] = useState<string[]>([]);
  const [status, setStatus] = useState<{ ok: boolean; error?: string; models?: string[] } | null>(null);
  const [checking, setChecking] = useState(false);

  const refreshModels = useCallback(async () => {
    setChecking(true);
    setStatus(null);
    const res = await checkOllama(settings);
    setStatus(res);
    if (res.ok && res.models) setModels(res.models);
    setChecking(false);
  }, [settings]);

  useEffect(() => {
    if (show) {
      // Defer so the setState calls don't run synchronously inside the effect.
      const t = setTimeout(() => void refreshModels(), 0);
      return () => clearTimeout(t);
    }
  }, [show, refreshModels]);

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSettings({
      ollamaUrl: String(fd.get('ollamaUrl') || settings.ollamaUrl),
      ollamaModel: String(fd.get('ollamaModel') || settings.ollamaModel),
    });
    onClose();
  }

  return (
    <>
      {show ? <div className="modal-backdrop fade show" onClick={onClose} /> : null}
      <div
        className={`modal fade ${show ? 'show d-block' : ''}`}
        tabIndex={-1}
        style={{ display: show ? 'block' : 'none' }}
        aria-hidden={!show}
      >
        <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            <form onSubmit={handleSave}>
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-gear me-2" />
                  Configuración
                </h5>
                <button type="button" className="btn-close" onClick={onClose} />
              </div>
              <div className="modal-body">
                <div className="alert alert-secondary small mb-3">
                  <i className="bi bi-info-circle me-1" />
                  Kanam Story corre la IA en local con{' '}
                  <a href="https://ollama.com" target="_blank" rel="noreferrer">
                    Ollama
                  </a>
                  . Instalalo y bajá un modelo (ej.{' '}
                  <code>ollama pull llama3.1</code>).
                </div>
                <div className="row g-3">
                  <div className="col-md-8">
                    <label className="form-label">URL de Ollama</label>
                    <input
                      name="ollamaUrl"
                      className="form-control"
                      defaultValue={settings.ollamaUrl}
                      placeholder="http://localhost:11434"
                    />
                  </div>
                  <div className="col-md-4 d-flex align-items-end">
                    <button
                      type="button"
                      className="btn btn-outline-primary w-100"
                      onClick={refreshModels}
                      disabled={checking}
                    >
                      {checking ? (
                        <>
                          <span className="spinner-inline me-2" />
                          Probando…
                        </>
                      ) : (
                        <>
                          <i className="bi bi-arrow-clockwise me-1" />
                          Probar y listar
                        </>
                      )}
                    </button>
                  </div>
                  <div className="col-md-12">
                    <label className="form-label">Modelo</label>
                    {models.length > 0 ? (
                      <select
                        name="ollamaModel"
                        className="form-select"
                        defaultValue={
                          models.includes(settings.ollamaModel)
                            ? settings.ollamaModel
                            : models[0]
                        }
                      >
                        {models.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        name="ollamaModel"
                        className="form-control"
                        defaultValue={settings.ollamaModel}
                        placeholder="ej. llama3.1, qwen3:14b, gemma4"
                      />
                    )}
                    <div className="form-text">
                      El modelo por defecto se elige automáticamente del primero disponible.
                    </div>
                  </div>
                </div>

                {status ? (
                  <div
                    className={`alert mt-3 ${
                      status.ok ? 'alert-success' : 'alert-danger'
                    } small mb-0`}
                  >
                    {status.ok ? (
                      <>
                        <i className="bi bi-check-circle me-1" />
                        Conectado. {status.models?.length ?? 0} modelo(s) disponible(s).
                      </>
                    ) : (
                      <>
                        <i className="bi bi-exclamation-triangle me-1" />
                        No se pudo conectar a Ollama: {status.error}
                      </>
                    )}
                  </div>
                ) : null}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}