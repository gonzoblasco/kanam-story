'use client';

import { useApp } from '@/lib/store';

export default function NewProjectModal({
  show,
  onClose,
}: {
  show: boolean;
  onClose: () => void;
}) {
  const { createProject, selectProject, projects } = useApp();

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name') || '').trim();
    if (!name) return;
    createProject({
      name,
      description: String(fd.get('description') || ''),
      genre: String(fd.get('genre') || ''),
      tone: String(fd.get('tone') || ''),
      pov: (fd.get('pov') as any) || 'third-limited',
      style: String(fd.get('style') || ''),
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
                    <label className="form-label">Título</label>
                    <input name="name" className="form-control" required autoFocus />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Género</label>
                    <input
                      name="genre"
                      className="form-control"
                      placeholder="fantasía, thriller, literario…"
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Sinopsis</label>
                    <textarea
                      name="description"
                      className="form-control"
                      rows={2}
                      placeholder="Un pitch de un párrafo para la historia"
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Tono</label>
                    <input
                      name="tone"
                      className="form-control"
                      placeholder="oscuro, ingenioso, melancólico…"
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Punto de vista</label>
                    <select name="pov" className="form-select" defaultValue="third-limited">
                      <option value="first">Primera persona</option>
                      <option value="third-limited">Tercera (limitado)</option>
                      <option value="third-omniscient">Tercera (omnisciente)</option>
                      <option value="second">Segunda persona</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Estilo</label>
                    <input
                      name="style"
                      className="form-control"
                      placeholder="prosa, escueto, lírico…"
                    />
                  </div>
                </div>

                {projects.length > 0 ? (
                  <>
                    <div className="divider" />
                    <div className="small text-muted">
                      Proyectos existentes: {projects.map((p) => p.name).join(', ')}
                    </div>
                  </>
                ) : null}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Crear proyecto
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}