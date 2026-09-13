# Contract: View Resolution, Fallback, and Legacy Retirement

## View model

- `DocumentLayout` has a single declarative form; the `built-in` layout type and `builtInView()` are removed.
- Each view id equals a shipped default template id with the same `documentKind` (asserted by a registry test for every system).
- View tables per definition: [data-model.md](../data-model.md) §6. Character/droid views are unchanged.

## Resolution order (`CharacterSheet.tsx`)

1. `metadata.templateId` set → user template with that id **and** matching kind → render.
   Else → fallback notice + `template-fallback` (`reason: 'missing' | 'kind-mismatch'`), continue.
2. View = `preferredViewId` (id or `legacyIds`) → else `defaultViewId` with `template-fallback` (`reason: 'unknown-view'`) when a stored id did not match.
3. Template = `defaultOverrides[viewId]` if valid → else shipped default.
4. No shipped default (should be unreachable; test-guarded) → fallback notice with no sheet content + `template-fallback` (`reason: 'no-default'`). Never throws.

Document data and `templateValues` are never modified by resolution.

## Retirement (FR-017)

Performed only after all shipped entity templates exist and all MDX replacements are in place (tasks gate).

Archive to `context/legacy-sheet-components/` (tree mirrors `src/`), then delete from `src/`:

- `sheet_manager/features/sheet/blocks/` — `AdvantagesBlock`, `AttributeBlock`, `BaseBlock`, `BodyBlock`, `ForceBlock`, `HealthBlock`, `OtherBlock`, `SkillBlock`, `StatsBlock`
- `sheet_manager/components/viewer/CharacterViewer.tsx` (+ `components/index.ts` export)
- `sheet_manager/features/sheet/registry/builtInBlockRegistry.ts`
- `sheet_manager/features/sheet/views/` — `CreatureSheet`, `VehicleSheet`, `FodderSheet`, `BriefDocumentSheet`, `BriefCharacterSheet`, `StarWarsSheetSupport`
- UI strings `sheet.templates.builtInBlocks.*` except `other` (re-homed under template labels)

Kept (used by the template renderer): body sections, `useBodyHandlers`, `CollapsibleBlock`, `SectionCard`, `TraitRow*`, `CustomTraitList`, `MeritFlawList`, `CatalogSuggest`, `AutoResizeTextarea`, `StatDot`, `CompactConditionTrack`, `DocumentSheetSections` (the `ConditionTrackBlock` member logic moves into the cohort primitive; the export is removed if unused after the move).

Archive rules: `README.md` with source commit + date + "reference only"; `context/**` excluded from typecheck, ESLint, Prettier, Vitest, and the Docusaurus build; entry added to `context/AGENTS.md`.

Tests updated or removed: `built-in-templates.test.ts` (now asserts every view is template-backed), `primitive-parity.test.tsx`, `document-system.test.ts` (layout type), `brief-character-sheet.test.tsx` (removed).

Current-state docs updated: `.agents/skills/sheet-templates/SKILL.md`, `.agents/skills/sheet-manager/SKILL.md`, `src/sheet_manager/AGENTS.md`, `src/sheet_manager/TODO.md` (close the retirement record); spec 006 gets no new banner (it already points at the skill doc).
