import { describe, it, expect } from 'vitest';
import { parseAgentReply, isValidAction, filterValidActions, parseBeatList } from '@/lib/agentReply';

describe('parseAgentReply', () => {
  it('parsea un bloque JSON limpio', () => {
    const raw = JSON.stringify({
      reply: 'Podemos reescribir la escena.',
      actions: [{ type: 'rewrite_scene', sceneId: 's1', before: 'a', after: 'b', summary: 'x' }],
    });
    const result = parseAgentReply(raw);
    expect(result).not.toBeNull();
    expect(result!.reply).toBe('Podemos reescribir la escena.');
    expect(result!.actions).toHaveLength(1);
  });

  it('parsea un bloque envuelto en fences markdown', () => {
    const raw = `Claro, acá va mi propuesta:

\`\`\`json
{"reply":"Listo","actions":[{"type":"add_beat","chapterId":"c1","beat":{"id":"b1","kind":"climax","title":"Giro","description":"","notes":"","characters":[],"status":"draft","source":"ai","position":0},"summary":"agregar beat"}]}
\`\`\`
`;
    const result = parseAgentReply(raw);
    expect(result).not.toBeNull();
    expect(result!.reply).toBe('Listo');
    expect(result!.actions).toHaveLength(1);
  });

  it('ignora prosa antes y después del bloque', () => {
    const raw = `Hola, te propongo esto:
{"reply":"ok","actions":[]}
Saludos.`;
    const result = parseAgentReply(raw);
    expect(result).not.toBeNull();
    expect(result!.reply).toBe('ok');
  });

  it('devuelve null si no hay JSON', () => {
    expect(parseAgentReply('solo texto sin acciones')).toBeNull();
    expect(parseAgentReply('')).toBeNull();
  });

  it('devuelve null si el JSON es inválido', () => {
    expect(parseAgentReply('{esto no es json')).toBeNull();
  });

  it('tolera actions ausentes como array vacío', () => {
    const result = parseAgentReply('{"reply":"solo texto"}');
    expect(result).not.toBeNull();
    expect(result!.actions).toEqual([]);
  });

  it('tolera una llave suelta en la prosa posterior al JSON', () => {
    const raw =
      'Claro: {"reply":"ok","actions":[{"type":"rewrite_scene","sceneId":"s1","after":"b","summary":"x"}]} Eso es todo.} ';
    const result = parseAgentReply(raw);
    expect(result).not.toBeNull();
    expect(result!.reply).toBe('ok');
    expect(result!.actions).toHaveLength(1);
  });
});

describe('isValidAction', () => {
  it('acepta rewrite_scene con campos mínimos', () => {
    expect(isValidAction({ type: 'rewrite_scene', sceneId: 's1', after: 'x' })).toBe(true);
  });
  it('rechaza rewrite_scene sin after', () => {
    expect(isValidAction({ type: 'rewrite_scene', sceneId: 's1' })).toBe(false);
  });
  it('rechaza tipos desconocidos', () => {
    expect(isValidAction({ type: 'hack_the_planet' })).toBe(false);
  });
  it('rechaza no-objetos', () => {
    expect(isValidAction(null)).toBe(false);
    expect(isValidAction('string')).toBe(false);
  });
  it('rechaza update_bible con sección inválida', () => {
    expect(isValidAction({ type: 'update_bible', section: 'no-existe', value: 'x', summary: 'y' })).toBe(false);
  });
  it('acepta update_bible con sección válida', () => {
    expect(isValidAction({ type: 'update_bible', section: 'themes', value: 'x', summary: 'y' })).toBe(true);
  });
  it('rechaza add_beat sin title', () => {
    expect(isValidAction({ type: 'add_beat', chapterId: 'c1', beat: { kind: 'climax' }, summary: 'x' })).toBe(false);
  });
  it('acepta add_beat con title', () => {
    expect(isValidAction({ type: 'add_beat', chapterId: 'c1', beat: { title: 'Giro' }, summary: 'x' })).toBe(true);
  });
  it('rechaza add_character sin name', () => {
    expect(isValidAction({ type: 'add_character', character: { role: 'x' }, summary: 'y' })).toBe(false);
  });
  it('acepta add_character con name', () => {
    expect(isValidAction({ type: 'add_character', character: { name: 'Lía' }, summary: 'y' })).toBe(true);
  });
});

describe('filterValidActions', () => {
  it('filtra acciones inválidas', () => {
    const result = filterValidActions([
      { type: 'rewrite_scene', sceneId: 's1', after: 'x' },
      { type: 'nope' },
      null,
      { type: 'update_beat', beatId: 'b1', changes: { title: 'nuevo' } },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('rewrite_scene');
    expect(result[1].type).toBe('update_beat');
  });
});

describe('parseBeatList', () => {
  it('parsea un array JSON limpio de beats', () => {
    const raw = JSON.stringify([
      { kind: 'inciting', title: 'La invitación', description: 'recibe una carta', notes: '', characters: [], status: 'draft' },
      { kind: 'climax', title: 'El duelo', description: '', notes: 'subir tensión', characters: ['Renzo'], status: 'draft' },
    ]);
    const result = parseBeatList(raw);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('La invitación');
    expect(result[0].kind).toBe('inciting');
    expect(result[1].characters).toEqual(['Renzo']);
  });

  it('tolera prosa y fences alrededor del array', () => {
    const raw = `Acá va mi propuesta:
\`\`\`json
[{"kind":"rising","title":"Giro","description":"","notes":"","characters":[],"status":"draft"}]
\`\`\`
Saludos.`;
    const result = parseBeatList(raw);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Giro');
  });

  it('tolera una llave suelta en la prosa posterior', () => {
    const raw = `[{"kind":"custom","title":"A","description":"","notes":"","characters":[],"status":"draft"}] Eso es todo.}`;
    const result = parseBeatList(raw);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('A');
  });

  it('descarta beats inválidos (sin title o kind desconocido)', () => {
    const raw = JSON.stringify([
      { kind: 'inciting', title: 'Válido', description: '', notes: '', characters: [], status: 'draft' },
      { kind: 'nope', title: 'Inválido', description: '', notes: '', characters: [], status: 'draft' },
      { title: 'Sin kind', description: '', notes: '', characters: [], status: 'draft' },
    ]);
    const result = parseBeatList(raw);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Válido');
  });

  it('devuelve array vacío si no hay array', () => {
    expect(parseBeatList('solo texto')).toEqual([]);
    expect(parseBeatList('')).toEqual([]);
  });
});
