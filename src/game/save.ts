// ── Экспорт/импорт зашифрованного файла сохранения (.rgs) ───────────────────

import type { GodState } from './godtree';
import type { RunSave } from './engine';
import type { RaceId } from './races';

const MAGIC = 'RGRS';
const VERSION = 2;
const KEY = 'regress.hourglass.keystream.v2';

export interface SaveFile {
  v: number;
  savedAt: number;
  ruler: string;
  race: RaceId | null;
  god: GodState;
  run: RunSave | null;
}

// ── Поточный шифр (XOR с ключевым потоком PRNG) + контрольная сумма ─────────

function keystream(seed: number, len: number): Uint8Array {
  const out = new Uint8Array(len);
  let a = seed >>> 0;
  for (let i = 0; i < len; i++) {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    out[i] = (t ^ (t >>> 14)) & 0xff;
  }
  return out;
}

function seedFrom(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function checksum(bytes: Uint8Array): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function toB64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Сериализует и шифрует состояние в текст файла. */
export function encodeSave(data: SaveFile): string {
  const json = JSON.stringify(data);
  const raw = new TextEncoder().encode(json);
  const salt = Math.floor(Math.random() * 0xffffffff) >>> 0;
  const ks = keystream(seedFrom(KEY) ^ salt, raw.length);
  const enc = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) enc[i] = raw[i] ^ ks[i];
  const sum = checksum(raw);
  const body = toB64(enc).replace(/=+$/, '');
  return [MAGIC, VERSION, salt.toString(36), sum.toString(36), body].join('.');
}

/** Расшифровывает текст файла. Бросает ошибку при повреждении. */
export function decodeSave(text: string): SaveFile {
  const parts = text.trim().split('.');
  if (parts.length !== 5 || parts[0] !== MAGIC) throw new Error('Это не файл сохранения «Регресса»');
  const salt = parseInt(parts[2], 36) >>> 0;
  const sum = parseInt(parts[3], 36) >>> 0;
  let b64 = parts[4];
  while (b64.length % 4 !== 0) b64 += '=';
  const enc = fromB64(b64);
  const ks = keystream(seedFrom(KEY) ^ salt, enc.length);
  const raw = new Uint8Array(enc.length);
  for (let i = 0; i < enc.length; i++) raw[i] = enc[i] ^ ks[i];
  if (checksum(raw) !== sum) throw new Error('Файл повреждён: не сходится контрольная сумма');
  const data = JSON.parse(new TextDecoder().decode(raw)) as SaveFile;
  if (!data || typeof data !== 'object' || !data.god) throw new Error('Неверная структура сохранения');
  return data;
}

export function downloadSave(data: SaveFile) {
  const text = encodeSave(data);
  const blob = new Blob([text], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  a.href = url;
  a.download = `regress-${data.ruler || 'lord'}-${stamp}.rgs`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function readSaveFile(file: File): Promise<SaveFile> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error('Не удалось прочитать файл'));
    fr.onload = () => {
      try {
        resolve(decodeSave(String(fr.result ?? '')));
      } catch (e) {
        reject(e instanceof Error ? e : new Error('Ошибка чтения'));
      }
    };
    fr.readAsText(file);
  });
}
