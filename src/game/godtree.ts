// ── Древо Бога: мета-прогрессия за Божественные откровения ──────────────────

export interface GodNodeDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  max: number;
  cost: (lvl: number) => number; // стоимость следующего уровня
}

export const GOD_NODES: GodNodeDef[] = [
  {
    id: 'squad',
    name: 'Первый клинок',
    desc: '+1 отряд в начале каждого цикла.',
    icon: 'swords',
    max: 2,
    cost: (l) => 1 + l,
  },
  {
    id: 'wealth',
    name: 'Наследие эонов',
    desc: '+120 дерева, +80 металла, +50 золота и +20 самоцветов на старте.',
    icon: 'bag',
    max: 3,
    cost: () => 1,
  },
  {
    id: 'blood',
    name: 'Кровавый пакт',
    desc: '+25% капель крови бога за убийства.',
    icon: 'droplet',
    max: 3,
    cost: (l) => 1 + l,
  },
  {
    id: 'doom',
    name: 'Замедление рока',
    desc: 'Монстры усиливаются на 10% медленнее за каждый уровень.',
    icon: 'hourglass',
    max: 3,
    cost: () => 2,
  },
  {
    id: 'valor',
    name: 'Эхо былой мощи',
    desc: '+12% ко всем параметрам отрядов: атака, здоровье, добыча.',
    icon: 'star',
    max: 4,
    cost: (l) => 1 + l,
  },
  {
    id: 'breath',
    name: 'Второе дыхание',
    desc: 'Раз за цикл город переживает смертельный удар, восстановив 30% прочности.',
    icon: 'heart',
    max: 1,
    cost: () => 4,
  },
];

export interface GodState {
  rev: number; // Божественные откровения
  nodes: Record<string, number>;
  runs: number;
  bloodTotal: number;
  rebirths: number; // Рождения сверхновой
}

const KEY = 'regress_god_v1';

export const EMPTY_GOD: GodState = { rev: 0, nodes: {}, runs: 0, bloodTotal: 0, rebirths: 0 };

/** Стоимость следующего Рождения сверхновой — растёт экспоненциально. */
export function supernovaCost(rebirths: number): number {
  return Math.round(10 * Math.pow(2.35, rebirths));
}

/** Сводка бонусов за все совершённые рождения. */
export function supernovaBonus(rebirths: number) {
  return {
    power: 1 + 0.18 * rebirths, // атака и здоровье
    gather: 1 + 0.15 * rebirths,
    blood: 1 + 0.1 * rebirths,
    cost: Math.max(0.35, 1 - 0.05 * rebirths),
    cityHp: 1 + 0.15 * rebirths,
    squads: Math.floor(rebirths / 2),
    doom: Math.max(0.55, 1 - 0.04 * rebirths), // замедление роста монстров
  };
}

export function loadGod(): GodState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<GodState>;
      return {
        rev: p.rev ?? 0,
        nodes: p.nodes ?? {},
        runs: p.runs ?? 0,
        bloodTotal: p.bloodTotal ?? 0,
        rebirths: p.rebirths ?? 0,
      };
    }
  } catch {
    /* ignore */
  }
  return { ...EMPTY_GOD };
}

export function saveGod(g: GodState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(g));
  } catch {
    /* ignore */
  }
}

export function wipeAll(): void {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem('regress_ruler');
  } catch {
    /* ignore */
  }
}
