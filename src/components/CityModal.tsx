// ── Модалка города: отряды, укрепления, заклинания ──────────────────────────

import { Game, UPGRADES, costAt } from '../game/engine';
import type { Snap } from '../game/engine';
import { SQUAD_TYPES, SQUAD_ORDER } from '../game/units';
import type { RaceDef, ResType } from '../game/races';
import { Modal, ModalHeader, Ico, CostRow } from './ui';

const RES_ORDER: ResType[] = ['wood', 'metal', 'gold', 'gems'];

export default function CityModal({
  game,
  snap,
  race,
  onClose,
}: {
  game: Game;
  snap: Snap;
  race: RaceDef;
  onClose: () => void;
}) {
  const full = snap.squads >= snap.maxSquads;

  return (
    <Modal onClose={onClose} wide>
      <ModalHeader
        icon="castle"
        title={`Город повелителя`}
        sub={`Прочность ${snap.cityHp} / ${snap.cityMax} · Отрядов ${snap.squads}/${snap.maxSquads}`}
        right={
          <div className="hidden items-center gap-3 md:flex">
            {RES_ORDER.map((k) => (
              <span key={k} className="flex items-center gap-1 text-sm font-semibold text-stone-200">
                <Ico k={['tree', 'pick', 'coins', 'gem'][RES_ORDER.indexOf(k)]} size={15} />
                {Math.floor(snap.res[k])}
              </span>
            ))}
          </div>
        }
      />

      <div className="scroll-thin grid gap-4 overflow-y-auto p-5 lg:grid-cols-2">
        {/* левая колонка */}
        <div className="space-y-4">
          {/* найм отрядов */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-stone-500">Казарма — рода войск</span>
              <span className={`text-[11px] font-bold ${full ? 'text-rose-300' : 'text-stone-300'}`}>
                {snap.squads}/{snap.maxSquads} отрядов
              </span>
            </div>
            <div className="space-y-2">
              {SQUAD_ORDER.map((type) => {
                const d = SQUAD_TYPES[type];
                const cost = snap.squadCosts[type];
                const st = game.squadStats(type, 1);
                const afford = RES_ORDER.every((k) => snap.res[k] >= (cost[k] ?? 0));
                const r = snap.roster[type];
                return (
                  <div key={type} className="panel-inset p-3" style={{ borderColor: `${d.color}33` }}>
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg border p-2" style={{ borderColor: `${d.color}55`, color: d.color, background: `${d.color}12` }}>
                        <Ico k={d.icon} size={19} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display text-base font-bold text-stone-100">{d.name}</span>
                          <span className="chip text-[9px]" style={{ color: d.color, borderColor: `${d.color}44` }}>{d.role}</span>
                          <span className="text-[10px] text-stone-500">в войске: {r.total} · свободно: {r.free}</span>
                        </div>
                        <div className="mt-0.5 text-[11px] leading-snug text-stone-400">{d.desc}</div>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10.5px] text-stone-500">
                          <span>⚔ {Math.round(st.atk)}/с</span>
                          <span>❤ {Math.round(st.hp)}</span>
                          <span>➤ {Math.round(st.speed)}</span>
                          <span>📦 ×{st.carry.toFixed(2)}</span>
                          {st.range > 0 && <span style={{ color: d.color }}>дальность {st.range}</span>}
                          {st.dmgRed > 0 && <span style={{ color: d.color }}>броня −{Math.round(st.dmgRed * 100)}%</span>}
                        </div>
                      </div>
                      <div className="w-[112px] shrink-0 text-right">
                        <CostRow cost={cost} res={snap.res} size="sm" />
                        <button
                          className="btn mt-1 w-full px-2 py-1 text-[11px]"
                          disabled={full || !afford}
                          onClick={() => game.buySquad(type)}
                        >
                          Нанять
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {full && <div className="mt-2 text-[11px] text-rose-300">Лимит отрядов достигнут — постройте Казармы</div>}
          </div>

          {/* улучшения */}
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-stone-500">Укрепления и гильдии</div>
            <div className="space-y-2">
              {UPGRADES.map((u) => {
                const lvl = snap.upgrades[u.id] ?? 0;
                const maxed = lvl >= u.max;
                const cost = costAt(u, lvl, snap.costMult);
                const afford = RES_ORDER.every((k) => snap.res[k] >= (cost[k] ?? 0));
                return (
                  <div key={u.id} className="panel-inset flex items-center gap-3 p-3">
                    <div className="rounded-lg border border-white/10 bg-black/30 p-2 text-amber-200/90">
                      <Ico k={u.icon} size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-stone-100">{u.name}</span>
                        <span className="flex gap-0.5">
                          {Array.from({ length: u.max }).map((_, i) => (
                            <span
                              key={i}
                              className="h-1.5 w-3 rounded-sm"
                              style={{ background: i < lvl ? '#d8b45a' : 'rgba(255,255,255,0.1)' }}
                            />
                          ))}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-400">{u.desc}</div>
                    </div>
                    <div className="w-[118px] shrink-0 text-right">
                      {maxed ? (
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-200/80">Макс.</span>
                      ) : (
                        <>
                          <CostRow cost={cost} res={snap.res} size="sm" />
                          <button
                            className="btn mt-1 w-full px-2 py-1 text-[11px]"
                            disabled={!afford}
                            onClick={() => game.buyUpgrade(u.id)}
                          >
                            Улучшить
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* правая колонка — заклинания */}
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-stone-500">
            Заклинания народа: {race.name}
          </div>
          <div className="space-y-2">
            {(['attack', 'summon', 'defense'] as const).map((kind) => {
              const def = race.spells[kind];
              const owned = snap.spellOwned[kind];
              const cost = snap.spellCost[kind];
              const afford = RES_ORDER.every((k) => snap.res[k] >= (cost[k] ?? 0));
              const kindLabel = kind === 'attack' ? 'Атакующее' : kind === 'summon' ? 'Призывное' : 'Оборонительное';
              return (
                <div
                  key={kind}
                  className="panel-inset relative overflow-hidden p-4"
                  style={owned ? { borderColor: `${race.color}55`, background: `${race.color}0d` } : undefined}
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg border p-2.5" style={{ borderColor: `${race.color}55`, color: race.color, background: `${race.color}12` }}>
                      <Ico k={def.icon} size={22} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-lg font-bold text-stone-100">{def.name}</span>
                        <span className="chip text-[9px] text-stone-400">{kindLabel}</span>
                      </div>
                      <div className="mt-0.5 text-[11.5px] leading-snug text-stone-400">{def.desc}</div>
                      <div className="mt-1.5 text-[10px] text-stone-500">Перезарядка: {def.cd} сек</div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <CostRow cost={cost} res={snap.res} size="sm" />
                    {owned ? (
                      <span className="chip text-emerald-300">Изучено</span>
                    ) : (
                      <button className="btn px-4 py-1.5 text-xs" disabled={!afford} onClick={() => game.buySpell(kind)}>
                        Изучить
                      </button>
                    )}
                  </div>
                  {owned && <div className="shimmer pointer-events-none absolute inset-0" />}
                </div>
              );
            })}
          </div>

          <div className="panel-inset mt-4 p-4 text-[11.5px] leading-relaxed text-stone-400">
            <span className="font-semibold text-amber-200/90">Совет цикла. </span>
            Изученные заклинания применяются из панели внизу экрана и тратят ресурсы при каждом использовании.
            Держите самоцветы и золото про запас к нашествию элиты — оно наступает каждые 30 минут.
          </div>
        </div>
      </div>
    </Modal>
  );
}
