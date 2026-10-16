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

### F-009 — Device images in page values are never deleted

**Area:** sheet documents (image fields of custom pages, image storage)

**Evidence:** An image field on a custom page stores an uploaded picture as a `device` blob (`fieldControls.tsx`, `savePortrait`); replacing or removing the picture, resetting the document, or deleting it leaves the blob in IndexedDB, because only the bound portrait (`metadata.portraitId`) is ever passed to `deletePortrait` (`documentStore.ts`, `documentBoot.ts`). Each replaced picture keeps up to 10 MB on the device.

**Recommendation:** Collect the device blob ids a document's page values reference and delete the ones a write, reset, or purge stops referencing, the way the portrait is handled; or sweep unreferenced blobs at start.
