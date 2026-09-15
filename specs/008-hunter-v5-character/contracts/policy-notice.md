# Contract: Publisher Policy Notices

Boundary: system metadata (`sheet_manager/systems`) ↔ sheet shell, exports, and docs pages.
Implements Constitution Principle VIII for the V5 ruleset and Hunter module (research D6).

## Resolution

```ts
resolveDocumentPolicies(document: { systemId; definitionId }): PublisherPolicy[]
// = plugin.policies ∪ definition.module?.policies, deduplicated, stable order
resolveSystemPolicies(systemId): PublisherPolicy[]   // for templates and docs
```

Unknown policy ids fail registry construction (tested), never at render time.

> Revised 2026-09-15: one full statement on a docs page, badge-only on sheets (common fan-project
> practice; the notice is addressed to the rights holder more than to players).

Policy metadata adds `badge` (site-relative static path, `/img/dark-pack-badge.webp`) and
`aboutPage` (`/docs/v5/dark-pack`). Both paths are prefixed with the locale base URL at render.

## Components (`features/sheet/shell/PolicyNotice.tsx`)

- `<PolicyBadges policies>` — sheets. `<aside aria-label="Publisher notice">` holding one 40 px
  badge per policy, each a link to `aboutPage`; no notice text. Renders nothing when empty.
- `<PolicyStatement policy>` — docs (exported from `docsEmbeds.tsx`). Badge, the verbatim
  `officialNotice` sentences (English, never translated), the localized explanation, and a link
  to `url` (`rel="noopener noreferrer"`).

## Placement

| Surface                                             | Where                                                            | Owner                      |
| --------------------------------------------------- | ---------------------------------------------------------------- | -------------------------- |
| Sheet workspace (any view, any template)            | badge only, bottom-left below the active view, outside templates | `SheetWorkspace`           |
| Docs embeds (`TemplatePreview`, `TemplateFragment`) | never                                                            | —                          |
| Dark Pack docs page                                 | `docs/v5/dark-pack.mdx` and RU mirror — the only full statement  | MDX, test-enforced         |
| Other docs pages                                    | never                                                            | MDX, test-enforced         |
| Document export                                     | top-level `notices`                                              | export in `SheetWorkspace` |
| Template export                                     | wrapper-level `notices`                                          | `templateFile.ts`          |

Surfaces for documents or systems without policies render and write nothing.

## Tests

- Registry: V5 plugin resolves `[dark-pack]` for `hunter`; Star Wars resolves `[]`.
- Workspace render: badge (no notice text) for a hunter under shipped and user templates; absent for Star Wars.
- Export: hunter file contains `notices`; Star Wars file does not; both re-import unchanged.
- Docs: `<PolicyStatement policy="dark-pack" />` appears only in `dark-pack.mdx` (both locales);
  no page uses the retired `<PolicyNotice`.
- Strings: `translations/source/*/ui/sheet/policies.yaml` (generic, not under a system).
