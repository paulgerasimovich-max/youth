// Проверяет, что тексты для магазинов (docs/store-listing.md) укладываются в лимиты длины.
// Запуск: node scripts/check-store-listing.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const md = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../docs/store-listing.md'), 'utf8');
const block = (name) => {
  const m = md.match(new RegExp('```' + name + '\\n([\\s\\S]*?)\\n```'));
  if (!m) throw new Error(`block "${name}" not found`);
  return m[1];
};
const cell = (label) => {
  const m = md.match(new RegExp('\\| ' + label.replace(/[()]/g, '\\$&') + ' \\| \\d+ \\| `([^`]+)` \\|'));
  if (!m) throw new Error(`row "${label}" not found`);
  return m[1];
};

const checks = [
  ['App Store name', cell('Название в App Store'), 30],
  ['App Store subtitle', cell('Подзаголовок (App Store)'), 30],
  ['Google Play name', cell('Название в Google Play'), 30],
  ['Promotional text', block('promo'), 170],
  ['Description', block('description'), 4000],
  ['Keywords', block('keywords'), 100],
  ['Review notes', block('review'), 4000],
  ['Google short description', block('short'), 80],
];
let bad = 0;
for (const [name, text, max] of checks) {
  const n = [...text].length;
  if (n > max) bad++;
  console.log(`${n > max ? 'TOO LONG' : 'ok      '} ${String(n).padStart(4)} / ${max}  ${name}`);
}
if (/,\s/.test(block('keywords'))) { bad++; console.log('TOO LONG? keywords contain spaces after commas'); }
process.exit(bad ? 1 : 0);
