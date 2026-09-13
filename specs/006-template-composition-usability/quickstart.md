# Quickstart: Template Composition Usability — Validation Guide

**Feature**: 006-template-composition-usability
Prerequisites: Node + yarn; dev server (`yarn start`, http://localhost:3000) →
`/universal_sheet`; a Star Wars sentient character. Full contract details:
[template-node-model](./contracts/template-node-model.md),
[formula-grammar](./contracts/formula-grammar.md),
[binding-registry-v2](./contracts/binding-registry-v2.md).

Automated gates first:

```bash
yarn verify          # lint + typecheck + full test suite (schema/persistence tier)
yarn build:translations && yarn validate:i18n   # en/ru strings
yarn validate:data   # catalogs referenced by equipment/list bindings
```

Scenarios (run with `yarn start`; each maps to spec acceptance scenarios):

1. **Free composition (US1)** — Template editor → new template: add a bare field at page
   root; add a section → section → table (3 levels); add a group with one field. Save,
   assign to the character. _Expected_: every element renders and edits at its level; values
   persist across reload/restart. Try nesting beyond the depth limit → actionable rejection,
   nothing written.
2. **Affordances (US2)** — In the editor, verify every panel shows a left-edge grip handle
   and a right-edge collapse chevron (never the same icon/side). Drag a group into another
   section — whole subtree moves, collapse state unchanged; focus the grip and use arrow keys
   to move; toggle collapse — order unchanged. Keyboard-only pass over both controls.
3. **Presentation (US3)** — View the page: sections render without background boxes with
   accent markers and docs links (link click must not toggle); groups render the surface card
   with always-visible title; a collapsible group stays collapsed after reload. Section with
   `columns: 2` lays direct children into two columns (stacking on narrow viewport).
4. **Derived fields & dynamic maxima (US4)** — Build: rating field with
   `maxFrom: 'willpower.max'`; formula field `passion + self-control`; Force Points primitive
   with `maxFrom: 'self-control * 2'`. Edit sources: derived value updates immediately;
   exceeding a cap is impossible and display clamps; lower the cap → display clamps without
   rewriting the stored value. Delete the source field → labeled degraded state, rest of the
   page intact. Try `a = b + 1; b = a` cycle → save rejected naming the cycle. Division by
   zero → explicit error state, not a wrong number.
5. **Image field (US4)** — Add an image element; upload a large device photo (stored resized
   and bounded) and an HTTPS URL (renders); enter an `http://` URL → clear rejection. Export
   the character JSON: no image blob data present; reload → device image still displays.
6. **Custom lists (US5)** — Add a value-key list (2 columns) at page root and a system-bound
   list inside a group: add/edit/remove entries in both; two lists with different coordinates
   stay independent; presets seed once as ordinary entries (remove one, re-assign — it stays
   removed). No hardcoded three-column layout anywhere.
7. **Remaining card elements (US6)** — Compose a full template: identity fields, portrait
   image, attribute/skill trait rows, custom lists, Force skills/virtues/resources, Force
   powers, merits/flaws, backgrounds, equipment sections, health track, derived stats.
   Compare side-by-side with the built-in page: every interactive capability present, zero
   `built-in` placements. Assign a merits element to a vehicle page → labeled placeholder.
8. **Retirement of pre-feature templates (US1/US3/FR-4)** — With a pre-feature saved
   template present (old `sections` shape), reload: the store migrates it to quarantine, the
   document falls back to the built-in page with the stale-template notice, document data and
   stored values untouched, no console errors.
9. **Degradation sweep (SC-006)** — Import a template with an unknown `bindingKey` and an
   unknown formula coordinate: both render as labeled placeholders; zero crashes; document
   data unchanged.
10. **i18n / a11y spot-check (FR-22)** — Switch the site to Russian: all new editor and page
    strings localize (no raw keys). Keyboard-only pass: every collapsible exposes
    `aria-expanded`, image/formula errors announce via `role="alert"`, grip and chevron are
    labeled and operable.

Definition of done: all scenarios pass; `yarn verify` green; default templates show zero
legacy placements (see `default-templates.test.ts`); retirement covered by
`template-store-migration.test.ts`.
