// Какие эмодзи человек ставит чаще всего. Помним на самом телефоне (в базу это не уходит),
// чтобы в ряду реакций предлагать его любимые, а не один и тот же набор всем.

import { loadJSON, saveJSON } from './deviceStore';

const KEY = 'youth.emoji.usage';
const KEEP = 40; // больше хранить незачем

type Usage = Record<string, { n: number; t: number }>; // n — сколько раз, t — когда в последний раз

let usage: Usage = {};
loadJSON<Usage>(KEY, {}).then((saved) => {
  usage = { ...saved, ...usage };
});

// Сначала самые частые; при равенстве — те, что ставили недавно
function ranked(): string[] {
  return Object.keys(usage).sort((a, b) => usage[b].n - usage[a].n || usage[b].t - usage[a].t);
}

// Ряд быстрых реакций: любимые эмодзи человека, а пока их мало — добираем обычными
export function quickEmojis(defaults: string[], count: number = defaults.length): string[] {
  const mine = ranked().slice(0, count);
  return [...mine, ...defaults.filter((e) => !mine.includes(e))].slice(0, count);
}

// Для верхней строки полного набора
export function frequentEmojis(limit = 16): string[] {
  return ranked().slice(0, limit);
}

export function rememberEmoji(emoji: string): void {
  usage = { ...usage, [emoji]: { n: (usage[emoji]?.n ?? 0) + 1, t: Date.now() } };
  usage = Object.fromEntries(ranked().slice(0, KEEP).map((e) => [e, usage[e]]));
  saveJSON(KEY, usage);
}
