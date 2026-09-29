# Research: Document references scoped to the template's setting

## R1. Which setting a template belongs to

- **Decision**: reuse `catalogScopeOf(registry, template)` from `systems/userCatalogs.ts` (spec 015).
  It already answers "the template's setting" from the template alone:
    - its user setting (`template.settingId`, or the owner of its user type);
    - else the shipped setting: the system plus the module of the template's own definition, or a
      user type's `{systemId, moduleId?}` owner.
- **Rationale**: one rule for "which setting" across catalogs and references. A template that sees
  a catalog also sees the matching document types. No new stored property (spec Assumptions: the
  scope is derived, not stored).
- **Alternatives considered**:
    - Store the scope on the reference field. Rejected: redundant with the template, and it goes
      stale when a template is moved (library moves already re-derive catalog scope).
    - A separate "setting scope" helper that duplicates the derivation. Rejected: two rules would
      drift. If the name `catalogScopeOf` reads oddly at the new call site, a re-export under a
      neutral name is enough; no rename of the existing function.

## R2. Which document types a scope offers

- **Decision**: a pure helper `referenceTargetsOf(registry, template)` returns the scope's types.
  Each type is `{kind, label}` and appears once per kind. The rules per setting are:

| Setting of the template               | Shipped types                                                          | User types                                                                            |
| ------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| User setting `S` (ruleset system `R`) | `R`'s `coreDefinitions` kinds                                          | owned by `{settingId: S}`                                                             |
| Shipped line: system `Y`, module `M`  | definitions of `Y` with module `M`, plus `Y`'s `coreDefinitions` kinds | owned by `{systemId: Y, moduleId: M}`, plus owned by `{systemId: Y}` without a module |
| Shipped system `Y` without a module   | every definition of `Y` without a module                               | owned by `{systemId: Y}` without a module                                             |

- **Examples**:
    - A Hunter page (`wod-v5` + module `hunter`) offers the hunter `character`, the core `mortal`,
      and Hunter's own and V5-level user types.
    - A Star Wars page offers `character` (character and droid share this kind), `creature`,
      `vehicle`, `group`, and Star Wars user types.
    - A V5 core page (`mortal`) offers `mortal` and V5-level user types.
    - A user setting on V5 offers `mortal` and that setting's user types.
- **Rationale**:
    - This matches the layering the library tree already shows (spec 013). User types without a
      module sit at the ruleset level, next to the core definitions every line reuses.
    - A setting system (Star Wars) does not get its ruleset's (WoD 2e) documents: those are
      documents of another system. This follows the maintainer's scope decision.
    - A user setting does not get the ruleset-level user types (owned by `{systemId}` without a
      module), while shipped lines do. Their documents carry no `settingId`, so they could never
      be in a user setting's document scope (R3); offering them there would give a target with
      nothing to pick.
    - A template whose system is not registered (orphaned) gets no targets: every stored target
      is stale (R5), and the sheet offers nothing new.
- **Alternatives considered**:
    - Deduplicate `listTemplateTargets()` by `system/kind` and filter by system only. Rejected: a
      Hunter page would still see types of other V5 lines and every user setting on V5.
    - Leave V5-level user types out of line pages. Rejected: they are the user's shared types for
      the ruleset, by the same logic as core definitions.

## R3. Which documents a reference offers on the sheet

- **Decision**: a document is **in scope** when:
    - its `systemId` is the scope's system (the user setting's ruleset for a user setting);
    - its `metadata.settingId` equals the template's user setting, or both are absent;
    - its `kind` is one of the scope's types.

    The search offers in-scope documents whose kind is a target, excluding the document itself. The
    hook builds `DocumentOption`s with an `inScope` flag from the current template. The control
    filters by `inScope` and `targetKinds`.

- **Rationale**:
    - Line membership inside `wod-v5` needs no extra rule, because kinds are distinct per line
      (`character` is Hunter's) and core kinds are shared on purpose.
    - Documents of a user setting are excluded from shipped pages by `settingId`, as for page
      assignment (`templateMatchesSetting`).
    - T-082 may refine core characters inside lines later without changing this contract.
- **Alternatives considered**:
    - Match documents by `definitionId`'s module. Rejected: core documents have no module, and it
      duplicates what the kind already says.

## R4. Stored entries outside the scope (spec open question)

- **Decision**: an entry whose document exists but is not in scope, or whose kind is no longer a
  target, shows:
    - the document's title;
    - an "outside this setting" note (`text-textSecondary`, not an error colour);
    - the usual open button;
    - the remove button when the sheet is editable.

    It is not reported as missing. It reports its own diagnostic, `reference-target-out-of-scope`
    (field id and document ids), once per set of out-of-scope ids, exactly like
    `reference-target-missing`: skipped in the preview, and asserted in tests with
    `takeSheetIssues`.

- **Rationale**: the document exists. Showing it as missing would look like data loss, and the link
  still works. This is the spec's User Story 3. The display is still a fallback, so constitution
  III requires it to be observable to developers.
- **Alternatives considered**: showing the missing placeholder. Rejected, because it hides a
  working link.

## R5. Stale targets in the editor and on import

- **Decision**:
    - `validateTemplateReferences` gains an issue `reference-target-unavailable` with the field id
      and the kind, for every `targetKinds` entry the scope does not offer. It checks page fields,
      table cells, and custom list items alike.
    - The draft issue list shows it with the field's label and the type's best known name, which
      is found through any system's definitions, or else the raw id.
    - The editor's type list shows these targets after the scope's types: checked, labelled
      "unavailable", and still uncheckable.
    - The "last target cannot be unchecked" rule is unchanged.
    - The schema is unchanged, so load, import, and save keep the targets as they are.
    - **Import**: `resolveImportedTemplate` already reports every `validateTemplateReferences`
      issue as `template-reference-invalid`.
        - A single template file imports into the types and settings already installed, so it
          keeps the scope check: a stale target is reported once, and the template is still
          accepted.
        - A library file is parsed before its own types and settings are installed, so the scope
          would be wrong (its own user types would read as stale, and its user settings as
          unknown). Library parsing therefore calls `validateTemplateReferences` with
          `{ referenceScope: false }`, which skips only this check. The editor reports real
          stale targets once the file is installed.
- **Rationale**: this is the same pattern as unknown catalogs (spec 015). The issue is not blocking;
  it is visible and fixed by the author's own action. Skipping the check during library parsing
  avoids false reports without a second, file-local registry.
- **Alternatives considered**: pruning on load. Rejected by FR-010.

## R6. Names in the type list

- **Decision**: each offered type is labelled with `kindLabel(systemId, kind)`. When two offered
  types read the same (for example a user type named "Character" next to Hunter's character),
  both get the setting's name through `targetLabel`.
- **Rationale**: this is FR-004. Short names in the common case, with no ambiguity when names
  collide.

## R7. Testing and verification

- **Pure tests**: `referenceTargetsOf` for each row of the R2 table and the examples, and document
  scope (R3) with Star Wars, Hunter, V5 core, and user-setting documents.
- **Component tests**:
    - the sheet search offers 0 foreign documents;
    - out-of-scope entries show their title and note, and can be opened and removed;
    - read-only hides remove;
    - the same holds for a list item of type reference.
- **Editor tests**: the offered types per setting, stale targets shown and reported, and
  unchecking a stale target.
- **Other**: the storybook guard, and `yarn verify:full` because documentation paths change.
