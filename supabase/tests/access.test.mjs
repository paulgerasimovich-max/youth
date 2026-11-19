// Тесты правил доступа и анонимности. Каждый тест отвечает на вопрос
// «может ли такой-то человек сделать то, чего ему нельзя?» — и база обязана сказать «нет».
// Запуск: npm run test:db

import { assert, createDb, denied, equal, runAll, test } from './harness.mjs';

const { query, createUser } = await createDb();
const ADMIN = 'admin-console'; // владелец базы (панель Supabase), не участник приложения
const GUEST = 'guest'; // человек без входа

const alice = await createUser('Alice');
const bob = await createUser('Bob');
const mallory = await createUser('Mallory', { role: 'admin', approved: true }); // пытается назначить себя админом
const lena = await createUser('Lena');
const paul = await createUser('Paul');
await query(ADMIN, `update public.profiles set role = 'leader' where id = $1`, [lena.uid]);
await query(ADMIN, `update public.profiles set role = 'admin' where id = $1`, [paul.uid]);

const SECRET = 'a'.repeat(40);
const one = async (who, sql, params) => (await query(who, sql, params))[0];

// ============================================================
// Общие гарантии для всей базы
// ============================================================
test('every table has row-level security switched on', async () => {
  const rows = await query(
    ADMIN,
    `select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
  );
  equal(rows.map((r) => r.relname), [], 'tables without RLS');
});

test('a guest (not signed in) has no access to any table', async () => {
  const rows = await query(
    ADMIN,
    `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r'
       and (has_table_privilege('anon', c.oid, 'select, insert, update, delete')
            or has_any_column_privilege('anon', c.oid, 'select, insert, update'))`,
  );
  equal(rows.map((r) => r.relname), [], 'tables a guest can touch');
});

test('a guest can call only the four anonymous-question functions', async () => {
  const rows = await query(
    ADMIN,
    `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute') order by 1`,
  );
  equal(rows.map((r) => r.proname), ['anon_ask', 'anon_delete', 'anon_my_threads', 'anon_reply'], 'guest functions');
});

test('signed-in people cannot call anonymous or internal functions', async () => {
  const rows = await query(
    ADMIN,
    `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and has_function_privilege('authenticated', p.oid, 'execute')
       and (p.proname like 'anon\\_%' or p.proname in ('handle_new_user'))`,
  );
  equal(rows.map((r) => r.proname), [], 'functions that must stay closed');
});

test('no table stores email, phone or password', async () => {
  const rows = await query(
    ADMIN,
    `select table_name || '.' || column_name as col from information_schema.columns
     where table_schema = 'public' and column_name ~* '(email|phone|password|address)'`,
  );
  equal(rows.map((r) => r.col), [], 'personal-data columns');
});

// ============================================================
// Люди и роли
// ============================================================
test('a new account is always a plain member, whatever the app sends', async () => {
  const p = await one(ADMIN, `select role, approved from public.profiles where id = $1`, [mallory.uid]);
  equal(p, { role: 'member', approved: true }, 'Mallory profile');
});

test('nobody can make themselves a leader or admin', async () => {
  await denied(query(mallory, `update public.profiles set role = 'admin' where id = $1`, [mallory.uid]), /permission denied/, 'self-promote');
  await denied(query(mallory, `update public.profiles set approved = true where id = $1`, [mallory.uid]), /permission denied/, 'self-approve');
  await denied(query(mallory, `select public.set_user_role($1, 'leader')`, [mallory.uid]), /Only the lead pastor/, 'member picks leaders');
  await denied(query(lena, `select public.set_user_role($1, 'leader')`, [bob.uid]), /Only the lead pastor/, 'leader picks leaders');
  await denied(query(mallory, `insert into public.profiles (id, name, role) values ($1, 'x', 'admin')`, [mallory.uid]), /permission denied/, 'insert profile');
});

test('only the admin picks leaders, and not themselves or another admin', async () => {
  await query(paul, `select public.set_user_role($1, 'leader')`, [bob.uid]);
  equal((await one(ADMIN, `select role from public.profiles where id = $1`, [bob.uid])).role, 'leader', 'Bob promoted');
  await query(paul, `select public.set_user_role($1, 'member')`, [bob.uid]);
  equal((await one(ADMIN, `select role from public.profiles where id = $1`, [bob.uid])).role, 'member', 'Bob demoted');
  await denied(query(paul, `select public.set_user_role($1, 'member')`, [paul.uid]), /your own role/, 'admin changes own role');
  await denied(query(paul, `select public.set_user_role($1, 'admin')`, [bob.uid]), /member or leader/, 'admin creates another admin');
});

test('you can rename yourself but not somebody else', async () => {
  await query(alice, `update public.profiles set name = 'Alice C' where id = $1`, [alice.uid]);
  await query(mallory, `update public.profiles set name = 'Hacked' where id = $1`, [alice.uid]);
  equal((await one(ADMIN, `select name from public.profiles where id = $1`, [alice.uid])).name, 'Alice C', 'Alice name');
});

test('a guest cannot read the member list', async () => {
  await denied(query(GUEST, `select * from public.profiles`), /permission denied/, 'guest reads profiles');
});

// ============================================================
// Дни рождения
// ============================================================
test('a birthday is readable only by its owner', async () => {
  const today = await one(
    ADMIN,
    `select extract(month from d)::int as m, extract(day from d)::int as d
     from (select (now() at time zone 'America/Los_Angeles')::date as d) x`,
  );
  await query(alice, `insert into public.birthdays (month, day) values ($1, $2)`, [today.m, today.d]);
  equal((await query(alice, `select user_id from public.birthdays`)).length, 1, 'Alice sees own');
  equal((await query(mallory, `select * from public.birthdays`)).length, 0, 'Mallory sees none');
  equal((await query(lena, `select * from public.birthdays`)).length, 0, 'even a leader cannot read the table');
  await denied(query(mallory, `insert into public.birthdays (user_id, month, day) values ($1, 1, 1)`, [bob.uid]), /row-level security/, 'set birthday for someone else');
});

test('"birthday today" shows names only; the full list is for leaders', async () => {
  const todayList = await query(bob, `select * from public.birthdays_today()`);
  equal(todayList.map((r) => r.name), ['Alice C'], 'today list');
  equal((await query(mallory, `select * from public.birthdays_for_leaders()`)).length, 0, 'member gets nothing');
  equal((await query(lena, `select * from public.birthdays_for_leaders()`)).length, 1, 'leader gets the list');
  await denied(query(GUEST, `select * from public.birthdays_today()`), /permission denied/, 'guest');
});

// ============================================================
// Анонимные вопросы
// ============================================================
test('anonymous tables have no column that could point to the author', async () => {
  const cols = async (t) =>
    (await query(ADMIN, `select column_name from information_schema.columns where table_schema = 'public' and table_name = $1 order by 1`, [t])).map((r) => r.column_name);
  equal(await cols('anon_threads'), ['created_at', 'id', 'last_message_at', 'preferred_leader_id', 'secret_hash', 'status'], 'anon_threads columns');
  equal(await cols('anon_messages'), ['body', 'created_at', 'id', 'leader_id', 'sender', 'thread_id'], 'anon_messages columns');
});

test('a question cannot be sent together with a signed-in session', async () => {
  await denied(query(alice, `select public.anon_ask($1, 'hi')`, [SECRET]), /permission denied/, 'signed-in ask');
  await denied(query({ uid: alice.uid, role: 'anon' }, `select public.anon_ask($1, 'hi')`, [SECRET]), /without a signed-in session/, 'guest call carrying a session');
  equal((await query(ADMIN, `select 1 from public.anon_threads`)).length, 0, 'nothing was stored');
});

let threadId;
test('a guest can ask; the stored row holds only a fingerprint of the secret', async () => {
  threadId = (await one(GUEST, `select public.anon_ask($1, $2, $3) as id`, [SECRET, 'I feel alone', lena.uid])).id;
  const t = await one(ADMIN, `select * from public.anon_threads where id = $1`, [threadId]);
  assert(t.secret_hash !== SECRET && t.secret_hash.length === 64, 'secret must be stored hashed');
  equal(t.preferred_leader_id, lena.uid, 'preferred leader');
  await denied(query(GUEST, `select public.anon_ask('short', 'hi')`), /Bad secret/, 'weak secret');
});

test('members and guests cannot read questions; leaders can', async () => {
  equal((await query(mallory, `select * from public.anon_threads`)).length, 0, 'member reads threads');
  equal((await query(mallory, `select * from public.anon_messages`)).length, 0, 'member reads messages');
  await denied(query(GUEST, `select * from public.anon_threads`), /permission denied/, 'guest reads threads');
  await denied(query(GUEST, `select * from public.anon_messages`), /permission denied/, 'guest reads messages');
  equal((await query(lena, `select * from public.anon_threads`)).length, 1, 'leader reads threads');
  equal((await query(paul, `select body from public.anon_messages`)).map((r) => r.body), ['I feel alone'], 'admin reads messages');
});

test('only the right secret opens a conversation', async () => {
  equal((await one(GUEST, `select public.anon_my_threads($1) as j`, [['b'.repeat(40)]])).j, [], 'wrong secret');
  const mine = (await one(GUEST, `select public.anon_my_threads($1) as j`, [[SECRET]])).j;
  equal(mine.length, 1, 'own thread');
  equal(mine[0].messages.map((m) => m.sender), ['asker'], 'messages');
});

test('only leaders can answer, and only under their own name', async () => {
  const insert = `insert into public.anon_messages (thread_id, sender, leader_id, body) values ($1, $2, $3, $4)`;
  await denied(query(mallory, insert, [threadId, 'leader', mallory.uid, 'trust me']), /row-level security/, 'member answers');
  await denied(query(lena, insert, [threadId, 'leader', paul.uid, 'as Paul']), /row-level security/, 'leader answers as another leader');
  await denied(query(lena, insert, [threadId, 'asker', null, 'fake asker']), /row-level security/, 'leader fakes the asker');
  await query(lena, insert, [threadId, 'leader', lena.uid, 'You are not alone.']);
  const mine = (await one(GUEST, `select public.anon_my_threads($1) as j`, [[SECRET]])).j;
  equal(mine[0].messages.map((m) => m.leader_name), [null, 'Lena'], 'asker sees the leader name');
});

test('the asker can write back with the secret; nobody else can', async () => {
  await query(GUEST, `select public.anon_reply($1, 'Thank you')`, [SECRET]);
  await denied(query(GUEST, `select public.anon_reply($1, 'hi')`, ['c'.repeat(40)]), /not found/, 'wrong secret reply');
  equal((await query(lena, `select 1 from public.anon_messages where thread_id = $1`, [threadId])).length, 3, 'message count');
});

test('a leader can close a conversation but cannot tamper with it', async () => {
  await denied(query(lena, `update public.anon_threads set secret_hash = 'x' where id = $1`, [threadId]), /permission denied/, 'leader edits the fingerprint');
  await denied(query(lena, `delete from public.anon_messages where thread_id = $1`, [threadId]), /permission denied/, 'leader deletes messages');
  await denied(query(mallory, `update public.anon_threads set status = 'closed' where id = $1 returning id`, [threadId]).then((r) => { if (r.length === 0) throw new Error('no rows'); }), /no rows/, 'member closes');
  await query(lena, `update public.anon_threads set status = 'closed' where id = $1`, [threadId]);
  await denied(query(GUEST, `select public.anon_reply($1, 'more')`, [SECRET]), /closed/, 'reply after close');
  await denied(
    query(lena, `insert into public.anon_messages (thread_id, sender, leader_id, body) values ($1, 'leader', $2, 'late')`, [threadId, lena.uid]),
    /row-level security/, 'leader reply after close',
  );
});

test('"Delete now" wipes the conversation for everyone', async () => {
  equal((await one(GUEST, `select public.anon_delete($1) as ok`, ['d'.repeat(40)])).ok, false, 'wrong secret deletes nothing');
  equal((await one(GUEST, `select public.anon_delete($1) as ok`, [SECRET])).ok, true, 'right secret deletes');
  equal((await query(ADMIN, `select 1 from public.anon_threads`)).length, 0, 'threads left');
  equal((await query(ADMIN, `select 1 from public.anon_messages`)).length, 0, 'messages left');
});

test('conversations disappear 7 days after the last message', async () => {
  const oldId = (await one(GUEST, `select public.anon_ask($1, 'old one') as id`, ['e'.repeat(40)])).id;
  await query(GUEST, `select public.anon_ask($1, 'fresh one')`, ['f'.repeat(40)]);
  await query(ADMIN, `update public.anon_threads set last_message_at = now() - interval '8 days' where id = $1`, [oldId]);
  await denied(query(lena, `select public.anon_purge_expired()`), /permission denied/, 'leader runs the purge');
  equal((await one(ADMIN, `select public.anon_purge_expired() as n`)).n, 1, 'purged');
  equal((await query(ADMIN, `select body from public.anon_messages`)).map((r) => r.body), ['fresh one'], 'what is left');
});

test('question flooding is capped', async () => {
  const before = (await query(ADMIN, `select 1 from public.anon_threads`)).length;
  for (let i = before; i < 40; i++) {
    await query(GUEST, `select public.anon_ask($1, 'spam')`, [`flood-${i}`.padEnd(40, 'x')]);
  }
  await denied(query(GUEST, `select public.anon_ask($1, 'one too many')`, ['g'.repeat(40)]), /Too many questions/, '41st question');
  await query(ADMIN, `delete from public.anon_threads`);
});

// ============================================================
// Проповеди и ежедневные посты
// ============================================================
let pastPost;
let futurePost;
test('only leaders write sermons and posts', async () => {
  await denied(query(mallory, `insert into public.sermons (title, date, paragraphs, created_by) values ('x', current_date, array['p'], $1)`, [mallory.uid]), /row-level security/, 'member adds sermon');
  const sermon = await one(lena, `insert into public.sermons (title, date, paragraphs, created_by) values ('Rooted', current_date, array['one', 'two'], $1) returning id`, [lena.uid]);
  const add = `insert into public.daily_posts (sermon_id, day, publish_at, quote, author_id) values ($1, $2::date, $3::timestamptz, $4, $5) returning id`;
  pastPost = (await one(lena, add, [sermon.id, '2026-01-01', '2026-01-01T15:30:00Z', 'one', lena.uid])).id;
  futurePost = (await one(lena, add, [sermon.id, '2999-01-01', '2999-01-01T15:30:00Z', 'two', lena.uid])).id;
  await denied(query(mallory, add, [sermon.id, '2026-01-02', '2026-01-02T15:30:00Z', 'fake word', mallory.uid]), /row-level security/, 'member adds post');
  await denied(query(lena, add, [sermon.id, '2026-01-01', '2026-01-01T15:30:00Z', 'dup', lena.uid]), /unique/, 'two posts on one day');
});

test('members see a post only after its release time', async () => {
  equal((await query(alice, `select quote from public.daily_posts`)).map((r) => r.quote), ['one'], 'member view');
  equal((await query(lena, `select quote from public.daily_posts order by day`)).map((r) => r.quote), ['one', 'two'], 'leader view');
  await denied(query(alice, `insert into public.post_reactions (post_id, emoji) values ($1, '🙏')`, [futurePost]), /row-level security/, 'react to an unreleased post');
  await denied(query(alice, `insert into public.comments (post_id, body) values ($1, 'early')`, [futurePost]), /row-level security/, 'comment on an unreleased post');
});

test('reactions and comments are always under your own name', async () => {
  await query(alice, `insert into public.post_reactions (post_id, emoji) values ($1, '🙏')`, [pastPost]);
  await query(alice, `insert into public.comments (post_id, body) values ($1, 'Needed this')`, [pastPost]);
  await denied(query(mallory, `insert into public.comments (post_id, user_id, body) values ($1, $2, 'I am Alice')`, [pastPost, alice.uid]), /row-level security/, 'comment as someone else');
  await denied(query(mallory, `insert into public.post_reactions (post_id, user_id, emoji) values ($1, $2, '🔥')`, [pastPost, alice.uid]), /row-level security/, 'react as someone else');
  await denied(query(mallory, `update public.comments set body = 'edited'`), /permission denied/, 'edit comments');
  equal((await query(mallory, `delete from public.comments returning id`)).length, 0, 'member deletes others comment');
  equal((await query(lena, `delete from public.comments returning id`)).length, 1, 'leader deletes a comment');
});

// ============================================================
// Чат, блокировки, жалобы
// ============================================================
let aliceMsg;
test('chat messages are yours only; leaders can remove any', async () => {
  aliceMsg = (await one(alice, `insert into public.chat_messages (body) values ('hello') returning id`)).id;
  await query(mallory, `insert into public.chat_messages (body) values ('buy now')`);
  await denied(query(mallory, `insert into public.chat_messages (user_id, body) values ($1, 'I am Alice')`, [alice.uid]), /row-level security/, 'post as someone else');
  await denied(query(mallory, `update public.chat_messages set body = 'changed'`), /permission denied/, 'edit messages');
  equal((await query(mallory, `delete from public.chat_messages where id = $1 returning id`, [aliceMsg])).length, 0, 'delete someone else message');
  await denied(query(GUEST, `select * from public.chat_messages`), /permission denied/, 'guest reads chat');
});

test('blocking hides that person only for you', async () => {
  await query(alice, `insert into public.blocks (blocked_id) values ($1)`, [mallory.uid]);
  equal((await query(alice, `select body from public.chat_messages`)).map((r) => r.body), ['hello'], 'Alice view');
  equal((await query(bob, `select body from public.chat_messages order by created_at`)).length, 2, 'Bob view');
  equal((await query(mallory, `select * from public.blocks`)).length, 0, 'Mallory cannot see who blocked her');
  await denied(query(mallory, `insert into public.blocks (blocker_id, blocked_id) values ($1, $2)`, [alice.uid, bob.uid]), /row-level security/, 'block on behalf of someone');
});

test('reports go to leaders only', async () => {
  const spam = await one(bob, `select id from public.chat_messages where body = 'buy now'`);
  await query(bob, `insert into public.reports (target_type, target_id, preview) values ('chat', $1, 'buy now')`, [spam.id]);
  equal((await query(mallory, `select * from public.reports`)).length, 0, 'member reads reports');
  equal((await query(bob, `select * from public.reports`)).length, 0, 'even the reporter cannot list reports');
  equal((await query(lena, `select * from public.reports`)).length, 1, 'leader reads reports');
  await query(lena, `update public.reports set resolved_at = now(), resolved_by = $1`, [lena.uid]);
  equal((await query(lena, `delete from public.chat_messages where id = $1 returning id`, [spam.id])).length, 1, 'leader removes the message');
});

// ============================================================
// События, идеи, поздравления
// ============================================================
test('only leaders create events; "I\'m in" is always your own', async () => {
  await denied(query(mallory, `insert into public.events (title, starts_at, created_by) values ('Party', now(), $1)`, [mallory.uid]), /row-level security/, 'member creates event');
  const ev = await one(lena, `insert into public.events (title, starts_at, created_by) values ('Friday Night', now() + interval '1 day', $1) returning id`, [lena.uid]);
  await query(alice, `insert into public.event_rsvps (event_id) values ($1)`, [ev.id]);
  await denied(query(mallory, `insert into public.event_rsvps (event_id, user_id) values ($1, $2)`, [ev.id, bob.uid]), /row-level security/, 'sign someone else up');
  equal((await query(mallory, `delete from public.event_rsvps returning user_id`)).length, 0, 'remove someone else rsvp');
  equal((await query(mallory, `delete from public.events returning id`)).length, 0, 'member deletes event');
});

test('ideas and votes are under your own name', async () => {
  const idea = await one(alice, `insert into public.ideas (title) values ('Bowling') returning id`);
  await query(bob, `insert into public.idea_votes (idea_id) values ($1)`, [idea.id]);
  await denied(query(mallory, `insert into public.idea_votes (idea_id, user_id) values ($1, $2)`, [idea.id, lena.uid]), /row-level security/, 'vote as someone else');
  await denied(query(bob, `insert into public.idea_votes (idea_id) values ($1)`, [idea.id]), /unique|duplicate/, 'vote twice');
  equal((await query(mallory, `delete from public.ideas returning id`)).length, 0, 'delete someone else idea');
});

test('a birthday note is private between the leader and the person', async () => {
  await denied(query(mallory, `insert into public.birthday_greetings (to_user_id, body) values ($1, 'hi')`, [alice.uid]), /row-level security/, 'member sends a note');
  await query(lena, `insert into public.birthday_greetings (to_user_id, body) values ($1, 'Happy birthday!')`, [alice.uid]);
  equal((await query(mallory, `select * from public.birthday_greetings`)).length, 0, 'outsider reads');
  equal((await query(paul, `select * from public.birthday_greetings`)).length, 0, 'even the admin cannot read it');
  equal((await query(alice, `select body from public.birthday_greetings`)).length, 1, 'recipient reads');
  await denied(query(alice, `update public.birthday_greetings set body = 'changed'`), /permission denied/, 'recipient edits the text');
  await query(alice, `update public.birthday_greetings set seen_at = now()`);
});

// ============================================================
// Устройство, одобрение, удаление аккаунта
// ============================================================
test('settings of the group can be changed only by the admin', async () => {
  equal((await query(mallory, `update public.app_settings set require_approval = true returning id`)).length, 0, 'member changes settings');
  equal((await query(lena, `update public.app_settings set timezone = 'UTC' returning id`)).length, 0, 'leader changes settings');
  equal((await query(paul, `update public.app_settings set require_approval = true returning id`)).length, 1, 'admin changes settings');
});

test('with approval switched on, a newcomer sees nothing until a leader lets them in', async () => {
  const newbie = await createUser('Newbie');
  equal((await query(newbie, `select name from public.profiles`)).map((r) => r.name), ['Newbie'], 'sees only own profile');
  equal((await query(newbie, `select * from public.chat_messages`)).length, 0, 'chat hidden');
  equal((await query(newbie, `select * from public.events`)).length, 0, 'events hidden');
  await denied(query(newbie, `insert into public.chat_messages (body) values ('let me in')`), /row-level security/, 'post before approval');
  await denied(query(newbie, `select public.approve_member($1)`, [newbie.uid]), /Only leaders/, 'approve yourself');
  await query(lena, `select public.approve_member($1)`, [newbie.uid]);
  assert((await query(newbie, `select * from public.chat_messages`)).length > 0, 'chat visible after approval');
});

test('a push address can be registered only for yourself', async () => {
  await query(alice, `select public.register_push_token('ExponentPushToken[aaaaaaaaaaaa]', 'ios')`);
  equal((await query(mallory, `select * from public.push_tokens`)).length, 0, 'read someone else token');
  await denied(query(mallory, `insert into public.push_tokens (token, user_id, platform) values ('ExponentPushToken[zzzzzzzz]', $1, 'ios')`, [alice.uid]), /permission denied/, 'insert a token directly');
  await query(bob, `select public.register_push_token('ExponentPushToken[aaaaaaaaaaaa]', 'ios')`); // телефон перешёл к Бобу
  equal((await query(alice, `select * from public.push_tokens`)).length, 0, 'token moved away from Alice');
});

test('deleting your account removes your data and nobody else\'s', async () => {
  await denied(query(GUEST, `select public.delete_my_account()`), /permission denied/, 'guest deletes');
  await denied(query(lena, `select public.remove_member($1)`, [bob.uid]), /Only the lead pastor/, 'leader removes a member');
  const before = (await query(ADMIN, `select 1 from public.profiles`)).length;
  await query(alice, `select public.delete_my_account()`);
  equal((await query(ADMIN, `select 1 from auth.users where id = $1`, [alice.uid])).length, 0, 'account gone');
  equal((await query(ADMIN, `select 1 from public.profiles`)).length, before - 1, 'only one profile removed');
  equal((await query(ADMIN, `select 1 from public.chat_messages where user_id = $1`, [alice.uid])).length, 0, 'messages gone');
  equal((await query(ADMIN, `select 1 from public.birthdays where user_id = $1`, [alice.uid])).length, 0, 'birthday gone');
  equal((await query(ADMIN, `select 1 from public.events`)).length, 1, 'group events stay');
});

await runAll();
