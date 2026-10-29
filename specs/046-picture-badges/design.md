# Design: Picture badges

**Spec**: [spec.md](spec.md) | **Date**: 2026-10-29

## Approach

The documents window already draws one badge per document row (`SystemBadge` in
`components/documents/DocumentsTree.tsx`, fed by `documentBadge` in `features/documents/labeler.ts`,
spec 045). This feature widens what `documentBadge` returns from letters to "letters, and maybe a
picture", and teaches `SystemBadge` to draw the picture alone when there is one (FR-010). Two
picture sources:

- shipped settings: one single-colour SVG file per setting in `static/img/settings/`, named on the
  setting system (Star Wars) or the ruleset's module (Vampire, Hunter); rulesets and General keep
  letters;
- user settings: a cleaned SVG string stored on the setting, uploaded in the library's setting form
  (`CreateForm`, which already asks for the text badge).

Order: US1 (marks, the badge drawing them), then US2 (cleaner, schema, form, upload). Drafts of the
marks are approved by the maintainer before tasks (spec clarification).

## Decisions

- **D1 — Shipped marks are files drawn through a CSS mask**: `badgeMark?: string` is a site path
  (`/img/settings/<setting>.svg`) on a setting system's `SystemPlugin` or on a `DocumentModule`; the
  badge draws a `span` with `background: currentColor` and the file as `mask-image`, so a mark takes
  the theme's text colour in light and dark (FR-003) and is fetched only when a badge shows. _Why_:
  one replaceable file per mark (spec assumption), no bytes on the page's initial load (SC-004), no
  loader setup. _Rejected_: importing the SVG as a React component (needs an SVG loader in webpack
  and Vitest, and lands in a JS chunk); `<img>` of the file (cannot follow the theme colour); path
  data in code (not a file the maintainer swaps). A mark is therefore a silhouette: colours inside
  the file are ignored. The mask URL is set on the element itself as an absolute site path
  (`sitePath`): a relative `url()` passed through a CSS variable did not load in the draft page.
- **D2 — A setting's picture is a cleaned SVG string on the setting**:
  `UserSetting.picture?: string`. _Why_: a setting is one library item, and its content is opaque on
  the wire, so the picture is exported, imported, and synced with it with no contract change
  (FR-005). _Rejected_: a blob in the portrait storage (device-only; it would not travel with
  exports or the cloud).
- **D3 — One cleaner, run at upload and at every way in**: `cleanSvgPicture(text)` in
  `src/shared/utils/svgPicture.ts` parses with `DOMParser` (`image/svg+xml`), rebuilds a new
  document from an allowlist, and returns `{ svg, removed, elements }` or a rejection (`not-svg`,
  `empty`, `too-large`, `too-complex`). The form calls it on upload (FR-011, FR-007);
  `UserSettingSchema` runs it again on `picture` (a transform: a picture that does not come out
  unchanged-or-cleaner within limits is dropped), so a hand-edited library file, a type file, or a
  cloud copy cannot store what the form would refuse. _Why_: one rule for every path that parses a
  setting (store, `libraryFile.ts`, `typeFile.ts`, `libraryActions.ts`). _Rejected_: DOMPurify (a
  new dependency, built for HTML; the allowlist here is small); cleaning only in the form (imports
  would bypass it); rejecting instead of cleaning (spec clarification: clean).
- **D4 — The allowlist**: elements
  `svg g path rect circle ellipse line polyline polygon text tspan defs linearGradient radialGradient stop clipPath title`;
  geometry and presentation attributes
  (`d points x y cx cy r rx ry x1 y1 x2 y2 width height viewBox transform fill stroke stroke-width stroke-linecap stroke-linejoin opacity fill-opacity stroke-opacity fill-rule clip-rule clip-path offset stop-color stop-opacity gradientUnits gradientTransform font-size font-weight text-anchor id`),
  and `style` reduced to the same properties. Any value with `url(` must be `url(#id)`;
  `href`/`xlink:href`, `on*`, `<script>`, `<style>`, `<foreignObject>`, `<image>`, `<use>`, and
  anything else are dropped and counted by kind. Limits after cleaning: 8,192 bytes and 200 elements
  (FR-005); a file over 256 KB is refused before parsing.
- **D5 — The picture is drawn only as an image**:
  `<img src="data:image/svg+xml;charset=utf-8,…" alt="">` (FR-006), the full name staying on the
  badge's `title` and `sr-only` text (FR-002). An `onError` falls back to the letters and reports
  `setting-picture-failed` once per setting through the sheet diagnostics (constitution III).
  _Rejected_: inline SVG markup (would run anything the cleaner missed).
- **D6 — Upload in the setting form**: `CreateForm` (`withBadge`) gains a picture row beside the
  letters: **Upload picture** (a hidden `<input type="file" accept=".svg,image/svg+xml">` behind a
  button, as `ImportPreview.tsx` does), a 32 px preview, **Remove picture** (FR-008), and an inline
  note: what was removed, or why the file was refused (`role="alert"`). Inline, not a toast: it is
  form state the GM reads before saving (`AGENTS.md` §4 toasts are passing notices). `createSetting`
  and `renameItem` take the picture like the text badge.
- **D8 — A badge belongs to the document's setting**: `documentBadge` resolves the user setting
  (spec 045), else the module of the kind's definition (`definition.module`: `badge` letters, its
  label as full name, `badgeMark`), else the system. _Why_: the maintainer asked for marks per
  setting, so a player tells a vampire from a hunter; V5 letters on both said nothing. _Rejected_:
  marks per ruleset (V5, WoD 2e: too broad to tell characters apart).
- **D7 — Badge rule unchanged**: rows are badged when their full names differ (FR-009); the picture
  only changes how a badge is drawn, so the documents window does the same work per row (SC-002).

## Changed types and data

- `systems/types.ts`: `badgeMark?: string` (site path) on `SystemPlugin` and `DocumentModule`;
  `DocumentModule.badge?: DocumentViewLabel`. Marks set on `star-wars-wod` and the V5 `vampire` and
  `hunter` modules; module letters `sheet.v5Vampire.badge` (VtM) and `sheet.v5Hunter.badge` (HtR),
  en + ru (an i18n exception: the same letters in both).
- `systems/userTypes.ts`: `UserSetting.picture?: string`, cleaned by the schema (D3). Optional:
  stored settings without it parse as before; no store version change. Library items are opaque on
  the wire: no contract change.
- `features/documents/labeler.ts`: `documentBadge`/`systemBadge` return
  `{ badge, name, mark?, picture? }`.
- `diagnostics.ts`: code `setting-picture-failed`.
- Translations (`ui/sheet/library.yaml`, en + ru): picture field label, upload, remove, hint
  (limits), removed-parts note, the four refusals.
- `static/img/settings/{star-wars,vampire,hunter}.svg`: the marks, drawn after game-icons.net
  references (own paths; the comment in each file says so). `demon.svg` is the approved mark kept
  for a Demon module (nothing names it yet); a Werewolf mark is deferred, its draft was rejected.
  All four were approved by the maintainer on 2026-10-29.
- `SystemPlugin.badge` / `DocumentModule.badge` doc comments: letters name the game line, not only
  the edition (a D&D ruleset is "D&D 5e", not "5e").

## Principles at risk

- I (`shared/` stays system-independent): `svgPicture.ts` knows SVG, not settings or systems.
- II (validated contracts at boundaries): every parse of a setting cleans its picture (D3).
- III (observable degradation): a picture that fails to draw shows letters and is reported once.
- VI (accessible): the picture is decorative (`alt=""`, mask `aria-hidden`); the full name is the
  tooltip and spoken text; upload and remove are labelled buttons; refusals use `role="alert"`.
- VII (performance): marks are fetched on first display, 3 files under 1 KB each; no new dependency;
  the 3,000-document window timing is rerun.
- VIII (third-party material): marks are original glyphs, no publisher logo or trademark.

## Tests

- `tests/shared/svg-picture.test.ts`: keeps shapes, gradients, `url(#id)` fills, and safe `style`
  properties; removes `<script>`, `on*`, `<foreignObject>`, `<image>`, `<use>`, `href`, external
  `url(...)`, and `<style>`, counting each kind; refuses non-SVG, empty-after-cleaning, over 8 KB,
  over 200 elements, and over 256 KB input; output parses again unchanged (idempotent).
- `tests/sheet_manager/documents-badges.test.tsx`: Star Wars, hunter, and vampire rows draw their
  mark and no letters, named after the setting; a V5 Storyteller character and a note show V5 and
  General; a setting with a picture draws an `img` with `alt=""` and a data URL, without letters;
  without one, letters; a failing `img` falls back to letters and reports once.
- `tests/sheet_manager/setting-picture.test.tsx`: the form uploads a file, shows the preview and the
  removed-parts note, refuses a non-SVG and an oversized file with the previous picture kept,
  removes the picture; saving stores the cleaned string.
- `tests/sheet_manager/library-file.test.ts` (or the existing library import test): a library file
  whose setting carries a script-laden picture imports with the cleaned picture; export keeps it.
- E2E `tests-e2e/smoke/documents.spec.ts` (or a new one): documents of two systems show their marks
  (the mark files load: the smoke test fails on a failed request).

## Manual walk

1. Open the documents window with a Star Wars character, a hunter, a vampire, a V5 Storyteller
   character, and a note → the first three show their setting's mark, no letters; the others show V5
   and General; hovering gives the full name; the same in the dark theme.
2. Library → a user setting → **Edit name and description** → **Upload picture** with a small SVG →
   preview shows; save → its documents show the picture.
3. Upload an SVG with `<script>` and `onload` → note says what was removed; the picture shows.
4. Upload a PNG, and a 300 KB SVG → refused with the reason; the previous picture stays.
5. **Remove picture**, save → its documents show the letters again.
6. Export the setting, delete it, import the file → the picture is back.
7. A phone width (375 px) → badge stays one line, the form fits.

## Implementation notes

- US1: the documents window timing (3,000 documents, every other a hunter, the rest notes, so marks
  and letters both draw) opens in 36 ms (budget 500; 31–57 ms before). Main chunk 290.7 KB gzip
  (290.4 KB after spec 045's US1; the stories since included), under SC-004's 2 KB. Badges are
  computed once per distinct (system, kind, setting) in a render, not per row. A user type owned by
  a V5 module (`owner.moduleId`) shows that module's badge.
