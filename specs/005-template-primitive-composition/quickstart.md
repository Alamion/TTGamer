# Quickstart: Template Primitive Composition

**Feature**: 005-template-primitive-composition | **Validation guide** (post-implementation)

## Prerequisites

- `yarn install` up to date; `yarn verify` green (Constitution V tier).
- Dev server: `yarn start` → open `/universal_sheet`.

## Manual validation (user paths, spec order)

### Primitives are placeable and bound (FR-1/2, SC-001)

1. Open the template editor for a new character template; in the block picker, see primitive
   groups (Identity / Traits / Lists / Resources / Tracks) with human-readable binding names.
2. Add: a trait row (Strength), a trait row with input (Blaster), a custom list
   (customSkills) **with presets** ("Occultism" 0, "Lore: Jedi" 1), a resource (Willpower),
   a condition track (Health), an identity field (Name).
3. Override the track: 7 levels with custom names — the editor validates against the profile
   range and prefills defaults.

### Values land in document data (FR-8, SC-003)

4. Assign the template to a character. Edit each primitive: raise Strength, mark Blaster
   specialization, set Occultism to 3, spend Willpower, mark health levels, rename Name.
5. Reload and restart the app — every value persists; the values live in the document's own data
   (verify via document JSON export: skills/attributes/health/customSkills change, templateValues
   only for declarative fields).

### Presets behave like ordinary entries (FR-16)

6. The preset entries appear once; re-assigning the template does not duplicate them.
7. Delete "Lore: Jedi" → it does not reappear on reload (one-time seeding).
8. Edit the template's presets later → already-assigned documents are unaffected.

### Parity and the "no Force" scenario (FR-10, SC-001/SC-002)

9. Open the rebuilt default full-sheet template: identity/attributes/skills/lists/health/
   resources render identically to the previous built-in page; advantages/force/inventory parts
   still render through the retained legacy placements (hybrid, FR-10).
10. Duplicate the default and remove the Force-related part plus several skill rows — the page
    works, Willpower still shows its derived value, omitted traits simply do not appear.

### Brief via compact primitives (FR-7, SC-004)

11. Open the rebuilt brief default: composed from the same bindings with `compact: true`.
    Edit a value on the brief page → the full page shows the same value (and vice versa).

### Degradation and safety (FR-3, SC-005)

12. Import a template referencing an unknown `bindingKey` → labeled placeholder + notice; the
    rest of the page and document data are untouched.

### Legacy demotion (FR-11/12, SC-006)

13. The editor offers no legacy placements for covered content; a pre-005 template containing
    placements still renders through the legacy path.

## Automated gates

```bash
yarn verify        # lint + typecheck + full test suite
```

Expected new tests: binding registry (derivation/scoping/unknown), primitive schema round-trip,
seeding (idempotency/removal/non-propagation/duplicates/read-only), parity of rebuilt defaults,
degradation, mixed persistence.
