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
  equal((await query(mallory, `delete from public.chat_messages where id = $1 returning id`, [aliceMsg])).length, 0, 'delete someone else message');
  await denied(query(GUEST, `select * from public.chat_messages`), /permission denied/, 'guest reads chat');
});

test('you can edit only the text of your own message', async () => {
  equal((await query(mallory, `update public.chat_messages set body = 'changed' where id = $1 returning id`, [aliceMsg])).length, 0, 'edit someone else message');
  await denied(query(alice, `update public.chat_messages set user_id = $1 where id = $2`, [mallory.uid, aliceMsg]), /permission denied/, 'hand a message to someone else');
  await denied(query(alice, `update public.chat_messages set created_at = now() where id = $1`, [aliceMsg]), /permission denied/, 'change the time');
  await denied(query(alice, `update public.chat_messages set media_path = 'albums/x/y.jpg', media_kind = 'photo' where id = $1`, [aliceMsg]), /permission denied/, 'attach a file by editing');
  await denied(query(alice, `update public.chat_messages set forwarded_from = 'Bob' where id = $1`, [aliceMsg]), /permission denied/, 'fake a forward');

  const fresh = await one(alice, `select edited_at from public.chat_messages where id = $1`, [aliceMsg]);
  equal(fresh.edited_at, null, 'not marked before editing');
  const edited = await one(alice, `update public.chat_messages set body = 'hello!' where id = $1 returning body, edited_at`, [aliceMsg]);
  equal(edited.body, 'hello!', 'own text changed');
  assert(edited.edited_at, 'the server marks it as edited');
  await denied(query(alice, `update public.chat_messages set edited_at = null where id = $1`, [aliceMsg]), /permission denied/, 'hide the edited mark');
  await query(alice, `update public.chat_messages set body = 'hello' where id = $1`, [aliceMsg]);

  const fwd = await one(alice, `insert into public.chat_messages (body, forwarded_from) values ('I said this', 'Bob') returning id`);
  equal((await query(alice, `update public.chat_messages set body = 'no, this' where id = $1 returning id`, [fwd.id])).length, 0, 'edit a forwarded message');
  await query(alice, `delete from public.chat_messages where id = $1`, [fwd.id]);

  await denied(query(GUEST, `update public.chat_messages set body = 'x'`), /permission denied/, 'guest edits chat');
});

test('a reply remembers its message and survives when that message is deleted', async () => {
  const original = await one(alice, `insert into public.chat_messages (body) values ('who is in?') returning id`);
  const reply = await one(bob, `insert into public.chat_messages (body, reply_to) values ('me!', $1) returning id, reply_to`, [original.id]);
  equal(reply.reply_to, original.id, 'reply points at the message');
  await denied(query(bob, `insert into public.chat_messages (body, reply_to) values ('?', gen_random_uuid())`), /foreign key/, 'reply to a message that does not exist');
  await denied(query(bob, `update public.chat_messages set reply_to = null where id = $1`, [reply.id]), /permission denied/, 'change what a reply points at');
  await denied(query(mallory, `insert into public.chat_messages (user_id, body, reply_to) values ($1, 'fake', $2)`, [alice.uid, original.id]), /row-level security/, 'reply as someone else');

  await query(alice, `delete from public.chat_messages where id = $1`, [original.id]);
  const after = await one(bob, `select body, reply_to from public.chat_messages where id = $1`, [reply.id]);
  equal(after.body, 'me!', 'the reply stays');
  equal(after.reply_to, null, 'and just loses its quote');
  await query(bob, `delete from public.chat_messages where id = $1`, [reply.id]);
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

// ============================================================
// Возраст 13+ и правила группы
// ============================================================
test('"I am 13 or older and I accept the rules" is recorded once, by the person themselves', async () => {
  const ticked = await createUser('Tina', { agreed: true });
  const skipped = await createUser('Sam');
  const at = async (u) => (await one(ADMIN, `select agreed_at from public.profiles where id = $1`, [u.uid])).agreed_at;
  assert(await at(ticked), 'ticking both boxes at sign-up is recorded');
  equal(await at(skipped), null, 'no record without it');

  await denied(query(skipped, `update public.profiles set agreed_at = now() where id = $1`, [skipped.uid]), /permission denied/, 'write the mark directly');
  await denied(query(ticked, `update public.profiles set agreed_at = null where id = $1`, [ticked.uid]), /permission denied/, 'remove the mark');
  await denied(query(GUEST, `select public.accept_rules()`), /permission denied/, 'guest accepts rules');

  await query(ticked, `select public.accept_rules()`); // чужую отметку этим не поставить
  equal(await at(skipped), null, 'accepting applies only to yourself');
  await query(skipped, `select public.accept_rules()`);
  const first = await at(skipped);
  assert(first, 'accepted on the separate screen');
  await query(skipped, `select public.accept_rules()`);
  equal(await at(skipped), first, 'the first moment is kept');

  await query(ADMIN, `delete from auth.users where id = any($1::uuid[])`, [[ticked.uid, skipped.uid]]);
});

// ============================================================
// Push-уведомления: кому уходят, а кому нет
// ============================================================
// Что ушло бы на телефоны с момента последней проверки: список { to, title, body, type }
async function pushed() {
  const rows = await query(ADMIN, `select body from net.sent order by id`);
  await query(ADMIN, `delete from net.sent`);
  return rows.flatMap((r) => r.body).map((m) => ({ to: m.to, title: m.title, body: m.body, type: m.data.type }));
}
const TOKEN = { alice: 'ExponentPushToken[alice-phone]', bob: 'ExponentPushToken[bob-phone]', lena: 'ExponentPushToken[lena-phone]' };

test('a chat message is pushed to everyone except its author, the muted and those who blocked them', async () => {
  await query(ADMIN, `delete from public.push_tokens`);
  await query(ADMIN, `delete from public.blocks`);
  await query(alice, `select public.register_push_token($1, 'ios')`, [TOKEN.alice]);
  await query(bob, `select public.register_push_token($1, 'android')`, [TOKEN.bob]);
  await query(lena, `select public.register_push_token($1, 'ios')`, [TOKEN.lena]);
  await pushed();

  await query(alice, `insert into public.chat_messages (body) values ('Who is coming   tonight?')`);
  let out = await pushed();
  equal(out.map((m) => m.to).sort(), [TOKEN.bob, TOKEN.lena].sort(), 'goes to the others, not to the author');
  assert(out[0].title.startsWith('Alice'), 'shows who wrote');
  equal(out[0].body, 'Who is coming tonight?', 'shows the text on one line');
  equal(out[0].type, 'chat', 'opens the chat');

  await query(bob, `update public.notification_prefs set chat = false`);
  await query(lena, `insert into public.blocks (blocked_id) values ($1)`, [alice.uid]);
  await query(alice, `insert into public.chat_messages (body) values ('anyone?')`);
  equal(await pushed(), [], 'nobody is pushed: Bob muted the chat, Lena blocked Alice');
  await query(bob, `update public.notification_prefs set chat = true`);
  await query(ADMIN, `delete from public.blocks`);

  await query(alice, `insert into public.chat_messages (media_kind, media_path) values ('photo', 'chat/x/y.jpg')`);
  equal((await pushed())[0].body, 'Sent a photo', 'a photo has a plain caption');
});

test('events and birthday notes are pushed to the right people', async () => {
  const ev = await one(lena, `insert into public.events (title, place, starts_at) values ('Bonfire', 'The beach', now() + interval '3 days') returning id`);
  let out = await pushed();
  equal(out.map((m) => m.to).sort(), [TOKEN.alice, TOKEN.bob].sort(), 'new event goes to everyone but its creator');
  equal(out[0].title, 'New event', 'event title');
  assert(out[0].body.startsWith('Bonfire · '), 'event name and time');

  // напоминание: только тем, кто идёт, и только один раз
  await query(alice, `insert into public.event_rsvps (event_id) values ($1)`, [ev.id]);
  equal(await one(ADMIN, `select public.push_event_reminders() as n`), { n: 0 }, 'too early for a reminder');
  await query(ADMIN, `update public.events set starts_at = now() + interval '1 hour', created_at = now() - interval '2 days' where id = $1`, [ev.id]);
  await query(ADMIN, `select public.push_event_reminders()`);
  out = await pushed();
  equal(out.map((m) => m.to), [TOKEN.alice], 'reminder goes only to people who are in');
  assert(out[0].body.startsWith('Starts at ') && out[0].body.endsWith(' · The beach'), 'reminder says when and where');
  await query(ADMIN, `select public.push_event_reminders()`);
  equal(await pushed(), [], 'reminder is not sent twice');
  await query(lena, `delete from public.events where id = $1`, [ev.id]);

  await query(lena, `insert into public.birthday_greetings (to_user_id, body) values ($1, 'Happy birthday, Bob!')`, [bob.uid]);
  out = await pushed();
  equal(out.map((m) => m.to), [TOKEN.bob], 'a birthday note goes only to that person');
  equal(out[0].body, 'Lena sent you a note', 'and does not show the note itself');
  await query(bob, `update public.notification_prefs set birthdays = false`);
  await query(lena, `insert into public.birthday_greetings (to_user_id, body) values ($1, 'Again!')`, [bob.uid]);
  equal(await pushed(), [], 'not if they switched birthdays off');
  await query(bob, `update public.notification_prefs set birthdays = true`);
});

test('the daily word is pushed once, at its time', async () => {
  await query(ADMIN, `delete from public.daily_posts`);
  const post = await one(lena, `insert into public.daily_posts (day, publish_at, quote) values (current_date, now() + interval '1 hour', 'Be still and know.') returning id`);
  await query(ADMIN, `select public.push_due_daily_posts()`);
  equal(await pushed(), [], 'not before its time');

  await query(alice, `update public.notification_prefs set daily_word = false`);
  await query(ADMIN, `update public.daily_posts set publish_at = now() - interval '1 minute' where id = $1`, [post.id]);
  await query(ADMIN, `select public.push_due_daily_posts()`);
  const out = await pushed();
  equal(out.map((m) => m.to).sort(), [TOKEN.bob, TOKEN.lena].sort(), 'to everyone who keeps the daily word on');
  equal([out[0].title, out[0].body, out[0].type], ["Today's word", 'Be still and know.', 'post'], 'what it says');

  await query(lena, `update public.daily_posts set quote = 'Be still, and know.' where id = $1`, [post.id]);
  await query(ADMIN, `select public.push_due_daily_posts()`);
  equal(await pushed(), [], 'fixing a typo does not push again');
  // так пост сохраняет приложение: «вставить, а если на этот день уже есть — обновить»
  await query(
    lena,
    `insert into public.daily_posts (sermon_id, day, publish_at, quote, note) values (null, current_date, now() - interval '1 minute', 'Be still.', null)
     on conflict (day) do update set sermon_id = excluded.sermon_id, day = excluded.day, publish_at = excluded.publish_at, quote = excluded.quote, note = excluded.note`,
  );
  equal((await query(lena, `select quote from public.daily_posts`)).map((r) => r.quote), ['Be still.'], 'saving over an existing day keeps one post');
  await query(ADMIN, `select public.push_due_daily_posts()`);
  equal(await pushed(), [], 'and still does not push again');
  await denied(query(alice, `insert into public.daily_posts (day, publish_at, quote) values (current_date, now(), 'x') on conflict (day) do update set quote = excluded.quote`), /row-level security|permission denied/, 'a member overwrites the daily word');
  await query(alice, `update public.notification_prefs set daily_word = true`);
  await query(ADMIN, `delete from public.daily_posts`);
});

test('a new report is pushed to leaders, without saying who or what', async () => {
  await query(paul, `select public.register_push_token('ExponentPushToken[paul-phone]', 'ios')`);
  await pushed();
  const msg = await one(bob, `insert into public.chat_messages (body) values ('something rude') returning id`);
  await pushed(); // само сообщение тоже вызвало уведомления — они здесь не интересны
  await query(alice, `insert into public.reports (target_type, target_id, preview) values ('chat', $1, 'something rude')`, [msg.id]);
  let out = await pushed();
  equal(out.map((m) => m.to).sort(), ['ExponentPushToken[paul-phone]', TOKEN.lena].sort(), 'goes to leaders only');
  equal([out[0].title, out[0].body, out[0].type], ['New report', 'Someone flagged something. Take a look.', 'report'], 'no message text and no names');

  await query(lena, `insert into public.reports (target_type, target_id, preview) values ('chat', $1, 'something rude')`, [msg.id]);
  out = await pushed();
  equal(out.map((m) => m.to), ['ExponentPushToken[paul-phone]'], 'a leader is not pushed about their own report');
  await query(ADMIN, `delete from public.reports where target_id = $1`, [msg.id]);
  await query(bob, `delete from public.chat_messages where id = $1`, [msg.id]);
  await query(ADMIN, `delete from public.push_tokens where token = 'ExponentPushToken[paul-phone]'`);
});

test('anonymous questions never cause a push', async () => {
  const secret = 'f'.repeat(48);
  const id = (await one(GUEST, `select public.anon_ask($1, $2) as id`, [secret, 'Can I ask something?'])).id;
  await query(lena, `insert into public.anon_messages (thread_id, sender, leader_id, body) values ($1, 'leader', $2, 'Of course')`, [id, lena.uid]);
  await query(GUEST, `select public.anon_reply($1, 'Thanks')`, [secret]);
  equal(await pushed(), [], 'no push for a question, an answer or a reply');
  await query(GUEST, `select public.anon_delete($1)`, [secret]);
});

test('nobody in the app can send a push or see where pushes go', async () => {
  for (const who of [alice, lena, paul]) {
    await denied(query(who, `select public.push_send(array[$1::uuid], 'Hi', 'there', '{}'::jsonb)`, [bob.uid]), /permission denied/, 'send a push by hand');
    await denied(query(who, `select public.push_due_daily_posts()`), /permission denied/, 'trigger the daily word');
    await denied(query(who, `select public.push_event_reminders()`), /permission denied/, 'trigger reminders');
    await denied(query(who, `select * from net.sent`), /permission denied/, 'read what was sent');
  }
  await denied(query(GUEST, `select public.push_send(array[$1::uuid], 'Hi', 'there', '{}'::jsonb)`, [bob.uid]), /permission denied/, 'guest sends a push');
  await denied(query(alice, `update public.events set reminded_at = now()`), /permission denied/, 'fake a reminder mark');
  equal((await query(lena, `select token from public.push_tokens`)).map((r) => r.token), [TOKEN.lena], 'a leader sees only their own phone');
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
