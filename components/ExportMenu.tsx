'use client';

import { useState } from 'react';
import { useApp } from '@/lib/store';
import {
  buildManuscriptMarkdown,
  markdownToPlainText,
  downloadTextFile,
  exportManuscriptPdf,
  exportManuscriptDocx,
} from '@/lib/export';

export default function ExportMenu() {
  const { currentProject, chapters, scenes, characters, world, beats } = useApp();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!currentProject) return null;

  const project = currentProject;
  const slug =
    project.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'manuscrito';

  function exportMarkdown() {
    const md = buildManuscriptMarkdown({ project, chapters, scenes, characters, world, beats });
    downloadTextFile(`${slug}.md`, md, 'text/markdown');
    setOpen(false);
  }

  function exportTxt() {
    const md = buildManuscriptMarkdown({ project, chapters, scenes, characters, world, beats });
    downloadTextFile(`${slug}.txt`, markdownToPlainText(md), 'text/plain');
    setOpen(false);
  }

  function exportPdf() {
    setError(null);
    exportManuscriptPdf({ project, chapters, scenes, characters, world, beats }, `${slug}.pdf`)
      .then(() => setOpen(false))
      .catch((e) => setError(e instanceof Error ? e.message : 'Falló la exportación a PDF'));
  }

  function exportDocx() {
    setError(null);
    exportManuscriptDocx({ project, chapters, scenes, characters, world, beats }, `${slug}.docx`)
      .then(() => setOpen(false))
      .catch((e) => setError(e instanceof Error ? e.message : 'Falló la exportación a Word'));
  }

  return (
    <div className="position-relative">
      <button
        className="btn btn-sm btn-outline-secondary"
        title="Exportar el manuscrito"
        onClick={() => setOpen((o) => !o)}
      >
        <i className="bi bi-download me-1" /> Exportar
      </button>
      {open ? (
        <>
          <div className="export-backdrop" onClick={() => setOpen(false)} />
          <div className="export-menu">
            {error ? <div className="small text-danger px-2 py-1">{error}</div> : null}
            <button className="export-menu-item" onClick={exportMarkdown}>
              <i className="bi bi-filetype-md me-2" /> Markdown (.md)
            </button>
            <button className="export-menu-item" onClick={exportTxt}>
              <i className="bi bi-file-earmark-text me-2" /> Texto plano (.txt)
            </button>
            <button className="export-menu-item" onClick={exportPdf}>
              <i className="bi bi-file-earmark-pdf me-2" /> PDF (.pdf)
            </button>
            <button className="export-menu-item" onClick={exportDocx}>
              <i className="bi bi-file-earmark-word me-2" /> Word (.docx)
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
