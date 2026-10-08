# Design: Tailwind 4 Upgrade

**Spec**: [spec.md](spec.md) | **Date**: 2026-10-08

## Approach

Tailwind's setup today is three files: `tailwind.config.cjs` (palette,
`important: '.tailwind-root'`, content globs), `postcss.config.js` (tailwind + autoprefixer), and a
SCSS pair that builds the scoped reset and base rules into tracked `.css` files
(`yarn build:styles`, run by `prestart`/`prebuild`). `custom.css` carries
`@tailwind components/utilities`; the sheet page imports the reset itself. A probe on Tailwind 4.3
showed what is needed: `.tailwind-root { @tailwind utilities; }` emits `.tailwind-root .p-4`-style
selectors (the same specificity as v3 `important`), and theme colors defined as
`rgb(var(--primary) / 1)` keep working with opacity modifiers (`bg-primary/20`).

Order of work:

1. **Visual baseline** on Tailwind 3 (D1), before any change.
2. **Engine switch**: `@tailwindcss/postcss`, tokens into `@theme`, scoped utilities, reset moved
   from SCSS to plain CSS, `Palette` reading the CSS tokens.
3. **Class renames** (D7), then compare with the baseline and fix what differs.
4. **Clean-up**: remove `sass`, `autoprefixer`, the config file, generated CSS from the repo;
   guidance and backlog.

## Decisions

- **D1 — Visual check**: a Playwright script (kept in the scratchpad, not committed) screenshots a
  fixed list on the built site, light and dark, en and ru: home, a docs page with admonitions and a
  catalog table, the sheet (empty, the full shipped sheet), the template editor open with a tracker
  selected, library dialog, dice panel (2D), the storybook palette page. Compared with `pixelmatch`
  at 1% pixels. _Rejected_: committed screenshot tests (fonts and GPU make them flaky on CI, see the
  §11 flaky policy).
- **D2 — Integration**: `@tailwindcss/postcss` in `postcss.config.js`, `autoprefixer` removed
  (Tailwind 4 prefixes through its own pipeline). _Rejected_: the Vite plugin or CLI (Docusaurus
  builds with webpack).
- **D3 — Tokens**: colors move from `theme.extend.colors` to `@theme` in `src/css/custom.css`
  (`--color-primary`, `--color-primary-hover`, …), names unchanged so classes keep their names.
  `tertiary`'s `<alpha-value>` becomes a plain value. `@source` lists `src` and `docs` (the former
  `content` globs). _Why_: custom.css already owns the CSS variables and the dark overrides, so
  palette and tokens sit in one file. _Rejected_: a second `theme.css` (two owners).
- **D4 — Scope**: utilities are emitted inside `.tailwind-root { @tailwind utilities; }`, with the
  unlayered result checked in the built CSS (a `@layer utilities` rule would lose to Infima's
  unlayered rules). The default theme import excludes the preflight; the project keeps its own
  reset. _Rejected_: Tailwind's global `important` flag (not scoped, wins over Docusaurus on every
  page).
- **D5 — Reset and base rules**: `tailwind-base-reset.scss` and `set_tailwind_styles.scss` become
  plain CSS (native nesting, processed by the same PostCSS pipeline); `@apply` lines become explicit
  declarations using the `--color-*` variables, so no `@reference` is needed. `sass`,
  `build:styles`, and the generated `.css` are deleted, and `prestart`/`prebuild` lose the style
  step (FR-006). _Rejected_: keeping SCSS (a second build step with no purpose once nesting is
  native).
- **D6 — Transform variables**: the SCSS resets `--tw-translate-*`, `--tw-rotate`, `--tw-skew-*` on
  every element to stop a dialog's `-translate-1/2` leaking into a rotated icon. Tailwind 4 emits
  the standalone `translate`/`rotate` properties, which do not inherit that way. The hack is removed
  and the dialog-with-rotated-icon case is in the D1 list; it is restored in v4 terms only if the
  comparison shows the leak.
- **D7 — Renamed utilities** (counts from a search of `src` and `docs`, to be exact in T-tasks):
  `shadow`→`shadow-sm` and `shadow-sm`→`shadow-xs`, `rounded`→`rounded-sm` and `rounded-sm`→
  `rounded-xs`, `blur`→`blur-sm`, `ring`→`ring-3`, `outline-none`→`outline-hidden` (keeps the
  forced-colors outline v3 had; about 51 uses), `flex-shrink-*`/`flex-grow-*`→`shrink-*`/`grow-*`.
  Ring and border default colors become explicit where a bare `ring`/`border` relied on them. Done
  by a reviewed script in its own commit right after the engine switch (the names mean different
  things on the two majors, so no earlier step is safe), and checked by a search for the old names.
  _Rejected_: the official upgrade tool on the repo (rewrites configs and CSS too; used only on a
  scratch copy as a cross-check).
- **D8 — `Palette` source**: `Palette.tsx` imports `tailwind.config.cjs`, which goes away. It reads
  the `--color-*` declarations from the loaded stylesheets at runtime (and drops
  `src/@types/tailwind-config.d.ts`). _Rejected_: a TS list of colors (a second owner of the
  tokens).
- **D9 — Accepted by default**: `hover:` applies only on hover-capable devices in v4 (no sticky
  hover on touch); `dark:` keeps following the OS setting (the existing `DifficultyTable` use), not
  the site's `data-theme`; both are noted for the maintainer, not changed here.
- **D11 — Line heights**: `@theme` restores Tailwind 3's absolute line heights
  (`--text-sm--line-height: 1.25rem`, …). _Why_: v4's unitless ratios made `text-[10px]` inside a
  `text-sm` row 6px shorter (outline rows 24 → 18 px). _Rejected_: re-spacing every row.
- **D12 — Reset layer**: the reset moves into `@layer base` instead of the planned plain nesting.
  _Why_: v4 emits `space-*`/`divide-*` inside `:where()` (zero specificity), so the unlayered
  reset's `margin: 0` cancelled them (the sheet lost 144 px). _Rejected_: `:where()` around the
  reset selectors (still ties with the utilities and depends on stylesheet order).
- **D10 — Browsers**: Tailwind 4 needs Safari 16.4+, Chrome 111+, Firefox 128+. The project's
  browserslist (`>0.5%, not dead`) is checked against that and the result recorded; a gap goes to
  the maintainer (spec Edge Cases).

## Changed types and data

- CSS and config only: `tailwind.config.cjs`, `postcss.config.js`, `src/css/*`, `package.json`
  (`tailwindcss`, `@tailwindcss/postcss`; remove `autoprefixer`, `sass`, `build:styles`),
  `Palette.tsx`, `src/@types/tailwind-config.d.ts` (deleted), class names in about 134 TSX files. No
  schema, persisted shape, or translation changes.

## Principles at risk

- VI Consistent, accessible experience: focus rings and outlines (`outline-hidden`, `ring-3`) are in
  the D1 list and the keyboard e2e tests run.
- VII Performance: CSS bytes and dev rebuild time are compared with the baseline (SC-004).
- IV Fit-for-purpose: removing SCSS and the JS config reduces moving parts; no compatibility layer.

## Tests

- D1 screenshot comparison (not committed); results recorded in "Results".
- `yarn verify:full` (browser smoke tests fail on any stylesheet error or failed request).
- `tests/sheet_manager/storybook.test.tsx` for the palette page; a unit test that `tailwindColors()`
  returns the known token names (primary, bgSurface, jediBlue, tertiary).
- A search test or script step: no removed v3 class names remain in `src` and `docs`.

## Manual walk

1. `yarn start`, open `/universal_sheet` → styles load, reset applies, no flash of unstyled content.
2. Toggle the dark theme → surfaces, text, borders, and tinted rows switch as before.
3. Open the template editor, select an element, tab through controls → selection and focus look as
   before (outline and ring).
4. Open `/docs/dev/storybook/palette` (dev) → swatches show every palette color with a value.
5. Open a docs page on a phone-width window → navbar, footer, and content look unchanged.

## Results

- Baseline (Tailwind 3.4.19, 2026-10-08): production CSS 137,702 bytes (24,856 gzip, one file);
  `yarn build` 14.8 s (warm cache); sheet JS and CSS 3,702,698 bytes (spec 027 final).
- Screenshot baseline: 42 images (home, docs, catalog, sheet empty/new/dice, library, editor,
  selected, focus; light/dark, en/ru, desktop and 390 px for the docs-type pages). Two captures of
  the same build are pixel-identical.
- Browsers: the project's production browserslist (`>0.5%, not dead, not op_mini all`) is evergreen
  today; Tailwind 4 needs Safari 16.4, Chrome 111, Firefox 128. No supported browser falls outside
  it.

## Final results (2026-10-08)

- Comparison against a Tailwind 3 build of the same commit (`git worktree`, built separately), 42
  images plus difficulty table, bestiary, equipment, V5 docs, and docs index pages in light/dark,
  en/ru, desktop and 390 px: every page is within 0.1% of pixels; the sheet differs by 0.003%
  (color-mix rounding). One long page (equipment, ru, mobile) changed height by 24 px in both
  directions between themes in the baseline itself, so it is capture noise.
- A DOM dump (size, spacing, font, color of every element) of the sheet is identical to Tailwind 3
  except `outline-hidden`'s computed style (`outline-style: none` instead of a transparent 2 px
  outline: invisible, and it keeps the forced-colors outline) and color notation (`oklab(...)` for
  `/N` opacity colors).
- Production CSS 137,702 → 177,897 bytes (24,856 → 28,738 gzipped, +3.9 KB); sheet JS and CSS
  3,702,698 → 3,743,812 bytes (+1.1%). Editor edit 14 ms, move preview 36 ms, open the sheet 116 ms.
  Dev server starts in 5.3 s; a new `--color-*` token and a class using it appear in the dev CSS
  without a restart (SC-005).
- Browser behavior changes accepted (D9): `hover:` only on hover-capable devices.
- Manual walk: steps 1–3 and 5 are covered by the screenshot list (sheet, dark theme, editor focus,
  mobile docs); step 4 (palette page, draft-only) is covered by the unit test that reads the tokens.
  Left for the maintainer: restart `yarn start` once (the PostCSS plugin changed) and look at the
  palette page in the dev server.
