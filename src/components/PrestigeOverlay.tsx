// ── Сцена регресса: переворот песочных часов ────────────────────────────────

import { useEffect } from 'react';
import type { PrestigeInfo } from '../game/engine';

export default function PrestigeOverlay({
  info,
  cause,
  onDone,
}: {
  info: PrestigeInfo;
  cause: 'destroyed' | 'manual';
  onDone: () => void;
}) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 4600);
    return () => window.clearTimeout(t);
  }, [onDone]);

  const particles = Array.from({ length: 26 });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#04050a]">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{ background: 'radial-gradient(ellipse at 50% 45%, rgba(120,80,220,0.25), transparent 60%)' }}
      />
      {/* частицы */}
      {particles.map((_, i) => (
        <span
          key={i}
          className="hg-particle absolute rounded-full"
          style={{
            left: `${42 + Math.random() * 16}%`,
            top: `${52 + Math.random() * 14}%`,
            width: 2 + Math.random() * 3,
            height: 2 + Math.random() * 3,
            background: i % 3 === 0 ? '#c9a7ff' : '#f3d98b',
            animationDelay: `${Math.random() * 2.2}s`,
            boxShadow: '0 0 8px rgba(243,217,139,0.8)',
          }}
        />
      ))}

      <div className="hg-wrap relative">
        <svg width="240" height="360" viewBox="0 0 200 300" className="hg-flip">
          <defs>
            <linearGradient id="hgsGold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f3d98b" />
              <stop offset="100%" stopColor="#b8863b" />
            </linearGradient>
            <clipPath id="topBulb">
              <path d="M40 34 C40 100 92 118 96 142 L104 142 C108 118 160 100 160 34 Z" />
            </clipPath>
            <clipPath id="botBulb">
              <path d="M96 158 L104 158 C108 182 160 200 160 266 L40 266 C40 200 92 182 96 158 Z" />
            </clipPath>
          </defs>

          {/* свечение */}
          <ellipse className="hg-glow" cx="100" cy="150" rx="92" ry="128" fill="rgba(150,100,255,0.10)" />

          {/* песок */}
          <g clipPath="url(#topBulb)">
            <rect className="hg-sand-top" x="30" y="34" width="140" height="110" fill="url(#hgsGold)" opacity="0.95" />
          </g>
          <g clipPath="url(#botBulb)">
            <rect className="hg-sand-bottom" x="30" y="186" width="140" height="80" fill="url(#hgsGold)" opacity="0.95" />
          </g>
          <line className="hg-stream" x1="100" y1="142" x2="100" y2="196" stroke="#f3d98b" strokeWidth="2.5" />

          {/* стекло */}
          <path d="M40 34 C40 100 92 118 96 142 L96 158 C92 182 40 200 40 266" fill="none" stroke="rgba(220,230,255,0.4)" strokeWidth="2" />
          <path d="M160 34 C160 100 108 118 104 142 L104 158 C108 182 160 200 160 266" fill="none" stroke="rgba(220,230,255,0.4)" strokeWidth="2" />

          {/* оправы */}
          <rect x="24" y="20" width="152" height="14" rx="7" fill="#3a2c12" stroke="#d8b45a" strokeWidth="1.5" />
          <rect x="24" y="266" width="152" height="14" rx="7" fill="#3a2c12" stroke="#d8b45a" strokeWidth="1.5" />
          <line x1="34" y1="34" x2="34" y2="266" stroke="#d8b45a" strokeWidth="3" opacity="0.7" />
          <line x1="166" y1="34" x2="166" y2="266" stroke="#d8b45a" strokeWidth="3" opacity="0.7" />
        </svg>
      </div>

      <div className="absolute bottom-[12%] left-0 right-0 text-center">
        <div className="hg-text font-display text-2xl font-semibold tracking-[0.25em] text-amber-100 md:text-3xl">
          {cause === 'destroyed' ? 'ГОРОД ПАЛ — ВРЕМЯ ПОВОРАЧИВАЕТСЯ ВСПЯТЬ' : 'ВЫ ПЕРЕВОРАЧИВАЕТЕ ЧАСЫ СУДЬБЫ'}
        </div>
        <div className="hg-text mt-3 text-sm text-stone-400" style={{ animationDelay: '0.35s' }}>
          Всё, чего вы достигли, рассыплется песком — но Божественные откровения останутся при вас: +{info.total}
        </div>
      </div>
    </div>
  );
}
