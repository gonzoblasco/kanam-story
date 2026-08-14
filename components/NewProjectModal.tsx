'use client';

import { useState } from 'react';
import { useApp, type StarterStructure } from '@/lib/store';
import { POV_LABELS } from '@/lib/labels';
import { GENRE_TEMPLATES } from '@/lib/projectTemplates';
import type { Project } from '@/types';
import StarterPicker, { type StarterKey } from '@/components/StarterPicker';

const DEFAULT_STARTER: StarterKey = 'outline';

export default function NewProjectModal({
  show,
  onClose,
}: {
  show: boolean;
  onClose: () => void;
}) {
  const { createProjectWithStructure, projects } = useApp();
  const [starter, setStarter] = useState<StarterKey>(DEFAULT_STARTER);
  const [genre, setGenre] = useState<string>(GENRE_TEMPLATES[0]?.key ?? 'thriller');
  const [creating, setCreating] = useState(false);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (creating) return;
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name') || '').trim();
    if (!name) return;
    const pov = String(fd.get('pov') || 'third-limited') as Project['pov'];
    const style = String(fd.get('style') || '').trim();
    const projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> = {
      name,
      description: String(fd.get('description') || ''),
      genre: String(fd.get('genre') || ''),
      tone: String(fd.get('tone') || ''),
      pov,
      tense: 'past',
      style: style ? { mode: 'custom', custom: style } : { mode: 'custom', custom: '' },
    };
    let structure: StarterStructure;
    switch (starter) {
      case 'bible':
        structure = { kind: 'bible' };
        break;
      case 'template':
        structure = { kind: 'template', templateKey: genre };
        break;
      case 'empty':
        structure = { kind: 'empty' };
        break;
      case 'outline':
      default:
        structure = { kind: 'outline' };
        break;
    }
    setCreating(true);
    try {
      await createProjectWithStructure(projectData, structure);
      onClose();
    } finally {
      setCreating(false);
    }
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
            <form onSubmit={handleCreate}>
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-bookmark-plus me-2" />
                  Nuevo proyecto
                </h5>
                <button type="button" className="btn-close" onClick={onClose} />
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-8">
                    <label className="form-label" htmlFor="np-name">Título</label>
                    <input id="np-name" name="name" className="form-control" required autoFocus />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label" htmlFor="np-genre">Género</label>
                    <input
                      id="np-genre"
                      name="genre"
                      className="form-control"
                      placeholder="fantasía, thriller, literario…"
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label" htmlFor="np-description">Sinopsis</label>
                    <textarea
                      id="np-description"
                      name="description"
                      className="form-control"
                      rows={2}
                      placeholder="Un pitch de un párrafo para la historia"
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label" htmlFor="np-tone">Tono</label>
                    <input
                      id="np-tone"
                      name="tone"
                      className="form-control"
                      placeholder="oscuro, ingenioso, melancólico…"
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label" htmlFor="np-pov">Punto de vista</label>
                    <select id="np-pov" name="pov" className="form-select" defaultValue="third-limited">
                      {Object.entries(POV_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label" htmlFor="np-style">Estilo</label>
                    <input
                      id="np-style"
                      name="style"
                      className="form-control"
                      placeholder="prosa, escueto, lírico…"
                    />
                  </div>
                </div>

                <div className="divider" />

                {/* U5: punto de partida opcional (radio group accesible). */}
                <StarterPicker
                  value={starter}
                  onChange={setStarter}
                  genre={genre}
                  onGenreChange={setGenre}
                />

                {projects.length > 0 ? (
                  <div className="small text-muted">
                    Proyectos existentes: {projects.map((p) => p.name).join(', ')}
                  </div>
                ) : null}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Creando…' : 'Crear proyecto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}