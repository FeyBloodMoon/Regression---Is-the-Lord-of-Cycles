// ── Древо Бога: мета-прогрессия за Божественные откровения ──────────────────

import { useState } from 'react';
import { GOD_NODES, supernovaCost, supernovaBonus } from '../game/godtree';
import type { GodState } from '../game/godtree';
import { Modal, ModalHeader, Ico } from './ui';
import { Sparkles, Star, TriangleAlert, RotateCcw } from 'lucide-react';

export default function GodTreeModal({
  god,
  onBuy,
  onRebirth,
  onRestart,
  onClose,
}: {
  god: GodState;
  onBuy: (id: string) => void;
  onRebirth: () => void;
  onRestart: () => void;
  onClose: () => void;
}) {
  const [confirm, setConfirm] = useState<'nova' | 'wipe' | null>(null);
  const cost = supernovaCost(god.rebirths);
  const bonus = supernovaBonus(god.rebirths);
  const next = supernovaBonus(god.rebirths + 1);
  const canNova = god.rev >= cost;

  return (
    <Modal onClose={onClose} wide>
      <ModalHeader
        icon="sparkles"
        title="Древо Бога"
        sub="Единственное, что переживает переворот часов. Откровения даются за каждый завершённый цикл."
        right={
          <span className="chip border-sky-300/30 text-sky-300">
            <Sparkles size={12} />
            {god.rev}
          </span>
        }
      />
      <div className="scroll-thin overflow-y-auto p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {GOD_NODES.map((n) => {
            const lvl = god.nodes[n.id] ?? 0;
            const maxed = lvl >= n.max;
            const cost = maxed ? 0 : n.cost(lvl);
            const afford = god.rev >= cost;
            return (
              <div
                key={n.id}
                className="panel-inset relative overflow-hidden p-4"
                style={lvl > 0 ? { borderColor: 'rgba(142,205,243,0.35)', background: 'rgba(142,205,243,0.06)' } : undefined}
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className="rounded-lg border p-2"
                    style={{
                      borderColor: lvl > 0 ? 'rgba(142,205,243,0.5)' : 'rgba(255,255,255,0.12)',
                      color: lvl > 0 ? '#8ecdf3' : '#a8a29e',
                      background: 'rgba(0,0,0,0.3)',
                    }}
                  >
                    <Ico k={n.icon} size={19} />
                  </div>
                  {maxed ? (
                    <span className="chip text-sky-300">Макс.</span>
                  ) : (
                    <button className="btn px-3 py-1 text-[11px]" disabled={!afford} onClick={() => onBuy(n.id)}>
                      <Sparkles size={11} className="text-sky-300" />
                      {cost}
                    </button>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="font-display text-base font-bold text-stone-100">{n.name}</span>
                  <span className="flex gap-0.5">
                    {Array.from({ length: n.max }).map((_, i) => (
                      <span
                        key={i}
                        className="h-1.5 w-3 rounded-sm"
                        style={{ background: i < lvl ? '#8ecdf3' : 'rgba(255,255,255,0.1)' }}
                      />
                    ))}
                  </span>
                </div>
                <div className="mt-0.5 text-[11px] leading-snug text-stone-400">{n.desc}</div>
                {lvl > 0 && <div className="shimmer pointer-events-none absolute inset-0" />}
              </div>
            );
          })}
        </div>
        <div className="panel-inset mt-5 p-4 text-[11.5px] leading-relaxed text-stone-400">
          <span className="font-semibold text-sky-300">Как получить откровения. </span>
          Переверните часы сами (кнопка с часами сверху) — или дайте городу пасть. Формула дара:{' '}
          <span className="text-amber-200">повержённые боссы + секунды цикла × 0.01</span>.
        </div>

        {/* ── Рождение сверхновой ── */}
        <div
          className="panel-inset relative mt-4 overflow-hidden p-4"
          style={{ borderColor: 'rgba(217,70,239,0.4)', background: 'linear-gradient(140deg, rgba(217,70,239,0.1), rgba(8,10,15,0.9))' }}
        >
          <div className="flex flex-wrap items-start gap-3">
            <div className="anim-spin-slow rounded-xl border border-fuchsia-400/45 bg-fuchsia-400/10 p-2.5 text-fuchsia-300">
              <Star size={22} />
            </div>
            <div className="min-w-[220px] flex-1">
              <div className="flex items-center gap-2">
                <span className="font-display text-xl font-bold text-fuchsia-200">Рождение сверхновой</span>
                <span className="chip border-fuchsia-400/35 text-fuchsia-300">✦ {god.rebirths}</span>
              </div>
              <div className="mt-1 text-[11.5px] leading-snug text-stone-400">
                Сжигает <b className="text-rose-300">все откровения и всё Древо Бога</b> — но навсегда усиливает каждый
                аспект вашей силы. Стоимость растёт экспоненциально.
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-5 gap-y-0.5 text-[11px] text-stone-400 sm:grid-cols-3">
                <span>Сила войск: <b className="text-fuchsia-200">×{bonus.power.toFixed(2)} → ×{next.power.toFixed(2)}</b></span>
                <span>Добыча: <b className="text-fuchsia-200">×{bonus.gather.toFixed(2)} → ×{next.gather.toFixed(2)}</b></span>
                <span>Прочность: <b className="text-fuchsia-200">×{bonus.cityHp.toFixed(2)} → ×{next.cityHp.toFixed(2)}</b></span>
                <span>Кровь: <b className="text-fuchsia-200">×{bonus.blood.toFixed(2)} → ×{next.blood.toFixed(2)}</b></span>
                <span>Цены: <b className="text-fuchsia-200">×{bonus.cost.toFixed(2)} → ×{next.cost.toFixed(2)}</b></span>
                <span>Отряды: <b className="text-fuchsia-200">+{bonus.squads} → +{next.squads}</b></span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-stone-500">Цена</div>
              <div className="font-display text-2xl font-bold text-fuchsia-200">{cost}</div>
              <button
                className="btn mt-1 px-4 py-1.5 text-xs"
                style={{ borderColor: 'rgba(217,70,239,0.5)' }}
                disabled={!canNova}
                onClick={() => setConfirm('nova')}
              >
                <Star size={13} /> Возродиться
              </button>
            </div>
          </div>
        </div>

        {/* ── Полный сброс ── */}
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-rose-500/25 bg-rose-500/5 px-4 py-3">
          <div className="text-[11.5px] leading-snug text-stone-400">
            <span className="font-semibold text-rose-300">Полный рестарт. </span>
            Стереть вообще всё: откровения, Древо Бога, рождения, имя повелителя и текущий цикл.
          </div>
          <button className="btn btn-danger shrink-0 px-3 py-1.5 text-xs" onClick={() => setConfirm('wipe')}>
            <RotateCcw size={13} /> Сбросить всё
          </button>
        </div>

        {/* ── подтверждение ── */}
        {confirm && (
          <div className="mt-4 rounded-xl border border-amber-200/30 bg-black/50 p-4">
            <div className="flex items-center gap-2 font-display text-lg font-bold text-amber-100">
              <TriangleAlert size={17} className="text-amber-300" />
              {confirm === 'nova' ? 'Сжечь откровения ради нового рождения?' : 'Стереть весь прогресс навсегда?'}
            </div>
            <div className="mt-1 text-[11.5px] text-stone-400">
              {confirm === 'nova'
                ? `Вы потеряете ${god.rev} откровений и все ветви Древа Бога. Взамен — постоянное усиление №${god.rebirths + 1}.`
                : 'Действие необратимо: игра вернётся к самому первому запуску.'}
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button className="btn px-4 py-1.5 text-xs" onClick={() => setConfirm(null)}>
                Отмена
              </button>
              <button
                className="btn btn-danger px-4 py-1.5 text-xs"
                onClick={() => {
                  if (confirm === 'nova') onRebirth();
                  else onRestart();
                  setConfirm(null);
                  onClose();
                }}
              >
                {confirm === 'nova' ? 'Возродиться' : 'Стереть всё'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
