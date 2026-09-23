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

### F-001 — Discord webhook secret exposed to the client

**Area:** dice roller sharing (Discord delivery integration)

**Evidence:** The webhook URL is stored in `sessionStorage` and sent directly from the client via `fetch()`, so it is visible to browser DevTools. Affected surfaces: `src/integrations/discord/webhook.ts`, `src/dice_roller/store/diceRollerStore.ts`, `src/dice_roller/components/DiceRollerSettingsModal.tsx`, `src/dice_roller/components/DiscordWebhookSubscription.tsx`.

**Recommendation:** Remove the client-side `sendToDiscordWebhook` call and POST to an authenticated backend endpoint that proxies the message to Discord with server-side secret storage; no anonymous proxy. Important but not a release blocker for the offline-first product.

## 🟢 Medium

### F-003 — Panel rolls show no roll toast in a production build

**Area:** dice roller panel / theme shell

**Evidence:** `src/theme/Root.tsx` subscribes to `onRollResult` and raises a roll toast for every
result, and the same subscription feeds the history list. In a production build (`yarn serve`)
a roll started from the dice panel updates the history but no toast ever appears; the
react-hot-toast container stays empty. Reproduced on the pre-change baseline build as well, so
it predates the spec 010 changes and is not caused by them. Found while verifying the 3D
fallback notice, which is why that notice is covered by a component test instead of a browser check.

**Recommendation:** find out whether the `dice-logic/dice-roller` module is duplicated across
chunks (two callback registries) or whether the toast is rendered and immediately dismissed;
add a regression test for "a roll raises exactly one toast" once the cause is known.

### F-002 — DataCatalog URL parameter initialization race

**Area:** shared catalog components

**Evidence:** `DataCatalog.tsx` splits URL parameter initialization across `useLayoutEffect` (first render) and `useEffect` (subsequent navigations) using a `firstRender` ref (`src/shared/components/DataCatalog.tsx:355-368`). Potentially fragile under concurrent rendering; no user-visible failure has been reproduced.

**Recommendation:** Revisit if concurrent navigation demonstrates a breakage; converge on one reducer/external-store boundary rather than adding more refs.
