import type { Project, Chapter, Scene, Character, WorldEntity, Beat } from '@/types';

function stripHtml(html: string): string {
  return (html ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export interface ExportSources {
  project: Project;
  chapters: Chapter[];
  scenes: Scene[];
  characters: Character[];
  world: WorldEntity[];
  beats: Beat[];
}

/**
 * Builds a plain-text Markdown manuscript from the project's chapters and
 * scenes. Used for the MD export and as the base for DOCX/PDF.
 */
export function buildManuscriptMarkdown(sources: ExportSources): string {
  const { project, chapters, scenes, characters, world, beats } = sources;
  const parts: string[] = [];

  parts.push(`# ${project.name}`);
  if (project.description) parts.push(`\n> ${project.description}`);
  if (project.genre || project.tone) {
    const meta = [project.genre, project.tone].filter(Boolean).join(' · ');
    if (meta) parts.push(`\n*${meta}*`);
  }

  if (characters.length > 0) {
    parts.push('\n## Personajes');
    for (const c of characters) {
      parts.push(`- **${c.name}**${c.role ? ` (${c.role})` : ''}${c.personality ? ` — ${c.personality}` : ''}`);
    }
  }

  if (world.length > 0) {
    parts.push('\n## Mundo');
    for (const w of world) {
      parts.push(`- **${w.name}**: ${w.description}`);
    }
  }

  const byChapter = new Map<string, Scene[]>();
  for (const s of scenes) {
    const arr = byChapter.get(s.chapterId) ?? [];
    arr.push(s);
    byChapter.set(s.chapterId, arr);
  }

  for (const ch of [...chapters].sort((a, b) => a.order - b.order)) {
    parts.push(`\n## ${ch.title}`);
    const chapterBeats = beats
      .filter((b) => b.chapterId === ch.id && !b.sceneId)
      .sort((a, b) => a.position - b.position);
    if (chapterBeats.length > 0) {
      parts.push('');
      for (const b of chapterBeats) {
        parts.push(`- **${b.title}**${b.description ? `: ${b.description}` : ''}`);
      }
    }
    const scs = (byChapter.get(ch.id) ?? []).sort((a, b) => a.order - b.order);
    for (const s of scs) {
      parts.push(`\n### ${s.title}`);
      if (s.summary) parts.push(`\n*${s.summary}*`);
      const text = stripHtml(s.content);
      if (text) parts.push(`\n${text}`);
    }
  }

  return parts.join('\n').trim() + '\n';
}

/** Triggers a browser download of the given text as a file. */
export function downloadTextFile(filename: string, text: string, mime = 'text/markdown'): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
