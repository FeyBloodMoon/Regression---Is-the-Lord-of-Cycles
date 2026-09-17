// ── Канвас мира: отрисовка карты, отрядов, монстров, эффектов ───────────────

import { useEffect, useRef, useState } from 'react';
import { Game, WORLD, CITY_R, PATH_GRID } from '../game/engine';
import { ZONE_META } from '../game/terrain';
import type { Snap } from '../game/engine';
import { RES_META } from '../game/races';
import { SQUAD_TYPES, MOB_ARCHS } from '../game/units';
import NodePopup from './NodePopup';

interface View {
  w: number;
  h: number;
  s: number;
  ox: number;
  oy: number;
}

function computeView(w: number, h: number): View {
  const s = Math.min(w / WORLD.w, h / WORLD.h) * 0.985;
  return { w, h, s, ox: (w - WORLD.w * s) / 2, oy: (h - WORLD.h * s) / 2 };
}

export default function MapCanvas({
  game,
  snap,
  onOpenCity,
}: {
  game: Game;
  snap: Snap | null;
  onOpenCity: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>(() => computeView(1280, 800));
  const [selNode, setSelNode] = useState<string | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;
  const hoverRef = useRef<{ kind: 'node' | 'city'; id?: string } | null>(null);

  // resize
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setView(computeView(r.width, r.height));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // отрисовка
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    let raf = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const v = viewRef.current;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (cv.width !== Math.round(v.w * dpr) || cv.height !== Math.round(v.h * dpr)) {
        cv.width = Math.round(v.w * dpr);
        cv.height = Math.round(v.h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, v.w, v.h);

      // фон за пределами мира
      ctx.fillStyle = '#04060a';
      ctx.fillRect(0, 0, v.w, v.h);

      const shake = game.shakeT > 0 ? game.shakeT * 9 : 0;
      const shx = shake ? (Math.random() - 0.5) * shake : 0;
      const shy = shake ? (Math.random() - 0.5) * shake : 0;

      ctx.save();
      ctx.translate(v.ox + shx, v.oy + shy);
      ctx.scale(v.s, v.s);

      drawWorld(ctx, game);

      // следы
      for (const s of game.squads) {
        ctx.strokeStyle = `${game.race.color}2e`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(s.px, s.py);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
      }
      for (const m of game.monsters) {
        ctx.strokeStyle = 'rgba(255,60,90,0.14)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(m.px, m.py);
        ctx.lineTo(m.x, m.y);
        ctx.stroke();
      }

      drawCity(ctx, game);
      for (const n of game.nodes) drawNode(ctx, n, hoverRef.current?.kind === 'node' && hoverRef.current.id === n.id);
      for (const v of game.villages) drawVillage(ctx, v);
      for (const c of game.caravans) drawCaravan(ctx, c);
      for (const s of game.squads) drawSquad(ctx, game, s);
      for (const m of game.monsters) drawMonster(ctx, m);
      drawShots(ctx, game);
      drawFx(ctx, game);
      ctx.restore();

      // экранный слой: подписи и всплывающий текст
      ctx.save();
      for (const n of game.nodes) {
        if (n.assigned > 0 || (hoverRef.current?.kind === 'node' && hoverRef.current.id === n.id)) {
          const sx = n.x * v.s + v.ox;
          const sy = n.y * v.s + v.oy;
          const meta = RES_META[n.type];
          ctx.font = '600 12px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(0,0,0,0.55)';
          const label = `${meta.nodeName} · ${n.assigned}/${game.mods.nodeCap}`;
          const wText = ctx.measureText(label).width + 14;
          roundRect(ctx, sx - wText / 2, sy + 26, wText, 20, 6);
          ctx.fill();
          ctx.fillStyle = meta.color;
          ctx.fillText(label, sx, sy + 40);
        }
      }
      for (const m of game.monsters) {
        if (m.kind === 'boss' && m.name) {
          const sx = m.x * v.s + v.ox;
          const sy = m.y * v.s + v.oy;
          ctx.font = "700 13px 'Cormorant Garamond', serif";
          ctx.textAlign = 'center';
          ctx.fillStyle = '#ffb14d';
          ctx.fillText(m.name, sx, sy - 46);
        }
      }
      for (const f of game.floats) {
        const sx = f.x * v.s + v.ox;
        const sy = (f.y - (1.4 - f.ttl) * 42) * v.s + v.oy;
        ctx.globalAlpha = Math.min(1, f.ttl);
        ctx.font = `700 ${f.txt.includes('×2') ? 15 : 13}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = 3;
        ctx.strokeText(f.txt, sx, sy);
        ctx.fillStyle = f.color;
        ctx.fillText(f.txt, sx, sy);
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      // сохранить позиции для следов
      for (const s of game.squads) { s.px = s.x; s.py = s.y; }
      for (const m of game.monsters) { m.px = m.x; m.py = m.y; }
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [game]);

  // клики
  const toWorld = (e: { clientX: number; clientY: number }) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const v = viewRef.current;
    if (!rect) return { x: 0, y: 0 };
    return { x: (e.clientX - rect.left - v.ox) / v.s, y: (e.clientY - rect.top - v.oy) / v.s };
  };

  const hitTest = (wx: number, wy: number): { kind: 'node' | 'city'; id?: string } | null => {
    for (const n of game.nodes) {
      if (Math.hypot(n.x - wx, n.y - wy) < 52) return { kind: 'node', id: n.id };
    }
    if (Math.hypot(game.city.x - wx, game.city.y - wy) < CITY_R + 30) return { kind: 'city' };
    return null;
  };

  const sel = selNode ? game.nodes.find((n) => n.id === selNode) : undefined;
  const selSnap = selNode ? snap?.nodes.find((n) => n.id === selNode) : undefined;

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ cursor: hoverRef.current ? 'pointer' : 'default' }}
        onClick={(e) => {
          const w = toWorld(e);
          const hit = hitTest(w.x, w.y);
          if (hit?.kind === 'node' && hit.id) setSelNode(hit.id);
          else if (hit?.kind === 'city') onOpenCity();
          else setSelNode(null);
        }}
        onMouseMove={(e) => {
          const w = toWorld(e);
          hoverRef.current = hitTest(w.x, w.y);
        }}
        onMouseLeave={() => (hoverRef.current = null)}
      />

      {/* виньетка */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ boxShadow: 'inset 0 0 180px rgba(0,0,0,0.75)' }}
      />
      {snap && snap.cityHp / Math.max(1, snap.cityMax) < 0.3 && !snap.gameOver && (
        <div className="anim-danger pointer-events-none absolute inset-0" />
      )}

      {sel && selSnap && (
        <NodePopup
          type={sel.type}
          assigned={selSnap.assigned}
          cap={snap?.nodeCap ?? 5}
          freeSquads={snap?.freeSquads ?? 0}
          roster={snap!.roster}
          rich={sel.rich}
          x={sel.x * view.s + view.ox}
          y={sel.y * view.s + view.oy}
          village={snap!.villages.find((v) => v.nodeId === sel.id)}
          villageCost={snap!.villageCost}
          res={snap!.res}
          onAssign={(t) => game.assign(sel.id, t)}
          onUnassign={() => game.unassign(sel.id)}
          onBuildVillage={() => game.buildVillage(sel.id)}
          onUpgradeVillage={() => {
            const v = game.villages.find((vv) => vv.nodeId === sel.id);
            if (v) game.upgradeVillage(v.id);
          }}
          onClose={() => setSelNode(null)}
        />
      )}

      <div className="pointer-events-none absolute bottom-2 right-3 text-[10px] tracking-widest text-stone-600">
        клик по источнику — назначить отряды · клик по городу — управление
      </div>
    </div>
  );
}

// ── рисование ────────────────────────────────────────────────────────────────

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawWorld(ctx: CanvasRenderingContext2D, game: Game) {
  const t = performance.now() / 1000;

  // земля
  const g = ctx.createRadialGradient(game.city.x, game.city.y, 100, game.city.x, game.city.y, 1500);
  g.addColorStop(0, '#15231a');
  g.addColorStop(0.5, '#0e1a12');
  g.addColorStop(1, '#080d0a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);

  // граница мира
  ctx.strokeStyle = 'rgba(216,180,90,0.12)';
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, WORLD.w - 16, WORLD.h - 16);

  // пруды
  for (const p of game.deco.ponds) {
    const pg = ctx.createRadialGradient(p.x, p.y, 6, p.x, p.y, Math.max(p.rx, p.ry));
    pg.addColorStop(0, '#1b3d55');
    pg.addColorStop(1, '#0b1c2a');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,180,220,0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // утоптанные тропы
  const { cell, w: gw, h: gh } = PATH_GRID;
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      const wv = game.wear[gy * gw + gx] ?? 0;
      if (wv < 0.06) continue;
      ctx.fillStyle = `rgba(150,126,86,${Math.min(0.5, wv * 0.5)})`;
      ctx.beginPath();
      ctx.ellipse(gx * cell + cell / 2, gy * cell + cell / 2, cell * 0.62, cell * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // особая местность
  for (const z of game.zones) {
    const meta = ZONE_META[z.kind];
    ctx.save();
    ctx.beginPath();
    const steps = 22;
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const wobble = 0.82 + 0.28 * Math.abs(Math.sin(a * 3 + z.seed));
      const px = z.x + Math.cos(a) * z.r * wobble;
      const py = z.y + Math.sin(a) * z.r * wobble * 0.85;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    const zg = ctx.createRadialGradient(z.x, z.y, 4, z.x, z.y, z.r);
    zg.addColorStop(0, meta.color);
    zg.addColorStop(1, `${meta.color}cc`);
    ctx.fillStyle = zg;
    ctx.fill();
    ctx.strokeStyle = `${meta.edge}99`;
    ctx.lineWidth = 3;
    ctx.setLineDash(z.kind === 'rock' ? [] : [12, 8]);
    ctx.stroke();
    ctx.setLineDash([]);

    // фактура
    if (z.kind === 'rock') {
      ctx.fillStyle = '#414b59';
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + z.seed;
        const rr = z.r * 0.55 * ((i % 3) / 3 + 0.35);
        const px = z.x + Math.cos(a) * rr;
        const py = z.y + Math.sin(a) * rr * 0.8;
        ctx.beginPath();
        ctx.moveTo(px, py - 14);
        ctx.lineTo(px - 13, py + 10);
        ctx.lineTo(px + 13, py + 10);
        ctx.closePath();
        ctx.fill();
      }
    } else if (z.kind === 'swamp') {
      ctx.fillStyle = 'rgba(110,190,140,0.25)';
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + z.seed;
        const rr = z.r * (0.25 + ((i % 4) / 4) * 0.55);
        ctx.beginPath();
        ctx.ellipse(z.x + Math.cos(a) * rr, z.y + Math.sin(a) * rr * 0.8, 14, 8, a, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.strokeStyle = 'rgba(160,120,255,0.35)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const yy = z.y - z.r * 0.6 + (i / 4) * z.r * 1.2;
        ctx.beginPath();
        ctx.moveTo(z.x - z.r * 0.7, yy);
        ctx.lineTo(z.x + z.r * 0.7, yy + (i % 2 ? 10 : -10));
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // маршруты к занятым источникам
  ctx.setLineDash([10, 14]);
  ctx.lineDashOffset = -t * 40;
  for (const n of game.nodes) {
    if (n.assigned <= 0) continue;
    ctx.strokeStyle = `${RES_META[n.type].color}44`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(game.city.x, game.city.y);
    ctx.lineTo(n.x, n.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // деревья
  for (const tr of game.deco.trees) drawTree(ctx, tr.x, tr.y, tr.s);
  // камни
  for (const r of game.deco.rocks) {
    ctx.fillStyle = '#232a33';
    ctx.beginPath();
    ctx.ellipse(r.x, r.y, r.s, r.s * 0.72, r.x % 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2e3742';
    ctx.beginPath();
    ctx.ellipse(r.x - r.s * 0.2, r.y - r.s * 0.2, r.s * 0.55, r.s * 0.4, r.x % 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.fillStyle = '#14291c';
  ctx.fillRect(x - s * 0.1, y, s * 0.2, s * 0.5);
  ctx.fillStyle = '#1d3d28';
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.lineTo(x - s * 0.62, y + s * 0.25);
  ctx.lineTo(x + s * 0.62, y + s * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#255135';
  ctx.beginPath();
  ctx.moveTo(x, y - s * 1.05);
  ctx.lineTo(x - s * 0.4, y - s * 0.25);
  ctx.lineTo(x + s * 0.4, y - s * 0.25);
  ctx.closePath();
  ctx.fill();
}

function drawCity(ctx: CanvasRenderingContext2D, game: Game) {
  const { x, y } = game.city;
  const t = performance.now() / 1000;
  const color = game.race.color;

  // тень-основа
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(x, y + 14, CITY_R + 34, (CITY_R + 34) * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // платформа
  const pg = ctx.createRadialGradient(x, y, 8, x, y, CITY_R + 26);
  pg.addColorStop(0, '#2b2f38');
  pg.addColorStop(1, '#14171d');
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.ellipse(x, y, CITY_R + 26, (CITY_R + 26) * 0.92, 0, 0, Math.PI * 2);
  ctx.fill();

  // стены с зубцами
  ctx.strokeStyle = '#3d434f';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(x, y, CITY_R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#4a5160';
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ctx.save();
    ctx.translate(x + Math.cos(a) * CITY_R, y + Math.sin(a) * CITY_R);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillRect(-4, -6, 8, 7);
    ctx.restore();
  }

  // башни
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i / 4) * Math.PI * 2;
    const bx = x + Math.cos(a) * (CITY_R - 22);
    const by = y + Math.sin(a) * (CITY_R - 22);
    ctx.fillStyle = '#39404c';
    ctx.beginPath();
    ctx.arc(bx, by, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4d5563';
    ctx.beginPath();
    ctx.arc(bx - 2, by - 2, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // донжон
  ctx.fillStyle = '#454d5c';
  ctx.beginPath();
  ctx.moveTo(x - 16, y + 14);
  ctx.lineTo(x - 16, y - 12);
  ctx.lineTo(x, y - 24);
  ctx.lineTo(x + 16, y - 12);
  ctx.lineTo(x + 16, y + 14);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - 24);
  ctx.lineTo(x, y - 44);
  ctx.strokeStyle = '#d8d8d8';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.moveTo(x, y - 44);
  ctx.lineTo(x + 14, y - 39);
  ctx.lineTo(x, y - 34);
  ctx.closePath();
  ctx.fill();

  // свечение расы
  const pulse = 0.5 + Math.sin(t * 2) * 0.18;
  ctx.strokeStyle = `${color}${Math.round(pulse * 90).toString(16).padStart(2, '0')}`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, CITY_R + 14, 0, Math.PI * 2);
  ctx.stroke();

  // щит
  if (game.city.shieldT > 0) {
    ctx.fillStyle = 'rgba(124,196,255,0.13)';
    ctx.beginPath();
    ctx.arc(x, y, CITY_R + 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(124,196,255,0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, CITY_R + 40, 0, Math.PI * 2);
    ctx.stroke();
  }

  // дуга прочности
  const frac = Math.max(0, game.city.hp / game.city.maxHp);
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(x, y, CITY_R + 32, -Math.PI / 2, Math.PI * 1.5);
  ctx.stroke();
  ctx.strokeStyle = frac > 0.5 ? '#59c46d' : frac > 0.25 ? '#e0a94f' : '#ff4d6d';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(x, y, CITY_R + 32, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
  ctx.stroke();
}

function drawNode(ctx: CanvasRenderingContext2D, n: Game['nodes'][number], hover: boolean) {
  const t = performance.now() / 1000;
  const meta = RES_META[n.type];

  // платформа
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(n.x, n.y + 8, 40, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#181d24';
  ctx.strokeStyle = `${meta.color}66`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(n.x, n.y, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // иконка
  if (n.type === 'wood') {
    drawTree(ctx, n.x - 10, n.y + 6, 12);
    drawTree(ctx, n.x + 8, n.y + 8, 15);
    drawTree(ctx, n.x + 1, n.y + 2, 18);
  } else if (n.type === 'metal') {
    ctx.fillStyle = '#7d8ca1';
    ctx.beginPath();
    ctx.moveTo(n.x - 14, n.y + 12);
    ctx.lineTo(n.x - 4, n.y - 14);
    ctx.lineTo(n.x + 8, n.y - 4);
    ctx.lineTo(n.x + 14, n.y + 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#aeb9c9';
    ctx.beginPath();
    ctx.moveTo(n.x - 4, n.y + 12);
    ctx.lineTo(n.x + 6, n.y - 16);
    ctx.lineTo(n.x + 16, n.y + 12);
    ctx.closePath();
    ctx.fill();
  } else if (n.type === 'gold') {
    ctx.fillStyle = '#8a6a2a';
    ctx.beginPath();
    ctx.moveTo(n.x - 14, n.y + 12);
    ctx.lineTo(n.x, n.y - 15);
    ctx.lineTo(n.x + 14, n.y + 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e8c45a';
    for (const [dx, dy] of [[-5, 4], [4, 0], [1, 7], [-2, -6]] as const) {
      ctx.beginPath();
      ctx.arc(n.x + dx, n.y + dy, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = '#c77dff';
    for (const [dx, dy, s] of [[-8, 6, 7], [7, 7, 6], [0, -2, 10]] as const) {
      ctx.save();
      ctx.translate(n.x + dx, n.y + dy);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-s / 2, -s / 2 - s * 0.5, s, s * 1.6);
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.arc(n.x - 3, n.y - 6, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // кольца активности
  if (n.assigned > 0) {
    const p = (t * 0.8) % 1;
    ctx.strokeStyle = `${meta.color}${Math.round((1 - p) * 160).toString(16).padStart(2, '0')}`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(n.x, n.y, 32 + p * 22, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (hover) {
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(n.x, n.y, 36 + Math.sin(t * 5) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawSquad(ctx: CanvasRenderingContext2D, game: Game, s: Game['squads'][number]) {
  const def = SQUAD_TYPES[s.type];
  const color = def.color;
  const dx = s.x - s.px;
  const dy = s.y - s.py;
  const ang = Math.atan2(dy, dx);

  ctx.globalAlpha = s.temp ? 0.75 : 1;

  // направление
  if (dx * dx + dy * dy > 0.02) {
    ctx.fillStyle = color;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(7, -4);
    ctx.lineTo(7, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // тело — своя форма у каждого рода войск
  ctx.fillStyle = '#0d1118';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  if (s.type === 'guardian') {
    // шестиугольник-щит
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const px = s.x + Math.cos(a) * 10;
      const py = s.y + Math.sin(a) * 10;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else if (s.type === 'ranger') {
    // ромб
    ctx.moveTo(s.x, s.y - 10);
    ctx.lineTo(s.x + 8, s.y);
    ctx.lineTo(s.x, s.y + 10);
    ctx.lineTo(s.x - 8, s.y);
    ctx.closePath();
  } else if (s.type === 'worker') {
    // квадрат
    ctx.rect(s.x - 7.5, s.y - 7.5, 15, 15);
  } else if (s.type === 'scout') {
    // треугольник
    ctx.moveTo(s.x, s.y - 10);
    ctx.lineTo(s.x + 9, s.y + 7);
    ctx.lineTo(s.x - 9, s.y + 7);
    ctx.closePath();
  } else {
    ctx.arc(s.x, s.y, 8.5, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(s.x, s.y, 3, 0, Math.PI * 2);
  ctx.fill();

  // кольцо принадлежности к расе
  ctx.strokeStyle = `${game.race.color}55`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(s.x, s.y, 12.5, 0, Math.PI * 2);
  ctx.stroke();

  if (s.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${s.flash * 6})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  // груз
  if (s.carry) {
    ctx.fillStyle = RES_META[s.carry.type].color;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1.4;
    ctx.save();
    ctx.translate(s.x + 8, s.y - 9);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-3.4, -3.4, 6.8, 6.8);
    ctx.strokeRect(-3.4, -3.4, 6.8, 6.8);
    ctx.restore();
  }

  ctx.globalAlpha = 1;

  // хп-бар
  if (s.hp < s.maxHp) {
    const w = 22;
    const f = Math.max(0, s.hp / s.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(s.x - w / 2, s.y - 16, w, 3.4);
    ctx.fillStyle = f > 0.5 ? '#59c46d' : f > 0.25 ? '#e0a94f' : '#ff4d6d';
    ctx.fillRect(s.x - w / 2, s.y - 16, w * f, 3.4);
  }
}

function drawMonster(ctx: CanvasRenderingContext2D, m: Game['monsters'][number]) {
  const t = performance.now() / 1000;
  const boss = m.kind === 'boss';
  const elite = m.kind === 'elite';
  const arch = MOB_ARCHS[m.arch] ?? MOB_ARCHS.grunt;
  const sizeMul = m.arch === 'brute' ? 1.35 : m.arch === 'stalker' ? 0.85 : 1;
  const r = (boss ? 26 : elite ? 17 : 11) * sizeMul;
  const base = boss ? '#4d1a05' : elite ? '#2b1140' : arch.color;
  const edge = boss ? '#ff8c1a' : elite ? '#b46bff' : arch.edge;

  if (boss || elite) {
    const glow = 0.35 + Math.sin(t * 3 + m.off) * 0.15;
    ctx.fillStyle = boss ? `rgba(255,140,26,${glow * 0.35})` : `rgba(180,107,255,${glow * 0.35})`;
    ctx.beginPath();
    ctx.arc(m.x, m.y, r * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // шипы
  ctx.fillStyle = edge;
  const spikes = 8;
  for (let i = 0; i < spikes; i++) {
    const a = (i / spikes) * Math.PI * 2 + m.off + t * 0.4;
    ctx.save();
    ctx.translate(m.x + Math.cos(a) * r, m.y + Math.sin(a) * r);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(r * 0.55, 0);
    ctx.lineTo(0, -r * 0.2);
    ctx.lineTo(0, r * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // тело
  ctx.fillStyle = base;
  ctx.strokeStyle = edge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // глаза
  ctx.fillStyle = boss ? '#ffd27d' : '#ff8fa8';
  const er = r * 0.14;
  ctx.beginPath();
  ctx.arc(m.x - r * 0.3, m.y - r * 0.12, er, 0, Math.PI * 2);
  ctx.arc(m.x + r * 0.3, m.y - r * 0.12, er, 0, Math.PI * 2);
  ctx.fill();

  if (m.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${m.flash * 4.5})`;
    ctx.beginPath();
    ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // хп-бар
  const w = boss ? 52 : elite ? 34 : 22;
  const f = Math.max(0, m.hp / m.maxHp);
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(m.x - w / 2, m.y - r - 10, w, boss ? 5 : 3.6);
  ctx.fillStyle = boss ? '#ff8c1a' : elite ? '#b46bff' : '#ff4d6d';
  ctx.fillRect(m.x - w / 2, m.y - r - 10, w * f, boss ? 5 : 3.6);

  if (m.slowT > 0) {
    ctx.strokeStyle = 'rgba(120,200,255,0.6)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(m.x, m.y, r + 5, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawVillage(ctx: CanvasRenderingContext2D, v: Game['villages'][number]) {
  const t = performance.now() / 1000;
  const meta = RES_META[v.type];

  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.beginPath();
  ctx.ellipse(v.x, v.y + 10, 46, 27, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1d222b';
  ctx.strokeStyle = '#d8b45a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(v.x, v.y, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // домики
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const hx = v.x + Math.cos(a) * 17;
    const hy = v.y + Math.sin(a) * 15;
    ctx.fillStyle = '#4a4034';
    ctx.fillRect(hx - 7, hy - 4, 14, 11);
    ctx.fillStyle = meta.color;
    ctx.beginPath();
    ctx.moveTo(hx - 9, hy - 4);
    ctx.lineTo(hx, hy - 12);
    ctx.lineTo(hx + 9, hy - 4);
    ctx.closePath();
    ctx.fill();
  }

  // уровень
  ctx.fillStyle = '#f3d98b';
  for (let i = 0; i < v.level; i++) {
    ctx.beginPath();
    ctx.arc(v.x - (v.level - 1) * 4 + i * 8, v.y + 26, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // пульс отправки обоза
  const pulse = (t * 0.6) % 1;
  ctx.strokeStyle = `${meta.color}${Math.round((1 - pulse) * 120).toString(16).padStart(2, '0')}`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(v.x, v.y, 36 + pulse * 20, 0, Math.PI * 2);
  ctx.stroke();

  if (v.flash > 0) {
    ctx.fillStyle = `rgba(255,80,110,${v.flash * 3})`;
    ctx.beginPath();
    ctx.arc(v.x, v.y, 36, 0, Math.PI * 2);
    ctx.fill();
  }

  const f = Math.max(0, v.hp / v.maxHp);
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(v.x - 26, v.y - 46, 52, 5);
  ctx.fillStyle = f > 0.5 ? '#59c46d' : f > 0.25 ? '#e0a94f' : '#ff4d6d';
  ctx.fillRect(v.x - 26, v.y - 46, 52 * f, 5);
}

function drawCaravan(ctx: CanvasRenderingContext2D, c: Game['caravans'][number]) {
  const meta = RES_META[c.type];
  const ang = Math.atan2(c.y - c.py, c.x - c.px);
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(ang);
  ctx.fillStyle = '#5a4a32';
  ctx.strokeStyle = meta.color;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(-9, -6, 18, 12, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = meta.color;
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  // колёса
  ctx.fillStyle = '#2b2620';
  ctx.beginPath();
  ctx.arc(-5, 7, 2.6, 0, Math.PI * 2);
  ctx.arc(5, 7, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawShots(ctx: CanvasRenderingContext2D, game: Game) {
  for (const s of game.shots) {
    const a = Math.max(0, Math.min(1, s.ttl / 0.16));
    ctx.globalAlpha = a;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.x2, s.y2, 3.2 * a + 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawFx(ctx: CanvasRenderingContext2D, game: Game) {
  for (const f of game.fxs) {
    const p = 1 - f.ttl / f.max;
    if (f.kind === 'ring') {
      const rr = f.r0 + (f.r1 - f.r0) * p;
      ctx.strokeStyle = f.color;
      ctx.globalAlpha = (1 - p) * 0.8;
      ctx.lineWidth = 3 + (1 - p) * 3;
      ctx.beginPath();
      ctx.arc(f.x, f.y, rr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      const n = 10;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + f.id;
        const rr = f.r0 + (f.r1 - f.r0) * p;
        ctx.fillStyle = f.color;
        ctx.globalAlpha = (1 - p) * 0.9;
        ctx.beginPath();
        ctx.arc(f.x + Math.cos(a) * rr, f.y + Math.sin(a) * rr, 3.2 * (1 - p) + 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
}
