// ── Типы отрядов игрока и архетипы монстров ─────────────────────────────────

import type { Cost } from './races';

export type SquadType = 'worker' | 'warrior' | 'guardian' | 'ranger' | 'scout';

export interface SquadTypeDef {
  id: SquadType;
  name: string;
  short: string;
  icon: string;
  color: string;
  desc: string;
  role: string;
  hp: number;
  atk: number;
  speed: number;
  carry: number;
  range: number; // 0 — ближний бой
  dmgRed: number;
  cost: Cost;
}

export const SQUAD_TYPES: Record<SquadType, SquadTypeDef> = {
  worker: {
    id: 'worker',
    name: 'Артель добытчиков',
    short: 'Добытчики',
    icon: 'pick',
    color: '#8fd48a',
    role: 'Добыча',
    desc: 'Носят вдвое больше ресурсов, но почти не умеют драться.',
    hp: 0.75, atk: 0.4, speed: 1.05, carry: 2.0, range: 0, dmgRed: 0,
    cost: { wood: 45, metal: 20, gold: 15 },
  },
  warrior: {
    id: 'warrior',
    name: 'Ратники',
    short: 'Ратники',
    icon: 'swords',
    color: '#e0a94f',
    role: 'Бой',
    desc: 'Универсальные бойцы: крепкий удар и достойная добыча.',
    hp: 1, atk: 1.2, speed: 1, carry: 1, range: 0, dmgRed: 0,
    cost: { wood: 60, metal: 45, gold: 30 },
  },
  guardian: {
    id: 'guardian',
    name: 'Стражи',
    short: 'Стражи',
    icon: 'shield',
    color: '#7fb0d8',
    role: 'Танк',
    desc: 'Живучие латники: втрое больше здоровья и −30% входящего урона. Медлительны.',
    hp: 2.6, atk: 0.75, speed: 0.72, carry: 0.7, range: 0, dmgRed: 0.3,
    cost: { wood: 70, metal: 90, gold: 40 },
  },
  ranger: {
    id: 'ranger',
    name: 'Лучники',
    short: 'Лучники',
    icon: 'crosshair',
    color: '#c9a2ff',
    role: 'Дальний бой',
    desc: 'Бьют на расстоянии 150 шагов, не подставляясь под удар. Очень хрупкие.',
    hp: 0.7, atk: 1.15, speed: 1.02, carry: 0.85, range: 150, dmgRed: 0,
    cost: { wood: 80, metal: 35, gold: 55, gems: 8 },
  },
  scout: {
    id: 'scout',
    name: 'Разведчики',
    short: 'Разведка',
    icon: 'wind',
    color: '#f0e08a',
    role: 'Скорость',
    desc: 'Вдвое быстрее прочих: молниеносные ходки за ресурсами и перехват монстров.',
    hp: 0.62, atk: 0.85, speed: 1.85, carry: 1.25, range: 0, dmgRed: 0,
    cost: { wood: 55, metal: 30, gold: 45 },
  },
};

export const SQUAD_ORDER: SquadType[] = ['worker', 'warrior', 'guardian', 'ranger', 'scout'];

// ── Монстры ──────────────────────────────────────────────────────────────────

export type MobArch = 'grunt' | 'stalker' | 'brute' | 'hexer';

export interface MobArchDef {
  id: MobArch;
  name: string;
  hp: number;
  atk: number;
  speed: number;
  range: number;
  minLevel: number;
  weight: number;
  color: string;
  edge: string;
}

export const MOB_ARCHS: Record<MobArch, MobArchDef> = {
  grunt: { id: 'grunt', name: 'Тварь', hp: 1, atk: 1, speed: 1, range: 0, minLevel: 1, weight: 3, color: '#32080f', edge: '#e03060' },
  stalker: { id: 'stalker', name: 'Ловчий', hp: 0.7, atk: 0.95, speed: 1.75, range: 0, minLevel: 2, weight: 2.2, color: '#0f2820', edge: '#39d98a' },
  brute: { id: 'brute', name: 'Громила', hp: 2.6, atk: 1.45, speed: 0.72, range: 0, minLevel: 3, weight: 2, color: '#2a1408', edge: '#ff8c3a' },
  hexer: { id: 'hexer', name: 'Проклинатель', hp: 0.85, atk: 1.1, speed: 0.92, range: 165, minLevel: 5, weight: 1.8, color: '#1b0e2e', edge: '#9d6bff' },
};

export function pickArch(level: number, rnd: () => number): MobArch {
  const pool = Object.values(MOB_ARCHS).filter((a) => level >= a.minLevel);
  const total = pool.reduce((s, a) => s + a.weight, 0);
  let r = rnd() * total;
  for (const a of pool) {
    r -= a.weight;
    if (r <= 0) return a.id;
  }
  return 'grunt';
}
