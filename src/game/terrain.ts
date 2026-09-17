// ── Непроходимая и особая местность ─────────────────────────────────────────

import type { SquadType } from './units';

export type ZoneKind = 'rock' | 'chasm' | 'swamp';
export type Mover = SquadType | 'monster' | 'caravan';

export interface Zone {
  id: string;
  kind: ZoneKind;
  x: number;
  y: number;
  r: number;
  seed: number;
}

export const ZONE_META: Record<ZoneKind, { name: string; desc: string; color: string; edge: string }> = {
  rock: {
    name: 'Скальный кряж',
    desc: 'Непроходим ни для кого — ни для ваших отрядов, ни для монстров.',
    color: '#2a2f39',
    edge: '#5b6472',
  },
  chasm: {
    name: 'Расселина',
    desc: 'Перепрыгнуть могут только Разведчики. Монстры сюда не суются.',
    color: '#120c1c',
    edge: '#8b5cf6',
  },
  swamp: {
    name: 'Топь',
    desc: 'Тяжёлая броня тонет: проходима лишь для Разведчиков и Лучников. Монстры проходят свободно.',
    color: '#16281f',
    edge: '#4f9e6a',
  },
};

/** Может ли данный тип существа находиться в зоне. */
export function zoneAllows(kind: ZoneKind, who: Mover): boolean {
  if (kind === 'rock') return false;
  if (kind === 'chasm') return who === 'scout';
  // swamp
  return who === 'scout' || who === 'ranger' || who === 'monster' || who === 'caravan';
}
