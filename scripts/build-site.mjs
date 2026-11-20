// Собирает сайт приложения (папка site/): страницу политики конфиденциальности — из docs/privacy-policy.md,
// чтобы текст политики жил в одном месте. Запуск: npm run site:build
//
// Понимает ровно то, что есть в политике: заголовки, абзацы, списки, одну таблицу, **жирный**, _курсив_.
// Всё, что осталось в [квадратных скобках], подсвечивается жёлтым — это ещё не заполненные места.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const md = fs.readFileSync(path.join(root, 'docs/privacy-policy.md'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|\s)_(.+?)_(?=\s|$)/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]/g, '<mark>[$1]</mark>');
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const out = [];
const lines = md.split('\n');
for (let i = 0; i < lines.length; ) {
  const line = lines[i];
  if (!line.trim()) { i++; continue; }
  if (line.startsWith('# ')) { out.push(`<h1>${inline(line.slice(2))}</h1>`); i++; continue; }
  if (line.startsWith('## ')) { const t = line.slice(3); out.push(`<h2 id="${slug(t)}">${inline(t)}</h2>`); i++; continue; }
  if (line.startsWith('- ')) {
    const items = [];
    while (i < lines.length && lines[i].startsWith('- ')) items.push(`<li>${inline(lines[i++].slice(2))}</li>`);
    out.push(`<ul>${items.join('')}</ul>`);
    continue;
  }
  if (line.startsWith('|')) {
    const rows = [];
    while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++].split('|').slice(1, -1).map((c) => c.trim()));
    const [head, , ...body] = rows; // вторая строка — разделитель |---|
    out.push(
      `<div class="table"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>` +
        body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('') +
        `</tbody></table></div>`,
    );
    continue;
  }
  const para = [];
  while (i < lines.length && lines[i].trim() && !/^(#|- |\|)/.test(lines[i])) para.push(inline(lines[i++]));
  out.push(`<p>${para.join('<br>')}</p>`);
}

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Privacy Policy · Youth Group</title>
<meta name="description" content="What the Youth Group app keeps about you, and what it doesn't.">
<link rel="icon" href="/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&family=Unbounded:wght@700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
</head>
<body>
<header class="top"><div class="wrap">
  <a class="brand" href="/"><span class="logo">☀️</span>Youth Group</a>
  <nav><a href="/">Home</a><a href="/#help">Help</a></nav>
</div></header>
<main class="wrap"><article class="doc">
${out.join('\n')}
</article></main>
<footer><div class="wrap"><span>Youth Group</span><span><a href="/">Home</a> · <a href="/privacy/">Privacy Policy</a></span></div></footer>
</body>
</html>
`;
fs.mkdirSync(path.join(root, 'site/privacy'), { recursive: true });
fs.writeFileSync(path.join(root, 'site/privacy/index.html'), page);
fs.copyFileSync(path.join(root, 'assets/favicon.png'), path.join(root, 'site/favicon.png'));
const left = (page.match(/<mark>/g) ?? []).length;
console.log(`site/privacy/index.html written${left ? ` — ${left} place(s) still in [brackets]` : ''}`);
