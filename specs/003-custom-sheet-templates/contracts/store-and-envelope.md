# Contract: Stores, Envelope, and Module API Surface

Scope: in-app contracts for the new stores and the changed document boundary. Consumers:
`sheet_manager` internals only (no cross-module exports added — Constitution I).

## 1. Template library store (`store/templateStore.ts`)

Zustand + `persist` (async localForage), storage key `'universal-template-storage'`,
`version: 1`.

```ts
interface TemplateStoreState {
    templates: CustomTemplate[];
    // CRUD — all writes pass CustomTemplateSchema.parse; invalid input rejected, not stored
    saveTemplate: (template: CustomTemplate) => void; // upsert by id
    duplicateTemplate: (id: string, newId: string) => CustomTemplate | undefined;
    removeTemplate: (id: string) => void;
    getTemplate: (id: string) => CustomTemplate | undefined; // selector-friendly
}
```

- Owns library persistence only; never touches documents or character data (R1).
- `duplicateTemplate` copies structure verbatim under a new id (caller generates the id).
- Failed persisted entries (schema drift) drop to recovery-style quarantine in state, never
  silently discarded — mirroring the document store's bounded recovery philosophy.
- Preset/template starter skeletons are NOT stored here (code-owned, R4).

## 2. Document envelope change (`types/document.ts` + `types/templateValues.ts`)

```ts
// added to DocumentEnvelopeBaseSchema — optional, additive
templateValues: TemplateValuesSchema.optional().default({});

// TemplateValuesSchema (permissive envelope layer — R6)
// Record<templateId, Record<fieldIdOrBlockId, FieldValueLike>>
// bounds: ≤100 template ids; ≤2,000 entries per template; strings ≤10,000 chars;
// numbers finite; resource-ish values { current: finite int, max: finite int }
// table rows: Record<rowIndex (string), Record<columnId, FieldValueLike>>
```

Store (`documentStore.ts`):

```ts
// new action — write path validation is strict (template in hand)
updateTemplateValues: (
    documentId: string,
    templateId: string,
    updater: (values: TemplateValuesForTemplate) => TemplateValuesForTemplate,
) => void;
```

- Strict write validation resolves the template from `templateStore` + field defs
  (`types/template.ts` unions) and rejects type/bounds/option-membership mismatches (R6).
- Store `version` bumps 1 → 2; `migrateDocumentStoreState` accepts missing
  `templateValues` as `{}`; no other shape changes — existing documents parse unchanged.
- `updateDocumentData` (definition data) is untouched; template values never enter
  definition schemas.

## 3. View resolution (`systems/view.ts` + consumers)

```ts
// existing, unchanged
resolveDocumentView(definition, preferredViewId?): DocumentViewDefinition | undefined;

// new pure helper (same module)
resolveCustomTemplate(
    templateId: string | undefined,
    library: readonly CustomTemplate[],
    documentKind: DocumentKind,
): CustomTemplate | { reason: 'missing' } | undefined;
// undefined            → no template assignment (built-in path)
// { reason: 'missing'} → stale id: render built-in page + fallback notice (FR-13)
// CustomTemplate       → kind-compatible template page
```

`CharacterSheet` / `SheetWorkspace` call `resolveCustomTemplate` first; built-in resolution
remains the fallback and the default. Assignment writes:
`updateDocumentMetadata(id, { templateId })` — set for templates, cleared for built-ins
(`ViewModeSelect` merges both lists; R3).

## 4. Declarative renderer surface (`features/sheet/declarative/`)

```ts
// hooks.ts
useTemplatePage(templateId: string | undefined): {
    template: CustomTemplate | undefined;      // resolved + kind-checked
    status: 'none' | 'ready' | 'missing';
    values: TemplateValuesForTemplate;         // sparse read
    setValue: (fieldId: string, value: FieldValue) => void;      // strict write path
    setRowValue: (blockId: string, row: number, columnId: string, value: FieldValue) => void;
    resolveCatalogField: (field: TemplateField) => CatalogFieldRuntime;  // options + fills
    readOnly: boolean;                          // viewer context (FR-14)
}
```

- `declarativeFieldRegistry.ts`: `Map<field.type, FieldControlComponent>` — one control per
  field type; atoms receive `(field, value, onChange, { disabled })`, never read stores
  (composition scale: atoms).
- Fallback notice, degradation notices, and soft-required markers render at the
  view/shell layer, not inside atoms (a11y: `role="alert"` for notices).

## 5. Editor dialog contract (`components/dialogs/TemplateEditorDialog.tsx`)

```ts
interface TemplateEditorDialogProps {
    base:
        | 'empty'
        | { kind: 'skeleton'; documentKind: DocumentKind }
        | { kind: 'duplicate' | 'edit'; templateId: string };
    onClose: () => void; // prompts confirmation when draft is dirty (R8)
}
```

- Draft is local state; "Save" = `CustomTemplateSchema.parse` → `saveTemplate` (upsert).
- Integrity feedback (duplicate ids, limits, dangling binding targets) computed against the
  draft on each edit (live, per spec edge case).
- Catalog binding editor lists registry entries + their `fillableDetails` and offers default
  mapping targets; incompatible kinds are unselectable (contract §catalog-binding rules 1–3).

## 6. Shell import/export contract (`features/sheet/shell/`)

- Export: per `contracts/template-file-format.md` — saved templates only.
- Import: wrapper + schema + registry validation → conflict dialog on id collision
  (Replace / Duplicate-new-id / Cancel — reuses `ImportConflictDialog` patterns) →
  degradation report on success when catalogs are unavailable.
- Errors surface as `role="alert"` toasts/dialog messages; cancel guarantees zero mutation.

## Testing gates (Constitution V — `yarn verify` tier)

- Round-trip: save → reload → identical template (templateStore persistence).
- Migration: v1 (no bag) → v3 and v2 (nested bag) → v3 flattening, including partial
  declarations and unknown template namespaces; recovery of invalid bags.
- Import: wrapper/schema/registry rejection matrix; degradation path; collision flows.
- Renderer: field-type controls, table rows, orphan visibility, read-only context.
- Binding: closed-set/kind/target validation; copy-on-select semantics incl. replace/clear.
