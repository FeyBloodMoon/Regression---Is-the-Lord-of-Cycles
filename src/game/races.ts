// ── Базовые типы и данные рас, заклинаний и древ умений ─────────────────────

export type RaceId = 'humans' | 'elves' | 'undead' | 'insectoids' | 'golems' | 'demons';
export type ResType = 'wood' | 'metal' | 'gold' | 'gems';
export type Cost = Partial<Record<ResType, number>>;
export type SpellKind = 'attack' | 'summon' | 'defense';

export const RES_META: Record<ResType, { name: string; nodeName: string; icon: string; color: string }> = {
  wood: { name: 'Дерево', nodeName: 'Лесопилка', icon: 'tree', color: '#4fc06f' },
  metal: { name: 'Металл', nodeName: 'Шахта металла', icon: 'pick', color: '#9fb4cb' },
  gold: { name: 'Золото', nodeName: 'Золотой рудник', icon: 'coins', color: '#e8c45a' },
  gems: { name: 'Самоцветы', nodeName: 'Жила самоцветов', icon: 'gem', color: '#c77dff' },
};

export interface SpellDef {
  kind: SpellKind;
  name: string;
  desc: string;
  icon: string;
  cost: Cost;
  cd: number; // секунды
}

export interface RaceDef {
  id: RaceId;
  name: string;
  title: string;
  color: string;
  icon: string;
  desc: string;
  pros: string[];
  cons: string[];
  // модификаторы
  gather: number;
  atk: number;
  hp: number;
  speed: number;
  cost: number;
  cityHp: number;
  perRes: Partial<Record<ResType, number>>;
  nodeCapBonus: number;
  maxSquadsBonus: number;
  revive: boolean;
  doubleBlood: number; // шанс удвоенной крови
  ult: { name: string; desc: string };
  spells: Record<SpellKind, SpellDef>;
}

export const RACE_LIST: RaceId[] = ['humans', 'elves', 'undead', 'insectoids', 'golems', 'demons'];

export const RACES: Record<RaceId, RaceDef> = {
  humans: {
    id: 'humans',
    name: 'Люди',
    title: 'Королевство под сенью знамён',
    color: '#e0a94f',
    icon: 'crown',
    desc: 'Гибкие и прагматичные. Их сила — в дисциплине, торговле и умении строить быстрее всех.',
    pros: ['Отряды и постройки на 15% дешевле', 'Добыча всех ресурсов +10%'],
    cons: ['Атака отрядов −5%'],
    gather: 1.1, atk: 0.95, hp: 1, speed: 1, cost: 0.85, cityHp: 1,
    perRes: {}, nodeCapBonus: 0, maxSquadsBonus: 0, revive: false, doubleBlood: 0,
    ult: { name: 'Единство рас', desc: 'Все отряды получают +15% к атаке и здоровью.' },
    spells: {
      attack: { kind: 'attack', name: 'Стальной ливень', desc: 'Град стрел: урон всем монстрам на карте.', icon: 'storm', cost: { gold: 70, gems: 30 }, cd: 90 },
      summon: { kind: 'summon', name: 'Ополчение', desc: 'Призывает 2 временных отряда на 45 сек.', icon: 'users', cost: { wood: 120, metal: 80 }, cd: 120 },
      defense: { kind: 'defense', name: 'Королевский щит', desc: 'Город неуязвим 20 сек и восстанавливает 25% прочности.', icon: 'shield', cost: { metal: 90, gold: 60, gems: 10 }, cd: 100 },
    },
  },
  elves: {
    id: 'elves',
    name: 'Эльфы',
    title: 'Народ вечных рощ',
    color: '#63d68b',
    icon: 'leaf',
    desc: 'Стремительные следопыты. Лес кормит их, а ветер несёт их клинки быстрее мысли.',
    pros: ['Скорость отрядов +30%', 'Добыча дерева +25%'],
    cons: ['Здоровье отрядов −15%'],
    gather: 1, atk: 1, hp: 0.85, speed: 1.3, cost: 1, cityHp: 1,
    perRes: { wood: 1.25 }, nodeCapBonus: 0, maxSquadsBonus: 0, revive: false, doubleBlood: 0,
    ult: { name: 'Танец клинков', desc: 'Отряды уклоняются: входящий урон −18%.' },
    spells: {
      attack: { kind: 'attack', name: 'Гнев рощи', desc: 'Корни ранят всех монстров и замедляют их на 40% на 20 сек.', icon: 'leaf', cost: { gold: 70, gems: 30 }, cd: 90 },
      summon: { kind: 'summon', name: 'Духи леса', desc: 'Призывает 2 стремительных временных отряда на 45 сек.', icon: 'wind', cost: { wood: 120, metal: 80 }, cd: 120 },
      defense: { kind: 'defense', name: 'Благословение рощи', desc: 'Лечит город на 30%, все отряды на 40%, щит на 10 сек.', icon: 'shieldplus', cost: { metal: 90, gold: 60, gems: 10 }, cd: 100 },
    },
  },
  undead: {
    id: 'undead',
    name: 'Нежить',
    title: 'Легионы тихого сна',
    color: '#9fb8a8',
    icon: 'skull',
    desc: 'Смерть для них — лишь пауза. Павшие отряды возвращаются из тьмы, чтобы служить вновь.',
    pros: ['Отряды воскресают у города через 20 сек после гибели', 'Здоровье отрядов +15%'],
    cons: ['Скорость отрядов −20%'],
    gather: 1, atk: 1, hp: 1.15, speed: 0.8, cost: 1, cityHp: 1,
    perRes: {}, nodeCapBonus: 0, maxSquadsBonus: 0, revive: true, doubleBlood: 0,
    ult: { name: 'Великое восстание', desc: 'Воскрешение занимает 8 сек вместо 20.' },
    spells: {
      attack: { kind: 'attack', name: 'Чума', desc: 'Мор: все монстры теряют здоровье каждую секунду в течение 8 сек.', icon: 'biohazard', cost: { gold: 70, gems: 30 }, cd: 90 },
      summon: { kind: 'summon', name: 'Подъём мёртвых', desc: 'Призывает 3 слабых временных отряда на 45 сек.', icon: 'ghost', cost: { wood: 120, metal: 80 }, cd: 120 },
      defense: { kind: 'defense', name: 'Стена костей', desc: 'Город неуязвим 25 сек.', icon: 'bones', cost: { metal: 90, gold: 60, gems: 10 }, cd: 100 },
    },
  },
  insectoids: {
    id: 'insectoids',
    name: 'Инсектоиды',
    title: 'Рой бесчисленных крыльев',
    color: '#c3d44e',
    icon: 'bug',
    desc: 'Один — ничто. Миллион — легион. Рой не знает страха, усталости и пощады.',
    pros: ['До 7 отрядов на источник (вместо 5)', 'Отряды и постройки на 30% дешевле', '+4 к максимуму отрядов'],
    cons: ['Атака отрядов −25%', 'Здоровье отрядов −10%'],
    gather: 1, atk: 0.75, hp: 0.9, speed: 1, cost: 0.7, cityHp: 1,
    perRes: {}, nodeCapBonus: 2, maxSquadsBonus: 4, revive: false, doubleBlood: 0,
    ult: { name: 'Сверхрой', desc: 'Ещё +2 отряда на источник и +15% к атаке роя.' },
    spells: {
      attack: { kind: 'attack', name: 'Кислотный дождь', desc: 'Ранит всех монстров и ослабляет их атаку на 30% на 20 сек.', icon: 'rain', cost: { gold: 70, gems: 30 }, cd: 90 },
      summon: { kind: 'summon', name: 'Рой', desc: 'Призывает 3 временных отряда на 45 сек.', icon: 'bug', cost: { wood: 120, metal: 80 }, cd: 120 },
      defense: { kind: 'defense', name: 'Хитиновый купол', desc: 'Щит на 15 сек и ремонт города на 20%.', icon: 'dome', cost: { metal: 90, gold: 60, gems: 10 }, cd: 100 },
    },
  },
  golems: {
    id: 'golems',
    name: 'Големы',
    title: 'Дети камня и молота',
    color: '#b8a37e',
    icon: 'mountain',
    desc: 'Медлительные создания камня. Их почти невозможно уничтожить — и горы служат им кладовыми.',
    pros: ['Здоровье отрядов +45%', 'Добыча металла и самоцветов +20%'],
    cons: ['Скорость отрядов −30%', 'Отряды на 25% дороже'],
    gather: 1, atk: 1, hp: 1.45, speed: 0.7, cost: 1.25, cityHp: 1.1,
    perRes: { metal: 1.2, gems: 1.2 }, nodeCapBonus: 0, maxSquadsBonus: 0, revive: false, doubleBlood: 0,
    ult: { name: 'Адамантова плоть', desc: 'Входящий урон по отрядам −25%.' },
    spells: {
      attack: { kind: 'attack', name: 'Землетрясение', desc: 'Тяжёлый урон всем монстрам и отбрасывание от города.', icon: 'quake', cost: { gold: 70, gems: 30 }, cd: 90 },
      summon: { kind: 'summon', name: 'Каменные стражи', desc: 'Призывает 2 очень прочных временных отряда на 45 сек.', icon: 'mountain', cost: { wood: 120, metal: 80 }, cd: 120 },
      defense: { kind: 'defense', name: 'Гранитная кожа', desc: 'Щит на 15 сек, урон по городу −50% ещё на 25 сек.', icon: 'granite', cost: { metal: 90, gold: 60, gems: 10 }, cd: 100 },
    },
  },
  demons: {
    id: 'demons',
    name: 'Демоны',
    title: 'Воинство алого пламени',
    color: '#ff6b4a',
    icon: 'flame',
    desc: 'Ярость бездны в каждом ударе. Кровь врагов питает их — и питает твоё могущество.',
    pros: ['Атака отрядов +25%', '15% шанс удвоить капли крови за убийство'],
    cons: ['Добыча ресурсов −15%', 'Прочность города −15%'],
    gather: 0.85, atk: 1.25, hp: 1, speed: 1.05, cost: 1, cityHp: 0.85,
    perRes: {}, nodeCapBonus: 0, maxSquadsBonus: 0, revive: false, doubleBlood: 0.15,
    ult: { name: 'Жажда бездны', desc: 'Отряды исцеляются на 25% от нанесённого урона.' },
    spells: {
      attack: { kind: 'attack', name: 'Адское пламя', desc: 'Огромный урон всем монстрам на карте.', icon: 'flame', cost: { gold: 70, gems: 30 }, cd: 90 },
      summon: { kind: 'summon', name: 'Портал бездны', desc: 'Призывает 2 могучих временных отряда на 45 сек.', icon: 'portal', cost: { wood: 120, metal: 80 }, cd: 120 },
      defense: { kind: 'defense', name: 'Кровавый барьер', desc: 'Щит на 12 сек, отряды получают вампиризм 30% на 25 сек.', icon: 'bloodshield', cost: { metal: 90, gold: 60, gems: 10 }, cd: 100 },
    },
  },
};

// ── Древо умений расы (за капли крови бога) ─────────────────────────────────

export interface TreeNodeDef {
  id: string;
  tier: 1 | 2 | 3 | 4;
  cost: number;
  icon: string;
  name: string;
  desc: string;
}

export function raceTreeFor(race: RaceId): TreeNodeDef[] {
  const r = RACES[race];
  return [
    { id: 'prod', tier: 1, cost: 1, icon: 'pick', name: 'Кровавая жила', desc: 'Добыча ресурсов +25%.' },
    { id: 'atk', tier: 1, cost: 1, icon: 'swords', name: 'Оружие войны', desc: 'Атака отрядов +20%.' },
    { id: 'hp', tier: 1, cost: 1, icon: 'heart', name: 'Закалённая плоть', desc: 'Здоровье отрядов +20%.' },
    { id: 'spd', tier: 2, cost: 3, icon: 'wind', name: 'След бури', desc: 'Скорость отрядов +18%.' },
    { id: 'carry', tier: 2, cost: 3, icon: 'bag', name: 'Глубокие сумы', desc: 'Ноша ресурсов +45%.' },
    { id: 'regen', tier: 2, cost: 3, icon: 'regen', name: 'Кровавое восстановление', desc: 'Отряды лечатся на 1%/сек где угодно.' },
    { id: 'ult', tier: 3, cost: 6, icon: 'crown', name: r.ult.name, desc: r.ult.desc },
    { id: 'asc', tier: 4, cost: 10, icon: 'star', name: 'Вознесение', desc: '+30% к атаке, здоровью и добыче.' },
  ];
}

export function treeTierOk(owned: Record<string, boolean>, node: TreeNodeDef): boolean {
  if (node.tier === 1) return true;
  const count = (t: number) => raceTreeIdsOfTier(t).filter((id) => owned[id]).length;
  if (node.tier === 2) return count(1) >= 1;
  if (node.tier === 3) return count(2) >= 2;
  return !!owned.ult;
}

function raceTreeIdsOfTier(tier: number): string[] {
  const ids: Record<number, string[]> = {
    1: ['prod', 'atk', 'hp'],
    2: ['spd', 'carry', 'regen'],
    3: ['ult'],
    4: ['asc'],
  };
  return ids[tier] ?? [];
}
