# Tasks: Tailwind 4 Upgrade

**Input**: [spec.md](spec.md), [design.md](design.md)

Stories are delivery steps: US1 (looks the same) is proved by the baseline taken first; US2 (one
current place) is the engine switch and clean-up; US3 completes the dependency and the checks. The
engine switch and the class renames are separate commits, but the site is only compared after both.

## Foundation

- [x] T001 Record the baselines in design.md "Results": installed Tailwind version, the production
      CSS bytes (raw and gzip) of the sheet route from `yarn test:e2e` timings, the `yarn start`
      cold start and one rebuild time, and the browserslist check against Tailwind 4's minimums
      (D10).
- [x] T002 Write the screenshot script in the scratchpad (D1): fixed pages and states, light and
      dark, en and ru, plus the dialog-with-rotated-icon case; capture the Tailwind 3 baseline from
      the built site into the scratchpad. Check the script twice on the same build: identical
      output.

## User Story 1 - The site looks the same (P1)

**Check**: the screenshot comparison stays under 1% of pixels on every listed page, theme, and
language (SC-001).

- [x] T003 [US1] Install `tailwindcss@^4`, `@tailwindcss/postcss`; set `postcss.config.js` to the
      new plugin and drop `autoprefixer` (D2).
- [x] T004 [US1] In `src/css/custom.css` move the palette from `tailwind.config.cjs` to `@theme`
      (D3), add `@source` for `src` and `docs`, and emit utilities inside `.tailwind-root` (D4).
      Check the built CSS: unlayered, `.tailwind-root .bg-primary\/20` present, opacity modifiers
      and `hover:` variants generated.
- [x] T005 [US1] Convert `src/css/tailwind-base-reset.scss` and `set_tailwind_styles.scss` to plain
      CSS (D5), replace each `@apply` with explicit declarations, drop the transform-variable reset
      (D6); update the import in `src/pages/universal_sheet.tsx`.
- [x] T006 [US1] Rewrite `src/shared/components/Palette.tsx` to read `--color-*` tokens from the
      loaded stylesheets (D8); delete `tailwind.config.cjs` and `src/@types/tailwind-config.d.ts`;
      add the `tailwindColors()` unit test next to `tests/sheet_manager/storybook.test.tsx`.
- [x] T007 [US1] Run `yarn verify:fast` and the sheet/editor/dice unit tests and commit the engine
      switch, `feat(deps): Tailwind 4 engine, CSS-first tokens, plain CSS reset (spec 028, US1)`.
- [x] T008 [US1] Write and run the reviewed rename script (D7) over `src` and `docs`: list every
      changed class in the commit message body counts, make bare `ring` and `border` colors
      explicit; search for the old names (`shadow-sm`→old meaning, bare `rounded`, `outline-none`,
      `flex-shrink`, `flex-grow`, `ring ` without width) and confirm none remain unconverted.
      Cross-check against `npx @tailwindcss/upgrade` run on a scratch copy. Commit,
      `refactor: Tailwind 4 utility names (spec 028, US1)`.
- [x] T009 [US1] Build, run the screenshot comparison; fix each difference (or list it under
      "Accepted differences" in design.md); repeat until SC-001 holds. Commit the fixes with the
      list, `fix(styles): match the pre-upgrade look under Tailwind 4 (spec 028, US1)`.

## User Story 2 - Styling is configured in one current place (P1)

**Check**: a throwaway palette color added following the guidance appears as a class (SC-005).

- [x] T010 [US2] Remove `sass`, the `build:styles` script, the `prestart`/`prebuild` style step, the
      generated `src/css/*.css` that now are sources only where redundant, and any `.prettierignore`
      or knip entries for them; confirm `yarn start` and `yarn build` need no extra step (FR-006).
- [x] T011 [US2] Add the throwaway color to `custom.css` per the new guidance, use it in a
      component, see it generated in dev and in the build, and remove it.
- [x] T012 [US2] Run `yarn verify:full` and commit,
      `chore(styles): drop Sass and the JS Tailwind config (spec 028, US2)`.

## User Story 3 - Dependency is current and the checks are green (P2)

**Check**: `yarn outdated` shows no Tailwind entry; no removed v3 class name remains (SC-003).

- [x] T013 [US3] Compare CSS bytes and dev start/rebuild time with T001 (SC-004); investigate a
      growth above 5% gzipped (unused scanned sources, duplicated theme import).
- [x] T014 [US3] Run the removed-name search over `src`, `docs`, and `i18n`; confirm Russian docs
      pages render with the same screenshots (D1 covers ru).

## Finish

- [x] T015 Update guidance, one owner per rule: `.agents/skills/tailwind-theming/SKILL.md` (where
      tokens, the scope selector, and the reset live; the class-name table), root `AGENTS.md` (stack
      row, `src/css` line, commands table without `build:styles`),
      `.agents/skills/docusaurus-integration/SKILL.md` if it mentions the PostCSS setup, and
      `docs/dev/storybook/palette.mdx` if its text names the config file.
- [x] T016 Update `TODO.md` T-088 (Tailwind done; only TypeScript 7 left, blocked on
      typescript-eslint) and run `yarn validate:backlog`.
- [x] T017 Run `yarn verify:full`; walk design.md "Manual walk"; record the results, the accepted
      differences, and the browsers check in design.md; commit,
      `docs: guidance, backlog, and results for Tailwind 4 (spec 028)`.

## Coverage

FR-001 → T003, T008, T014. FR-002 → T004, T007. FR-003 → T004, T009. FR-004 → T002, T009. FR-005 →
T005, T009. FR-006 → T010. FR-007 → commit plan above. FR-008 → T015, T016. SC-001 → T002, T009.
SC-002 → T007, T012, T017. SC-003 → T014, T017. SC-004 → T001, T013. SC-005 → T011.
