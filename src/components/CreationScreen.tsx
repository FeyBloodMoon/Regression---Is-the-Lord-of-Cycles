// ── Экран создания повелителя и выбора расы ─────────────────────────────────

import { useState } from 'react';
import { Hourglass, Sparkles, Play, Plus, Minus } from 'lucide-react';
import { RACES, RACE_LIST } from '../game/races';
import type { RaceId } from '../game/races';
import type { GodState } from '../game/godtree';
import { Ico } from './ui';

export default function CreationScreen({
  god,
  lastCycle,
  onStart,
  onOpenGodTree,
  saveControls,
}: {
  god: GodState;
  lastCycle: { rev: number; cause: 'destroyed' | 'manual'; mins: number } | null;
  onStart: (cfg: { ruler: string; race: RaceId }) => void;
  onOpenGodTree: () => void;
  saveControls?: React.ReactNode;
}) {
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem('regress_ruler') || '';
    } catch {
      return '';
    }
  });
  const [race, setRace] = useState<RaceId | null>(null);
  const sel = race ? RACES[race] : null;

  return (
    <div className="relative h-full w-full overflow-y-auto scroll-thin">
      {/* фон */}
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/images/regress-bg.jpg)' }}
      />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-[#05070b]/70 via-[#05070b]/82 to-[#05070b]" />

      <div className="relative z-10 mx-auto flex min-h-full w-[min(1180px,94vw)] flex-col items-center py-10">
        {/* логотип */}
        <div className="anim-fade-up flex flex-col items-center text-center">
          <div className="anim-floaty mb-3 rounded-full border border-amber-200/30 bg-black/40 p-4 text-amber-200 shadow-[0_0_40px_rgba(216,180,90,0.25)]">
            <Hourglass size={34} />
          </div>
          <h1 className="font-display title-grad text-6xl font-bold tracking-[0.22em] md:text-7xl">РЕГРЕСС</h1>
          <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.5em] text-stone-400">
            Повелитель бесконечных циклов
          </div>
        </div>

        {/* статус цикла */}
        <div className="anim-fade-up mt-6 flex flex-wrap items-center justify-center gap-2" style={{ animationDelay: '0.1s' }}>
          <span className="chip text-amber-200/90">
            <Sparkles size={12} />
            Откровения: {god.rev}
          </span>
          <span className="chip text-stone-300">
            Прожито циклов: {god.runs}
          </span>
          {god.rebirths > 0 && (
            <span className="chip border-fuchsia-400/35 text-fuchsia-300" title="Рождения сверхновой">
              ✦ Сверхновых: {god.rebirths}
            </span>
          )}
          <span className="chip text-rose-300/90">
            Крови бога за все жизни: {god.bloodTotal}
          </span>
          <button onClick={onOpenGodTree} className="btn px-3 py-1 text-xs">
            <Ico k="sparkles" size={13} />
            Древо Бога
          </button>
          {saveControls}
        </div>

        {lastCycle && (
          <div className="anim-fade-up mt-4 panel px-5 py-3 text-center" style={{ animationDelay: '0.15s' }}>
            <div className="font-display text-lg font-bold text-amber-200">
              {lastCycle.cause === 'destroyed' ? 'Город пал. Часы перевернуты.' : 'Вы сами повернули время вспять.'}
            </div>
            <div className="text-xs text-stone-400">
              Цикл длился {Math.floor(lastCycle.mins)} мин · Получено откровений:{' '}
              <span className="font-bold text-amber-200">+{lastCycle.rev}</span> — вложите их в Древо Бога
            </div>
          </div>
        )}

        {/* имя */}
        <div className="anim-fade-up mt-8 w-[min(460px,92vw)]" style={{ animationDelay: '0.2s' }}>
          <label className="mb-2 block text-center text-[11px] font-semibold uppercase tracking-[0.35em] text-stone-400">
            Имя повелителя
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например, Эраст Вечный"
            maxLength={26}
            className="w-full rounded-xl border border-amber-200/25 bg-black/50 px-4 py-3 text-center font-display text-2xl font-semibold text-amber-100 outline-none placeholder:text-stone-600 focus:border-amber-200/70 focus:shadow-[0_0_25px_rgba(216,180,90,0.2)]"
          />
        </div>

        {/* раса */}
        <div className="anim-fade-up mt-8 w-full" style={{ animationDelay: '0.3s' }}>
          <div className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.35em] text-stone-400">
            Выберите народ, которым вы правите
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {RACE_LIST.map((id) => {
              const r = RACES[id];
              const active = race === id;
              return (
                <button
                  key={id}
                  onClick={() => setRace(id)}
                  className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 ${
                    active ? 'scale-[1.02]' : 'hover:scale-[1.01] hover:border-white/25'
                  }`}
                  style={{
                    borderColor: active ? r.color : 'rgba(255,255,255,0.09)',
                    background: active
                      ? `linear-gradient(160deg, ${r.color}26, rgba(8,10,15,0.92) 55%)`
                      : 'linear-gradient(160deg, rgba(18,21,29,0.85), rgba(8,10,15,0.92))',
                    boxShadow: active ? `0 0 34px ${r.color}44` : '0 10px 30px rgba(0,0,0,0.4)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="rounded-xl border p-2.5 transition"
                      style={{ borderColor: `${r.color}66`, color: r.color, background: `${r.color}14` }}
                    >
                      <Ico k={r.icon} size={22} />
                    </div>
                    <div>
                      <div className="font-display text-xl font-bold leading-tight" style={{ color: active ? r.color : '#ece7d8' }}>
                        {r.name}
                      </div>
                      <div className="text-[10px] uppercase tracking-widest text-stone-500">{r.title}</div>
                    </div>
                  </div>
                  <p className="mt-2.5 min-h-[34px] text-[11.5px] leading-snug text-stone-400">{r.desc}</p>
                  <div className="mt-2 space-y-1">
                    {r.pros.map((p) => (
                      <div key={p} className="flex items-start gap-1.5 text-[11px] text-emerald-300/90">
                        <Plus size={11} className="mt-0.5 shrink-0" />
                        {p}
                      </div>
                    ))}
                    {r.cons.map((c) => (
                      <div key={c} className="flex items-start gap-1.5 text-[11px] text-rose-300/90">
                        <Minus size={11} className="mt-0.5 shrink-0" />
                        {c}
                      </div>
                    ))}
                  </div>
                  {active && <div className="shimmer pointer-events-none absolute inset-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* старт */}
        <div className="anim-fade-up mt-8 pb-6" style={{ animationDelay: '0.4s' }}>
          <button
            disabled={!race || !name.trim()}
            onClick={() => {
              try {
                localStorage.setItem('regress_ruler', name.trim());
              } catch {
                /* ignore */
              }
              onStart({ ruler: name.trim(), race: race! });
            }}
            className="btn px-10 py-4 text-base disabled:opacity-40"
            style={sel ? { borderColor: sel.color, boxShadow: `0 0 30px ${sel.color}33` } : undefined}
          >
            <Play size={18} />
            {sel ? `Начать цикл во главе: ${sel.name}` : 'Начать цикл'}
          </button>
          <div className="mt-3 text-center text-[11px] text-stone-500">
            Управляйте добычей, отражайте монстров, копите кровь бога — и в нужный момент переверните часы
            <br />
            Есть файл .rgs? Нажмите «Загрузить файл» вверху, чтобы продолжить прежний цикл
          </div>
        </div>
      </div>
    </div>
  );
}
