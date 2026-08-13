'use client';

import { useState } from 'react';
import { useApp } from '@/lib/store';
import { buildManuscriptMarkdown, markdownToPlainText, downloadTextFile } from '@/lib/export';

export default function ExportMenu() {
  const { currentProject, chapters, scenes, characters, world, beats } = useApp();
  const [open, setOpen] = useState(false);

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
            <button className="export-menu-item" onClick={exportMarkdown}>
              <i className="bi bi-filetype-md me-2" /> Markdown (.md)
            </button>
            <button className="export-menu-item" onClick={exportTxt}>
              <i className="bi bi-file-earmark-text me-2" /> Texto plano (.txt)
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
