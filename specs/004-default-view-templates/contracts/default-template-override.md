# Contract: Default Template Override Store

**Feature**: 004-default-view-templates | **Status**: designed (Phase 1)

## Store shape (templateStore extension)

```ts
interface TemplateStoreState {
    // existing
    templates: CustomTemplate[];
    quarantine: unknown[];
    // new (persisted)
    defaultOverrides: Record<string, CustomTemplate>; // key = view id
    // new actions
    setDefaultOverride: (viewId: string, template: CustomTemplate) => void;
    clearDefaultOverride: (viewId: string) => void; // reset (FR-10)
    // changed semantics
    removeTemplate: (id: string) => void; // refuses registered view ids (FR-11)
    duplicateTemplate: (id: string, newId: string) => CustomTemplate | undefined;
    //   for a default id: snapshots effective (override ?? derived) content (clarification Q1)
}

// new resolved view (selector + renderer + library share one function)
export function resolveEffectiveTemplate(
    id: string,
    state: Pick<TemplateStoreState, 'templates' | 'defaultOverrides'>,
    systemId: string,
    documentKind: DocumentKind
): { template: CustomTemplate; isDefault: boolean; modified: boolean } | undefined;
```

## Derivation & reset

- `viewToDefaultTemplate(view, systemId, kind): CustomTemplate` — pure; identity = `view.id`;
  name/description from the registry label; structure from `view.layout.blocks`.
- Reset = `clearDefaultOverride(viewId)` after explicit confirmation; the pristine original is
  re-derived from the registry — reset never depends on user-stored data (spec assumption).
- Modified state = `defaultOverrides[viewId] !== undefined` (FR-12); clears on reset.

## Page selection & resolution order

1. `metadata.templateId` set → custom template (`tpl:` prefixed in selector) →
   `resolveCustomTemplate` (existing; missing → fallback notice, FR-13/spec-003 FR-13).
2. Else `metadata.preferredViewId` (or definition default) → that view id IS the default
   template id → effective template renders declaratively.
3. No migration, no special-case mapping (clarification Q4); view ids and `tpl:` ids never
   collide in the selector — exactly one entry per page (FR-13).

## Editor & library rules

- Default templates: no delete control; reset control (enabled when modified, confirm dialog);
  duplicate control; "default" badge + "modified" marker (FR-11, FR-12, clarification Q5).
- Draft-until-save applies identically to defaults and custom templates (FR-9); on save, live
  propagation to all assigned documents follows from shared-store resolution (clarification Q2).
- Value consistency full ↔ brief: no synchronization — both compositions bind the same document
  data and shared value keys (spec-003 FR-25) (clarification Q4).

## Persistence & migration

- Store version bumps (template store v1 → v2) solely to add the optional `defaultOverrides`
  map; hydration: absent key → `{}`; each entry validated by `CustomTemplateSchema`, invalid
  entries quarantined (existing pattern). No document-envelope change; no document migration.

## Testing gates (Constitution V — `yarn verify` tier)

- Derivation parity: every registered view's default template renders the same block components,
  order, and accent settings as the built-in path (SC-002).
- Override round-trip: save → reload → effective content = saved; reset → pristine; duplicate →
  independent custom copy with modified content.
- Import with unknown `blockId` degrades without data loss; selector shows no duplicates.
- `removeTemplate` refusal and store v1→v2 migration.
