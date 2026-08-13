import { describe, expect, it } from 'vitest';
import {
  parseCharacterEntries,
  parseWorldEntries,
  safeParseJsonArray,
} from '@/lib/bibleExtract';

describe('parseCharacterEntries', () => {
  it('devuelve [] para texto vacío', () => {
    expect(parseCharacterEntries('')).toEqual([]);
    expect(parseCharacterEntries('   \n\n  ')).toEqual([]);
  });

  it('parsea bullets con **Nombre** en una sola línea', () => {
    const md = `- **Marta**: antagonista fría y manipuladora.
- **Lucas**: protagonista dubitativo.`;
    const out = parseCharacterEntries(md);
    expect(out).toHaveLength(2);
    expect(out[0].name).toBe('Marta');
    expect(out[0].personality).toContain('antagonista fría y manipuladora');
    expect(out[1].name).toBe('Lucas');
    expect(out[1].personality).toContain('protagonista dubitativo');
  });

  it('parsea headings ### Nombre', () => {
    const md = `### Marta
Rol: antagonista
Voz: cortante, seca
Personalidad: controladora`;
    const out = parseCharacterEntries(md);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('Marta');
    expect(out[0].role).toBe('antagonista');
    expect(out[0].voice).toBe('cortante, seca');
    expect(out[0].personality).toBe('controladora');
  });

  it('distribuye campos con etiquetas en español', () => {
    const md = `### Lucas
Rol: protagonista
Edad: 28
Personalidad: tímido
Voz y forma de hablar: dubitativa, frases cortas
Objetivos y motivaciones: encontrar a su hermana`;
    const out = parseCharacterEntries(md);
    expect(out).toHaveLength(1);
    const c = out[0];
    expect(c.role).toBe('protagonista');
    expect(c.age).toBe('28');
    expect(c.personality).toBe('tímido');
    expect(c.voice).toBe('dubitativa, frases cortas');
    expect(c.goals).toBe('encontrar a su hermana');
  });

  it('cae a personality cuando no hay etiquetas', () => {
    const md = `### Marta
Fría. Calculadora. Siempre tiene un as bajo la manga.
No le importa el daño colateral.`;
    const out = parseCharacterEntries(md);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('Marta');
    expect(out[0].personality).toContain('Fría');
    expect(out[0].personality).toContain('No le importa el daño colateral');
  });

  it('soporta bullets sin **negrita**', () => {
    const md = `- Marta: antagonista
- Lucas: protagonista`;
    const out = parseCharacterEntries(md);
    expect(out).toHaveLength(2);
    expect(out[0].name).toBe('Marta');
    expect(out[0].personality).toContain('antagonista');
  });

  it('mezcla headings y bullets en el mismo texto', () => {
    const md = `### Marta
Rol: antagonista

- **Lucas**
  Personalidad: optimista
  Voz: rápida, ansiosa`;
    const out = parseCharacterEntries(md);
    expect(out).toHaveLength(2);
    expect(out[0].name).toBe('Marta');
    expect(out[1].name).toBe('Lucas');
    expect(out[1].personality).toBe('optimista');
    expect(out[1].voice).toBe('rápida, ansiosa');
  });
});

describe('parseWorldEntries', () => {
  it('devuelve [] para texto vacío', () => {
    expect(parseWorldEntries('')).toEqual([]);
  });

  it('parsea bullets básicos', () => {
    const md = `- **Café del Ángel**: lugar de encuentro de los protagonistas.
- **La Orden**: grupo secreto que controla la ciudad.`;
    const out = parseWorldEntries(md);
    expect(out).toHaveLength(2);
    expect(out[0].name).toBe('Café del Ángel');
    expect(out[0].description).toContain('lugar de encuentro');
    expect(out[1].name).toBe('La Orden');
  });

  it('respeta la categoría explícita [lugar] [regla] etc', () => {
    const md = `- **El Gremio** [regla]: los magos no pueden usar fuego.
- **Varita de Saúco** [objeto]: arma legendaria.`;
    const out = parseWorldEntries(md);
    expect(out).toHaveLength(2);
    expect(out[0].category).toBe('rule');
    expect(out[1].category).toBe('item');
  });

  it('infiere categoría por palabras clave cuando no hay tag', () => {
    const md = `- **Bosque Encantado**: lugar donde la magia se vuelve loca.
- **Espada del Héroe**: arma legendaria forjada en el alba.
- **Religión del Sol**: dogma central de la cultura sureña.`;
    const out = parseWorldEntries(md);
    const byName = Object.fromEntries(out.map((e) => [e.name, e.category]));
    expect(byName['Bosque Encantado']).toBe('location');
    expect(byName['Espada del Héroe']).toBe('item');
    expect(byName['Religión del Sol']).toBe('lore');
  });

  it('descarta entradas sin descripción', () => {
    const md = `- **Nombre sin descripción**`;
    const out = parseWorldEntries(md);
    expect(out).toEqual([]);
  });

  it('parsea headings ###', () => {
    const md = `### Reino del Alba
Capital: Solaria. Gobierno: monarquía constitucional.`;
    const out = parseWorldEntries(md);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('Reino del Alba');
    expect(out[0].description).toContain('Capital: Solaria');
  });
});

describe('safeParseJsonArray', () => {
  it('parsea un array JSON directo', () => {
    const out = safeParseJsonArray<{ name: string }>(`[{"name":"Marta"},{"name":"Lucas"}]`);
    expect(out).toEqual([{ name: 'Marta' }, { name: 'Lucas' }]);
  });

  it('extrae el array de un objeto con clave entries', () => {
    const out = safeParseJsonArray<{ name: string }>(
      `{"entries":[{"name":"Marta"}]}`,
    );
    expect(out).toEqual([{ name: 'Marta' }]);
  });

  it('extrae el array dentro de un fence markdown', () => {
    const out = safeParseJsonArray<{ name: string }>(
      '```json\n[{"name":"Marta"}]\n```',
    );
    expect(out).toEqual([{ name: 'Marta' }]);
  });

  it('devuelve [] para texto sin JSON válido', () => {
    expect(safeParseJsonArray('hola mundo')).toEqual([]);
    expect(safeParseJsonArray('')).toEqual([]);
  });

  it('devuelve [] si el JSON es válido pero no es un array', () => {
    expect(safeParseJsonArray('{"name":"Marta"}')).toEqual([]);
  });
});