// Демо-данные для прототипа. Все даты считаются от «сегодня»,
// поэтому прототип всегда выглядит свежим, в какой бы день его ни открыли.

import { mediaTints } from '../theme';
import { addDays, combine, startOfWeek, toBirthday, toISODate, weekDays } from '../lib/dates';
import type {
  Album, AnonThread, BirthdayGreeting, ChatMessage, Comment, DailyPost,
  DeviceSecret, GroupEvent, Idea, MediaItem, Report, Sermon, User,
} from './types';

export interface Db {
  users: User[];
  sermons: Sermon[];
  posts: DailyPost[];
  comments: Comment[];
  events: GroupEvent[];
  ideas: Idea[];
  albums: Album[];
  chat: ChatMessage[];
  threads: AnonThread[];
  greetings: BirthdayGreeting[];
  reports: Report[];
}

let counter = 1000;
export const uid = (prefix = 'id') => `${prefix}_${++counter}`;

// Отпечаток секретного кода. В прототипе — простая функция;
// в настоящем приложении это будет надёжный хэш (SHA-256) на сервере.
export function hashSecret(secret: string): string {
  let h = 5381;
  for (let i = 0; i < secret.length; i++) h = ((h << 5) + h + secret.charCodeAt(i)) >>> 0;
  return `h${h.toString(16)}`;
}

export function makeSecret(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < 32; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export const ME_ID = 'u_me';
const SARAH = 'u_sarah';
const JORDAN = 'u_jordan';
const DAVID = 'u_david';

const now = new Date();
const day = (offset: number) => toISODate(addDays(now, offset));
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60000).toISOString();
const hoursAgo = (h: number) => minutesAgo(h * 60);
const daysAgo = (d: number) => minutesAgo(d * 24 * 60);

// день рождения через N дней («ММ-ДД», без года)
const bday = (offset: number) => toBirthday(addDays(now, offset));

const media = (i: number, emoji: string, kind: 'photo' | 'video' = 'photo', duration?: string): MediaItem => ({
  id: uid('m'),
  kind,
  tint: mediaTints[i % mediaTints.length],
  emoji,
  duration,
});

export function randomMedia(kind: 'photo' | 'video'): MediaItem {
  const emojis = kind === 'photo' ? ['📸', '🌅', '🎉', '🏕️', '🎸', '🙌', '🍕', '⛰️'] : ['🎬', '🎤', '🎸', '🏀'];
  const i = Math.floor(Math.random() * 100);
  return media(i, emojis[i % emojis.length], kind, kind === 'video' ? `0:${10 + (i % 49)}` : undefined);
}

export function buildDemoDb(): { db: Db; deviceSecrets: DeviceSecret[] } {
  const users: User[] = [
    { id: ME_ID, name: 'Alex Carter', birthday: bday(0), role: 'member' },
    { id: DAVID, name: 'David Brooks', birthday: bday(120), role: 'admin' },
    { id: SARAH, name: 'Sarah Mitchell', birthday: bday(45), role: 'leader' },
    { id: JORDAN, name: 'Jordan Reyes', birthday: bday(16), role: 'leader' },
    { id: 'u_mia', name: 'Mia Thompson', birthday: bday(0), role: 'member' },
    { id: 'u_noah', name: 'Noah Williams', birthday: bday(3), role: 'member' },
    { id: 'u_emma', name: 'Emma Davis', birthday: bday(9), role: 'member' },
    { id: 'u_liam', name: 'Liam Johnson', birthday: bday(27), role: 'member' },
    { id: 'u_olivia', name: 'Olivia Martinez', birthday: bday(62), role: 'member' },
    { id: 'u_ethan', name: 'Ethan Clark', birthday: bday(88), role: 'member' },
    { id: 'u_ava', name: 'Ava Lewis', role: 'member' },
    { id: 'u_lucas', name: 'Lucas Walker', role: 'member' },
    { id: 'u_sophia', name: 'Sophia Hall', birthday: bday(250), role: 'member' },
  ];

  // ---------- Проповедь и посты недели ----------
  const week = weekDays(now);
  const lastSunday = toISODate(addDays(startOfWeek(now), -1));

  const sermon: Sermon = {
    id: 's_rooted',
    title: 'Rooted: Staying Steady When Life Shakes',
    preacher: 'David Brooks',
    date: lastSunday,
    paragraphs: [
      'Everybody builds their life on something. Grades, friends, followers, how you look, what people think of you. The question isn\'t whether you have a foundation. The question is whether it holds when the storm shows up.',
      'Jeremiah 17 paints a picture of a tree planted by the water. It sends its roots out toward the stream. When the heat comes, it doesn\'t panic. Its leaves stay green. It keeps bearing fruit, even in a dry year.',
      'Notice that the tree still goes through the heat. Following Jesus doesn\'t mean you skip the hard stuff. It means the hard stuff doesn\'t get the last word, because your roots reach something deeper than your circumstances.',
      'Roots grow in secret. Nobody claps for roots. Nobody posts their roots. But what happens when no one is watching decides what happens when everyone is.',
      'So how do you grow roots? Small things, done daily. Five minutes in the Word before you open your phone. One honest prayer. One friend who knows what\'s really going on with you.',
      'Some of you feel like you\'re barely holding on right now. Hear this: God isn\'t disappointed in you for being tired. He\'s the water, not the weather. Come back to the stream.',
      'You don\'t have to fix your whole life this week. Just pick one root. One habit. One step toward Him. He\'ll meet you there, He always does.',
      'Colossians 2 says to stay rooted and built up in Him, overflowing with thankfulness. Thankfulness is how roots drink. Start there tonight: name three things you\'re grateful for before you sleep.',
    ],
  };

  const postPlan: { quote: number; note?: string; author: string }[] = [
    { quote: 0, note: 'Real question for today: what\'s your life actually built on?', author: SARAH },
    { quote: 1, note: 'Read Jeremiah 17:7-8 today. It takes one minute.', author: SARAH },
    { quote: 2, note: 'Hard days don\'t mean God left. Keep going.', author: JORDAN },
    { quote: 3, note: 'What you do when no one\'s watching matters most.', author: SARAH },
    { quote: 4, note: 'Try it tomorrow: Bible before phone. Just 5 minutes.', author: JORDAN },
    { quote: 5, note: 'If that\'s you right now, talk to one of us. We\'re here.', author: SARAH },
    { quote: 6, note: 'Pick one small step today. See you Sunday!', author: JORDAN },
  ];
  const todayIdx = week.indexOf(toISODate(now));
  // Пн–Сб запланированы; воскресенье — только если сегодня воскресенье
  const lastPlanned = Math.max(5, todayIdx);
  const reactionSets: Record<string, string[]>[] = [
    { '🙏': ['u_mia', 'u_noah', 'u_emma', JORDAN], '🔥': ['u_liam', 'u_ava'] },
    { '❤️': ['u_olivia', 'u_sophia', 'u_mia'], '🙏': ['u_ethan'] },
    { '🙏': ['u_mia', 'u_liam', 'u_lucas', 'u_ava', SARAH], '❤️': ['u_emma', 'u_noah'], '🔥': ['u_ethan'] },
    { '🔥': ['u_noah', 'u_liam', 'u_olivia'], '🙌': ['u_mia', 'u_sophia'] },
  ];
  const posts: DailyPost[] = postPlan.slice(0, lastPlanned + 1).map((p, i) => ({
    id: `p_${i}`,
    sermonId: sermon.id,
    day: week[i],
    time: '07:30',
    quote: sermon.paragraphs[p.quote],
    note: p.note,
    authorId: p.author,
    reactions: i <= todayIdx ? reactionSets[i % reactionSets.length] : {},
  }));

  const todayPostId = `p_${todayIdx}`;
  const comments: Comment[] = [
    { id: uid('c'), postId: todayPostId, userId: 'u_mia', body: 'Needed this today. Thank you 🙏', createdAt: hoursAgo(3) },
    { id: uid('c'), postId: todayPostId, userId: 'u_liam', body: 'The "nobody claps for roots" part got me.', createdAt: hoursAgo(2) },
    { id: uid('c'), postId: todayPostId, userId: SARAH, body: 'Love that you guys are reading these. Proud of you.', createdAt: minutesAgo(50) },
  ];

  // ---------- События ----------
  const events: GroupEvent[] = [
    {
      id: 'e_friday', title: 'Friday Night Youth', place: 'Youth Room, Main Building',
      description: 'Worship, a short message, and games after. Bring a friend! Pizza is on us.',
      startsAt: combine(day(1), '19:00'), going: ['u_mia', 'u_noah', 'u_emma', 'u_liam', SARAH, JORDAN, 'u_ava'], createdBy: SARAH,
    },
    {
      id: 'e_bonfire', title: 'Bonfire & Worship', place: 'Lakeside Park, Shelter 3',
      description: 'Guitars, s\'mores, and a fire. Dress warm. Rides leave the church at 5:30.',
      startsAt: combine(day(6), '18:00'), going: ['u_olivia', 'u_ethan', 'u_mia', JORDAN], createdBy: JORDAN,
    },
    {
      id: 'e_serve', title: 'Serve Day: Food Bank', place: 'Community Food Bank',
      description: 'We\'re packing food boxes for families in our city. Wear closed shoes. Lunch after.',
      startsAt: combine(day(13), '10:00'), going: ['u_sophia', 'u_lucas', SARAH], createdBy: SARAH,
    },
    {
      id: 'e_retreat', title: 'Winter Retreat', place: 'Pine Ridge Camp',
      description: 'Three days away: worship, small groups, snow, and way too much hot chocolate. Sign-up form coming soon.',
      startsAt: combine(day(27), '16:00'), going: ['u_mia', 'u_noah', 'u_emma', 'u_liam', 'u_olivia', 'u_ethan', 'u_ava', 'u_lucas', 'u_sophia', SARAH, JORDAN, DAVID], createdBy: DAVID,
    },
  ];

  const ideas: Idea[] = [
    { id: uid('i'), userId: 'u_noah', title: 'Bowling night', body: 'Loser team buys the fries.', votes: ['u_mia', 'u_emma', 'u_liam', 'u_ava', 'u_ethan', 'u_olivia', JORDAN], createdAt: daysAgo(4) },
    { id: uid('i'), userId: 'u_olivia', title: 'Sunrise hike + prayer', body: 'Early, I know. But worth it. Breakfast after.', votes: ['u_sophia', 'u_mia', 'u_lucas', SARAH, 'u_noah'], createdAt: daysAgo(6) },
    { id: uid('i'), userId: 'u_ethan', title: 'Movie night with a real talk after', body: 'Watch something good, then actually talk about it.', votes: ['u_liam', 'u_ava', 'u_emma'], createdAt: daysAgo(2) },
    { id: uid('i'), userId: 'u_ava', title: 'Bake cookies for the neighbors', body: 'Drop them off with a note from the youth group.', votes: ['u_mia', 'u_olivia'], createdAt: daysAgo(1) },
  ];

  // ---------- Альбомы ----------
  const albums: Album[] = [
    {
      id: 'a_retreat', title: 'Fall Retreat', date: day(-12), createdBy: SARAH,
      items: [
        media(0, '🏕️'), media(1, '🔥'), media(2, '⛰️'), media(3, '🎸', 'video', '1:24'),
        media(4, '🙌'), media(5, '🌅'), media(0, '🛶'), media(2, '🍳'),
        media(1, '🎤', 'video', '0:48'), media(3, '🤝'), media(4, '🌲'), media(5, '✨'),
      ],
    },
    {
      id: 'a_games', title: 'Game Night', date: day(-6), createdBy: JORDAN,
      items: [
        media(3, '🎯'), media(4, '🏓'), media(1, '😂'), media(2, '🍕'),
        media(5, '🏀', 'video', '0:32'), media(0, '🎉'), media(3, '🃏'), media(4, '🥤'),
      ],
    },
    {
      id: 'a_baptism', title: 'Baptism Sunday', date: day(-20), createdBy: DAVID,
      items: [media(2, '💧'), media(3, '🙏'), media(5, '❤️'), media(0, '🎶', 'video', '2:05'), media(1, '🤍'), media(4, '🙌')],
    },
  ];

  // ---------- Общий чат ----------
  const chat: ChatMessage[] = [
    { id: uid('ch'), userId: JORDAN, body: 'Who\'s coming Friday? Need a headcount for pizza 🍕', reactions: { '🙌': ['u_mia', 'u_noah', 'u_liam'] }, createdAt: hoursAgo(26) },
    { id: uid('ch'), userId: 'u_noah', body: 'Me! Can I bring my cousin?', reactions: {}, createdAt: hoursAgo(25) },
    { id: uid('ch'), userId: JORDAN, body: 'Of course. The more the better.', reactions: { '❤️': ['u_noah'] }, createdAt: hoursAgo(25) },
    { id: uid('ch'), userId: 'u_mia', media: albums[0].items[1], forwardedFrom: 'Fall Retreat', body: 'Still thinking about this night', reactions: { '🔥': ['u_emma', 'u_liam', 'u_olivia', SARAH], '❤️': ['u_ava'] }, createdAt: hoursAgo(20) },
    { id: uid('ch'), userId: 'u_emma', body: 'Same. Best retreat so far.', reactions: {}, createdAt: hoursAgo(19) },
    { id: uid('ch'), userId: ME_ID, body: 'Does anyone have a ride to the bonfire? I can chip in for gas', reactions: {}, createdAt: hoursAgo(5) },
    { id: uid('ch'), userId: 'u_liam', body: 'My mom\'s driving, we have 2 seats. I\'ll text you', reactions: { '🙏': [ME_ID] }, createdAt: hoursAgo(4) },
    { id: uid('ch'), userId: 'u_ethan', body: 'free stuff!! click here bit.ly/xx-win', reactions: {}, createdAt: hoursAgo(3) },
    { id: uid('ch'), userId: SARAH, media: media(4, '🎂'), body: 'Happy birthday Mia and Alex!! 🎉', reactions: { '🎉': ['u_noah', 'u_emma', 'u_liam', 'u_olivia', JORDAN], '❤️': ['u_mia'] }, createdAt: hoursAgo(1) },
    { id: uid('ch'), userId: 'u_mia', body: 'Aww thank you!! 🥹', reactions: {}, createdAt: minutesAgo(40) },
  ];
  const spam = chat[7];

  // ---------- Анонимные вопросы ----------
  const mySecret = makeSecret();
  const threads: AnonThread[] = [
    {
      id: 't_mine', secretHash: hashSecret(mySecret), status: 'open',
      createdAt: daysAgo(2), lastMessageAt: hoursAgo(6),
      messages: [
        { id: uid('am'), from: 'asker', body: 'I keep comparing myself to people at school and it makes me feel like I\'m not enough. How do I stop?', createdAt: daysAgo(2) },
        { id: uid('am'), from: SARAH, body: 'Thank you for trusting us with this. First: you\'re not weird for feeling it, almost everyone does. Comparison gets louder the more time we spend looking at other people\'s highlights. Can I ask, when does it hit the hardest?', createdAt: daysAgo(1) },
        { id: uid('am'), from: 'asker', body: 'Mostly at night when I\'m scrolling.', createdAt: hoursAgo(20) },
        { id: uid('am'), from: SARAH, body: 'That makes sense. Try this for a week: phone goes on the charger across the room 30 min before bed, and read Psalm 139 instead. Tell me how it goes?', createdAt: hoursAgo(6) },
      ],
    },
    {
      id: 't_2', secretHash: hashSecret(makeSecret()), status: 'open', preferredLeaderId: JORDAN,
      createdAt: hoursAgo(9), lastMessageAt: hoursAgo(9),
      messages: [
        { id: uid('am'), from: 'asker', body: 'My parents are fighting a lot lately and I don\'t know who to talk to. I don\'t want it to get around.', createdAt: hoursAgo(9) },
      ],
    },
    {
      id: 't_3', secretHash: hashSecret(makeSecret()), status: 'open',
      createdAt: hoursAgo(30), lastMessageAt: hoursAgo(30),
      messages: [
        { id: uid('am'), from: 'asker', body: 'Is it normal to have doubts about God? Sometimes I\'m not sure I believe all of it and I feel guilty.', createdAt: hoursAgo(30) },
      ],
    },
    {
      id: 't_4', secretHash: hashSecret(makeSecret()), status: 'closed',
      createdAt: daysAgo(5), lastMessageAt: daysAgo(4),
      messages: [
        { id: uid('am'), from: 'asker', body: 'How do I tell my friends I don\'t want to go to that party without sounding lame?', createdAt: daysAgo(5) },
        { id: uid('am'), from: JORDAN, body: 'Honestly? Keep it short: "Not my thing, but let\'s hang out Saturday." Real friends will be fine with it. And offering another plan shows you still want them around.', createdAt: daysAgo(4) },
      ],
    },
  ];

  const greetings: BirthdayGreeting[] = [
    { id: uid('g'), toUserId: ME_ID, fromUserId: SARAH, body: 'Happy birthday, Alex! So glad you\'re part of this group. Praying this year is your best one yet. 🎉', createdAt: hoursAgo(2) },
  ];

  const reports: Report[] = [
    { id: uid('r'), reporterId: 'u_emma', targetType: 'chat', targetId: spam.id, preview: spam.body ?? '', createdAt: hoursAgo(2), resolved: false },
  ];

  return {
    db: { users, sermons: [sermon], posts, comments, events, ideas, albums, chat, threads, greetings, reports },
    deviceSecrets: [{ threadId: 't_mine', secret: mySecret }],
  };
}
