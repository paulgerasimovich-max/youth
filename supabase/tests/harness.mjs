// Локальный стенд для проверки правил базы. Поднимает настоящий Postgres прямо
// в памяти (PGlite), накатывает структуру из supabase/migrations и даёт помощников
// «выполнить запрос от имени такого-то человека».
// Облако Supabase здесь не участвует — тесты ничего не трогают в настоящей базе.

import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

// То, что в облаке Supabase уже есть «из коробки»: роли и система входа.
const SUPABASE_STUBS = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text unique,
    raw_user_meta_data jsonb not null default '{}',
    email_confirmed_at timestamptz
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
`;

export async function createDb() {
  const db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  const core = fs.readFileSync(path.join(here, '../migrations/20261119000001_core.sql'), 'utf8');
  await db.exec(core);
  await db.exec(fs.readFileSync(path.join(here, '../migrations/20261119000004_chat_edit.sql'), 'utf8'));
  await db.exec(fs.readFileSync(path.join(here, '../migrations/20261119000005_chat_reply.sql'), 'utf8'));
  // Вместо настоящей отправки наружу (pg_net есть только в облаке) — заглушка: записывает, что ушло бы.
  await db.exec(`
    create schema net;
    create table net.sent (id bigserial primary key, url text, body jsonb);
    create function net.http_post(
      url text, body jsonb default '{}'::jsonb, params jsonb default '{}'::jsonb,
      headers jsonb default '{}'::jsonb, timeout_milliseconds integer default 5000
    ) returns bigint language sql as $$ insert into net.sent (url, body) values (url, body) returning id $$;
  `);
  await db.exec(fs.readFileSync(path.join(here, '../migrations/20261119000006_push.sql'), 'utf8'));
  await db.exec(fs.readFileSync(path.join(here, '../migrations/20261119000008_agreement.sql'), 'utf8'));
  await db.exec(fs.readFileSync(path.join(here, '../migrations/20261119000009_push_reports.sql'), 'utf8'));
  await db.exec(fs.readFileSync(path.join(here, '../migrations/20261119000010_remove_member.sql'), 'utf8'));
  await db.exec(fs.readFileSync(path.join(here, '../migrations/20261120000011_confirmed_members.sql'), 'utf8'));
  await db.exec(fs.readFileSync(path.join(here, '../migrations/20261121000012_admin_wording.sql'), 'utf8'));

  // who: 'admin-console' (владелец базы), 'guest' (без входа) или { uid } (вошедший человек).
  // { uid, role: 'anon' } — гость, который зачем-то прислал чужой вход.
  async function query(who, sql, params = []) {
    if (who === 'admin-console') return (await db.query(sql, params)).rows;
    const role = who === 'guest' ? 'anon' : who.role ?? 'authenticated';
    const uid = who === 'guest' ? '' : who.uid;
    await db.exec('begin');
    try {
      await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid]);
      await db.exec(`set local role ${role}`);
      const res = await db.query(sql, params);
      await db.exec('commit');
      return res.rows;
    } catch (e) {
      await db.exec('rollback');
      throw e;
    }
  }

  // Как в настоящей системе входа: сначала адрес запоминается без подтверждения (код отправлен),
  // потом — если код введён верно — проставляется время подтверждения.
  // По умолчанию человек сразу подтверждён; { confirmed: false } — остановиться на первом шаге.
  async function createUser(name, meta = {}, { confirmed = true } = {}) {
    const rows = await query(
      'admin-console',
      `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
      [`${name.toLowerCase()}@example.com`, JSON.stringify({ name, ...meta })],
    );
    const user = { uid: rows[0].id, name };
    if (confirmed) await confirmEmail(user);
    return user;
  }

  async function confirmEmail(user) {
    await query('admin-console', `update auth.users set email_confirmed_at = now() where id = $1`, [user.uid]);
  }

  return { db, query, createUser, confirmEmail };
}

// ---------- крошечный набор для тестов ----------
const results = [];
const queue = [];
export function test(name, fn) {
  queue.push({ name, fn });
}

export function assert(cond, message) {
  if (!cond) throw new Error(message);
}

export function equal(actual, expected, message) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${message}: expected ${e}, got ${a}`);
}

// Запрос обязан быть отклонён базой
export async function denied(promise, pattern, message) {
  try {
    await promise;
  } catch (e) {
    if (pattern && !pattern.test(String(e.message))) {
      throw new Error(`${message}: rejected, but with an unexpected error: ${e.message}`);
    }
    return;
  }
  throw new Error(`${message}: was ALLOWED but must be rejected`);
}

export async function runAll() {
  for (const { name, fn } of queue) {
    try {
      await fn();
      results.push({ name, ok: true });
      console.log(`  ok   ${name}`);
    } catch (e) {
      results.push({ name, ok: false });
      console.log(`  FAIL ${name}\n         ${e.message}`);
    }
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
