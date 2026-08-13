import type { WorldEntity } from '@/types';
import { mapCategoryToKind } from '@/lib/labels';

export interface ExtractedCharacter {
  name: string;
  role: string;
  age: string;
  appearance: string;
  personality: string;
  voice: string;
  backstory: string;
  goals: string;
}

export interface ExtractedWorld {
  name: string;
  kind: WorldEntity['kind'];
  description: string;
}

const FIELD_PATTERNS: Array<{ key: keyof ExtractedCharacter; re: RegExp }> = [
  { key: 'role', re: /^\s*(?:-\s*)?(?:\*\*)?\s*rol(?:\s+e[nr]\s+la\s+historia)?\s*[:\-]\s*/i },
  { key: 'age', re: /^\s*(?:-\s*)?(?:\*\*)?\s*edad\s*[:\-]\s*/i },
  { key: 'appearance', re: /^\s*(?:-\s*)?(?:\*\*)?\s*apariencia\s*[:\-]\s*/i },
  { key: 'personality', re: /^\s*(?:-\s*)?(?:\*\*)?\s*personalidad\s*[:\-]\s*/i },
  { key: 'voice', re: /^\s*(?:-\s*)?(?:\*\*)?\s*voz(?:\s+y\s+forma\s+de\s+hablar)?\s*[:\-]\s*/i },
  { key: 'goals', re: /^\s*(?:-\s*)?(?:\*\*)?\s*objetivos?(?:\s+y\s+motivaciones?)?\s*[:\-]\s*/i },
  { key: 'backstory', re: /^\s*(?:-\s*)?(?:\*\*)?\s*(?:historia\s+previa|backstory|historia)\s*[:\-]\s*/i },
];

function stripInlineMd(s: string): string {
  return s.replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim();
}

function looksLikeHeading(line: string): boolean {
  return /^\s*#{1,6}\s+/.test(line) || /^\s*[-*]\s+\*\*/.test(line);
}

function extractName(line: string): string | null {
  const h = line.match(/^\s*#{1,6}\s+(.+?)\s*$/);
  if (h) return stripInlineMd(h[1]);
  const b = line.match(/^\s*[-*]\s+\*\*(.+?)\*\*/);
  if (b) return stripInlineMd(b[1]);
  return null;
}

function extractHeaderName(line: string): string | null {
  const name = extractName(line);
  if (!name) return null;
  if (name.includes(':')) return null;
  if (name.length >= 80) return null;
  return name;
}

function extractBulletNameAndTail(line: string): { name: string; tail: string } | null {
  const m = line.match(/^\s*[-*]\s+\*\*(.+?)\*\*(.*)$/);
  if (!m) return null;
  const name = stripInlineMd(m[1]);
  if (!name) return null;
  const rest = (m[2] ?? '').trim().replace(/^\s*[:\-–—]\s*/, '').trim();
  return { name, tail: rest };
}

function plainBulletNameAndTail(line: string): { name: string; tail: string } | null {
  const m = line.match(/^\s*[-*]\s+(?!\*)(.+?)$/);
  if (!m) return null;
  const name = stripInlineMd(m[1]);
  if (!name || name.length >= 80) return null;
  const sep = name.match(/^(.+?)\s*[:\-–—]\s*(.+)$/);
  if (sep) return { name: sep[1].trim(), tail: sep[2].trim() };
  return { name, tail: '' };
}

function blankEntry(): ExtractedCharacter {
  return { name: '', role: '', age: '', appearance: '', personality: '', voice: '', backstory: '', goals: '' };
}

function pushField(entry: ExtractedCharacter, key: keyof ExtractedCharacter, value: string): void {
  const trimmed = value.trim();
  if (!trimmed) return;
  const existing = entry[key] as string;
  const next = existing ? `${existing}\n${trimmed}` : trimmed;
  (entry as unknown as Record<string, unknown>)[key] = next;
}

function assignByPattern(entry: ExtractedCharacter, line: string): boolean {
  for (const { key, re } of FIELD_PATTERNS) {
    const m = line.match(re);
    if (m) {
      const value = line.slice(m[0].length).trim();
      if (value) {
        pushField(entry, key, value);
        return true;
      }
    }
  }
  return false;
}

function gatherFieldLines(lines: string[], startIdx: number): { value: string; endIdx: number } {
  const buf: string[] = [];
  let i = startIdx;
  while (i < lines.length) {
    const ln = lines[i];
    if (looksLikeHeading(ln) || extractBulletNameAndTail(ln) || plainBulletNameAndTail(ln)) break;
    buf.push(ln);
    i++;
  }
  return { value: buf.join('\n').trim(), endIdx: i };
}

export function parseCharacterEntries(text: string): ExtractedCharacter[] {
  const lines = (text ?? '').split('\n');
  const out: ExtractedCharacter[] = [];
  let current: ExtractedCharacter | null = null;
  let fallthroughBuf: string[] = [];

  const flushCurrent = (): void => {
    if (!current) return;
    if (!current.personality && fallthroughBuf.length > 0) {
      current.personality = fallthroughBuf.join('\n').trim();
    }
    if (current.name) out.push(current);
    current = null;
    fallthroughBuf = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headerName = extractHeaderName(line);
    const bulletNamed = extractBulletNameAndTail(line) ?? plainBulletNameAndTail(line);
    const name = headerName ?? bulletNamed?.name ?? null;

    if (name) {
      flushCurrent();
      current = blankEntry();
      current.name = name;
      const tail = bulletNamed?.tail ?? '';
      const descLines: string[] = [];
      if (tail) descLines.push(tail);
      const rest = gatherFieldLines(lines, i + 1);
      const restLines = rest.value.split('\n');
      for (const rl of restLines) {
        if (!rl.trim()) continue;
        if (!assignByPattern(current, rl)) {
          descLines.push(rl);
        }
      }
      if (descLines.length > 0 && !current.personality) {
        current.personality = descLines.join('\n').trim();
      }
      i = rest.endIdx - 1;
      continue;
    }
    if (!current) continue;
    if (!line.trim()) continue;
    if (!assignByPattern(current, line)) {
      fallthroughBuf.push(line);
    }
  }
  flushCurrent();
  return out;
}

const KIND_KEYWORDS: Array<{ kind: WorldEntity['kind']; words: string[] }> = [
  { kind: 'rule', words: ['regla', 'ley', 'prohibido', 'magic system', 'sistema de magia'] },
  { kind: 'place', words: ['lugar', 'ciudad', 'reino', 'mapa', 'continente', 'isla', 'castillo', 'bosque'] },
  { kind: 'lore', words: ['historia', 'lore', 'leyenda', 'mito', 'tradición', 'religión', 'religiosa'] },
  { kind: 'item', words: ['objeto', 'arma', 'libro', 'piedra', 'artefacto', 'espada', 'anillo'] },
  { kind: 'organization', words: ['organización', 'faccion', 'facción', 'gremio', 'orden', 'sociedad', 'clan'] },
  { kind: 'key_event', words: ['evento', 'batalla', 'guerra', 'catástrofe', 'catastrofe', 'invasión'] },
  { kind: 'clue', words: ['pista', 'clue', 'secreto', 'indicio', 'misterio'] },
  { kind: 'magic_system', words: ['magia', 'hechizo', 'conjuro', 'poderes', 'poder', 'mana'] },
];

function inferKind(name: string, description: string): WorldEntity['kind'] {
  const haystack = `${name}\n${description}`.toLowerCase();
  for (const { kind, words } of KIND_KEYWORDS) {
    if (words.some((w) => haystack.includes(w))) return kind;
  }
  return 'other';
}

export function parseWorldEntries(text: string): ExtractedWorld[] {
  const lines = (text ?? '').split('\n');
  const out: ExtractedWorld[] = [];
  let current: ExtractedWorld | null = null;
  let buf: string[] = [];

  const flush = (): void => {
    if (!current) return;
    const description = current.description.trim() || buf.join('\n').trim();
    if (current.name && description) {
      const kind = current.kind === 'other' ? inferKind(current.name, description) : current.kind;
      out.push({ name: current.name, kind, description });
    }
    current = null;
    buf = [];
  };

  for (const line of lines) {
    const headerName = extractHeaderName(line);
    const bulletNamed = extractBulletNameAndTail(line) ?? plainBulletNameAndTail(line);
    const name = headerName ?? bulletNamed?.name ?? null;

    if (name) {
      flush();
      current = { name, kind: 'other', description: bulletNamed?.tail ?? '' };
      const catMatch = line.match(/\[\s*(lugar|lore|regla|objeto|otro|location|rule|item|organización|organizacion|evento|pista|magia)\s*\]/i);
      if (catMatch) {
        current.kind = mapCategoryToKind(catMatch[1]);
      }
      continue;
    }
    if (current) {
      buf.push(line);
    }
  }
  flush();
  return out;
}

export function safeParseJsonArray<T>(raw: string): T[] {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return [];
  const candidates: string[] = [];
  const direct = trimmed.startsWith('[') ? trimmed : null;
  if (direct) candidates.push(direct);
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]+?)```/i);
  if (fenced) candidates.push(fenced[1].trim());
  const objMatch = trimmed.match(/\{[\s\S]*"entries"\s*:\s*(\[[\s\S]*\])[\s\S]*\}/);
  if (objMatch) candidates.push(objMatch[1]);
  const arrInText = trimmed.match(/\[[\s\S]*\]/);
  if (arrInText) candidates.push(arrInText[0]);

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) return parsed as T[];
    } catch {
      // try next
    }
  }
  return [];
}