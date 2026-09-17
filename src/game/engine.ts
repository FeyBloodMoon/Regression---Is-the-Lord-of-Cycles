// ── Игровой движок «РЕГРЕСС»: симуляция цикла ───────────────────────────────

import { RACES, RES_META, raceTreeFor, treeTierOk } from './races';
import type { RaceId, ResType, Cost, RaceDef } from './races';
import type { GodState } from './godtree';
import { supernovaBonus } from './godtree';
import { SQUAD_TYPES, SQUAD_ORDER, MOB_ARCHS, pickArch } from './units';
import type { SquadType, MobArch } from './units';
import { zoneAllows } from './terrain';
import type { Zone, ZoneKind, Mover } from './terrain';

export const WORLD = { w: 2600, h: 1700 };
export const CITY_R = 64;
export const ELITE_EVERY = 1800; // 30 минут — нашествие элиты
export const NODE_CAP = 5;
export const VILLAGE_SQUADS = 5;
export const LEVEL_MIN = 60; // усиление монстров: от 1
export const LEVEL_MAX = 300; // ... до 5 минут

const ENGAGE_R = 34;
const CARRY_BASE: Record<ResType, number> = { wood: 12, metal: 9, gold: 7, gems: 5 };

// сетка троп
const CELL = 65;
const GW = Math.ceil(WORLD.w / CELL);
const GH = Math.ceil(WORLD.h / CELL);
export const PATH_GRID = { cell: CELL, w: GW, h: GH };
const PATH_SPEED_BONUS = 0.28; // максимум +28% скорости на утоптанной тропе

let uid = 0;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Сущности ─────────────────────────────────────────────────────────────────

export interface ResNode {
  id: string;
  type: ResType;
  x: number;
  y: number;
  rich: number;
  assigned: number;
  villageId: string | null;
}

export interface Village {
  id: string;
  nodeId: string;
  type: ResType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  level: number;
  caravanT: number;
  flash: number;
}

export interface Caravan {
  id: string;
  villageId: string;
  x: number;
  y: number;
  px: number;
  py: number;
  type: ResType;
  amt: number;
}

export interface Squad {
  id: string;
  type: SquadType;
  x: number;
  y: number;
  px: number;
  py: number;
  hp: number;
  maxHp: number;
  mode: 'guard' | 'toNode' | 'gather' | 'return';
  nodeId: string | null;
  gatherT: number;
  carry: { type: ResType; amt: number } | null;
  tempT: number;
  temp: boolean;
  power: number;
  wx: number;
  wy: number;
  wt: number;
  flash: number;
  off: number;
  shotCd: number;
}

export type MobKind = 'normal' | 'elite' | 'boss';

export interface Monster {
  id: string;
  kind: MobKind;
  arch: MobArch;
  name?: string;
  x: number;
  y: number;
  px: number;
  py: number;
  hp: number;
  maxHp: number;
  atk: number;
  speed: number;
  range: number;
  flash: number;
  off: number;
  slowT: number;
  weakenT: number;
  dotT: number;
  dotDps: number;
  shotCd: number;
  summonT: number;
}

export interface FloatText { id: number; x: number; y: number; txt: string; color: string; ttl: number }
export interface Shot { id: number; x1: number; y1: number; x2: number; y2: number; color: string; ttl: number }
export interface Fx { id: number; kind: 'ring' | 'burst'; x: number; y: number; color: string; ttl: number; max: number; r0: number; r1: number }
export interface Banner { id: number; text: string; sub?: string; kind: 'info' | 'danger' | 'gold'; ttl: number }
export interface LogEntry { id: number; text: string; kind: 'info' | 'danger' | 'gold' | 'blood' }

export interface Deco {
  trees: { x: number; y: number; s: number }[];
  rocks: { x: number; y: number; s: number }[];
  ponds: { x: number; y: number; rx: number; ry: number }[];
}

interface Mods {
  gather: number;
  carry: number;
  atk: number;
  hp: number;
  speed: number;
  costMult: number;
  cityHp: number;
  bloodMult: number;
  maxSquads: number;
  nodeCap: number;
  dmgReduce: number;
  lifesteal: number;
  regen: number;
  monsterSlow: number;
  doubleBlood: number;
  revive: boolean;
  reviveDelay: number;
  perRes: Partial<Record<ResType, number>>;
}

// ── Улучшения города ─────────────────────────────────────────────────────────

export interface UpgradeDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  max: number;
  base: Cost;
  mult: number;
}

export const UPGRADES: UpgradeDef[] = [
  { id: 'walls', name: 'Стены', desc: '+45% к прочности города', icon: 'wall', max: 10, base: { wood: 80, metal: 60 }, mult: 1.5 },
  { id: 'ballista', name: 'Баллисты', desc: 'Город бьёт врагов рядом на 16 урона/сек', icon: 'crosshair', max: 8, base: { metal: 70, gold: 50 }, mult: 1.55 },
  { id: 'barracks', name: 'Казармы', desc: '+2 к максимуму отрядов', icon: 'users', max: 6, base: { wood: 90, gold: 60 }, mult: 1.65 },
  { id: 'guild', name: 'Гильдия добытчиков', desc: '+20% к добыче ресурсов', icon: 'hammer', max: 8, base: { wood: 70, metal: 40 }, mult: 1.55 },
  { id: 'temple', name: 'Храм крови', desc: '+25% капель крови бога', icon: 'droplet', max: 4, base: { gold: 60, gems: 25 }, mult: 1.8 },
  { id: 'forge', name: 'Кузница', desc: '+18% к атаке отрядов', icon: 'flame', max: 10, base: { metal: 80, gold: 40 }, mult: 1.55 },
  { id: 'armory', name: 'Оружейня', desc: '+18% к здоровью отрядов', icon: 'shield', max: 10, base: { wood: 60, metal: 70 }, mult: 1.55 },
  { id: 'infirm', name: 'Лазарет', desc: 'Отряды лечатся на 1.2%/сек по всей карте', icon: 'regen', max: 4, base: { wood: 110, gold: 70, gems: 15 }, mult: 1.7 },
];

export function costAt(def: { base: Cost; mult: number }, lvl: number, costMult: number): Cost {
  const out: Cost = {};
  for (const k of Object.keys(def.base) as ResType[]) {
    out[k] = Math.round((def.base[k] ?? 0) * Math.pow(def.mult, lvl) * costMult);
  }
  return out;
}

export interface PrestigeInfo {
  total: number;
  parts: { boss: number; time: number };
  mins: number;
  kills: { normal: number; elite: number; boss: number };
  blood: number;
}

export interface RosterEntry { total: number; free: number }

export interface VillageSnap {
  id: string;
  nodeId: string;
  type: ResType;
  hp: number;
  maxHp: number;
  level: number;
  upCost: Cost;
  interval: number;
  amount: number;
}

export interface Snap {
  t: number;
  level: number;
  levelIn: number;
  eliteIn: number;
  speed: number;
  res: Record<ResType, number>;
  blood: number;
  cityHp: number;
  cityMax: number;
  shieldT: number;
  barrierT: number;
  vampT: number;
  squads: number;
  maxSquads: number;
  freeSquads: number;
  nodeCap: number;
  costMult: number;
  monsterCount: number;
  bossAlive: boolean;
  kills: { normal: number; elite: number; boss: number };
  bloodEarned: number;
  upgrades: Record<string, number>;
  tree: Record<string, boolean>;
  spellOwned: Record<string, boolean>;
  spellCd: Record<string, number>;
  spellCost: Record<string, Cost>;
  banners: Banner[];
  log: LogEntry[];
  nodes: { id: string; type: ResType; assigned: number; villageId: string | null }[];
  villages: VillageSnap[];
  villageCost: Cost;
  roster: Record<SquadType, RosterEntry>;
  squadCosts: Record<SquadType, Cost>;
  rebirths: number;
  gameOver: { cause: 'destroyed' | 'manual'; info: PrestigeInfo } | null;
  prestige: PrestigeInfo;
}

const BOSS_NAMES = [
  'Гор’Маш Разрушитель', 'Храмовник Пустоты', 'Матка Хиссари', 'Костяной Император',
  'Владыка Третьей Ночи', 'Пожиратель Зари', 'КН-17 «Молот Тишины»',
];

const VILLAGE_BASE: Cost = { wood: 220, metal: 160, gold: 120, gems: 25 };

// ── Сохранение ───────────────────────────────────────────────────────────────

export interface RunSave {
  t: number;
  level: number;
  nextLevelAt: number;
  speed: number;
  res: Record<ResType, number>;
  blood: number;
  bloodEarned: number;
  kills: { normal: number; elite: number; boss: number };
  squads: Squad[];
  monsters: Monster[];
  nodes: ResNode[];
  villages: Village[];
  caravans: Caravan[];
  zones: Zone[];
  wear: number[];
  deco: Deco;
  city: { x: number; y: number; hp: number; maxHp: number; shieldT: number };
  upgrades: Record<string, number>;
  tree: Record<string, boolean>;
  spellOwned: Record<string, boolean>;
  spellCd: Record<string, number>;
  buffs: { vampT: number; barrierT: number };
  spawnT: number;
  eliteT: number;
  boughtSquads: number;
  secondWindUsed: boolean;
  reviveQueue: { at: number }[];
}

// ── Движок ───────────────────────────────────────────────────────────────────

export class Game {
  ruler: string;
  race: RaceDef;
  god: GodState;
  rng: () => number;

  t = 0;
  speed = 1;
  level = 1;
  nextLevelAt = 120;

  res: Record<ResType, number> = { wood: 0, metal: 0, gold: 0, gems: 0 };
  blood = 0;
  bloodEarned = 0;
  kills = { normal: 0, elite: 0, boss: 0 };

  squads: Squad[] = [];
  monsters: Monster[] = [];
  nodes: ResNode[] = [];
  villages: Village[] = [];
  caravans: Caravan[] = [];
  zones: Zone[] = [];
  wear: number[] = new Array(GW * GH).fill(0);
  deco: Deco = { trees: [], rocks: [], ponds: [] };

  city = { x: WORLD.w / 2, y: WORLD.h / 2, hp: 1, maxHp: 1, shieldT: 0 };

  upgrades: Record<string, number> = {};
  tree: Record<string, boolean> = {};
  spellOwned: Record<string, boolean> = {};
  spellCd: Record<string, number> = { attack: 0, summon: 0, defense: 0 };
  buffs = { vampT: 0, barrierT: 0 };

  reviveQueue: { at: number }[] = [];
  spawnT = 12;
  eliteT = ELITE_EVERY;
  secondWindUsed = false;
  boughtSquads = 0;
  shakeT = 0;

  floats: FloatText[] = [];
  fxs: Fx[] = [];
  shots: Shot[] = [];
  banners: Banner[] = [];
  log: LogEntry[] = [];

  gameOver: { cause: 'destroyed' | 'manual'; info: PrestigeInfo } | null = null;

  mods!: Mods;
  private hpMultPrev = 1;
  private emitAcc = 0;
  private decayAcc = 0;
  onSnap?: (s: Snap) => void;

  constructor(cfg: { ruler: string; race: RaceId; god: GodState; cycle: number; save?: RunSave }) {
    this.ruler = cfg.ruler;
    this.race = RACES[cfg.race];
    this.god = cfg.god;
    this.rng = mulberry32((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);

    if (cfg.save) {
      this.loadRun(cfg.save);
      this.recalc();
      this.hpMultPrev = this.mods.hp;
      this.addBanner('Сохранение загружено', 'Цикл продолжается с места остановки', 'gold');
      return;
    }

    this.genWorld();
    this.recalc();
    this.rollNextLevel();

    const g = this.god.nodes;
    const wealth = g.wealth ?? 0;
    const sn = supernovaBonus(this.god.rebirths ?? 0);
    this.res = {
      wood: Math.round((150 + wealth * 120) * sn.gather),
      metal: Math.round((100 + wealth * 80) * sn.gather),
      gold: Math.round((60 + wealth * 50) * sn.gather),
      gems: Math.round((20 + wealth * 20) * sn.gather),
    };
    this.city.hp = this.city.maxHp;

    const startTypes: SquadType[] = ['worker', 'worker', 'warrior', 'warrior', 'guardian'];
    const extra = (g.squad ?? 0) + sn.squads;
    for (let i = 0; i < extra; i++) startTypes.push(i % 2 === 0 ? 'ranger' : 'scout');
    startTypes.forEach((type, i) => {
      const a = (i / startTypes.length) * Math.PI * 2;
      this.squads.push(this.makeSquad(type, this.city.x + Math.cos(a) * 120, this.city.y + Math.sin(a) * 120, 1, 0));
    });

    this.spawnMonster('normal');
    this.spawnMonster('normal');

    this.addBanner(`Цикл ${cfg.cycle} начался`, 'Собирайте 5 отрядов на источнике, чтобы построить деревню', 'gold');
    this.addLog(`${this.ruler} возводит город народа «${this.race.name}»`, 'gold');
  }

  // ── модификаторы ──────────────────────────────────────────────────────────

  recalc() {
    const r = this.race;
    const t = this.tree;
    const g = this.god.nodes;
    const u = this.upgrades;
    const sn = supernovaBonus(this.god.rebirths ?? 0);
    const valor = 1 + 0.12 * (g.valor ?? 0);

    const m: Mods = {
      gather: r.gather * sn.gather,
      carry: 1,
      atk: r.atk * sn.power,
      hp: r.hp * sn.power,
      speed: r.speed,
      costMult: r.cost * sn.cost,
      cityHp: r.cityHp * sn.cityHp,
      bloodMult: sn.blood,
      maxSquads: 8 + r.maxSquadsBonus + sn.squads,
      nodeCap: NODE_CAP + r.nodeCapBonus,
      dmgReduce: 0,
      lifesteal: 0,
      regen: 0,
      monsterSlow: Math.max(0.5, (1 - 0.1 * (g.doom ?? 0)) * sn.doom),
      doubleBlood: r.doubleBlood,
      revive: r.revive,
      reviveDelay: 20,
      perRes: r.perRes,
    };

    if (u.guild) m.gather *= 1 + 0.2 * u.guild;
    if (u.forge) m.atk *= 1 + 0.18 * u.forge;
    if (u.armory) m.hp *= 1 + 0.18 * u.armory;
    if (u.barracks) m.maxSquads += 2 * u.barracks;
    if (u.temple) m.bloodMult *= 1 + 0.25 * u.temple;
    if (u.infirm) m.regen += 0.012 * u.infirm;
    m.cityHp *= 1 + 0.45 * (u.walls ?? 0);

    if (t.prod) m.gather *= 1.25;
    if (t.atk) m.atk *= 1.2;
    if (t.hp) m.hp *= 1.2;
    if (t.spd) m.speed *= 1.18;
    if (t.carry) m.carry *= 1.45;
    if (t.regen) m.regen += 0.01;
    if (t.asc) { m.atk *= 1.3; m.hp *= 1.3; m.gather *= 1.3; }
    if (t.ult) {
      if (r.id === 'humans') { m.atk *= 1.15; m.hp *= 1.15; }
      if (r.id === 'elves') m.dmgReduce += 0.18;
      if (r.id === 'undead') m.reviveDelay = 8;
      if (r.id === 'insectoids') { m.nodeCap += 2; m.atk *= 1.15; }
      if (r.id === 'golems') m.dmgReduce += 0.25;
      if (r.id === 'demons') m.lifesteal += 0.25;
    }

    m.atk *= valor;
    m.hp *= valor;
    m.gather *= valor;
    m.bloodMult *= 1 + 0.25 * (g.blood ?? 0);

    this.mods = m;

    const prevMax = this.city.maxHp;
    this.city.maxHp = Math.round(620 * m.cityHp);
    if (this.city.maxHp > prevMax && prevMax > 1) {
      this.city.hp = Math.min(this.city.maxHp, this.city.hp + (this.city.maxHp - prevMax));
    }

    if (this.hpMultPrev !== m.hp && this.squads.length > 0) {
      const ratio = m.hp / this.hpMultPrev;
      for (const s of this.squads) {
        s.maxHp = Math.max(1, s.maxHp * ratio);
        s.hp = Math.min(s.maxHp, s.hp * ratio);
      }
    }
    this.hpMultPrev = m.hp;
  }

  squadStats(type: SquadType, power = 1) {
    const d = SQUAD_TYPES[type];
    return {
      hp: Math.round(130 * this.mods.hp * d.hp * power),
      atk: 13 * this.mods.atk * d.atk * power,
      speed: 100 * this.mods.speed * d.speed,
      carry: this.mods.carry * d.carry,
      range: d.range,
      dmgRed: d.dmgRed,
    };
  }

  private rollNextLevel() {
    this.nextLevelAt = this.t + LEVEL_MIN + this.rng() * (LEVEL_MAX - LEVEL_MIN);
  }

  // ── тропы ─────────────────────────────────────────────────────────────────

  private cellIdx(x: number, y: number) {
    const gx = Math.max(0, Math.min(GW - 1, Math.floor(x / CELL)));
    const gy = Math.max(0, Math.min(GH - 1, Math.floor(y / CELL)));
    return gy * GW + gx;
  }
  wearAt(x: number, y: number) {
    return this.wear[this.cellIdx(x, y)] ?? 0;
  }
  private treadPath(x: number, y: number, dt: number) {
    const i = this.cellIdx(x, y);
    this.wear[i] = Math.min(1, (this.wear[i] ?? 0) + dt * 0.11);
  }

  // ── местность ─────────────────────────────────────────────────────────────

  passable(x: number, y: number, who: Mover): boolean {
    if (x < 14 || y < 14 || x > WORLD.w - 14 || y > WORLD.h - 14) return false;
    for (const z of this.zones) {
      const dx = x - z.x;
      const dy = y - z.y;
      if (dx * dx + dy * dy < z.r * z.r && !zoneAllows(z.kind, who)) return false;
    }
    return true;
  }

  /** Шаг с обходом препятствий и предпочтением утоптанных троп. */
  private move(
    e: { x: number; y: number },
    tx: number,
    ty: number,
    sp: number,
    dt: number,
    who: Mover,
    tread: boolean,
  ): boolean {
    const dx = tx - e.x;
    const dy = ty - e.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) return true;

    const boost = 1 + this.wearAt(e.x, e.y) * PATH_SPEED_BONUS;
    const mv = sp * boost * dt;
    if (mv >= dist && this.passable(tx, ty, who)) {
      e.x = tx;
      e.y = ty;
      if (tread) this.treadPath(e.x, e.y, dt);
      return true;
    }

    const baseA = Math.atan2(dy, dx);
    let bestA: number | null = null;
    let bestScore = -Infinity;
    for (const off of [0, 0.3, -0.3, 0.7, -0.7, 1.2, -1.2, 1.9, -1.9, 2.6, -2.6]) {
      const a = baseA + off;
      const nx = e.x + Math.cos(a) * mv;
      const ny = e.y + Math.sin(a) * mv;
      if (!this.passable(nx, ny, who)) continue;
      // прямой путь важнее, но утоптанная тропа притягивает
      const score = -Math.abs(off) * 1.25 + this.wearAt(nx, ny) * 0.8;
      if (score > bestScore) {
        bestScore = score;
        bestA = a;
      }
    }
    if (bestA === null) return false;
    e.x += Math.cos(bestA) * mv;
    e.y += Math.sin(bestA) * mv;
    if (tread) this.treadPath(e.x, e.y, dt);
    return false;
  }

  // ── генерация мира ────────────────────────────────────────────────────────

  private genWorld() {
    const rnd = this.rng;
    const cx = this.city.x;
    const cy = this.city.y;
    const counts: [ResType, number][] = [
      ['metal', 2 + Math.floor(rnd() * 2)],
      ['wood', 5 + Math.floor(rnd() * 2)],
      ['gems', 1 + Math.floor(rnd() * 2)],
      ['gold', 1 + Math.floor(rnd() * 2)],
    ];
    const placed: { x: number; y: number }[] = [];
    const farEnough = (x: number, y: number, d: number) => placed.every((p) => Math.hypot(p.x - x, p.y - y) >= d);

    for (const [type, count] of counts) {
      for (let i = 0; i < count; i++) {
        let x = cx;
        let y = cy;
        for (let tries = 0; tries < 80; tries++) {
          const a = rnd() * Math.PI * 2;
          const d = 330 + rnd() * 660;
          const tx = Math.max(120, Math.min(WORLD.w - 120, cx + Math.cos(a) * d));
          const ty = Math.max(120, Math.min(WORLD.h - 120, cy + Math.sin(a) * d * 0.72));
          if (farEnough(tx, ty, 200)) { x = tx; y = ty; break; }
        }
        placed.push({ x, y });
        this.nodes.push({ id: `n${++uid}`, type, x, y, rich: 0.85 + rnd() * 0.5, assigned: 0, villageId: null });
      }
    }

    // особая местность — не перекрывает город и источники
    const kinds: ZoneKind[] = ['rock', 'rock', 'rock', 'rock', 'chasm', 'chasm', 'swamp', 'swamp', 'swamp'];
    for (const kind of kinds) {
      for (let tries = 0; tries < 60; tries++) {
        const r = kind === 'rock' ? 70 + rnd() * 80 : 90 + rnd() * 100;
        const x = 120 + rnd() * (WORLD.w - 240);
        const y = 120 + rnd() * (WORLD.h - 240);
        if (Math.hypot(x - cx, y - cy) < 300 + r) continue;
        if (!this.nodes.every((n) => Math.hypot(n.x - x, n.y - y) > r + 95)) continue;
        if (!this.zones.every((z) => Math.hypot(z.x - x, z.y - y) > z.r + r + 60)) continue;
        this.zones.push({ id: `z${++uid}`, kind, x, y, r, seed: Math.floor(rnd() * 1000) });
        break;
      }
    }

    for (let i = 0; i < 3; i++) {
      let x = 0;
      let y = 0;
      for (let tries = 0; tries < 40; tries++) {
        x = 200 + rnd() * (WORLD.w - 400);
        y = 200 + rnd() * (WORLD.h - 400);
        if (
          Math.hypot(x - cx, y - cy) > 430 &&
          this.nodes.every((n) => Math.hypot(n.x - x, n.y - y) > 190) &&
          this.zones.every((z) => Math.hypot(z.x - x, z.y - y) > z.r + 110)
        ) break;
      }
      this.deco.ponds.push({ x, y, rx: 90 + rnd() * 80, ry: 60 + rnd() * 50 });
    }

    const addTree = (x: number, y: number) => this.deco.trees.push({ x, y, s: 9 + rnd() * 8 });
    for (const n of this.nodes.filter((n) => n.type === 'wood')) {
      const c = 9 + Math.floor(rnd() * 6);
      for (let i = 0; i < c; i++) {
        const a = rnd() * Math.PI * 2;
        const d = 55 + rnd() * 110;
        addTree(n.x + Math.cos(a) * d, n.y + Math.sin(a) * d);
      }
    }
    for (let c = 0; c < 9; c++) {
      const bx = 120 + rnd() * (WORLD.w - 240);
      const by = 120 + rnd() * (WORLD.h - 240);
      if (Math.hypot(bx - cx, by - cy) < 300) continue;
      if (!this.nodes.every((n) => Math.hypot(n.x - bx, n.y - by) > 100)) continue;
      const cnt = 5 + Math.floor(rnd() * 6);
      for (let i = 0; i < cnt; i++) addTree(bx + (rnd() - 0.5) * 170, by + (rnd() - 0.5) * 130);
    }
    for (let i = 0; i < 40; i++) {
      const x = 100 + rnd() * (WORLD.w - 200);
      const y = 100 + rnd() * (WORLD.h - 200);
      if (Math.hypot(x - cx, y - cy) < 220) continue;
      if (!this.nodes.every((n) => Math.hypot(n.x - x, n.y - y) > 90)) continue;
      this.deco.rocks.push({ x, y, s: 7 + rnd() * 14 });
    }
  }

  // ── утилиты ───────────────────────────────────────────────────────────────

  private addFloat(x: number, y: number, txt: string, color: string) {
    this.floats.push({ id: ++uid, x, y, txt, color, ttl: 1.4 });
    if (this.floats.length > 60) this.floats.splice(0, this.floats.length - 60);
  }
  private addFx(fx: Omit<Fx, 'id'>) {
    this.fxs.push({ ...fx, id: ++uid });
    if (this.fxs.length > 60) this.fxs.splice(0, this.fxs.length - 60);
  }
  private addShot(x1: number, y1: number, x2: number, y2: number, color: string) {
    this.shots.push({ id: ++uid, x1, y1, x2, y2, color, ttl: 0.16 });
    if (this.shots.length > 90) this.shots.splice(0, this.shots.length - 90);
  }
  private addBanner(text: string, sub: string | undefined, kind: Banner['kind']) {
    this.banners.push({ id: ++uid, text, sub, kind, ttl: 4 });
    if (this.banners.length > 3) this.banners.shift();
  }
  private addLog(text: string, kind: LogEntry['kind'] = 'info') {
    this.log.push({ id: ++uid, text, kind });
    if (this.log.length > 7) this.log.splice(0, this.log.length - 7);
  }

  private makeSquad(type: SquadType, x: number, y: number, power: number, tempT: number): Squad {
    const st = this.squadStats(type, power);
    return {
      id: `s${++uid}`, type,
      x, y, px: x, py: y,
      hp: st.hp, maxHp: st.hp,
      mode: 'guard', nodeId: null, gatherT: 0, carry: null,
      tempT, temp: tempT > 0, power, wx: x, wy: y, wt: 0, flash: 0,
      off: this.rng() * Math.PI * 2, shotCd: 0,
    };
  }

  private nodeById(id: string | null) { return this.nodes.find((n) => n.id === id); }
  private villageById(id: string | null) { return this.villages.find((v) => v.id === id); }

  private nearestMonster(x: number, y: number, maxR: number): Monster | undefined {
    let best: Monster | undefined;
    let bd = maxR;
    for (const m of this.monsters) {
      const d = Math.hypot(m.x - x, m.y - y);
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }

  private nearestSquad(x: number, y: number, maxR: number, preferBusy = false): Squad | undefined {
    let best: Squad | undefined;
    let bd = maxR;
    for (const s of this.squads) {
      let d = Math.hypot(s.x - x, s.y - y);
      if (preferBusy && s.mode !== 'guard') d *= 0.6;
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  private nearestVillage(x: number, y: number, maxR: number): Village | undefined {
    let best: Village | undefined;
    let bd = maxR;
    for (const v of this.villages) {
      const d = Math.hypot(v.x - x, v.y - y);
      if (d < bd) { bd = d; best = v; }
    }
    return best;
  }

  private gatherPoint(node: ResNode, off: number) {
    return { x: node.x + Math.cos(off) * 34, y: node.y + Math.sin(off) * 34 };
  }

  canAfford(cost: Cost): boolean {
    return (Object.keys(cost) as ResType[]).every((k) => this.res[k] >= (cost[k] ?? 0));
  }
  private pay(cost: Cost) {
    for (const k of Object.keys(cost) as ResType[]) this.res[k] -= cost[k] ?? 0;
  }
  private scaleCost(cost: Cost): Cost {
    const out: Cost = {};
    for (const k of Object.keys(cost) as ResType[]) out[k] = Math.round((cost[k] ?? 0) * this.mods.costMult);
    return out;
  }

  squadCost(type: SquadType): Cost {
    const base = SQUAD_TYPES[type].cost;
    const m = Math.pow(1.22, this.boughtSquads) * this.mods.costMult;
    const out: Cost = {};
    for (const k of Object.keys(base) as ResType[]) out[k] = Math.round((base[k] ?? 0) * m);
    return out;
  }

  villageCost(): Cost { return this.scaleCost(VILLAGE_BASE); }

  villageUpCost(level: number): Cost {
    const out: Cost = {};
    for (const k of Object.keys(VILLAGE_BASE) as ResType[]) {
      out[k] = Math.round((VILLAGE_BASE[k] ?? 0) * 0.7 * Math.pow(1.75, level - 1) * this.mods.costMult);
    }
    return out;
  }

  villageInterval(v: Village) { return Math.max(2.5, 5 - (v.level - 1) * 0.5); }

  villageHaul(v: Village) {
    const node = this.nodeById(v.nodeId);
    const rich = node?.rich ?? 1;
    const lvlMul = 1 + (v.level - 1) * 0.4;
    return Math.max(
      1,
      Math.round(CARRY_BASE[v.type] * rich * this.mods.carry * this.mods.gather * (this.mods.perRes[v.type] ?? 1) * lvlMul),
    );
  }

  // ── монстры ───────────────────────────────────────────────────────────────

  private edgePoint(pad = 40) {
    const rnd = this.rng;
    for (let i = 0; i < 20; i++) {
      const side = Math.floor(rnd() * 4);
      const p =
        side === 0 ? { x: rnd() * WORLD.w, y: pad }
        : side === 1 ? { x: rnd() * WORLD.w, y: WORLD.h - pad }
        : side === 2 ? { x: pad, y: rnd() * WORLD.h }
        : { x: WORLD.w - pad, y: rnd() * WORLD.h };
      if (this.passable(p.x, p.y, 'monster')) return p;
    }
    return { x: pad, y: pad };
  }

  private normalStats() {
    const lv = (this.level - 1) * this.mods.monsterSlow;
    const growth = Math.pow(1.38, lv);
    return { hp: 95 * growth, atk: 9 * growth, speed: 62 + Math.min(lv * 2.4, 30) };
  }

  private monsterCap() { return Math.min(96, 30 + this.level * 5); }

  private spawnMonster(kind: MobKind, at?: { x: number; y: number }, archForce?: MobArch) {
    if (kind === 'normal' && this.monsters.filter((m) => m.kind === 'normal').length >= this.monsterCap()) return;
    const base = this.normalStats();
    const km = kind === 'elite' ? 3 : kind === 'boss' ? 5 : 1;
    const arch = archForce ?? pickArch(this.level, this.rng);
    const ad = MOB_ARCHS[arch];
    const p = at ?? this.edgePoint();
    const m: Monster = {
      id: `m${++uid}`, kind, arch,
      x: p.x, y: p.y, px: p.x, py: p.y,
      hp: Math.round(base.hp * km * ad.hp), maxHp: Math.round(base.hp * km * ad.hp),
      atk: base.atk * km * ad.atk,
      speed: base.speed * ad.speed * (kind === 'boss' ? 0.9 : kind === 'elite' ? 0.97 : 1),
      range: ad.range * (kind === 'boss' ? 1.25 : 1),
      flash: 0, off: this.rng() * Math.PI * 2,
      slowT: 0, weakenT: 0, dotT: 0, dotDps: 0, shotCd: 0, summonT: 18,
    };
    if (kind === 'boss') m.name = BOSS_NAMES[Math.floor(this.rng() * BOSS_NAMES.length)];
    this.monsters.push(m);
    return m;
  }

  private spawnEliteWave() {
    for (let i = 0; i < 3; i++) this.spawnMonster('elite');
    const boss = this.spawnMonster('boss');
    this.addBanner('НАШЕСТВИЕ ЭЛИТЫ', `Три элитных отряда и ${boss?.name ?? 'Босс'} вступили на земли`, 'danger');
    this.addLog('Элитное нашествие: 3 элиты и босс на карте!', 'danger');
  }

  // ── главный цикл ──────────────────────────────────────────────────────────

  tick(rawDt: number) {
    if (this.gameOver) { this.emitTick(rawDt); return; }
    const dt = Math.min(rawDt, 0.06) * this.speed;
    if (dt <= 0) { this.emitTick(rawDt); return; }
    this.t += dt;

    // усиление монстров — через случайный промежуток 1–5 минут
    if (this.t >= this.nextLevelAt) {
      this.level++;
      this.rollNextLevel();
      const mins = Math.round((this.nextLevelAt - this.t) / 6) / 10;
      this.addBanner(`Монстры стали сильнее — волна ${this.level}`, `Следующее усиление примерно через ${mins} мин`, 'danger');
      const burst = Math.min(6, 1 + Math.floor(this.level / 2));
      for (let i = 0; i < burst; i++) this.spawnMonster('normal');
    }

    this.eliteT -= dt;
    if (this.eliteT <= 0) { this.spawnEliteWave(); this.eliteT = ELITE_EVERY; }

    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      const packs = 1 + Math.floor((this.level - 1) / 3);
      for (let i = 0; i < packs; i++) this.spawnMonster('normal');
      const interval = Math.max(4.5, 22 * Math.pow(0.92, this.level - 1));
      this.spawnT = interval * (0.75 + this.rng() * 0.5);
    }

    this.city.shieldT = Math.max(0, this.city.shieldT - dt);
    this.buffs.vampT = Math.max(0, this.buffs.vampT - dt);
    this.buffs.barrierT = Math.max(0, this.buffs.barrierT - dt);
    this.shakeT = Math.max(0, this.shakeT - dt);
    for (const k of Object.keys(this.spellCd)) this.spellCd[k] = Math.max(0, this.spellCd[k] - dt);

    for (let i = this.reviveQueue.length - 1; i >= 0; i--) {
      if (this.t >= this.reviveQueue[i].at) {
        this.reviveQueue.splice(i, 1);
        const a = this.rng() * Math.PI * 2;
        const s = this.makeSquad('warrior', this.city.x + Math.cos(a) * 90, this.city.y + Math.sin(a) * 90, 1, 0);
        this.squads.push(s);
        this.addFx({ kind: 'ring', x: s.x, y: s.y, color: '#9fb8a8', ttl: 0.7, max: 0.7, r0: 6, r1: 60 });
        this.addLog('Павший отряд восстал из мёртвых у стен города', 'info');
      }
    }

    this.updateSquads(dt);
    this.updateVillages(dt);
    this.updateCaravans(dt);
    this.updateMonsters(dt);

    const bl = this.upgrades.ballista ?? 0;
    if (bl > 0) {
      for (const m of this.monsters) {
        if (Math.hypot(m.x - this.city.x, m.y - this.city.y) < CITY_R + 150) {
          m.hp -= 16 * bl * dt;
          m.flash = 0.05;
        }
      }
    }

    this.sweepDeaths();
    this.checkCity();

    // затухание троп
    this.decayAcc += dt;
    if (this.decayAcc > 3) {
      this.decayAcc = 0;
      for (let i = 0; i < this.wear.length; i++) if (this.wear[i] > 0) this.wear[i] *= 0.985;
    }

    for (const f of this.floats) f.ttl -= dt;
    this.floats = this.floats.filter((f) => f.ttl > 0);
    for (const f of this.fxs) f.ttl -= dt;
    this.fxs = this.fxs.filter((f) => f.ttl > 0);
    for (const s of this.shots) s.ttl -= dt;
    this.shots = this.shots.filter((s) => s.ttl > 0);
    for (const b of this.banners) b.ttl -= rawDt;
    this.banners = this.banners.filter((b) => b.ttl > 0);

    this.emitTick(rawDt);
  }

  private updateSquads(dt: number) {
    const cx = this.city.x;
    const cy = this.city.y;
    for (const s of this.squads) {
      s.flash = Math.max(0, s.flash - dt);
      s.shotCd = Math.max(0, s.shotCd - dt);
      if (s.tempT > 0) {
        s.tempT -= dt;
        if (s.tempT <= 0) {
          s.hp = -1;
          this.addFx({ kind: 'burst', x: s.x, y: s.y, color: '#9fb4cb', ttl: 0.5, max: 0.5, r0: 4, r1: 44 });
          continue;
        }
      }
      const st = this.squadStats(s.type, s.power);
      const reach = Math.max(ENGAGE_R, st.range);

      const tgt = this.nearestMonster(s.x, s.y, reach);
      if (tgt) {
        const dmg = st.atk * dt;
        tgt.hp -= dmg;
        tgt.flash = 0.09;
        const ls = this.mods.lifesteal + (this.buffs.vampT > 0 ? 0.3 : 0);
        if (ls > 0) s.hp = Math.min(s.maxHp, s.hp + dmg * ls);
        if (st.range > 0 && s.shotCd <= 0) {
          this.addShot(s.x, s.y, tgt.x, tgt.y, SQUAD_TYPES[s.type].color);
          s.shotCd = 0.35;
        }
        continue;
      }

      if (s.mode === 'guard') {
        const hunt = this.nearestMonster(s.x, s.y, 99999);
        if (hunt) {
          const d = Math.hypot(hunt.x - s.x, hunt.y - s.y);
          const stop = st.range > 0 ? st.range * 0.85 : 0;
          if (d > stop) this.move(s, hunt.x, hunt.y, st.speed, dt, s.type, true);
        } else {
          s.wt -= dt;
          if (s.wt <= 0) {
            const a = this.rng() * Math.PI * 2;
            const r = 170 + this.rng() * 190;
            s.wx = cx + Math.cos(a) * r;
            s.wy = cy + Math.sin(a) * r;
            s.wt = 3 + this.rng() * 3;
          }
          this.move(s, s.wx, s.wy, st.speed * 0.45, dt, s.type, false);
        }
      } else if (s.mode === 'toNode') {
        const node = this.nodeById(s.nodeId);
        if (!node || node.villageId) { s.mode = 'guard'; s.nodeId = null; continue; }
        const gp = this.gatherPoint(node, s.off);
        if (this.move(s, gp.x, gp.y, st.speed, dt, s.type, true) || Math.hypot(s.x - node.x, s.y - node.y) < 40) {
          s.mode = 'gather';
          s.gatherT = 2.2 + this.rng() * 0.6;
        }
      } else if (s.mode === 'gather') {
        const node = this.nodeById(s.nodeId);
        if (!node || node.villageId) { s.mode = 'guard'; s.nodeId = null; continue; }
        s.gatherT -= dt;
        if (s.gatherT <= 0) {
          const amt = Math.max(
            1,
            Math.round(CARRY_BASE[node.type] * node.rich * st.carry * this.mods.gather * (this.mods.perRes[node.type] ?? 1)),
          );
          s.carry = { type: node.type, amt };
          s.mode = 'return';
        }
      } else if (s.mode === 'return') {
        if (Math.hypot(s.x - cx, s.y - cy) < CITY_R + 44) {
          if (s.carry) {
            this.res[s.carry.type] += s.carry.amt;
            this.addFloat(s.x, s.y - 12, `+${s.carry.amt}`, RES_META[s.carry.type].color);
            s.carry = null;
          }
          s.mode = s.nodeId ? 'toNode' : 'guard';
        } else {
          this.move(s, cx, cy, st.speed, dt, s.type, true);
        }
      }

      const nearCity = Math.hypot(s.x - cx, s.y - cy) < CITY_R + 95;
      const regen = (nearCity ? 0.025 : 0) + this.mods.regen;
      if (regen > 0) s.hp = Math.min(s.maxHp, s.hp + s.maxHp * regen * dt);
    }
  }

  private updateVillages(dt: number) {
    for (const v of this.villages) {
      v.flash = Math.max(0, v.flash - dt);
      v.caravanT -= dt;
      if (v.caravanT <= 0) {
        v.caravanT = this.villageInterval(v);
        this.caravans.push({
          id: `c${++uid}`,
          villageId: v.id,
          x: v.x, y: v.y, px: v.x, py: v.y,
          type: v.type,
          amt: this.villageHaul(v),
        });
      }
    }
  }

  private updateCaravans(dt: number) {
    const cx = this.city.x;
    const cy = this.city.y;
    for (let i = this.caravans.length - 1; i >= 0; i--) {
      const c = this.caravans[i];
      const speed = 92 * Math.max(1, this.mods.speed * 0.9);
      this.move(c, cx, cy, speed, dt, 'caravan', true);
      if (Math.hypot(c.x - cx, c.y - cy) < CITY_R + 40) {
        this.res[c.type] += c.amt;
        this.addFloat(c.x, c.y - 14, `+${c.amt}`, RES_META[c.type].color);
        this.caravans.splice(i, 1);
      }
    }
  }

  private updateMonsters(dt: number) {
    const cx = this.city.x;
    const cy = this.city.y;
    for (const m of this.monsters) {
      m.flash = Math.max(0, m.flash - dt);
      m.slowT = Math.max(0, m.slowT - dt);
      m.weakenT = Math.max(0, m.weakenT - dt);
      m.shotCd = Math.max(0, m.shotCd - dt);
      if (m.dotT > 0) {
        m.dotT -= dt;
        m.hp -= m.dotDps * dt;
        if (this.rng() < 0.12) this.addFloat(m.x, m.y - 14, `-${Math.round(m.dotDps)}`, '#9fb8a8');
      }

      if (m.kind === 'boss') {
        m.summonT -= dt;
        if (m.summonT <= 0) {
          m.summonT = 22;
          for (let i = 0; i < 2; i++) {
            const a = this.rng() * Math.PI * 2;
            this.spawnMonster('normal', { x: m.x + Math.cos(a) * 60, y: m.y + Math.sin(a) * 60 });
          }
          this.addFx({ kind: 'ring', x: m.x, y: m.y, color: '#ff8c1a', ttl: 0.7, max: 0.7, r0: 10, r1: 110 });
        }
      }

      const speedF = m.slowT > 0 ? 0.6 : 1;
      const weaken = m.weakenT > 0 ? 0.7 : 1;
      const reach = Math.max(ENGAGE_R, m.range);

      // 1) отряд рядом
      const target = this.nearestSquad(m.x, m.y, reach, m.arch === 'stalker');
      if (target) {
        const tst = this.squadStats(target.type, target.power);
        const dmg = m.atk * weaken * dt * (1 - this.mods.dmgReduce) * (1 - tst.dmgRed);
        target.hp -= dmg;
        target.flash = 0.09;
        if (m.range > 0 && m.shotCd <= 0) {
          this.addShot(m.x, m.y, target.x, target.y, MOB_ARCHS[m.arch].edge);
          m.shotCd = 0.4;
        }
        continue;
      }

      // 2) деревня рядом
      const vNear = this.nearestVillage(m.x, m.y, reach + 34);
      if (vNear) {
        vNear.hp -= m.atk * weaken * dt;
        vNear.flash = 0.12;
        if (m.range > 0 && m.shotCd <= 0) {
          this.addShot(m.x, m.y, vNear.x, vNear.y, MOB_ARCHS[m.arch].edge);
          m.shotCd = 0.45;
        }
        continue;
      }

      const chase = this.nearestSquad(m.x, m.y, 760, m.arch === 'stalker');
      const vTarget = this.nearestVillage(m.x, m.y, 620);
      if (chase) {
        const d = Math.hypot(chase.x - m.x, chase.y - m.y);
        const stop = m.range > 0 ? m.range * 0.85 : 0;
        if (d > stop) this.move(m, chase.x, chase.y, m.speed * speedF, dt, 'monster', false);
      } else if (vTarget) {
        this.move(m, vTarget.x, vTarget.y, m.speed * speedF, dt, 'monster', false);
      } else {
        const dCity = Math.hypot(m.x - cx, m.y - cy);
        const wall = CITY_R + 18 + (m.range > 0 ? m.range * 0.8 : 0);
        if (dCity > wall) {
          this.move(m, cx, cy, m.speed * speedF, dt, 'monster', false);
        } else if (this.city.shieldT <= 0) {
          let dmg = m.atk * weaken * dt * 1.4;
          if (this.buffs.barrierT > 0) dmg *= 0.5;
          this.city.hp -= dmg;
          this.shakeT = Math.min(0.4, this.shakeT + dt * 0.6);
          if (m.range > 0 && m.shotCd <= 0) {
            this.addShot(m.x, m.y, cx, cy, MOB_ARCHS[m.arch].edge);
            m.shotCd = 0.45;
          }
        }
      }
    }
  }

  private sweepDeaths() {
    const deadM = this.monsters.filter((m) => m.hp <= 0);
    if (deadM.length) {
      for (const m of deadM) {
        // кровь бога — только за элиту (1) и боссов (3)
        const base = m.kind === 'elite' ? 1 : m.kind === 'boss' ? 3 : 0;
        this.kills[m.kind]++;
        if (base > 0) {
          let amt = Math.max(1, Math.round(base * this.mods.bloodMult));
          let doubled = false;
          if (this.rng() < this.mods.doubleBlood) { amt *= 2; doubled = true; }
          this.blood += amt;
          this.bloodEarned += amt;
          this.addFloat(m.x, m.y - 10, `+${amt}${doubled ? ' ×2' : ''}`, '#ff4d6d');
        }
        this.addFx({ kind: 'burst', x: m.x, y: m.y, color: m.kind === 'boss' ? '#ffb14d' : '#ff4d6d', ttl: 0.6, max: 0.6, r0: 6, r1: m.kind === 'boss' ? 110 : 60 });
        if (m.kind === 'elite') this.addLog('Элитный отряд уничтожен (+1 капля крови)', 'blood');
        if (m.kind === 'boss') {
          this.addBanner(`${m.name ?? 'Босс'} ПОВЕРЖЕН`, '+3 капли крови бога · +1 откровение', 'gold');
          this.addLog(`Босс «${m.name ?? 'Босс'}» повержен!`, 'gold');
        }
      }
      this.monsters = this.monsters.filter((m) => m.hp > 0);
    }

    const deadS = this.squads.filter((s) => s.hp <= 0);
    if (deadS.length) {
      for (const s of deadS) {
        if (s.nodeId) {
          const n = this.nodeById(s.nodeId);
          if (n) n.assigned = Math.max(0, n.assigned - 1);
        }
        if (!s.temp && this.mods.revive) {
          this.reviveQueue.push({ at: this.t + this.mods.reviveDelay });
          this.addLog(`Отряд пал… тьма вернёт его через ${this.mods.reviveDelay} сек`, 'danger');
        } else if (!s.temp) {
          this.addLog(`${SQUAD_TYPES[s.type].short}: отряд уничтожен монстрами`, 'danger');
        }
        this.addFx({ kind: 'burst', x: s.x, y: s.y, color: SQUAD_TYPES[s.type].color, ttl: 0.6, max: 0.6, r0: 4, r1: 54 });
      }
      this.squads = this.squads.filter((s) => s.hp > 0);
    }

    const deadV = this.villages.filter((v) => v.hp <= 0);
    if (deadV.length) {
      for (const v of deadV) {
        const node = this.nodeById(v.nodeId);
        if (node) { node.villageId = null; node.assigned = 0; }
        this.caravans = this.caravans.filter((c) => c.villageId !== v.id);
        this.addFx({ kind: 'burst', x: v.x, y: v.y, color: '#ff4d6d', ttl: 0.9, max: 0.9, r0: 10, r1: 130 });
        this.addBanner('ДЕРЕВНЯ РАЗРУШЕНА', 'Монстры сожгли поселение дотла', 'danger');
        this.addLog('Деревня уничтожена монстрами', 'danger');
      }
      this.villages = this.villages.filter((v) => v.hp > 0);
    }
  }

  private checkCity() {
    if (this.city.hp > 0) return;
    if ((this.god.nodes.breath ?? 0) > 0 && !this.secondWindUsed) {
      this.secondWindUsed = true;
      this.city.hp = Math.round(this.city.maxHp * 0.3);
      this.addBanner('ВТОРОЕ ДЫХАНИЕ', 'Древо Бога спасло город от гибели', 'gold');
      this.addFx({ kind: 'ring', x: this.city.x, y: this.city.y, color: '#f3d98b', ttl: 1.2, max: 1.2, r0: 40, r1: 400 });
      return;
    }
    this.city.hp = 0;
    this.finish('destroyed');
  }

  // ── действия игрока ───────────────────────────────────────────────────────

  setSpeed(v: number) { this.speed = v; this.emitNow(); }

  private freeSquadsOf(type?: SquadType): Squad[] {
    return this.squads.filter((s) => !s.temp && s.mode === 'guard' && !s.nodeId && s.hp > 0 && (type ? s.type === type : true));
  }

  assign(nodeId: string, type?: SquadType): boolean {
    const node = this.nodeById(nodeId);
    if (!node || node.villageId || node.assigned >= this.mods.nodeCap) return false;
    let pool = this.freeSquadsOf(type);
    if (!pool.length && !type) pool = this.freeSquadsOf();
    if (!pool.length) return false;
    pool.sort((a, b) => SQUAD_TYPES[b.type].carry - SQUAD_TYPES[a.type].carry);
    const s = pool[0];
    s.nodeId = node.id;
    s.mode = 'toNode';
    node.assigned++;
    this.addFloat(node.x, node.y - 26, `+${SQUAD_TYPES[s.type].short}`, SQUAD_TYPES[s.type].color);
    this.emitNow();
    return true;
  }

  unassign(nodeId: string): boolean {
    const node = this.nodeById(nodeId);
    if (!node || node.assigned <= 0) return false;
    const s = this.squads.find((sq) => sq.nodeId === nodeId);
    if (s) { s.nodeId = null; s.mode = 'guard'; s.carry = null; }
    node.assigned = Math.max(0, node.assigned - 1);
    this.emitNow();
    return true;
  }

  /** Перестроить источник с 5 отрядами в деревню. */
  buildVillage(nodeId: string): boolean {
    const node = this.nodeById(nodeId);
    if (!node || node.villageId) return false;
    const crew = this.squads.filter((s) => s.nodeId === nodeId && !s.temp);
    if (crew.length < VILLAGE_SQUADS) return false;
    const cost = this.villageCost();
    if (!this.canAfford(cost)) return false;
    this.pay(cost);

    // 5 отрядов уходят на основание деревни
    const used = crew.slice(0, VILLAGE_SQUADS);
    const usedIds = new Set(used.map((s) => s.id));
    this.squads = this.squads.filter((s) => !usedIds.has(s.id));
    for (const s of crew.slice(VILLAGE_SQUADS)) { s.nodeId = null; s.mode = 'guard'; }
    node.assigned = 0;

    const v: Village = {
      id: `v${++uid}`,
      nodeId: node.id,
      type: node.type,
      x: node.x,
      y: node.y,
      hp: Math.round(520 * this.mods.cityHp),
      maxHp: Math.round(520 * this.mods.cityHp),
      level: 1,
      caravanT: 5,
      flash: 0,
    };
    node.villageId = v.id;
    this.villages.push(v);
    this.addFx({ kind: 'ring', x: v.x, y: v.y, color: '#f3d98b', ttl: 1, max: 1, r0: 20, r1: 180 });
    this.addBanner('ДЕРЕВНЯ ОСНОВАНА', `${RES_META[v.type].nodeName}: обоз каждые 5 сек`, 'gold');
    this.addLog(`Основана деревня у источника «${RES_META[v.type].nodeName}»`, 'gold');
    this.emitNow();
    return true;
  }

  upgradeVillage(villageId: string): boolean {
    const v = this.villageById(villageId);
    if (!v || v.level >= 5) return false;
    const cost = this.villageUpCost(v.level);
    if (!this.canAfford(cost)) return false;
    this.pay(cost);
    v.level++;
    const nm = Math.round(520 * this.mods.cityHp * (1 + (v.level - 1) * 0.45));
    v.hp += nm - v.maxHp;
    v.maxHp = nm;
    this.addFx({ kind: 'ring', x: v.x, y: v.y, color: '#f3d98b', ttl: 0.8, max: 0.8, r0: 14, r1: 110 });
    this.addLog(`Деревня улучшена до уровня ${v.level}`, 'info');
    this.emitNow();
    return true;
  }

  buyUpgrade(id: string): boolean {
    const def = UPGRADES.find((u) => u.id === id);
    if (!def) return false;
    const lvl = this.upgrades[id] ?? 0;
    if (lvl >= def.max) return false;
    const cost = costAt(def, lvl, this.mods.costMult);
    if (!this.canAfford(cost)) return false;
    this.pay(cost);
    this.upgrades[id] = lvl + 1;
    this.recalc();
    this.addLog(`${def.name}: улучшено до уровня ${lvl + 1}`, 'info');
    this.emitNow();
    return true;
  }

  buySquad(type: SquadType): boolean {
    const permanent = this.squads.filter((s) => !s.temp).length;
    if (permanent >= this.mods.maxSquads) return false;
    const cost = this.squadCost(type);
    if (!this.canAfford(cost)) return false;
    this.pay(cost);
    this.boughtSquads++;
    const a = this.rng() * Math.PI * 2;
    const s = this.makeSquad(type, this.city.x + Math.cos(a) * 100, this.city.y + Math.sin(a) * 100, 1, 0);
    this.squads.push(s);
    this.addFx({ kind: 'ring', x: s.x, y: s.y, color: SQUAD_TYPES[type].color, ttl: 0.6, max: 0.6, r0: 6, r1: 54 });
    this.addLog(`${SQUAD_TYPES[type].name}: отряд вступил в войско`, 'info');
    this.emitNow();
    return true;
  }

  buySpell(kind: string): boolean {
    if (this.spellOwned[kind]) return false;
    const def = this.race.spells[kind as keyof RaceDef['spells']];
    const cost = this.scaleCost(def.cost);
    if (!this.canAfford(cost)) return false;
    this.pay(cost);
    this.spellOwned[kind] = true;
    this.addLog(`Заклинание «${def.name}» изучено`, 'gold');
    this.emitNow();
    return true;
  }

  castSpell(kind: 'attack' | 'summon' | 'defense'): boolean {
    if (!this.spellOwned[kind] || this.spellCd[kind] > 0) return false;
    const def = this.race.spells[kind];
    const cost = this.scaleCost(def.cost);
    if (!this.canAfford(cost)) return false;
    this.pay(cost);
    this.spellCd[kind] = def.cd;

    const L = this.level;
    const base = 160 + 90 * L * Math.pow(1.2, L - 1);
    const cx = this.city.x;
    const cy = this.city.y;
    const rid = this.race.id;

    if (kind === 'attack') {
      let dmg = base;
      if (rid === 'elves' || rid === 'insectoids') dmg = base * 0.8;
      if (rid === 'golems') dmg = base * 1.5;
      if (rid === 'demons') dmg = base * 1.6;
      for (const m of this.monsters) {
        if (rid === 'undead') { m.dotT = 8; m.dotDps = (base * 1.4) / 8; }
        else { m.hp -= dmg; m.flash = 0.15; }
        if (rid === 'elves') m.slowT = 20;
        if (rid === 'insectoids') m.weakenT = 20;
        if (rid === 'golems') {
          const d = Math.hypot(m.x - cx, m.y - cy) || 1;
          const nx = m.x + ((m.x - cx) / d) * 160;
          const ny = m.y + ((m.y - cy) / d) * 160;
          if (this.passable(nx, ny, 'monster')) { m.x = nx; m.y = ny; }
        }
      }
      this.addFx({ kind: 'ring', x: cx, y: cy, color: this.race.color, ttl: 0.9, max: 0.9, r0: 60, r1: 1200 });
      this.addBanner(def.name, 'Магия обрушивается на врагов', 'info');
    }

    if (kind === 'summon') {
      const conf: Record<string, { n: number; p: number; t: SquadType }> = {
        humans: { n: 2, p: 1, t: 'warrior' },
        elves: { n: 2, p: 1, t: 'ranger' },
        undead: { n: 3, p: 0.65, t: 'warrior' },
        insectoids: { n: 3, p: 0.8, t: 'scout' },
        golems: { n: 2, p: 1.5, t: 'guardian' },
        demons: { n: 2, p: 1.25, t: 'warrior' },
      };
      const c = conf[rid];
      for (let i = 0; i < c.n; i++) {
        const a = this.rng() * Math.PI * 2;
        this.squads.push(this.makeSquad(c.t, cx + Math.cos(a) * 110, cy + Math.sin(a) * 110, c.p, 45));
      }
      this.addFx({ kind: 'ring', x: cx, y: cy, color: this.race.color, ttl: 1, max: 1, r0: 40, r1: 300 });
      this.addBanner(def.name, 'Временные отряды вступают в бой на 45 сек', 'info');
    }

    if (kind === 'defense') {
      if (rid === 'humans') { this.city.shieldT = 20; this.city.hp = Math.min(this.city.maxHp, this.city.hp + this.city.maxHp * 0.25); }
      if (rid === 'elves') {
        this.city.shieldT = 10;
        this.city.hp = Math.min(this.city.maxHp, this.city.hp + this.city.maxHp * 0.3);
        for (const s of this.squads) s.hp = Math.min(s.maxHp, s.hp + s.maxHp * 0.4);
      }
      if (rid === 'undead') this.city.shieldT = 25;
      if (rid === 'insectoids') { this.city.shieldT = 15; this.city.hp = Math.min(this.city.maxHp, this.city.hp + this.city.maxHp * 0.2); }
      if (rid === 'golems') { this.city.shieldT = 15; this.buffs.barrierT = 25; }
      if (rid === 'demons') { this.city.shieldT = 12; this.buffs.vampT = 25; }
      for (const v of this.villages) v.hp = Math.min(v.maxHp, v.hp + v.maxHp * 0.25);
      this.addFx({ kind: 'ring', x: cx, y: cy, color: '#7cc4ff', ttl: 1, max: 1, r0: 70, r1: 260 });
      this.addBanner(def.name, 'Город укрыт магической защитой', 'gold');
    }

    this.sweepDeaths();
    this.emitNow();
    return true;
  }

  buyTreeNode(id: string): boolean {
    if (this.tree[id]) return false;
    const def = raceTreeFor(this.race.id).find((n) => n.id === id);
    if (!def || !treeTierOk(this.tree, def)) return false;
    if (this.blood < def.cost) return false;
    this.blood -= def.cost;
    this.tree[id] = true;
    this.recalc();
    this.addBanner('Умение изучено', def.name, 'gold');
    this.emitNow();
    return true;
  }

  // ── регресс ───────────────────────────────────────────────────────────────

  /** Откровения = убитые боссы + секунды раунда × 0.01 */
  previewPrestige(): PrestigeInfo {
    const boss = this.kills.boss;
    const time = this.t * 0.01;
    return {
      total: Math.floor(boss + time),
      parts: { boss, time },
      mins: this.t / 60,
      kills: { ...this.kills },
      blood: this.bloodEarned,
    };
  }

  requestPrestige() { this.finish('manual'); }

  private finish(cause: 'destroyed' | 'manual') {
    if (this.gameOver) return;
    this.gameOver = { cause, info: this.previewPrestige() };
    this.emitNow();
  }

  // ── сохранение / загрузка цикла ───────────────────────────────────────────

  serializeRun(): RunSave {
    return {
      t: this.t,
      level: this.level,
      nextLevelAt: this.nextLevelAt,
      speed: this.speed,
      res: { ...this.res },
      blood: this.blood,
      bloodEarned: this.bloodEarned,
      kills: { ...this.kills },
      squads: this.squads.map((s) => ({ ...s, carry: s.carry ? { ...s.carry } : null })),
      monsters: this.monsters.map((m) => ({ ...m })),
      nodes: this.nodes.map((n) => ({ ...n })),
      villages: this.villages.map((v) => ({ ...v })),
      caravans: this.caravans.map((c) => ({ ...c })),
      zones: this.zones.map((z) => ({ ...z })),
      wear: this.wear.map((w) => Math.round(w * 1000) / 1000),
      deco: {
        trees: this.deco.trees.map((d) => ({ ...d })),
        rocks: this.deco.rocks.map((d) => ({ ...d })),
        ponds: this.deco.ponds.map((d) => ({ ...d })),
      },
      city: { ...this.city },
      upgrades: { ...this.upgrades },
      tree: { ...this.tree },
      spellOwned: { ...this.spellOwned },
      spellCd: { ...this.spellCd },
      buffs: { ...this.buffs },
      spawnT: this.spawnT,
      eliteT: this.eliteT,
      boughtSquads: this.boughtSquads,
      secondWindUsed: this.secondWindUsed,
      reviveQueue: this.reviveQueue.map((r) => ({ ...r })),
    };
  }

  private loadRun(s: RunSave) {
    this.t = s.t;
    this.level = s.level;
    this.nextLevelAt = s.nextLevelAt ?? s.t + 180;
    this.speed = s.speed ?? 1;
    this.res = { ...s.res };
    this.blood = s.blood;
    this.bloodEarned = s.bloodEarned;
    this.kills = { ...s.kills };
    this.squads = s.squads.map((sq) => ({ ...sq, shotCd: sq.shotCd ?? 0, type: sq.type ?? 'warrior' }));
    this.monsters = s.monsters.map((m) => ({ ...m, arch: m.arch ?? 'grunt', shotCd: m.shotCd ?? 0, summonT: m.summonT ?? 20 }));
    this.nodes = s.nodes.map((n) => ({ ...n, villageId: n.villageId ?? null }));
    this.villages = (s.villages ?? []).map((v) => ({ ...v }));
    this.caravans = (s.caravans ?? []).map((c) => ({ ...c }));
    this.zones = (s.zones ?? []).map((z) => ({ ...z }));
    this.wear = s.wear && s.wear.length === GW * GH ? [...s.wear] : new Array(GW * GH).fill(0);
    this.deco = s.deco;
    this.city = { ...s.city };
    this.upgrades = { ...s.upgrades };
    this.tree = { ...s.tree };
    this.spellOwned = { ...s.spellOwned };
    this.spellCd = { ...s.spellCd };
    this.buffs = { ...s.buffs };
    this.spawnT = s.spawnT;
    this.eliteT = s.eliteT;
    this.boughtSquads = s.boughtSquads;
    this.secondWindUsed = s.secondWindUsed;
    this.reviveQueue = s.reviveQueue ?? [];
    uid += 10000;
  }

  // ── снапшоты ──────────────────────────────────────────────────────────────

  private emitTick(rawDt: number) {
    this.emitAcc += rawDt;
    if (this.emitAcc >= 0.2) { this.emitAcc = 0; this.emitNow(); }
  }

  emitNow() {
    if (!this.onSnap) return;
    const permanent = this.squads.filter((s) => !s.temp).length;
    const spellCost: Record<string, Cost> = {};
    for (const k of ['attack', 'summon', 'defense'] as const) {
      spellCost[k] = this.scaleCost(this.race.spells[k].cost);
    }
    const roster = {} as Record<SquadType, RosterEntry>;
    const squadCosts = {} as Record<SquadType, Cost>;
    for (const t of SQUAD_ORDER) {
      roster[t] = {
        total: this.squads.filter((s) => s.type === t && !s.temp).length,
        free: this.freeSquadsOf(t).length,
      };
      squadCosts[t] = this.squadCost(t);
    }

    this.onSnap({
      t: this.t,
      level: this.level,
      levelIn: Math.max(0, this.nextLevelAt - this.t),
      eliteIn: Math.max(0, this.eliteT),
      speed: this.speed,
      res: { ...this.res },
      blood: this.blood,
      cityHp: Math.max(0, Math.round(this.city.hp)),
      cityMax: this.city.maxHp,
      shieldT: this.city.shieldT,
      barrierT: this.buffs.barrierT,
      vampT: this.buffs.vampT,
      squads: permanent,
      maxSquads: this.mods.maxSquads,
      freeSquads: this.freeSquadsOf().length,
      nodeCap: this.mods.nodeCap,
      costMult: this.mods.costMult,
      monsterCount: this.monsters.length,
      bossAlive: this.monsters.some((m) => m.kind === 'boss'),
      kills: { ...this.kills },
      bloodEarned: this.bloodEarned,
      upgrades: { ...this.upgrades },
      tree: { ...this.tree },
      spellOwned: { ...this.spellOwned },
      spellCd: { ...this.spellCd },
      spellCost,
      banners: [...this.banners],
      log: [...this.log],
      nodes: this.nodes.map((n) => ({ id: n.id, type: n.type, assigned: n.assigned, villageId: n.villageId })),
      villages: this.villages.map((v) => ({
        id: v.id,
        nodeId: v.nodeId,
        type: v.type,
        hp: Math.max(0, Math.round(v.hp)),
        maxHp: v.maxHp,
        level: v.level,
        upCost: this.villageUpCost(v.level),
        interval: this.villageInterval(v),
        amount: this.villageHaul(v),
      })),
      villageCost: this.villageCost(),
      roster,
      squadCosts,
      rebirths: this.god.rebirths ?? 0,
      gameOver: this.gameOver,
      prestige: this.previewPrestige(),
    });
  }
}
