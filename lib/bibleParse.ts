import { BIBLE_SECTION_DEFAULTS } from '@/lib/db';
import type { StoryBible } from '@/types';

export type BibleKey = StoryBible['sections'][number]['key'];

export function parseBibleSections(text: string): Partial<Record<BibleKey, string>> {
  const out: Partial<Record<BibleKey, string>> = {};
  const lines = text.split('\n');
  let currentKey: BibleKey | null = null;
  let buf: string[] = [];
  const flush = () => {
    if (currentKey) out[currentKey] = buf.join('\n').trim();
    buf = [];
  };
  for (const line of lines) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) {
      flush();
      const label = m[1].trim().toLowerCase();
      const def = BIBLE_SECTION_DEFAULTS.find(
        (d) => d.label.toLowerCase() === label || d.key === label,
      );
      currentKey = def ? def.key : null;
    } else if (currentKey) {
      buf.push(line);
    }
  }
  flush();
  return out;
}
