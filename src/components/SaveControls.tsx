// ── Кнопки экспорта/импорта зашифрованного сохранения ───────────────────────

import { useRef, useState } from 'react';
import { Download, Upload, Check, TriangleAlert } from 'lucide-react';
import { downloadSave, readSaveFile } from '../game/save';
import type { SaveFile } from '../game/save';

export default function SaveControls({
  build,
  onLoad,
  compact,
}: {
  build: () => SaveFile;
  onLoad: (data: SaveFile) => void;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    window.setTimeout(() => setMsg(null), 3200);
  };

  const pad = compact ? 'px-2.5 py-1.5 text-[11px]' : 'px-4 py-2 text-xs';

  return (
    <div className="pointer-events-auto relative flex items-center gap-1.5">
      <button
        className={`btn ${pad}`}
        title="Скачать зашифрованный файл сохранения (.rgs)"
        onClick={() => {
          try {
            downloadSave(build());
            flash(true, 'Файл сохранения скачан');
          } catch {
            flash(false, 'Не удалось создать файл');
          }
        }}
      >
        <Download size={13} />
        {compact ? 'Сохранить' : 'Скачать сохранение'}
      </button>
      <button className={`btn ${pad}`} title="Загрузить файл сохранения" onClick={() => inputRef.current?.click()}>
        <Upload size={13} />
        {compact ? 'Загрузить' : 'Загрузить файл'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".rgs,text/plain"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          try {
            const data = await readSaveFile(f);
            onLoad(data);
            flash(true, 'Сохранение загружено');
          } catch (err) {
            flash(false, err instanceof Error ? err.message : 'Ошибка загрузки');
          }
        }}
      />
      {msg && (
        <div
          className="panel anim-fade-up absolute right-0 top-full z-50 mt-2 flex w-max max-w-[280px] items-center gap-2 px-3 py-2 text-[11px]"
          style={{ borderColor: msg.ok ? 'rgba(89,196,109,0.5)' : 'rgba(255,77,109,0.5)' }}
        >
          {msg.ok ? <Check size={13} className="text-emerald-400" /> : <TriangleAlert size={13} className="text-rose-400" />}
          <span className={msg.ok ? 'text-emerald-200' : 'text-rose-200'}>{msg.text}</span>
        </div>
      )}
    </div>
  );
}
