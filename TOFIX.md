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

### F-002 — DataCatalog URL parameter initialization race

**Area:** shared catalog components

**Evidence:** `DataCatalog.tsx` splits URL parameter initialization across `useLayoutEffect` (first render) and `useEffect` (subsequent navigations) using a `firstRender` ref (`src/shared/components/DataCatalog.tsx:355-368`). Potentially fragile under concurrent rendering; no user-visible failure has been reproduced.

**Recommendation:** Revisit if concurrent navigation demonstrates a breakage; converge on one reducer/external-store boundary rather than adding more refs.

### F-004 — 3D dice spawn inside each other and scatter at high speed

**Area:** dice roller 3D physics (`src/dice_roller/dice-logic/renderer/`)

**Evidence:** A player reported that thrown dice can pass into each other, after which the physics engine's penetration resolution flings them apart at high speed. The default spawn vector in `shapes.ts` (`createDefaultVector`) places every die independently at a random point of a 100×100 square at the same height, with launch speeds up to ~2 250 units/s, and CCD is disabled (`ccdSpeedThreshold`/`ccdRadius` commented out) — nothing prevents overlapping spawns or tunnelling on a large step. Not yet reproduced locally; frequency may depend on pool size and frame timing.

**Recommendation:** Reproduce with the display-condition tests (T-066) first. Then spawn dice on non-overlapping slots (or reject overlapping positions), and evaluate CCD or a speed/step cap before tuning contact-material parameters.

### F-005 — 3D roll timing depends on the display refresh rate

**Area:** dice roller 3D renderer (`src/dice_roller/dice-logic/renderer/renderer.ts`)

**Evidence:** The result display and fade-out count animation frames (`showFrames`, `fadeFrames`, 60 or 30 frames each), so at 165 Hz dice stay visible and fade ~2.75× faster than at 60 Hz, and on a throttled/low-FPS display slower. An older report said dice vanished or their values were read before they stopped on a high-refresh display; it was fixed once but not re-confirmed with the reporter. The settle check itself uses wall-clock time (100 ms below `VELOCITY_THRESHOLD = 5`), and whether that threshold accepts a still-tipping die is unverified.

**Recommendation:** Convert frame-counted phases to elapsed-time durations, then use the display-condition tests (T-066) to confirm settle and read-out behave the same at 60, 144, 165, and 240 Hz before closing; ask the original reporter to re-check.
