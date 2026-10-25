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

### F-010 — A note's deleted picture can stay stored when the page closes mid-edit

**Area:** markdown notes, device pictures (`src/sheet_manager/features/sheet/declarative/MarkdownFieldControl.tsx`, `src/sheet_manager/store/documentStore.ts`)

**Evidence:** A picture whose `![[name]]` line is deleted keeps its entry in the value until the text is left (blur, Done/Esc, unmount), so undo can bring it back; the stored blob is deleted only when a version without the entry is written. Closing the tab or browser while the cursor is still in the text can skip that last write, so the entry and its blob stay until the note is opened and left again. No background sweep finds blobs no reference names.

**Recommendation:** On document load (or at boot, next to `purgeDeleted`), drop picture entries that the text no longer names and let `releaseImages` free their blobs; optionally a boot sweep of stored portrait ids that no document references.
