# Quickstart: validating roll sharing to Matrix

**Feature**: [spec.md](./spec.md) | **Contracts**: [contracts/roll-sharing-api.md](./contracts/roll-sharing-api.md)

## 1. Automated (mocked services)

```bash
yarn vitest run tests/integrations/roll-sharing.test.ts \
  tests/dice_roller/components/roll-sharing-subscription.test.tsx \
  tests/dice_roller/components/roll-sharing-ui.test.tsx \
  tests/dice_roller/utils/constants.test.ts
yarn verify:full
```

Expected: all pass; the former Discord assertions pass unchanged in meaning (SC-003).

## 2. Local UI (dev server at http://localhost:3000)

1. Open the dice panel → settings. **Service** shows Discord; an address entered before the
   update is still there.
2. Pick **Matrix**: the address field is empty and says Matrix; paste
   `https://discord.com/api/webhooks/1/x` → invalid; paste `http://example.org/hook` →
   invalid; paste `https://example.org/hook` → valid.
3. Switch Discord ↔ Matrix ten times: both addresses stay (SC-004).
4. Close settings: the button shows the Matrix logo; left click dims it; right click toggles
   the green ring. A screen reader name says "Matrix".
5. The "How to set up sharing" link opens `/docs/roll-sharing#matrix`; `/ru/docs/roll-sharing`
   is Russian.

## 3. Live hookshot check (FR-014 — gate before merging into `testing`)

Prerequisites from the admin: a hookshot generic webhook for an **unencrypted** test room,
`Access-Control-Allow-Origin` for `http://localhost:3000` and `https://ttgamer.vercel.app` on
the webhook path, `waitForComplete` recommended.

1. Without a browser (no CORS involved):
   `curl -i -X POST --data-urlencode 'text=**test** = 7' <address>` → `200`, message appears
   bold in the room.
2. Headers: `curl -i -X POST -H 'Origin: http://localhost:3000' --data-urlencode 'text=x' <address>`
   → response carries `Access-Control-Allow-Origin: http://localhost:3000`.
3. In the app (Matrix chosen, sharing on): roll `2d6` → one formatted message in the room, no
   notice.
4. Roll three times within a moment → one message with three rolls (SC-002).
5. Roll with a character name `@room` (sheet roll) → no room notification (SC-005).
6. Right click (anonymize) and roll → no character name or stats in the room.
7. Ask the admin to remove the CORS header (or use an address on a host without it) → notice
   "could not reach" with the guide link.
8. Use a wrong webhook id → "rejected" notice naming Matrix.
9. Switch to Discord with a valid address, roll → only Discord receives it.

Time the first share from opening the dice settings (SC-001: under one minute). Record the
result (date, homeserver, outcome per step, SC-001 time) in this file before merging.
