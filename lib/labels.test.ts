import { describe, it, expect } from 'vitest';
import { mapRoleToType, characterTypeLabel, mapCategoryToKind, worldKindLabel, styleText } from '@/lib/labels';

describe('mapRoleToType', () => {
  it('mapea valores conocidos en español e inglés', () => {
    expect(mapRoleToType('protagonista')).toBe('protagonist');
    expect(mapRoleToType('protagonist')).toBe('protagonist');
    expect(mapRoleToType('antagonista')).toBe('antagonist');
    expect(mapRoleToType('secundaria')).toBe('supporting');
    expect(mapRoleToType('menor')).toBe('minor');
    expect(mapRoleToType('love interest')).toBe('love_interest');
    expect(mapRoleToType('interés romántico')).toBe('love_interest');
  });

  it('default a supporting para valores desconocidos o vacíos', () => {
    expect(mapRoleToType('')).toBe('supporting');
    expect(mapRoleToType(undefined)).toBe('supporting');
    expect(mapRoleToType('villano de la esquina')).toBe('supporting');
  });
});

describe('characterTypeLabel', () => {
  it('devuelve la etiqueta legible', () => {
    expect(characterTypeLabel('protagonist')).toBe('Protagonista');
    expect(characterTypeLabel('love_interest')).toBe('Interés romántico');
  });
});

describe('mapCategoryToKind', () => {
  it('mapea categorías legacy a kinds finos', () => {
    expect(mapCategoryToKind('location')).toBe('place');
    expect(mapCategoryToKind('lugar')).toBe('place');
    expect(mapCategoryToKind('lore')).toBe('lore');
    expect(mapCategoryToKind('rule')).toBe('rule');
    expect(mapCategoryToKind('regla')).toBe('rule');
    expect(mapCategoryToKind('item')).toBe('item');
    expect(mapCategoryToKind('object')).toBe('item');
    expect(mapCategoryToKind('objeto')).toBe('item');
    expect(mapCategoryToKind('organización')).toBe('organization');
    expect(mapCategoryToKind('evento')).toBe('key_event');
    expect(mapCategoryToKind('pista')).toBe('clue');
    expect(mapCategoryToKind('magia')).toBe('magic_system');
  });

  it('default a other para valores desconocidos o vacíos', () => {
    expect(mapCategoryToKind('')).toBe('other');
    expect(mapCategoryToKind(undefined)).toBe('other');
    expect(mapCategoryToKind('cosa rara')).toBe('other');
  });
});

describe('worldKindLabel', () => {
  it('devuelve la etiqueta legible', () => {
    expect(worldKindLabel('place')).toBe('Lugar');
    expect(worldKindLabel('magic_system')).toBe('Sistema de magia');
    expect(worldKindLabel('key_event')).toBe('Evento clave');
  });
});

describe('styleText (Match My Style)', () => {
  it('inyecta el perfil completo en modo match', () => {
    const text = styleText({
      mode: 'match',
      profile: {
        tone: 'melancólico',
        rhythm: 'pausado',
        sentenceLength: 'frases cortas',
        vocabulary: 'coloquial',
        dialogue: 'poco diálogo',
        imagery: 'metáforas',
        subtext: 'mucho subtexto',
      },
    });
    expect(text).toContain('Estilo del autor: melancólico');
    expect(text).toContain('Ritmo: pausado');
    expect(text).toContain('Subtexto: mucho subtexto');
  });

  it('devuelve vacío si no hay perfil', () => {
    expect(styleText({ mode: 'match' })).toBe('');
  });
});
