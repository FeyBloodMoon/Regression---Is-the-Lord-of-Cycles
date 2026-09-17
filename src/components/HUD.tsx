// ── HUD: верхняя панель, заклинания, баннеры, журнал ────────────────────────

import { useState } from 'react';
import { Hourglass, Info, Pause, Play, Droplet, Sparkles, Timer, Skull, Swords, Lock } from 'lucide-react';
import type { Game, Snap } from '../game/engine';
import { SQUAD_TYPES, SQUAD_ORDER } from '../game/units';
import type { RaceDef, ResType } from '../game/races';
import { Ico, ResIco, fmtTime, Bar, Modal, ModalHeader, CostRow } from './ui';

const RES_ORDER: ResType[] = ['wood', 'metal', 'gold', 'gems'];
const SPEEDS = [1, 2, 4, 8];

export default function HUD({
  game,
  snap,
  race,
  ruler,
  rev,
  onOpenModal,
  saveControls,
}: {
  game: Game;
  snap: Snap;
  race: RaceDef;
  ruler: string;
  rev: number;
  onOpenModal: (m: 'city' | 'race' | 'god' | 'help') => void;
  saveControls?: React.ReactNode;
}) {
  const [confirmPrestige, setConfirmPrestige] = useState(false);
  const cityFrac = snap.cityHp / Math.max(1, snap.cityMax);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col">
      {/* ── верхняя панель ── */}
      <div className="pointer-events-auto m-2 space-y-1.5">
        <div className="panel flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2">
          {/* город */}
          <button onClick={() => onOpenModal('city')} className="flex items-center gap-2.5 rounded-lg px-1 py-0.5 transition hover:bg-white/5">
            <div className="rounded-lg border p-1.5" style={{ borderColor: `${race.color}55`, color: race.color, background: `${race.color}14` }}>
              <Ico k={race.icon} size={17} />
            </div>
            <div className="w-[150px] text-left">
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-sm font-bold leading-none text-stone-100">{ruler}</span>
                <span className="text-[10px] text-stone-500">{race.name}</span>
              </div>
              <div className="mt-1 flex items-center gap-1">
                <Bar
                  value={snap.cityHp}
                  max={snap.cityMax}
                  height={6}
                  color={cityFrac > 0.5 ? '#59c46d' : cityFrac > 0.25 ? '#e0a94f' : '#ff4d6d'}
                  glow={cityFrac <= 0.25}
                />
              </div>
            </div>
          </button>

          {(snap.shieldT > 0 || snap.barrierT > 0 || snap.vampT > 0) && (
            <div className="flex gap-1">
              {snap.shieldT > 0 && <span className="chip text-sky-300"><Ico k="shield" size={11} /> {Math.ceil(snap.shieldT)}с</span>}
              {snap.barrierT > 0 && <span className="chip text-stone-300"><Ico k="wall" size={11} /> {Math.ceil(snap.barrierT)}с</span>}
              {snap.vampT > 0 && <span className="chip text-rose-300"><Droplet size={11} /> {Math.ceil(snap.vampT)}с</span>}
            </div>
          )}

          <div className="h-8 w-px bg-white/10" />

          {/* ресурсы */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {RES_ORDER.map((k) => (
              <span key={k} className="flex items-center gap-1 text-[13px] font-semibold text-stone-100" title={k}>
                <ResIco type={k} />
                {Math.floor(snap.res[k])}
              </span>
            ))}
            <span className="flex items-center gap-1 text-[13px] font-semibold text-rose-300" title="Капли крови бога">
              <Droplet size={14} />
              {snap.blood}
            </span>
            <span className="flex items-center gap-1 text-[13px] font-semibold text-sky-300" title="Божественные откровения">
              <Sparkles size={14} />
              {rev}
            </span>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            {/* время */}
            <span className="chip text-stone-200">
              <Timer size={12} />
              {fmtTime(snap.t)}
            </span>
            <span className="chip text-rose-300" title="Волна монстров · их число · до усиления (1–5 мин)">
              <Skull size={12} />
              Волна {snap.level} · {snap.monsterCount}
              <span className="text-stone-400">↑{fmtTime(snap.levelIn)}</span>
              {snap.bossAlive && <span className="ml-1 animate-pulse font-bold text-amber-300">БОСС</span>}
            </span>
            {snap.rebirths > 0 && (
              <span className="chip text-fuchsia-300" title="Совершено Рождений сверхновой">
                <Sparkles size={12} />
                ✦{snap.rebirths}
              </span>
            )}
            <span className="chip text-violet-300" title="До нашествия элиты и босса">
              <Hourglass size={12} />
              {fmtTime(snap.eliteIn)}
            </span>

            {/* скорость */}
            <div className="flex overflow-hidden rounded-lg border border-white/10">
              <button
                className={`px-2 py-1 transition ${snap.speed === 0 ? 'bg-amber-200/20 text-amber-200' : 'bg-black/40 text-stone-400 hover:text-stone-100'}`}
                onClick={() => game.setSpeed(snap.speed === 0 ? 1 : 0)}
                title="Пауза"
              >
                {snap.speed === 0 ? <Play size={13} /> : <Pause size={13} />}
              </button>
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  className={`px-2 py-1 text-[11px] font-bold transition ${snap.speed === s ? 'bg-amber-200/20 text-amber-200' : 'bg-black/40 text-stone-400 hover:text-stone-100'}`}
                  onClick={() => game.setSpeed(s)}
                >
                  {s}×
                </button>
              ))}
            </div>

            {/* действия */}
            <button className="btn px-2.5 py-1.5 text-[11px]" onClick={() => onOpenModal('race')}>
              <Droplet size={13} className="text-rose-400" />
              Древо расы
            </button>
            <button className="btn px-2.5 py-1.5 text-[11px]" onClick={() => onOpenModal('god')}>
              <Sparkles size={13} className="text-sky-300" />
              Древо Бога
            </button>
            <button className="btn px-2 py-1.5" onClick={() => onOpenModal('help')} title="Как играть">
              <Info size={14} />
            </button>
            {saveControls}
            <button
              className="btn btn-danger anim-pulse-glow px-2.5 py-1.5 text-[11px]"
              onClick={() => setConfirmPrestige(true)}
              title="Перевернуть песочные часы — завершить цикл"
            >
              <Hourglass size={13} />
              Регресс
            </button>
          </div>
        </div>
      </div>

      {/* ── состав войска ── */}
      <div className="pointer-events-auto mx-2 -mt-1 flex flex-wrap items-center gap-1.5">
        {SQUAD_ORDER.map((t) => {
          const d = SQUAD_TYPES[t];
          const r = snap.roster[t];
          if (!r || r.total === 0) return null;
          return (
            <span
              key={t}
              className="chip"
              title={`${d.name}: всего ${r.total}, свободно ${r.free}`}
              style={{ color: d.color, borderColor: `${d.color}44`, background: `${d.color}12` }}
            >
              <Ico k={d.icon} size={11} />
              {d.short}: {r.total}
              <span className="text-stone-400">({r.free} своб.)</span>
            </span>
          );
        })}
      </div>

      {/* ── баннеры ── */}
      <div className="pointer-events-none absolute left-1/2 top-20 flex -translate-x-1/2 flex-col items-center gap-2">
        {snap.banners.map((b) => (
          <div
            key={b.id}
            className="anim-banner panel px-6 py-2.5 text-center"
            style={{
              borderColor:
                b.kind === 'danger' ? 'rgba(255,77,109,0.5)' : b.kind === 'gold' ? 'rgba(216,180,90,0.5)' : 'rgba(142,205,243,0.4)',
              boxShadow:
                b.kind === 'danger'
                  ? '0 0 40px rgba(255,77,109,0.25)'
                  : b.kind === 'gold'
                    ? '0 0 40px rgba(216,180,90,0.25)'
                    : '0 0 30px rgba(142,205,243,0.2)',
            }}
          >
            <div
              className="font-display text-lg font-bold tracking-wider"
              style={{ color: b.kind === 'danger' ? '#ff8fa8' : b.kind === 'gold' ? '#f3d98b' : '#a8d8f5' }}
            >
              {b.text}
            </div>
            {b.sub && <div className="text-[11px] text-stone-300">{b.sub}</div>}
          </div>
        ))}
      </div>

      {/* ── низ: журнал + заклинания + счёт ── */}
      <div className="pointer-events-none mt-auto flex items-end justify-between gap-3 p-2">
        {/* журнал */}
        <div className="pointer-events-auto w-[290px] space-y-1">
          {snap.log.slice(-5).map((l, i, arr) => (
            <div
              key={l.id}
              className="panel-inset truncate px-2.5 py-1 text-[11px]"
              style={{
                opacity: 0.45 + (i / arr.length) * 0.55,
                color:
                  l.kind === 'danger' ? '#ff9eb0' : l.kind === 'gold' ? '#f3d98b' : l.kind === 'blood' ? '#ff6b8a' : '#c9c4b5',
              }}
            >
              {l.text}
            </div>
          ))}
        </div>

        {/* заклинания */}
        <div className="pointer-events-auto flex items-end gap-2.5">
          {(['attack', 'summon', 'defense'] as const).map((kind) => {
            const def = race.spells[kind];
            const owned = snap.spellOwned[kind];
            const cd = snap.spellCd[kind] ?? 0;
            const cost = snap.spellCost[kind] ?? {};
            const afford = RES_ORDER.every((k) => snap.res[k] >= (cost[k] ?? 0));
            const frac = cd > 0 ? cd / def.cd : 0;
            return (
              <div key={kind} className="flex flex-col items-center gap-1">
                <button
                  disabled={!owned || cd > 0 || !afford}
                  onClick={() => game.castSpell(kind)}
                  className="group relative flex h-[58px] w-[58px] items-center justify-center rounded-2xl border transition disabled:cursor-not-allowed"
                  style={{
                    borderColor: owned ? `${race.color}77` : 'rgba(255,255,255,0.12)',
                    background: owned
                      ? `linear-gradient(160deg, ${race.color}2a, rgba(8,10,15,0.9))`
                      : 'rgba(8,10,15,0.85)',
                    boxShadow: owned && cd <= 0 && afford ? `0 0 22px ${race.color}44` : undefined,
                    opacity: owned ? (cd > 0 || !afford ? 0.55 : 1) : 0.7,
                  }}
                  title={owned ? `${def.name}: ${def.desc}` : 'Изучите в меню города'}
                >
                  <span style={{ color: owned ? race.color : '#6b7280' }}>
                    {owned ? <Ico k={def.icon} size={24} /> : <Lock size={20} />}
                  </span>
                  {cd > 0 && (
                    <span
                      className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/70 text-sm font-bold text-amber-100"
                      style={{
                        background: `conic-gradient(rgba(0,0,0,0.78) ${frac * 360}deg, rgba(0,0,0,0.25) 0deg)`,
                      }}
                    >
                      {Math.ceil(cd)}
                    </span>
                  )}
                </button>
                <div className="panel-inset px-2 py-0.5">
                  <CostRow cost={cost} res={snap.res} size="sm" />
                </div>
              </div>
            );
          })}
        </div>

        {/* счёт убийств */}
        <div className="pointer-events-auto panel hidden items-center gap-3 px-3 py-2 md:flex">
          <span className="flex items-center gap-1 text-[11px] text-stone-300" title="Обычные монстры уничтожены">
            <Skull size={12} className="text-rose-400/80" /> {snap.kills.normal}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-violet-300" title="Элита уничтожена">
            <Swords size={12} /> {snap.kills.elite}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-amber-300" title="Боссы повержены">
            <Ico k="crown" size={12} /> {snap.kills.boss}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-rose-300" title="Крови добыто за цикл">
            <Droplet size={12} /> {snap.bloodEarned}
          </span>
        </div>
      </div>

      {/* ── подтверждение регресса ── */}
      {confirmPrestige && (
        <Modal onClose={() => setConfirmPrestige(false)}>
          <ModalHeader icon="hourglass" title="Перевернуть песочные часы?" sub="Текущий цикл завершится. Всё, кроме Древа Бога, будет потеряно." />
          <div className="p-5">
            <div className="panel-inset p-4">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-stone-500">
                Вы получите Божественных откровений: <span className="text-sky-300">{snap.prestige.total}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12px] text-stone-400">
                <span>Повержено боссов</span>
                <span className="text-right text-amber-200">+{snap.prestige.parts.boss}</span>
                <span>Время цикла ({Math.floor(snap.t)} сек × 0.01)</span>
                <span className="text-right text-stone-200">+{snap.prestige.parts.time.toFixed(2)}</span>
                <span className="text-stone-500">Формула: боссы + секунды × 0.01</span>
                <span className="text-right font-bold text-sky-300">= {snap.prestige.total}</span>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn px-4 py-2 text-xs" onClick={() => setConfirmPrestige(false)}>
                Остаться в цикле
              </button>
              <button
                className="btn btn-danger px-4 py-2 text-xs"
                onClick={() => {
                  setConfirmPrestige(false);
                  game.requestPrestige();
                }}
              >
                <Hourglass size={13} />
                Перевернуть часы
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Справка ──────────────────────────────────────────────────────────────────

export function HelpModal({ onClose }: { onClose: () => void }) {
  const items: [string, string][] = [
    ['castle', 'Ваш город — центр мира. Кликните по нему, чтобы нанимать отряды, строить укрепления и изучать заклинания.'],
    ['users', 'Свободные отряды сами охотятся на монстров. Кликните по источнику и назначьте до 5 отрядов — они будут носить ресурсы в город.'],
    ['pick', 'Пять родов войск: Добытчики (ноша ×2), Ратники (универсалы), Стражи (×2.6 здоровья и броня), Лучники (бьют за 150 шагов), Разведчики (почти вдвое быстрее). Отправляйте на шахты добытчиков, а в дозор — бойцов.'],
    ['skull', 'Монстры: Твари, Ловчие (быстрые, охотятся на ваших добытчиков), Громилы (толстые и больно бьют) и Проклинатели (стреляют издалека). Каждые 5 минут их сила растёт лавинообразно, а число волн увеличивается.'],
    ['crown', 'Каждые 30 минут приходят 3 элитных отряда (×3 силы) и босс (×5), который ещё и призывает свиту. Готовьте заклинания и стены заранее.'],
    ['bag', 'Сохранение: кнопки «Сохранить»/«Загрузить» выгружают зашифрованный файл .rgs со всем прогрессом — Древом Бога и текущим циклом. Файл можно загрузить в любой момент.'],
    ['droplet', 'Капли крови бога дают только сильные враги: элитный отряд — 1 капля, босс — 3. Обычные монстры крови не дают. Тратьте капли в Древе расы.'],
    ['castle', 'Соберите 5 отрядов на одном источнике — и его можно перестроить в деревню. Пять отрядов уйдут на её основание, зато обоз будет сам идти в город каждые 5 сек. Деревню можно улучшать, но монстры могут её сжечь.'],
    ['wall', 'Местность не везде проходима: Скальный кряж непроходим ни для кого, Расселину перепрыгнут только Разведчики, а Топь держит лишь Разведчиков и Лучников (монстры проходят её свободно).'],
    ['wind', 'Хоженые маршруты превращаются в тропы: чем чаще по ним ходят, тем быстрее движение (до +28%). Все юниты стараются идти по натоптанным тропам.'],
    ['hourglass', 'Кнопка «Регресс» (или гибель города) переворачивает часы. Откровения = повержённые боссы + секунды цикла × 0.01. Они и Древо Бога сохраняются навсегда.'],
    ['star', 'Рождение сверхновой (в Древе Бога) сжигает все откровения и ветви, но навсегда усиливает всё: войска, добычу, прочность, цены. Первое стоит 10 откровений, дальше — экспоненциально дороже.'],
    ['sparkles', 'Вкладывайте откровения в Древо Бога: стартовые отряды и ресурсы, сила войск, замедление рока и даже второй шанс для города.'],
    ['storm', 'Заклинания трёх школ — атакующие, призывные, оборонительные. У каждой расы они свои. Изучаются за ресурсы в городе.'],
  ];
  return (
    <Modal onClose={onClose}>
      <ModalHeader icon="sparkles" title="Как править циклом" sub="Краткий свод законов мира Регресса" />
      <div className="scroll-thin space-y-3 overflow-y-auto p-5">
        {items.map(([icon, text]) => (
          <div key={icon} className="panel-inset flex items-start gap-3 p-3">
            <div className="mt-0.5 rounded-lg border border-amber-200/25 bg-amber-100/5 p-2 text-amber-200">
              <Ico k={icon} size={16} />
            </div>
            <div className="text-[12.5px] leading-relaxed text-stone-300">{text}</div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
