# Quickstart: Built-in Views as Default Templates

**Feature**: 004-default-view-templates | **Validation guide** (post-implementation)

## Prerequisites

- `yarn install` up to date; `yarn verify` green (per Constitution V, schema/persistence tier).
- Dev server: `yarn start` → open `/universal_sheet`.

## Manual validation (user paths, spec order)

### Default templates appear without action (FR-1, SC-003)

1. Fresh profile (clear IndexedDB) → open page selector.
2. Verify every registered view of the active system appears exactly once, labeled "default",
   before any custom templates.
3. Reload the page → default entries persist (derived, not stored until modified).

### Ready-made blocks are placeable and mixable (FR-2, FR-3)

4. Create a new template; in the block picker, choose a ready-made block (e.g., character header).
5. Add a full-composition block (e.g., attributes) and a brief-composition block (e.g., brief
   header) to the same section. Both render with correct interactive behavior.
6. Verify accent color picker (FR-2): switching primary/secondary re-renders the block.

### Editing a default template in place (FR-9, FR-10)

7. Select a default template (e.g., full sheet) → edit a label or reorder blocks → save.
8. Reload → modified content persists; every document assigned to it renders the modified version.
9. Verify document data values are consistent between full and brief compositions (edit a value
   on one page; open the other — value matches; FR-8).

### Reset to pristine (FR-10, FR-12)

10. On a modified default template → reset → confirm → block structure and presentation match the
    registry original exactly; "modified" marker clears.
11. Decline the confirmation → nothing changes.

### Duplication & deletion (clarification Q1, Q5)

12. Duplicate a default template → new independent custom template with identical content;
    original default unchanged. Editing the copy never affects the default.
13. Attempt delete on a default template → refused (FR-11) with explanatory message.

### Unavailable ready-made blocks (edge case)

14. Simulate an unavailable block (import referencing an unknown blockId, or registry entry
    removed) → page renders a labeled placeholder + notice; rest of template intact; document data
    untouched (FR-4).

## Automated gates

```bash
yarn verify        # constitution tier: schema round-trip, parity, persistence
yarn test          # full suite
```

Expected new tests:

- `default-template-derivation.test.ts` — every registered view derives a template; ids unique;
  reset restores pristine.
- `default-override-persistence.test.ts` — override survives reload; reset confirmed; duplicate
  isolation.
- `built-in-selector-merge.test.tsx` — selector lists view ids + `tpl:` ids, one entry per page,
  no duplicates (SC-002, FR-13).
- `built-in-import-export.test.ts` — round-trip with built-in placements; unknown blockId
  degradation (FR-16).
