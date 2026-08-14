import { describe, it, expect } from 'vitest';
import { buildCharacterSyncPlan, buildWorldSyncPlan } from '@/lib/bibleSync';
import type { Character, WorldEntity } from '@/types';

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'c1',
    projectId: 'p1',
    name: 'Renzo',
    type: 'protagonist',
    age: '',
    appearance: '',
    personality: '',
    voice: '',
    backstory: '',
    goals: '',
    source: 'manual',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function makeWorld(overrides: Partial<WorldEntity> = {}): WorldEntity {
  return {
    id: 'w1',
    projectId: 'p1',
    name: 'Club',
    kind: 'place',
    description: '',
    source: 'manual',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe('buildCharacterSyncPlan', () => {
  it('crea personajes nuevos con source biblia y dedupe case-insensitive', () => {
    const entries = [
      { name: 'Renzo', type: 'protagonist', personality: 'terco' },
      { name: '  renzo  ', type: 'protagonist', personality: 'orgulloso' }, // duplicado (trim + case)
      { name: 'Lía', type: 'supporting', personality: 'dulce' },
    ];
    const existing = [makeCharacter({ name: 'Renzo', source: 'biblia' })];
    const plan = buildCharacterSyncPlan(entries, existing);
    // 'Renzo' ya existe (biblia) → no se crea; 'Lía' es nuevo → se crea.
    expect(plan.toCreate).toHaveLength(1);
    expect(plan.toCreate[0].name).toBe('Lía');
    expect(plan.toCreate[0].source).toBe('biblia');
  });

  it('no pisa manual: solo toca source biblia y rellena solo campos vacíos', () => {
    const entries = [
      { name: 'Renzo', personality: 'terco', voice: 'seco', goals: 'ganar', backstory: 'campeón' },
    ];
    const existing = [
      makeCharacter({ name: 'Renzo', source: 'biblia', personality: 'ya tiene', voice: '', goals: '', backstory: '' }),
    ];
    const plan = buildCharacterSyncPlan(entries, existing);
    expect(plan.toCreate).toHaveLength(0);
    expect(plan.toUpdate).toHaveLength(1);
    // personality ya tiene valor → no se pisa; voice/goals/backstory vacíos → se rellenan.
    expect(plan.toUpdate[0].patch.personality).toBeUndefined();
    expect(plan.toUpdate[0].patch.voice).toBe('seco');
    expect(plan.toUpdate[0].patch.goals).toBe('ganar');
    expect(plan.toUpdate[0].patch.backstory).toBe('campeón');
  });

  it('salta personajes manuales (no los toca)', () => {
    const entries = [{ name: 'Renzo', personality: 'terco' }];
    const existing = [makeCharacter({ name: 'Renzo', source: 'manual' })];
    const plan = buildCharacterSyncPlan(entries, existing);
    expect(plan.toCreate).toHaveLength(0);
    expect(plan.toUpdate).toHaveLength(0);
  });

  it('respeta el revertir: un personaje revertido a manual ya no se toca', () => {
    // Simula un personaje que fue importado de biblia y luego revertido a manual.
    const entries = [{ name: 'Renzo', personality: 'terco' }];
    const existing = [makeCharacter({ name: 'Renzo', source: 'manual', personality: '' })];
    const plan = buildCharacterSyncPlan(entries, existing);
    expect(plan.toCreate).toHaveLength(0);
    expect(plan.toUpdate).toHaveLength(0);
  });

  it('ignora entradas sin nombre', () => {
    const plan = buildCharacterSyncPlan([{ personality: 'x' }], []);
    expect(plan.toCreate).toHaveLength(0);
  });
});

describe('buildWorldSyncPlan', () => {
  it('crea entidades nuevas con source biblia y dedupe case-insensitive', () => {
    const entries = [
      { name: 'Club', kind: 'place', description: 'salón' },
      { name: '  club  ', kind: 'place', description: 'otro' }, // duplicado
      { name: 'Bosque', kind: 'place', description: 'oscuro' },
    ];
    const existing = [makeWorld({ name: 'Club', source: 'biblia' })];
    const plan = buildWorldSyncPlan(entries, existing);
    expect(plan.toCreate).toHaveLength(1);
    expect(plan.toCreate[0].name).toBe('Bosque');
    expect(plan.toCreate[0].source).toBe('biblia');
  });

  it('rellena solo description vacía en entidades de biblia', () => {
    const entries = [{ name: 'Club', description: 'salón con naftalina' }];
    const existing = [makeWorld({ name: 'Club', source: 'biblia', description: '' })];
    const plan = buildWorldSyncPlan(entries, existing);
    expect(plan.toUpdate).toHaveLength(1);
    expect(plan.toUpdate[0].patch.description).toBe('salón con naftalina');
  });

  it('no pisa entidades manuales', () => {
    const entries = [{ name: 'Club', description: 'nuevo' }];
    const existing = [makeWorld({ name: 'Club', source: 'manual', description: 'viejo' })];
    const plan = buildWorldSyncPlan(entries, existing);
    expect(plan.toCreate).toHaveLength(0);
    expect(plan.toUpdate).toHaveLength(0);
  });
});
