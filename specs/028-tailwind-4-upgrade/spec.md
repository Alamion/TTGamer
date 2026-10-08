# Feature Specification: Tailwind 4 Upgrade

**Branch**: `028-tailwind-4-upgrade` | **Created**: 2026-10-08 | **Status**: Draft

**Input**: "Continue the T-088 upgrades with Tailwind 4 (CSS-first config and the Docusaurus
integration) before the next release. TypeScript 7 stays blocked on typescript-eslint."

## Context

Tailwind 3.4 styles every React tool on the site (sheet, dice roller, template editor, catalogs).
The setup has three unusual parts that the upgrade must keep: utilities are scoped under a
`.tailwind-root` selector so they do not fight Docusaurus's own styles; Tailwind's reset is
hand-written SCSS scoped the same way (`src/css/*.scss`, built by `yarn build:styles`); and the
palette is a set of CSS variables (`--primary`, `--bg-surface`, dark mode via `data-theme`) read by
theme colors with opacity modifiers such as `bg-primary/20`. Tailwind 4 replaces the JavaScript
config with CSS-first configuration, changes defaults (border and ring colors, shadow and radius
scales, outline and `ring` utilities), and requires a new PostCSS integration. This is the last
supported upgrade left in [T-088](../../TODO.md) (TypeScript 7 waits on typescript-eslint). The risk
is visual, not functional: nothing should look different.

## User Scenarios & Testing

### User Story 1 - The site looks the same (Priority: P1)

A player or author opens the home page, a docs page, the sheet, the dice roller, the template editor
and a catalog table, in light and dark themes and in English and Russian. Colors, spacing, borders,
focus rings, and layout match the release before the upgrade.

**Why this priority**: A visual regression is invisible to unit tests and affects every screen.

**Independent Test**: Capture screenshots of a fixed list of pages and states before the upgrade and
compare them after; every difference is either fixed or listed as an accepted change.

**Acceptance Scenarios**:

1. **Given** the same page, theme and language, **When** captured before and after, **Then** the
   difference stays under the agreed threshold, and larger differences are explained.
2. **Given** the dark theme, **When** a theme-colored utility with an opacity modifier is used
   (selected row tint, hovered frame, pressed switch), **Then** the color matches the previous one.
3. **Given** Docusaurus's own navbar, footer, and docs content, **When** the page loads, **Then**
   Tailwind utilities and reset do not change them (the scope boundary still holds).
4. **Given** a keyboard user, **When** focus moves through the sheet, editor and dialogs, **Then**
   focus indicators look the same as before.

---

### User Story 2 - Styling is configured in one current place (Priority: P1)

A maintainer adding a color or changing the palette edits the CSS-first theme definition, not a
JavaScript config, and the guidance says where. The reset and the scope selector are maintained in
one place without a separate SCSS build step if the new setup makes it unnecessary.

**Why this priority**: The upgrade is only worth doing if the setup is simpler or no worse to
maintain, and the next maintainer must find it from the guidance.

**Independent Test**: Add a throwaway palette color following the guidance and use it in a
component; remove it afterward.

**Acceptance Scenarios**:

1. **Given** the upgrade is merged, **When** a maintainer reads the `tailwind-theming` skill,
   **Then** it names where tokens, the scope selector, and the reset live, and no removed file is
   mentioned.
2. **Given** `yarn start`, `yarn build`, and `yarn test`, **When** they run, **Then** styling works
   in the dev server and the production build with no extra manual step.

---

### User Story 3 - Dependency is current and the checks are green (Priority: P2)

A maintainer sees Tailwind on its current major, no deprecated utility names left in the code, and
the whole verification suite passing, with the build size not worse.

**Why this priority**: Completes the Tailwind part of T-088.

**Independent Test**: `yarn verify:full` passes; `yarn outdated` lists no Tailwind entry; search
finds no removed Tailwind 3 class names.

**Acceptance Scenarios**:

1. **Given** the upgrade is merged, **When** `yarn verify:full` runs, **Then** every check passes.
2. **Given** the production build, **When** CSS bytes are compared with the pre-upgrade build,
   **Then** they do not grow noticeably.
3. **Given** the browser smoke tests, **When** they run, **Then** no console error or failed request
   appears (including from the stylesheet).

### Edge Cases

- Classes built dynamically from strings (for example color names joined into a class) are not seen
  by the class scanner: they must still produce their styles.
- Classes in MDX docs and in `docs/` components (outside `src/`) must still be generated.
- The print layout, if any exists, and the 3D dice canvas overlay keep their appearance.
- Browsers: the supported browser set is whatever Tailwind 4 requires; if it excludes a browser the
  site supported before, the maintainer decides before it ships.
- Any utility whose default changed (border color, ring width and color, shadow and radius scale,
  outline, `space-*`/`divide-*`, important modifier position) is either made explicit or confirmed
  identical by the screenshot comparison.

## Requirements

### Functional Requirements

- **FR-001**: The project MUST depend on the current Tailwind major with its supported PostCSS
  integration, and no removed or renamed Tailwind 3 utility MUST remain in code, MDX, or CSS.
- **FR-002**: Utilities MUST stay scoped to `.tailwind-root` (or an equivalent that Docusaurus's own
  styles cannot be affected by) and MUST keep their precedence over component CSS as today.
- **FR-003**: The palette tokens (primary, secondary, tertiary, state colors, surfaces, Star Wars
  colors) MUST keep their names, their values, their dark-mode behavior, and their opacity modifiers
  (`/10` to `/80`, hover variants).
- **FR-004**: Every page in the comparison list (spec 028 design) MUST render within the agreed
  difference in light and dark themes in both languages.
- **FR-005**: The reset MUST keep the effect of today's scoped reset on the tools; where the
  library's own reset replaces the hand-written one, the visual comparison proves it.
- **FR-006**: Development server, production build, tests, and the knip and lint checks MUST work
  without a manual style-build step the maintainer must remember.
- **FR-007**: The migration MUST land in steps that each keep the checks green, so any step can be
  reverted alone.
- **FR-008**: The `tailwind-theming` skill, the root `AGENTS.md` stack row and project structure,
  and the T-088 backlog entry MUST be updated; configuration lives in one place with one owner.

## Success Criteria

- **SC-001**: For the listed pages, themes and languages, at least 99% of pixels match the
  pre-upgrade screenshots, and every remaining difference is explained or fixed.
- **SC-002**: `yarn verify:full` passes with no test removed or weakened.
- **SC-003**: `yarn outdated` lists no Tailwind entry and no Tailwind 3 class name remains.
- **SC-004**: Production CSS for the sheet route grows by no more than 5% (gzipped) over the
  pre-upgrade build, and the dev server starts and rebuilds no slower than before.
- **SC-005**: A new palette color can be added by editing one file, following the guidance.

## Assumptions

- Visual comparison uses Playwright screenshots taken locally before and after on the same machine
  and browser build; they are a one-time migration check, not a committed test suite.
- The `.tailwind-root` scope stays (Docusaurus and Infima still own the rest of the page).
- Tailwind's upgrade tool may be used as a reading aid, but its output is reviewed and committed in
  small steps rather than applied wholesale.
- TypeScript 7 is out of scope (blocked on typescript-eslint); `@types/node` stays out as before.
- This is a regular spec rather than a small change because it touches the build pipeline and every
  styled screen.
