// Помощники для работы с датами и временем (всё в местном времени телефона).

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function todayISO(): string {
  return toISODate(new Date());
}

// Понедельник текущей недели
export function startOfWeek(d: Date = new Date()): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const shift = (x.getDay() + 6) % 7; // Пн = 0
  return addDays(x, -shift);
}

// 7 дат недели, Пн–Вс
export function weekDays(d: Date = new Date()): string[] {
  const mon = startOfWeek(d);
  return Array.from({ length: 7 }, (_, i) => toISODate(addDays(mon, i)));
}

export const weekdayShort = (iso: string) => WEEKDAYS[parseISODate(iso).getDay()];
export const weekdayLong = (iso: string) => WEEKDAYS_LONG[parseISODate(iso).getDay()];
export const monthShort = (iso: string) => MONTHS[parseISODate(iso).getMonth()];
export const dayOfMonth = (iso: string) => parseISODate(iso).getDate();

// «Thursday, November 19»
export function formatDayLong(iso: string): string {
  const d = parseISODate(iso);
  return `${WEEKDAYS_LONG[d.getDay()]}, ${MONTHS_LONG[d.getMonth()]} ${d.getDate()}`;
}

// «Thu, Nov 19»
export function formatDayShort(iso: string): string {
  const d = parseISODate(iso);
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

// «Nov 19»
export function formatMonthDay(iso: string): string {
  const d = parseISODate(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function formatMonthYear(d: Date): string {
  return `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

// «7:00 PM» из полной даты-времени
export function formatTime(iso: string): string {
  const d = new Date(iso);
  return formatHM(d.getHours(), d.getMinutes());
}

// «07:30» -> «7:30 AM»
export function formatHHMM(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  return formatHM(h, m);
}

function formatHM(h: number, m: number): string {
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${suffix}`;
}

// Собрать дату-время из «ГГГГ-ММ-ДД» и «ЧЧ:ММ»
export function combine(dateISO: string, hhmm: string): string {
  const d = parseISODate(dateISO);
  const [h, m] = hhmm.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

export function hhmmOf(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// «now», «5m», «2h», «3d»
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return formatMonthDay(toISODate(new Date(iso)));
}

// День рождения хранится как «ММ-ДД» (без года).
function birthdayParts(md: string): [number, number] {
  const [m, d] = md.split('-').map(Number);
  return [m, d];
}

// Через сколько дней ближайший день рождения (0 = сегодня)
export function daysUntilBirthday(md: string): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [m, d] = birthdayParts(md);
  let next = new Date(today.getFullYear(), m - 1, d);
  if (next.getTime() < today.getTime()) next = new Date(today.getFullYear() + 1, m - 1, d);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

export const isBirthdayToday = (md?: string) => !!md && daysUntilBirthday(md) === 0;

// «November 19»
export function birthdayLabel(md: string): string {
  const [m, d] = birthdayParts(md);
  return `${MONTHS_LONG[m - 1]} ${d}`;
}

// «ММ-ДД» из даты
export function toBirthday(date: Date): string {
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function greetingForNow(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Morning';
  if (h >= 18 || h < 5) return 'Evening';
  return 'Hey';
}

// Сколько осталось до автоудаления (7 дней после последнего сообщения)
export const AUTO_DELETE_DAYS = 7;
export function deletesInLabel(lastMessageAt: string): string {
  const end = new Date(lastMessageAt).getTime() + AUTO_DELETE_DAYS * 86400000;
  const left = end - Date.now();
  if (left <= 0) return 'Deleting soon';
  const days = Math.floor(left / 86400000);
  if (days >= 1) return `Deletes in ${days} day${days === 1 ? '' : 's'}`;
  const hours = Math.max(1, Math.floor(left / 3600000));
  return `Deletes in ${hours} hour${hours === 1 ? '' : 's'}`;
}

// «ММ-ДД» -> «MM/DD» (как дату вводит и видит человек)
export function birthdayToInput(md?: string): string {
  return md ? md.replace('-', '/') : '';
}

// «MM/DD» -> «ММ-ДД»; null, если введено что-то непонятное
export function parseBirthdayInput(text: string): string | null {
  const m = text.trim().match(/^(\d{1,2})[/.\-](\d{1,2})$/);
  if (!m) return null;
  const mm = Number(m[1]);
  const dd = Number(m[2]);
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (mm < 1 || mm > 12 || dd < 1 || dd > daysInMonth[mm - 1]) return null;
  return `${pad(mm)}-${pad(dd)}`;
}
