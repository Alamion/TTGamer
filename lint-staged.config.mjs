// Commit check (spec 024): only staged files, with caches. Type check and tests run on push.
const eslint =
    'eslint --cache --cache-location node_modules/.cache/eslint/ --no-warn-ignored --fix';
const prettier = 'prettier --write --cache --ignore-unknown';

export default {
    '*.{ts,tsx,js,mjs,cjs}': [eslint, prettier],
    '*.{md,mdx,json,yaml,yml,css,scss,html}': prettier,
    '**/{TODO,TOFIX}.md': () => 'yarn -s validate:backlog',
    'translations/**': () => 'yarn -s validate:i18n',
};
