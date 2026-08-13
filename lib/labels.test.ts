import { describe, it, expect } from 'vitest';
import { mapRoleToType, characterTypeLabel } from '@/lib/labels';

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
