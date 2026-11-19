// Единый стиль приложения: цвета, шрифты, отступы.
// Меняя значения здесь, меняем вид всего приложения сразу.

export const colors = {
  bg: '#F6F1EA', // тёплый светлый фон
  surface: '#FFFFFF',
  surfaceAlt: '#FBF8F4',
  ink: '#20152E', // основной цвет текста (тёмная слива)
  inkSoft: '#4A3F57',
  muted: '#7A7085',
  line: '#E9E1D7',
  accent: '#FF5A36', // «рассвет» — главный акцент
  accentSoft: '#FFE6DE',
  sun: '#FFC94A',
  sunSoft: '#FFF3D6',
  plum: '#3B2560',
  plumSoft: '#ECE6F6',
  green: '#1F9D6B',
  greenSoft: '#DDF3E9',
  danger: '#D93A3A',
  dangerSoft: '#FBE3E3',
  white: '#FFFFFF',
};

export const gradients = {
  sunrise: ['#FF5A36', '#FF8A4C', '#FFC94A'] as const,
  dusk: ['#3B2560', '#6B3A86', '#FF5A36'] as const,
  night: ['#20152E', '#3B2560'] as const,
};

export const fonts = {
  display: 'Unbounded_700Bold',
  displayMedium: 'Unbounded_500Medium',
  body: 'Manrope_500Medium',
  bodyRegular: 'Manrope_400Regular',
  bodySemi: 'Manrope_600SemiBold',
  bodyBold: 'Manrope_700Bold',
  bodyHeavy: 'Manrope_800ExtraBold',
};

export const radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

// Цвета для аватарок участников (по кругу)
export const avatarPalette = [
  '#FF5A36',
  '#3B2560',
  '#1F9D6B',
  '#E0A100',
  '#2F6FD6',
  '#C2378C',
  '#0E8A8A',
  '#8A5A2B',
];

// Пары цветов для «плиток» фото/видео в демо-версии
export const mediaTints: [string, string][] = [
  ['#FF8A4C', '#FFC94A'],
  ['#3B2560', '#FF5A36'],
  ['#0E8A8A', '#9BE3C9'],
  ['#2F6FD6', '#B9D4FF'],
  ['#C2378C', '#FFC2DE'],
  ['#20152E', '#6B3A86'],
];
