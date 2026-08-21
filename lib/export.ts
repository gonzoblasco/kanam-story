import type { Project, Chapter, Scene, Character, WorldEntity, Beat } from '@/types';
import { povLabel } from '@/lib/labels';
import type { Content } from 'pdfmake/interfaces';

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
 * Counts words in plain text (split on whitespace). Used for the word-count
 * footer appended to exports. Pure and testable.
 */
export function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

/**
 * Builds a plain-text Markdown manuscript from the project's chapters and
 * scenes. Used for the MD export and as the base for DOCX/PDF.
 */
export function buildManuscriptMarkdown(sources: ExportSources): string {
  const { project, chapters, scenes } = sources;
  const parts: string[] = [];

  // Portada: título, descripción, y metadata narrativa (género/tono/POV/estilo).
  parts.push(`# ${project.name}`);
  if (project.description) parts.push(`\n> ${project.description}`);
  const meta = [project.genre, project.tone, project.pov && povLabel(project.pov), project.style?.custom].filter(Boolean);
  if (meta.length) parts.push(`\n*${meta.join(' · ')}*`);

  const byChapter = new Map<string, Scene[]>();
  for (const s of scenes) {
    const arr = byChapter.get(s.chapterId) ?? [];
    arr.push(s);
    byChapter.set(s.chapterId, arr);
  }

  const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);
  let wordCount = 0;
  for (const ch of sortedChapters) {
    parts.push(`\n## ${ch.title}`);
    // U7: capítulos-directo. Si el capítulo tiene contenido directo (trabajo
    // sin escenas), se exporta como el texto del capítulo. Si además tiene
    // escenas, el content actúa como intro y las escenas siguen después.
    const chapterText = stripHtml(ch.content ?? '');
    if (chapterText) {
      parts.push(`\n${chapterText}`);
      wordCount += countWords(markdownToPlainText(chapterText));
    }
    const scs = (byChapter.get(ch.id) ?? []).sort((a, b) => a.order - b.order);
    for (let i = 0; i < scs.length; i++) {
      const s = scs[i];
      parts.push(`\n### ${s.title}`);
      if (s.summary) parts.push(`\n*${s.summary}*`);
      const text = stripHtml(s.content);
      if (text) {
        parts.push(`\n${text}`);
        wordCount += countWords(markdownToPlainText(text));
      }
      // Separador visual entre escenas (no al final del manuscrito).
      const isLast = ch === sortedChapters[sortedChapters.length - 1] && i === scs.length - 1;
      if (!isLast) parts.push('\n---');
    }
  }

  // Pie con el conteo de palabras del manuscrito (útil para escritores).
  parts.push(`\n---\n*${wordCount.toLocaleString('es-AR')} palabras*`);

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
    const hr = /^-{3,}$/.test(line.trim());
    const li = line.match(/^[-*] (.+)$/);
    const quote = line.match(/^> (.+)$/);
    if (hr) {
      flushList();
      content.push({
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.8, lineColor: '#888888' }],
        margin: [0, 8, 0, 8],
      });
    } else if (h1) {
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
    const hr = /^-{3,}$/.test(line.trim());
    const li = line.match(/^[-*] (.+)$/);
    const quote = line.match(/^> (.+)$/);
    const bold = line.match(/^\*\*(.+)\*\*$/);
    if (hr) {
      // Separador de escena: puntos centrados (convención editorial).
      paragraphs.push(
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 160, after: 160 }, children: [new TextRun('· · ·')] }),
      );
    } else if (h1) paragraphs.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(h1[1])] }));
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
