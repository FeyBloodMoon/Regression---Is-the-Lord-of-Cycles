// ── Общие UI-элементы: иконки, стоимость, модалки ───────────────────────────

import type { ReactNode } from 'react';
import {
  TreePine, Pickaxe, Coins, Gem, Droplet, Sparkles, Swords, Crosshair, Users, Hammer,
  Heart, HeartPulse, Wind, Package, Star, Crown, BrickWall, Flame, Shield, ShieldPlus,
  Ghost, Bug, Mountain, Skull, Leaf, CloudLightning, CloudRain, Biohazard, Hourglass,
  Castle, CircleDot, Zap, X,
} from 'lucide-react';
import type { Cost, ResType } from '../game/races';
import { RES_META } from '../game/races';

const ICONS: Record<string, typeof Swords> = {
  tree: TreePine, pick: Pickaxe, coins: Coins, gem: Gem, droplet: Droplet, sparkles: Sparkles,
  swords: Swords, crosshair: Crosshair, users: Users, hammer: Hammer, heart: Heart, regen: HeartPulse,
  wind: Wind, bag: Package, star: Star, crown: Crown, wall: BrickWall, flame: Flame, shield: Shield,
  shieldplus: ShieldPlus, ghost: Ghost, bug: Bug, mountain: Mountain, skull: Skull, leaf: Leaf,
  storm: CloudLightning, rain: CloudRain, biohazard: Biohazard, hourglass: Hourglass, castle: Castle,
  quake: Mountain, dome: CircleDot, granite: BrickWall, bloodshield: Droplet, bones: Skull,
  portal: Zap, x: X,
};

export function Ico({ k, size = 16, className = '', style }: { k: string; size?: number; className?: string; style?: React.CSSProperties }) {
  const C = ICONS[k] ?? Sparkles;
  return <C size={size} className={className} style={style} strokeWidth={2.1} />;
}

export function ResIco({ type, size = 15 }: { type: ResType; size?: number }) {
  return <Ico k={RES_META[type].icon} size={size} style={{ color: RES_META[type].color }} />;
}

export function CostRow({ cost, res, size = 'md' }: { cost: Cost; res?: Record<ResType, number>; size?: 'sm' | 'md' }) {
  const keys = Object.keys(cost) as ResType[];
  const cls = size === 'sm' ? 'text-[11px] gap-2' : 'text-xs gap-2.5';
  return (
    <div className={`flex flex-wrap items-center ${cls}`}>
      {keys.map((k) => {
        const lack = res !== undefined && res[k] < (cost[k] ?? 0);
        return (
          <span key={k} className={`inline-flex items-center gap-1 font-semibold ${lack ? 'text-red-400' : 'text-stone-300'}`}>
            <ResIco type={k} size={size === 'sm' ? 12 : 14} />
            {cost[k]}
          </span>
        );
      })}
    </div>
  );
}

export function Modal({ onClose, children, wide }: { onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(3,4,8,0.72)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className={`panel relative max-h-[88vh] overflow-hidden flex flex-col anim-fade-up ${wide ? 'w-[min(1080px,94vw)]' : 'w-[min(760px,94vw)]'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-md border border-white/10 bg-black/40 p-1.5 text-stone-400 hover:text-stone-100 hover:border-amber-200/40 transition"
        >
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ icon, title, sub, right }: { icon: string; title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="flex items-start gap-3 border-b border-amber-200/10 px-5 py-4 pr-12">
      <div className="mt-0.5 rounded-lg border border-amber-200/25 bg-amber-100/5 p-2 text-amber-200">
        <Ico k={icon} size={20} />
      </div>
      <div className="flex-1">
        <div className="font-display text-xl font-bold tracking-wide text-amber-100">{title}</div>
        {sub && <div className="text-xs text-stone-400">{sub}</div>}
      </div>
      {right}
    </div>
  );
}

export function fmtTime(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function Bar({ value, max, color, height = 8, glow }: { value: number; max: number; color: string; height?: number; glow?: boolean }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className="w-full overflow-hidden rounded-full border border-white/10 bg-black/50" style={{ height }}>
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${pct}%`, background: color, boxShadow: glow ? `0 0 10px ${color}` : undefined }}
      />
    </div>
  );
}
