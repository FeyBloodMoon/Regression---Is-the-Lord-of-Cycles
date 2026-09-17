// ── Древо умений расы (покупка за капли крови бога) ─────────────────────────

import { Game } from '../game/engine';
import type { Snap } from '../game/engine';
import { raceTreeFor, treeTierOk } from '../game/races';
import type { RaceDef } from '../game/races';
import { Modal, ModalHeader, Ico } from './ui';
import { Droplet, Lock } from 'lucide-react';

const TIER_NAMES: Record<number, string> = {
  1: 'Пробуждение',
  2: 'Закалка',
  3: 'Наследие расы',
  4: 'Вознесение',
};

export default function RaceTreeModal({
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
  const nodes = raceTreeFor(race.id);
  const tiers = [1, 2, 3, 4];

  return (
    <Modal onClose={onClose} wide>
      <ModalHeader
        icon="droplet"
        title={`Древо народа: ${race.name}`}
        sub="Умения покупаются за капли крови бога и действуют до конца цикла"
        right={
          <span className="chip border-rose-400/30 text-rose-300">
            <Droplet size={12} />
            {snap.blood}
          </span>
        }
      />
      <div className="scroll-thin overflow-y-auto p-5">
        <div className="space-y-5">
          {tiers.map((tier) => {
            const list = nodes.filter((n) => n.tier === tier);
            if (!list.length) return null;
            return (
              <div key={tier}>
                <div className="mb-2 flex items-center gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-stone-500">
                    Ранг {tier} · {TIER_NAMES[tier]}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-amber-200/25 to-transparent" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((n) => {
                    const owned = !!snap.tree[n.id];
                    const ok = treeTierOk(snap.tree, n);
                    const afford = snap.blood >= n.cost;
                    const isUlt = n.tier >= 3;
                    return (
                      <div
                        key={n.id}
                        className="panel-inset relative overflow-hidden p-4 transition"
                        style={
                          owned
                            ? { borderColor: `${race.color}66`, background: `${race.color}10`, boxShadow: `0 0 20px ${race.color}22` }
                            : undefined
                        }
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div
                            className="rounded-lg border p-2"
                            style={{
                              borderColor: owned ? race.color : 'rgba(255,255,255,0.12)',
                              color: owned ? race.color : isUlt ? '#d8b45a' : '#a8a29e',
                              background: 'rgba(0,0,0,0.3)',
                            }}
                          >
                            <Ico k={n.icon} size={19} />
                          </div>
                          {owned ? (
                            <span className="chip text-emerald-300">Изучено</span>
                          ) : !ok ? (
                            <span className="chip text-stone-500">
                              <Lock size={10} /> Закрыто
                            </span>
                          ) : (
                            <button
                              className="btn px-3 py-1 text-[11px]"
                              disabled={!afford}
                              onClick={() => game.buyTreeNode(n.id)}
                            >
                              <Droplet size={11} className="text-rose-400" />
                              {n.cost}
                            </button>
                          )}
                        </div>
                        <div className="mt-2 font-display text-base font-bold text-stone-100">{n.name}</div>
                        <div className="mt-0.5 text-[11px] leading-snug text-stone-400">{n.desc}</div>
                        {!ok && !owned && (
                          <div className="mt-1.5 text-[10px] text-stone-500">
                            {n.tier === 2 && 'Требуется любое умение I ранга'}
                            {n.tier === 3 && 'Требуются 2 умения II ранга'}
                            {n.tier === 4 && 'Требуется наследие расы'}
                          </div>
                        )}
                        {owned && <div className="shimmer pointer-events-none absolute inset-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
