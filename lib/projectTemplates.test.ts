import { describe, it, expect } from 'vitest';
import { GENRE_TEMPLATES, getGenreTemplate } from '@/lib/projectTemplates';

describe('GENRE_TEMPLATES (U5)', () => {
  it('expone al menos tres géneros (thriller, romance, sci-fi)', () => {
    const keys = GENRE_TEMPLATES.map((t) => t.key);
    expect(keys).toContain('thriller');
    expect(keys).toContain('romance');
    expect(keys).toContain('scifi');
  });

  it('cada plantilla tiene label y descripción descriptivos', () => {
    for (const t of GENRE_TEMPLATES) {
      expect(t.label.trim().length).toBeGreaterThan(0);
      expect(t.description.trim().length).toBeGreaterThan(0);
    }
  });

  it('cada plantilla tiene capítulos con beats y kinds válidos', () => {
    const kinds = ['inciting', 'rising', 'climax', 'falling', 'resolution', 'custom'];
    for (const t of GENRE_TEMPLATES) {
      expect(t.chapters.length).toBeGreaterThan(0);
      const allBeats = t.chapters.flatMap((c) => c.beats);
      expect(allBeats.length).toBeGreaterThan(0);
      for (const b of allBeats) {
        expect(kinds).toContain(b.kind);
        expect(b.title.trim().length).toBeGreaterThan(0);
      }
      for (const c of t.chapters) {
        expect(c.title.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('los capítulos tienen títulos únicos dentro de una plantilla', () => {
    for (const t of GENRE_TEMPLATES) {
      const titles = t.chapters.map((c) => c.title);
      expect(new Set(titles).size).toBe(titles.length);
    }
  });

  it('getGenreTemplate devuelve la plantilla por clave', () => {
    expect(getGenreTemplate('thriller')?.label).toBe('Thriller');
    expect(getGenreTemplate('no-existe')).toBeUndefined();
  });
});
