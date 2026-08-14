import type { Project, Chapter, Scene, Character, WorldEntity, Beat } from '@/types';
import type { Content } from 'pdfmake/interfaces';
import { characterTypeLabel } from '@/lib/labels';

/**
 * Converts editor HTML to plain text, preserving paragraph and list
 * boundaries (so a manuscript export doesn't become a wall of text).
 */
function stripHtml(html: string): string {
  return (html ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|blockquote|li|pre)>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Removes Markdown markers so the content reads as plain text. */
export function markdownToPlainText(md: string): string {
  return (md ?? '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(?!\s)(.+?)(?<!\s)\*/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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
      parts.push(`- **${c.name}**${c.type ? ` (${characterTypeLabel(c.type)})` : ''}${c.personality ? ` — ${c.personality}` : ''}`);
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

/** Triggers a browser download of an arbitrary Blob (binary exports). */
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Builds a PDF of the manuscript using pdfmake. Converts the markdown into a
 * pdfmake document definition (headings, paragraphs, lists) and downloads it.
 */
export async function exportManuscriptPdf(sources: ExportSources, filename: string): Promise<void> {
  const md = buildManuscriptMarkdown(sources);
  const content = markdownToPdfmakeContent(md);
  // Dynamic import keeps pdfmake (large) out of the initial bundle.
  const pdfMake = await import('pdfmake/build/pdfmake');
  // vfs_fonts ships no types; its runtime shape is a flat map of
  // { "<font>.ttf": base64 } (module.exports = vfs), NOT { pdfMake: { vfs } }.
  const vfsFonts = (await import('pdfmake/build/vfs_fonts')).default as unknown as Record<string, string>;
  pdfMake.addVirtualFileSystem(vfsFonts);
  pdfMake.createPdf({ content, pageSize: 'A4', pageMargins: [56, 56, 56, 56] }).download(filename);
}

/**
 * Splits a markdown inline string into pdfmake inline text nodes, honoring
 * `**bold**` and `*italic*` markers (pdfmake does not parse markdown itself,
 * so the markers would otherwise leak literally into the PDF). Returns a plain
 * string when there is no inline formatting.
 */
function inlineToPdfmake(text: string): Content {
  const out: Content[] = [];
  const re = /\*\*(.+?)\*\*|\*(?!\s)(.+?)(?<!\s)\*/g;
  let last = 0;
  let matched = false;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    matched = true;
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ text: m[1], bold: true });
    else out.push({ text: m[2], italics: true });
    last = re.lastIndex;
  }
  if (!matched) return text;
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

/**
 * Converts markdown lines into a pdfmake content array.
 * Supports H1/H2/H3 headings, consecutive lists (- and *), blockquotes and
 * paragraphs. Consecutive list lines are grouped into a pdfmake `ul` block.
 */
export function markdownToPdfmakeContent(md: string): Content[] {
  const lines = md.split('\n');
  const content: Content[] = [];
  let list: Content[] | null = null;

  function flushList() {
    if (list) {
      content.push({ ul: list, margin: [0, 2, 0, 6] });
      list = null;
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushList();
      content.push({ text: '', margin: [0, 0, 0, 4] });
      continue;
    }
    const h1 = line.match(/^# (.+)$/);
    const h2 = line.match(/^## (.+)$/);
    const h3 = line.match(/^### (.+)$/);
    const li = line.match(/^[-*] (.+)$/);
    const quote = line.match(/^> (.+)$/);
    if (h1) {
      flushList();
      content.push({ text: h1[1], style: 'h1', margin: [0, 12, 0, 6] });
    } else if (h2) {
      flushList();
      content.push({ text: h2[1], style: 'h2', margin: [0, 10, 0, 4] });
    } else if (h3) {
      flushList();
      content.push({ text: h3[1], style: 'h3', margin: [0, 8, 0, 4] });
    } else if (li) {
      if (!list) list = [];
      list.push({ text: inlineToPdfmake(li[1]), margin: [0, 1, 0, 1] });
    } else if (quote) {
      flushList();
      content.push({ text: inlineToPdfmake(quote[1]), style: 'quote', margin: [8, 2, 0, 4], italics: true });
    } else {
      flushList();
      content.push({ text: inlineToPdfmake(line), margin: [0, 2, 0, 6] });
    }
  }
  flushList();
  return content;
}

/**
 * Builds a .docx of the manuscript using the `docx` library and downloads it.
 * Converts the markdown into docx paragraphs with heading styles.
 */
export async function exportManuscriptDocx(sources: ExportSources, filename: string): Promise<void> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import('docx');

  /** Splits a markdown inline string into docx TextRuns (bold/italic). */
  function inlineToDocxRuns(text: string): InstanceType<typeof TextRun>[] {
    const runs: InstanceType<typeof TextRun>[] = [];
    const re = /\*\*(.+?)\*\*|\*(?!\s)(.+?)(?<!\s)\*/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) runs.push(new TextRun(text.slice(last, m.index)));
      if (m[1] !== undefined) runs.push(new TextRun({ text: m[1], bold: true }));
      else runs.push(new TextRun({ text: m[2], italics: true }));
      last = re.lastIndex;
    }
    if (last < text.length) runs.push(new TextRun(text.slice(last)));
    return runs;
  }

  const md = buildManuscriptMarkdown(sources);

  const paragraphs: InstanceType<typeof Paragraph>[] = [];
  const title = md.split('\n')[0].replace(/^# /, '');
  paragraphs.push(
    new Paragraph({ text: title, heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }),
  );

  for (const raw of md.split('\n').slice(1)) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      paragraphs.push(new Paragraph({ text: '', spacing: { after: 120 } }));
      continue;
    }
    const h1 = line.match(/^# (.+)$/);
    const h2 = line.match(/^## (.+)$/);
    const h3 = line.match(/^### (.+)$/);
    const li = line.match(/^[-*] (.+)$/);
    const quote = line.match(/^> (.+)$/);
    const bold = line.match(/^\*\*(.+)\*\*$/);
    if (h1) paragraphs.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(h1[1])] }));
    else if (h2) paragraphs.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(h2[1])] }));
    else if (h3) paragraphs.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(h3[1])] }));
    else if (li) paragraphs.push(new Paragraph({ children: inlineToDocxRuns(li[1]), bullet: { level: 0 } }));
    else if (quote)
      paragraphs.push(new Paragraph({ children: [new TextRun({ text: quote[1], italics: true })], indent: { left: 720 } }));
    else if (bold) paragraphs.push(new Paragraph({ children: [new TextRun({ text: bold[1], bold: true })] }));
    else paragraphs.push(new Paragraph({ children: inlineToDocxRuns(line), spacing: { after: 160 } }));
  }

  const doc = new Document({ sections: [{ children: paragraphs }] });
  const blob = await Packer.toBlob(doc);
  downloadBlob(filename, blob);
}
