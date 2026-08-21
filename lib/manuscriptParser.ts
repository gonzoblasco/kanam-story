/**
 * U6 — Parser de manuscrito markdown a capítulos.
 *
 * Lógica pura (sin DB ni DOM) para convertir un manuscrito en formato novela
 * (markdown) en una estructura de capítulos con `content` directo, lista para
 * crear en kanam-story. Mismo patrón que `lib/search.ts` / `lib/snapshots.ts`.
 *
 * Formato soportado (referencia: projects/ultimo-turno/ultimo-turno.md):
 *   - `# Titulo`            → título de la obra (nivel 1, opcional).
 *   - `## Prologo` / `## Parte 1` / `## Parte 2: El origen` → partes (nivel 2).
 *   - `### Capitulo 1 — El nombre` / `### Capitulo 7` → capítulos (nivel 3).
 *
 * El contenido de un capítulo es el texto entre su header `###` y el siguiente
 * header de cualquier nivel. Una parte puede tener contenido directo (p. ej. el
 * Prólogo) además de capítulos.
 */

export interface ParsedChapter {
  /** Título limpio: "El nombre" para "Capítulo 1 — El nombre"; "Capítulo 7" si no tiene título. */
  title: string;
  /** Contenido del capítulo (texto entre su header y el siguiente header). */
  content: string;
  /** Orden global dentro del manuscrito (0-based, a través de todas las partes). */
  order: number;
  /** Número del capítulo si se pudo extraer ("Capítulo 1" → 1). */
  number?: number;
}

export interface ParsedPart {
  title: string;
  /** Contenido directo de la parte (texto entre su header y el primer header hijo). */
  content: string;
  chapters: ParsedChapter[];
}

export type ParsedManuscript =
  | { title: string; parts: ParsedPart[] }
  | { title: string; chapters: ParsedChapter[] };

/** Extrae el texto de un header markdown, quitando el marcador `#`. */
function headerText(line: string): string {
  return line.replace(/^#{1,6}\s+/, '').trim();
}

/**
 * Parsea un header de capítulo (`### ...`).
 * "Capítulo 1 — El nombre" → { number: 1, title: "El nombre" }.
 * "Capítulo 7" → { number: 7, title: "Capítulo 7" }.
 */
function parseChapterHeader(line: string): { number?: number; title: string } {
  const text = headerText(line);
  const match = text.match(/^Cap[ií]tulo\s+(\d+)(?:\s*[—–-]\s*(.+))?$/i);
  if (match) {
    const number = parseInt(match[1], 10);
    const rest = match[2]?.trim();
    if (rest) return { number, title: rest };
    return { number, title: text };
  }
  return { title: text };
}

/**
 * Normaliza el contenido de un capítulo/parte: quita headers internos de nivel
 * 4+ (los convierte a texto plano) y recorta los extremos.
 */
function normalizeContent(raw: string): string {
  return raw
    .split('\n')
    .map((line) => {
      const inner = line.match(/^(#{4,})\s+(.*)$/);
      if (inner) return inner[2];
      return line;
    })
    .join('\n')
    .trim();
}

/**
 * Convierte un manuscrito markdown en capítulos con `content` directo.
 *
 * Devuelve `{ title, parts }` cuando hay al menos una parte (`##`); si el
 * manuscrito solo tiene capítulos (`###`) sin partes, devuelve `{ title, chapters }`.
 */
export function parseManuscript(markdown: string): ParsedManuscript {
  const lines = markdown.split('\n');

  let title = '';
  const parts: ParsedPart[] = [];
  const looseChapters: ParsedChapter[] = [];
  let currentPart: ParsedPart | null = null;
  let currentChapter: ParsedChapter | null = null;
  let buffer: string[] = [];
  let order = 0;

  const flush = () => {
    const text = normalizeContent(buffer.join('\n'));
    buffer = [];
    if (currentChapter) {
      currentChapter.content = text;
    } else if (currentPart) {
      currentPart.content = text;
    }
    // Texto antes de cualquier header se descarta.
  };

  for (const line of lines) {
    if (/^###\s+/.test(line)) {
      flush();
      const { number, title: chapterTitle } = parseChapterHeader(line);
      currentChapter = { title: chapterTitle, content: '', order: order++, number };
      if (currentPart) currentPart.chapters.push(currentChapter);
      else looseChapters.push(currentChapter);
    } else if (/^##\s+/.test(line)) {
      flush();
      currentChapter = null;
      currentPart = { title: headerText(line), content: '', chapters: [] };
      parts.push(currentPart);
    } else if (/^#\s+/.test(line)) {
      flush();
      if (!title) title = headerText(line);
    } else {
      buffer.push(line);
    }
  }
  flush();

  if (parts.length > 0) {
    if (looseChapters.length > 0) {
      parts.unshift({ title: '', content: '', chapters: looseChapters });
    }
    return { title, parts };
  }
  return { title, chapters: looseChapters };
}
