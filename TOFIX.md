# TOFIX

The queue of open defects found outside feature cycles. Fixed entries are removed in
the same review that ships the fix — the durable record lives in the commit and the
release summary. Defects discovered while implementing a feature belong to that
feature's task list, not here.

Severity is carried exclusively by the section an entry sits in; entries carry no
lifecycle status. Every entry has a stable `F-###` identifier — assigned once, never
reused for a different entry, never renumbered (gaps after removals are permanent).

## Legend

| Section     | Severity                                    |
| ----------- | ------------------------------------------- |
| 🟠 Critical | Data corruption, crash, or major UX failure |
| 🟡 High     | Significant code smell, refactor needed     |
| 🟢 Medium   | Minor code quality issue                    |
| ⬜ Low      | Nitpick / nice-to-have                      |

## 🟡 High

### F-001 — Roll-sharing webhook secrets exposed to the client

**Area:** dice roller sharing (roll-sharing integration: Discord, Matrix)

**Evidence:** The webhook URL is stored in `sessionStorage` and sent directly from the client via `fetch()`, so it is visible to browser DevTools. Affected surfaces: `src/integrations/roll-sharing/queue.ts`, `src/dice_roller/store/diceRollerStore.ts`, `src/dice_roller/components/DiceRollerSettingsModal.tsx`, `src/dice_roller/components/RollSharingSubscription.tsx`. A Matrix hookshot address is a secret in the same way.

**Recommendation:** Remove the client-side delivery and POST to an authenticated backend endpoint that proxies the message to the chosen service with server-side secret storage; no anonymous proxy. Important but not a release blocker for the offline-first product.

## 🟢 Medium

### F-011 — A section's "?" sits inside its header button

**Area:** sheet sections (`src/sheet_manager/components/sections/CollapsibleBlock.tsx`)

**Evidence:** The section header is one toggle `<button>` holding the title and, inside the heading, the docs "?" link (`DocsPreviewLink`). A link inside a button is invalid nesting: assistive technology does not expose it as a link (Playwright's `getByRole('link')` does not find it; `tests-e2e/smoke/docs-fragment.spec.ts` finds it by its label), and keyboard focus behavior inside a button is undefined. Cards (`SectionCard`) are not affected. Found in spec 045.

**Recommendation:** Make the header a row: the toggle button holding the accent and title, the "?" beside it outside the button, then the chevron inside a second hit area of the same toggle, keeping one tab stop for the toggle and one for the link; check the brief layout heights the browser tests pin.
