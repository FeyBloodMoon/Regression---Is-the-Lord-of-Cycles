// ── Попап источника ресурсов: назначение отрядов ────────────────────────────

import { RES_META } from '../game/races';
import type { ResType, Cost } from '../game/races';
import { SQUAD_TYPES, SQUAD_ORDER } from '../game/units';
import type { SquadType } from '../game/units';
import type { RosterEntry, VillageSnap } from '../game/engine';
import { Ico, ResIco, Bar, CostRow } from './ui';
import { X, Plus, Minus } from 'lucide-react';

export default function NodePopup({
  type,
  assigned,
  cap,
  freeSquads,
  roster,
  rich,
  x,
  y,
  village,
  villageCost,
  res,
  onAssign,
  onUnassign,
  onBuildVillage,
  onUpgradeVillage,
  onClose,
}: {
  type: ResType;
  assigned: number;
  cap: number;
  freeSquads: number;
  roster: Record<SquadType, RosterEntry>;
  rich: number;
  x: number;
  y: number;
  village?: VillageSnap;
  villageCost: Cost;
  res: Record<ResType, number>;
  onAssign: (t?: SquadType) => void;
  onUnassign: () => void;
  onBuildVillage: () => void;
  onUpgradeVillage: () => void;
  onClose: () => void;
}) {
  const meta = RES_META[type];
  const full = assigned >= cap;
  const resKeys = Object.keys(res) as ResType[];
  const canPay = (c: Cost) => resKeys.every((k) => res[k] >= (c[k] ?? 0));

  // ── режим деревни ──
  if (village) {
    const hpFrac = village.hp / Math.max(1, village.maxHp);
    const maxed = village.level >= 5;
    return (
      <div
        className="panel anim-fade-up absolute z-30 w-[262px] p-3"
        style={{
          left: x, top: y, transform: 'translate(-50%, -112%)', animationDuration: '0.18s',
          borderColor: 'rgba(216,180,90,0.55)', boxShadow: '0 14px 40px rgba(0,0,0,0.6), 0 0 24px rgba(216,180,90,0.2)',
        }}
      >
        <button onClick={onClose} className="absolute right-2 top-2 text-stone-500 transition hover:text-stone-200">
          <X size={14} />
        </button>
        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-amber-200/45 bg-amber-100/10 p-1.5 text-amber-200">
            <Ico k="castle" size={17} />
          </div>
          <div>
            <div className="font-display text-base font-bold leading-tight text-amber-100">
              Деревня · ур. {village.level}
            </div>
            <div className="text-[10px] text-stone-400">{meta.nodeName}</div>
          </div>
        </div>

        <div className="mt-2">
          <Bar value={village.hp} max={village.maxHp} height={7} color={hpFrac > 0.5 ? '#59c46d' : hpFrac > 0.25 ? '#e0a94f' : '#ff4d6d'} />
          <div className="mt-1 flex justify-between text-[10px] text-stone-400">
            <span>Прочность</span>
            <span>{village.hp} / {village.maxHp}</span>
          </div>
        </div>

        <div className="panel-inset mt-2 flex items-center justify-between px-3 py-2 text-[11px]">
          <span className="text-stone-400">Обоз каждые {village.interval.toFixed(1)} с</span>
          <span className="inline-flex items-center gap-1 font-bold" style={{ color: meta.color }}>
            <ResIco type={type} size={12} /> +{village.amount}
          </span>
        </div>

        {maxed ? (
          <div className="mt-2 text-center text-[11px] font-bold uppercase tracking-wider text-amber-200/80">
            Максимальный уровень
          </div>
        ) : (
          <div className="mt-2">
            <CostRow cost={village.upCost} res={res} size="sm" />
            <button
              className="btn mt-1.5 w-full px-2 py-1.5 text-xs"
              disabled={!canPay(village.upCost)}
              onClick={onUpgradeVillage}
            >
              <Ico k="hammer" size={12} /> Улучшить деревню
            </button>
          </div>
        )}
        <div className="mt-2 text-[10px] leading-snug text-stone-500">
          Улучшение: +40% к обозу, +45% прочности, ускорение отправки.
        </div>
      </div>
    );
  }

  return (
    <div
      className="panel anim-fade-up absolute z-30 w-[268px] p-3"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -112%)',
        animationDuration: '0.18s',
        borderColor: `${meta.color}55`,
        boxShadow: `0 14px 40px rgba(0,0,0,0.6), 0 0 24px ${meta.color}22`,
      }}
    >
      <button onClick={onClose} className="absolute right-2 top-2 text-stone-500 transition hover:text-stone-200">
        <X size={14} />
      </button>
      <div className="flex items-center gap-2">
        <div className="rounded-lg border p-1.5" style={{ borderColor: `${meta.color}55`, color: meta.color, background: `${meta.color}14` }}>
          <ResIco type={type} size={17} />
        </div>
        <div>
          <div className="font-display text-base font-bold leading-tight text-stone-100">{meta.nodeName}</div>
          <div className="text-[10px] text-stone-400">
            Жила богатая: <span style={{ color: meta.color }}>×{rich.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="panel-inset mt-2.5 flex items-center justify-between px-3 py-2">
        <span className="text-[11px] text-stone-400">Отряды на добыче</span>
        <span className="font-display text-lg font-bold" style={{ color: meta.color }}>
          {assigned}
          <span className="text-stone-500">/{cap}</span>
        </span>
      </div>

      <div className="mt-2.5 flex gap-2">
        <button className="btn flex-1 px-2 py-1.5 text-xs" disabled={full || freeSquads <= 0} onClick={() => onAssign()}>
          <Plus size={13} /> Лучший
        </button>
        <button className="btn btn-danger flex-1 px-2 py-1.5 text-xs" disabled={assigned <= 0} onClick={onUnassign}>
          <Minus size={13} /> Вернуть
        </button>
      </div>

      <div className="mt-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">Отправить конкретный род</div>
      <div className="mt-1 grid grid-cols-5 gap-1">
        {SQUAD_ORDER.map((t) => {
          const d = SQUAD_TYPES[t];
          const free = roster[t]?.free ?? 0;
          return (
            <button
              key={t}
              disabled={full || free <= 0}
              onClick={() => onAssign(t)}
              title={`${d.name}: свободно ${free} · ноша ×${d.carry.toFixed(2)}`}
              className="flex flex-col items-center gap-0.5 rounded-lg border py-1.5 transition disabled:opacity-30"
              style={{
                borderColor: free > 0 && !full ? `${d.color}55` : 'rgba(255,255,255,0.08)',
                background: free > 0 && !full ? `${d.color}12` : 'rgba(0,0,0,0.3)',
                color: d.color,
              }}
            >
              <Ico k={d.icon} size={14} />
              <span className="text-[10px] font-bold text-stone-300">{free}</span>
            </button>
          );
        })}
      </div>

      {/* основание деревни */}
      <div
        className="panel-inset mt-2.5 p-2.5"
        style={assigned >= 5 ? { borderColor: 'rgba(216,180,90,0.45)', background: 'rgba(216,180,90,0.07)' } : undefined}
      >
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-200">
          <Ico k="castle" size={12} />
          Основать деревню
          <span className="ml-auto text-[10px] font-semibold text-stone-400">{Math.min(assigned, 5)}/5 отрядов</span>
        </div>
        <div className="mt-1 text-[10px] leading-snug text-stone-500">
          5 отрядов останутся здесь навсегда, зато обоз пойдёт в город каждые 5 сек.
        </div>
        <div className="mt-1.5">
          <CostRow cost={villageCost} res={res} size="sm" />
        </div>
        <button
          className="btn mt-1.5 w-full px-2 py-1.5 text-[11px]"
          disabled={assigned < 5 || !canPay(villageCost)}
          onClick={onBuildVillage}
        >
          <Ico k="hammer" size={12} /> Построить
        </button>
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-stone-500">
        <Ico k="users" size={11} />
        Всего свободных отрядов: {freeSquads}
      </div>
    </div>
  );
}
