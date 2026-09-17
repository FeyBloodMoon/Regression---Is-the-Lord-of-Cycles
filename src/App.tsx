// ── РЕГРЕСС — Повелитель Циклов: корневой компонент ─────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { Game } from './game/engine';
import type { Snap, PrestigeInfo, RunSave } from './game/engine';
import { loadGod, saveGod, wipeAll, GOD_NODES, EMPTY_GOD, supernovaCost } from './game/godtree';
import type { GodState } from './game/godtree';
import type { RaceId } from './game/races';
import type { SaveFile } from './game/save';
import CreationScreen from './components/CreationScreen';
import PrestigeOverlay from './components/PrestigeOverlay';
import MapCanvas from './components/MapCanvas';
import HUD, { HelpModal } from './components/HUD';
import CityModal from './components/CityModal';
import RaceTreeModal from './components/RaceTreeModal';
import GodTreeModal from './components/GodTreeModal';
import SaveControls from './components/SaveControls';

type ModalKind = 'city' | 'race' | 'god' | 'help' | null;

export default function App() {
  const [god, setGod] = useState<GodState>(loadGod);
  const [screen, setScreen] = useState<'creation' | 'game'>('creation');
  const [game, setGame] = useState<Game | null>(null);
  const [snap, setSnap] = useState<Snap | null>(null);
  const [modal, setModal] = useState<ModalKind>(null);
  const [prestige, setPrestige] = useState<{ info: PrestigeInfo; cause: 'destroyed' | 'manual' } | null>(null);
  const [lastCycle, setLastCycle] = useState<{ rev: number; cause: 'destroyed' | 'manual'; mins: number } | null>(null);

  const godRef = useRef(god);
  godRef.current = god;
  const gameRef = useRef<Game | null>(null);
  gameRef.current = game;
  const prestigeRef = useRef(prestige);
  prestigeRef.current = prestige;

  const launch = (cfg: { ruler: string; race: RaceId; save?: RunSave; god?: GodState }) => {
    const g = new Game({
      ruler: cfg.ruler,
      race: cfg.race,
      god: cfg.god ?? godRef.current,
      cycle: (cfg.god ?? godRef.current).runs + 1,
      save: cfg.save,
    });
    g.onSnap = setSnap;
    setGame(g);
    setSnap(null);
    setModal(null);
    setPrestige(null);
    setScreen('game');
    g.emitNow();
  };

  // игровой цикл
  useEffect(() => {
    if (screen !== 'game' || !game) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      game.tick(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [screen, game]);

  // конец цикла
  useEffect(() => {
    if (snap?.gameOver && !prestige) {
      setPrestige({ info: snap.gameOver.info, cause: snap.gameOver.cause });
    }
  }, [snap, prestige]);

  const finishPrestige = useCallback(() => {
    const p = prestigeRef.current;
    if (p) {
      const ng: GodState = {
        rev: godRef.current.rev + p.info.total,
        nodes: { ...godRef.current.nodes },
        runs: godRef.current.runs + 1,
        bloodTotal: godRef.current.bloodTotal + p.info.blood,
        rebirths: godRef.current.rebirths,
      };
      saveGod(ng);
      setGod(ng);
      setLastCycle({ rev: p.info.total, cause: p.cause, mins: p.info.mins });
    }
    setPrestige(null);
    setGame(null);
    setSnap(null);
    setModal(null);
    setScreen('creation');
  }, []);

  const buyGodNode = (id: string) => {
    const prev = godRef.current;
    const def = GOD_NODES.find((n) => n.id === id);
    if (!def) return;
    const lvl = prev.nodes[id] ?? 0;
    if (lvl >= def.max) return;
    const cost = def.cost(lvl);
    if (prev.rev < cost) return;
    const ng: GodState = { ...prev, rev: prev.rev - cost, nodes: { ...prev.nodes, [id]: lvl + 1 } };
    saveGod(ng);
    setGod(ng);
    const g = gameRef.current;
    if (g) {
      g.god = ng;
      g.recalc();
      g.emitNow();
    }
  };

  const endRun = () => {
    setGame(null);
    setSnap(null);
    setModal(null);
    setPrestige(null);
    setScreen('creation');
  };

  /** Рождение сверхновой: сжигает откровения и Древо Бога ради вечного усиления. */
  const doRebirth = () => {
    const prev = godRef.current;
    const cost = supernovaCost(prev.rebirths);
    if (prev.rev < cost) return;
    const ng: GodState = { rev: 0, nodes: {}, runs: prev.runs, bloodTotal: prev.bloodTotal, rebirths: prev.rebirths + 1 };
    saveGod(ng);
    setGod(ng);
    godRef.current = ng;
    setLastCycle(null);
    endRun();
  };

  /** Полный рестарт игры. */
  const doRestart = () => {
    wipeAll();
    const ng = { ...EMPTY_GOD, nodes: {} };
    setGod(ng);
    godRef.current = ng;
    setLastCycle(null);
    endRun();
  };

  // ── сохранение / загрузка ──────────────────────────────────────────────────
  const buildSave = useCallback((): SaveFile => {
    const g = gameRef.current;
    return {
      v: 2,
      savedAt: Date.now(),
      ruler: g?.ruler ?? (localStorage.getItem('regress_ruler') || 'Повелитель'),
      race: g ? g.race.id : null,
      god: godRef.current,
      run: g && !g.gameOver ? g.serializeRun() : null,
    };
  }, []);

  const applySave = useCallback((data: SaveFile) => {
    const ng: GodState = {
      rev: data.god.rev ?? 0,
      nodes: data.god.nodes ?? {},
      runs: data.god.runs ?? 0,
      bloodTotal: data.god.bloodTotal ?? 0,
      rebirths: data.god.rebirths ?? 0,
    };
    saveGod(ng);
    setGod(ng);
    godRef.current = ng;
    try {
      if (data.ruler) localStorage.setItem('regress_ruler', data.ruler);
    } catch {
      /* ignore */
    }
    if (data.run && data.race) {
      launch({ ruler: data.ruler, race: data.race, save: data.run, god: ng });
    } else {
      setGame(null);
      setSnap(null);
      setScreen('creation');
    }
  }, []);

  return (
    <div className="relative h-full w-full select-none overflow-hidden">
      {screen === 'creation' && (
        <CreationScreen
          god={god}
          lastCycle={lastCycle}
          onStart={(cfg) => launch(cfg)}
          onOpenGodTree={() => setModal('god')}
          saveControls={<SaveControls build={buildSave} onLoad={applySave} />}
        />
      )}

      {screen === 'game' && game && (
        <>
          <MapCanvas game={game} snap={snap} onOpenCity={() => setModal('city')} />
          {snap && (
            <HUD
              game={game}
              snap={snap}
              race={game.race}
              ruler={game.ruler}
              rev={god.rev}
              onOpenModal={setModal}
              saveControls={<SaveControls build={buildSave} onLoad={applySave} compact />}
            />
          )}
          {modal === 'city' && snap && (
            <CityModal game={game} snap={snap} race={game.race} onClose={() => setModal(null)} />
          )}
          {modal === 'race' && snap && (
            <RaceTreeModal game={game} snap={snap} race={game.race} onClose={() => setModal(null)} />
          )}
          {modal === 'help' && <HelpModal onClose={() => setModal(null)} />}
        </>
      )}

      {modal === 'god' && (
        <GodTreeModal
          god={god}
          onBuy={buyGodNode}
          onRebirth={doRebirth}
          onRestart={doRestart}
          onClose={() => setModal(null)}
        />
      )}

      {prestige && <PrestigeOverlay info={prestige.info} cause={prestige.cause} onDone={finishPrestige} />}
    </div>
  );
}
