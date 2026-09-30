# Contract: Reference scope in the editor and on the sheet

## Editor: "Document types" in a reference field's settings

- The list shows every target of `referenceTargetsOf(draft)`, one checkbox each, in scope order.
- Stale targets follow the scope's types. Each one is:
    - checked;
    - labelled with its best known name and the suffix "(unavailable)";
    - uncheckable.
- The last checked target cannot be unchecked, as today.
- A new reference field, or a field retyped to reference, targets the draft's own kind, as today.
- The problems panel lists one entry per stale target: "“{field}” can point to {type}, which
  this setting does not have". Selecting it focuses the field, as other issues do.
- This applies unchanged to a custom list's entry template (spec 016) and to table cells.

## Sheet: reference control

- **Search**: the search offers documents that meet all of these:
    - `inScope`;
    - kind in `targetKinds`;
    - not already selected;
    - not the document itself.
- **Selected entry, in scope**: the title and the open button, with the remove button when
  editable. This is unchanged.
- **Selected entry, out of scope**:
    - the title, and a secondary note "outside this setting" (`text-textSecondary`), which is not
      an alert;
    - the open button;
    - the remove button when editable;
    - a `reference-target-out-of-scope` report (field id, document ids), which the preview
      skips, as for missing targets.
- **Selected entry, missing**: unchanged. It shows the error-styled placeholder, the `role="alert"`
  hint, and the `reference-target-missing` report, which the preview skips.
- **Labels**:
    - the remove button's `aria-label` keeps "Remove {title}";
    - the note is part of the item's text, so screen readers announce it with the title.
- **Editor preview**: it uses the same scope, and reports nothing.

## Storybook

The storybook's template stories list the reader's own documents, so they cannot show fixed entry
states. A `ReferenceEntryVariants` widget on the template elements page renders the reference
control on fixed sample documents: in scope, out of scope, and deleted, in preview mode (no
reports). The editor's stale-target state is covered by editor tests.
