# Sheet Manager Module

## Scope

The current universal sheet implementation supports sentient and droid characters for the Star Wars WEG/WoD hybrid. A vehicle sheet is planned as a separate sheet mode; do not fold vehicle-only state into sentient/droid blocks.

## Structure

```text
src/sheet_manager/
├── components/               # shared sheet controls, viewers, dialogs
├── context/                  # read-only CharacterContext
├── data/                     # bundled character presets
├── features/sheet/components # metadata, traits, Force, body, health, stats
├── hooks/                    # useCharacter and update helpers
├── store/characterStore.ts   # Zustand CRUD + IndexedDB persistence
└── types/character.ts        # Zod schemas, types, defaults, derived helpers
```

## Character Access

All sheet blocks, including derived and experience blocks, use `useCharacter()`:

- viewer context wins when present;
- otherwise the editable Zustand character is used;
- updates are ignored in read-only context.

Do not read `currentCharacter` directly inside a reusable sheet block. Direct store access is appropriate for layout/manager operations that explicitly manage the collection.

## Schema and Import/Export

- `BaseCharacterSchema` is the runtime boundary for JSON imports.
- Blank/missing character names normalize to `''`; the UI displays `New Character` where a label is required.
- IDs are opaque non-empty strings, not necessarily UUIDs, because presets and compatibility data may use stable textual IDs.
- Numeric resource and dot values must be finite integers within their schema limits.
- `forcePowerItems` is the single Force-power representation. Retired `forcePowers` and `customForcePowers` keys are stripped as unknown input.
- Zod object parsing strips unknown keys by default. Do not change schemas to `.passthrough()` without a migration/security reason.
- An import that collides with a stored ID must offer Replace, Duplicate (new ID), or Cancel.
- Export names start with `ttgamer_`; a blank name uses `new_character`.

Persistence migrations are not yet versioned. Any schema change that cannot be handled safely by defaults/unknown-key stripping must first add a Zustand `version` and `migrate` strategy and corresponding fixtures.

## Derived State

- `calculateHealthPenalty()` uses the deepest marked health level.
- Virtues define the minimum Willpower and Dark Side Resistance values shown in `ForceBlock`; merits/flaws may raise the stored values. Neither resource belongs in the read-only `DerivedStatsBlock`.
- Current Force Points may legitimately be zero.
- Detailed formulas are in `.agents/skills/sheet-manager/SKILL.md`.

## UI Rules

- `TraitRowWithInput` is controlled by `specializationText`; parent/store changes must appear immediately.
- Icon-only actions require accessible labels.
- Use Radix primitives for new modal behavior. A modal must label itself, trap focus, close on Escape, and restore focus to its trigger.
- Portrait URLs accept only HTTPS or site-relative resources and must use `referrerPolicy="no-referrer"`. Local portraits are resized, quota-bounded IndexedDB blobs; never put image data URLs or blob contents in Zustand/localStorage JSON.

## Testing

Run schema/import/derived-stat tests for changes to `types/`, persistence, or import/export. Run `yarn verify` before handoff. Load `.agents/skills/sheet-manager/SKILL.md` for schema, store, derived-stat, or block changes.
