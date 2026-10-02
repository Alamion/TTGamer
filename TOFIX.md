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

### F-003 — Template editor settings panel is hard to read

**Area:** template editor settings panel (`ElementSettings`, `FieldEditor`, `PrimitiveConfig`)

**Evidence:** 2026-10-02 player report: an author mistook a rating's tag field for its formula field and configured the wrong one; authors find the panel's settings hard to tell apart.

**Recommendation:** Review the panel with the guide's structure: group settings by purpose (what the element shows, where its value comes from, limits and formulas, look, visibility) under headings; give formula inputs their own look (an fx mark, monospace, live validation) and every input a short hint; fold rarely used groups. Check with a quick prototype before the rework.

### F-002 — DataCatalog URL parameter initialization race

**Area:** shared catalog components

**Evidence:** `DataCatalog.tsx` splits URL parameter initialization across `useLayoutEffect` (first render) and `useEffect` (subsequent navigations) using a `firstRender` ref (`src/shared/components/DataCatalog.tsx:355-368`). Potentially fragile under concurrent rendering; no user-visible failure has been reproduced.

**Recommendation:** Revisit if concurrent navigation demonstrates a breakage; converge on one reducer/external-store boundary rather than adding more refs.
