// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // Это правило нужно для сайтов (HTML). В мобильном приложении апострофы и
    // кавычки в тексте («I'm in») выводятся как есть, экранировать их не надо.
    rules: { 'react/no-unescaped-entities': 'off' },
  },
]);
