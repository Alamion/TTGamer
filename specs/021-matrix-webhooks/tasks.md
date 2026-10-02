---
description: 'Task list for feature 021: roll sharing to Matrix'
---

# Tasks: Roll sharing to Matrix

**Input**: Design documents from `specs/021-matrix-webhooks/`:

- [plan.md](./plan.md), [spec.md](./spec.md);
- [research.md](./research.md), whose decisions are cited as R1–R11;
- [data-model.md](./data-model.md) (service registry, settings, queue item);
- the contract [contracts/roll-sharing-api.md](./contracts/roll-sharing-api.md);
- [quickstart.md](./quickstart.md) (§3 is the live gate, FR-014).

**Tests**: included. Constitution V asks for contract tests on adapters in `integrations/`
and component tests for user-visible flows. The existing Discord assertions move with the
module and keep their meaning (SC-003).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no unfinished dependencies).
- **[Story]**: US1–US4 from spec.md.

---

## Phase 1: Setup

- [x] T001 Rename the module with `git mv`: `src/integrations/discord/` →
      `src/integrations/roll-sharing/` (`webhook.ts` stays for now), and
      `tests/integrations/discord-webhook.test.ts` → `tests/integrations/roll-sharing.test.ts`,
      `tests/dice_roller/components/discord-subscription.test.tsx` →
      `tests/dice_roller/components/roll-sharing-subscription.test.tsx`; update every import
      (`src/dice_roller/components/DiscordWebhookSubscription.tsx`,
      `src/dice_roller/components/DiceRollerSettingsModal.tsx`,
      `src/dice_roller/components/dice_pool/RollControls.tsx`, both tests). `yarn typecheck` and
      the two tests pass.

---

## Phase 2: Foundational (registry with Discord only)

**Purpose**: split the module into registry, queue, and message without changing behavior.

- [x] T002 Create `src/integrations/roll-sharing/services.ts`: `SharingServiceId`
      (`'discord'`), `SharingService` interface per data-model.md (`id`, `name`, `color`,
      `addressKey`, `contentLimit`, `isValidAddress`, `prepare`, `request`, `guideAnchor`),
      `SHARING_SERVICES` with the Discord entry (pattern, `#5865F2`, `discord_webhook_url`,
      2 000, identity `prepare`, JSON request with `allowed_mentions: { parse: [] }` and
      `content`, anchor `discord`, placeholder `https://discord.com/api/webhooks/...`, no
      `networkHint`), and `sharingServiceOf(id: unknown)` (unknown → first entry, reported with `warn` from
      `src/shared/utils/logging.ts`; constitution III).
- [x] T003 Create `src/integrations/roll-sharing/message.ts` from `webhook.ts`:
      `buildRollShareMessage` (was `buildDiscordHistoryMessage`), `RollShareReadingLines` (was
      `DiscordReadingLines`), and the `truncate`/escape helpers; the 2 000 limit comes from a
      shared `MESSAGE_LIMIT` constant.
- [x] T004 Create `src/integrations/roll-sharing/queue.ts` from `webhook.ts`:
      `RollShareResult` (was `DiscordDeliveryResult`), `queueRollShare(text, { service,
address })` — invalid address per `service.isValidAddress` → `invalid-webhook`; the item
      stores `service`, `address`, and `service.prepare(truncate(text, contentLimit))`; flush
      groups by `service + address` (R8); batches split at `contentLimit`; request from
      `service.request(content)`; 2xx/429/other/thrown mapping (R3); log
      `[Roll sharing] Delivery failed` with `{ service, reason, status }` only (FR-010). Delete
      `webhook.ts`.
- [x] T005 Rewrite `src/integrations/roll-sharing/index.ts` to the contract exports
      (`SHARING_SERVICES`, `sharingServiceOf`, `SharingService`, `SharingServiceId`,
      `RollShareResult`, `RollShareReadingLines`, `buildRollShareMessage`, `queueRollShare`);
      drop `SESSION_STORAGE_KEY` and `isValidDiscordWebhook` (callers use the registry).
- [x] T006 Rename `src/dice_roller/components/DiscordWebhookSubscription.tsx` →
      `RollSharingSubscription.tsx` (component `RollSharingSubscription`), reading the Discord
      entry's `addressKey` and calling `queueRollShare`; update `src/theme/Root.tsx`,
      `RollControls.tsx`, and `DiceRollerSettingsModal.tsx` to the registry's Discord entry
      (`isValidAddress`, `addressKey`). No visible change yet.
- [x] T007 Update `tests/integrations/roll-sharing.test.ts` and
      `tests/dice_roller/components/roll-sharing-subscription.test.tsx` to the new names (mock
      `queueRollShare`); every former assertion kept (SC-003). Run both plus `yarn typecheck`.

**Checkpoint**: same Discord behavior on the new module; commit.

---

## Phase 3: User Story 1 — Share rolls to a Matrix room (P1) 🎯 MVP

**Goal**: with Matrix chosen and a valid address, rolls reach the room as formatted text.

**Independent test**: stub `fetch`, queue two Matrix messages within 250 ms → one `POST` with
a form body whose `text` carries both rolls.

### Tests

- [x] T008 [P] [US1] Add Matrix contract tests to `tests/integrations/roll-sharing.test.ts`:
      address rule (`https://` ok; `http://`, garbage, and a Discord webhook address refused);
      request is `POST` with a `URLSearchParams` body whose `text` equals the content and no
      `headers` (no preflight, R1); two messages within the window → one request; `@room` in a
      character name becomes `@​room` in the Matrix body but stays as-is for Discord (R4);
      200 → ok, 404 → rejected with status, 429 with `retry-after: 2` → rate-limited 2 000 ms,
      thrown `TypeError` → network; a Discord and a Matrix message queued together → two
      requests to their own addresses (R8); the console error carries no address or text; `sharingServiceOf('teams')` returns
      Discord and reports a warning (constitution III).

### Implementation

- [x] T009 [US1] Add the Matrix entry to `src/integrations/roll-sharing/services.ts`
      (`id: 'matrix'`, `name: 'Matrix'`, `color: 'currentColor'`, `addressKey:
'matrix_webhook_url'`, limit 2 000, `isValidAddress`: parseable `https:` URL that fails the
      Discord rule, `prepare`: replace `@room` with `@​room`, `request`: `{ method: 'POST',
body: new URLSearchParams({ text: content }) }`, anchor `matrix`, placeholder
      `https://matrix.example.org/webhook/...`, `networkHint: 'site-permission'`); widen
      `SharingServiceId`.
- [x] T010 [US1] Add `sharingService: 'discord' as SharingServiceId` to `DEFAULT_SETTINGS`
      and `{ type: 'choice', name: 'Roll sharing service' }` to the setting config in
      `src/dice_roller/utils/constants.ts`; add the field to `DiceRollerSettings` in
      `src/dice_roller/store/diceRollerStore.ts` (no version bump; `mergeStoredSettings`
      fills it). Extend `tests/dice_roller/utils/constants.test.ts` (key list, default
      `'discord'`).
- [x] T011 [US1] Make `src/dice_roller/components/RollSharingSubscription.tsx` read the
      active target: `sharingServiceOf(settings.sharingService)`, its address from
      `useSessionStorageState(service.addressKey, '')`, send only when
      `enableDiscordWebhook` and the address is valid; resubscribe when the service changes.
- [x] T012 [US1] Notices name the service: move
      `translations/source/{en,ru}/ui/integrations/discord.yaml` →
      `translations/source/{en,ru}/ui/integrations/sharing.yaml` with `{service}` in
      `rateLimited`, `rateLimitedRetry`, `network`, `rejected`, plus `matrixNetwork` ("{service}
      room could not be reached. The homeserver may not allow this site yet.") and
      `setupGuide` ("Setup guide"); run `yarn build:translations`; in
      `RollSharingSubscription.tsx` pass `service.name`, and when `service.networkHint` is set a
      `network` failure renders the hint text with a link to the guide's `#site-permission` anchor (R11; `useBaseUrl`-safe path,
      plain `<a>`).
- [x] T013 [US1] Extend `tests/dice_roller/components/roll-sharing-subscription.test.tsx`:
      Matrix chosen with a valid `matrix_webhook_url` → `queueRollShare` gets `service:
'matrix'`; Matrix `network` failure → toast content contains the guide link; Discord
      failures still toast with "Discord" in the text.

**Checkpoint**: Matrix delivery works in tests (setting switched by store); commit.

---

## Phase 4: User Story 2 — Pick the service, keep both addresses (P1)

**Goal**: a Service select in the dice settings; each service keeps its own address.

**Independent test**: render the settings, enter a Discord address, switch to Matrix (field
empty, Matrix wording), enter one, switch back ten times → both addresses intact (SC-004).

- [x] T014 [US2] Strings in `translations/source/{en,ru}/ui/dice/sharing.yaml`:
      `enableDiscordWebhook` → "Share rolls" (key kept), `service` "Service", `webhookUrl`
      "{service} webhook URL", `webhookValid` "Valid {service} webhook", `webhookInvalid`
      "Invalid {service} webhook URL", `setupGuide` "How to set up sharing"; placeholders come from the
      registry (`service.placeholder`), with an exception reason in
      `translations/i18n-exceptions.yaml` if the verifier flags them. Run
      `yarn build:translations`.
- [x] T015 [US2] In `src/dice_roller/components/DiceRollerSettingsModal.tsx`: a labelled
      `<select>` of `SHARING_SERVICES` (value `settings.sharingService`, `updateSettings`), the
      `SecretField` bound to `useSessionStorageState(service.addressKey, '')` with the service's
      label, placeholder, and validity hint, and a link "How to set up sharing" to
      `/docs/roll-sharing#<guideAnchor>` (base URL applied).
- [x] T016 [US2] Create `tests/dice_roller/components/roll-sharing-ui.test.tsx` (jsdom):
      Discord default with an existing `discord_webhook_url` shown (US2-6); switch to Matrix →
      empty field, Matrix label; Discord address refused under Matrix; addresses survive ten
      switches (SC-004); the guide link targets the chosen service's anchor.

**Checkpoint**: settings flow complete; commit.

---

## Phase 5: User Story 3 — The sharing button shows the service (P2)

**Goal**: the button next to the dice settings draws the chosen service's logo.

**Independent test**: valid Matrix address → button labelled with Matrix and drawing the
Matrix path; switch to Discord → Discord.

- [x] T017 [P] [US3] Create `src/integrations/roll-sharing/logos.tsx`: `ServiceLogo({ service,
active })` returning the `<path>` for Discord (from `static/img/discord-icon.svg`,
      viewBox `0 -28.5 256 256`) or Matrix (from `static/img/matrix-icon.svg`, viewBox
      `0 0 24 24`) with fill `service.color` when active, `currentColor` + `opacity-40` when
      not; export the viewBox per service; export from `index.ts`.
- [x] T018 [US3] In `src/dice_roller/components/dice_pool/RollControls.tsx`: read the active
      service and its address, show the button when valid, draw the anonymize ring scaled to
      the service viewBox and `ServiceLogo`; `aria-label` and `title` from
      `uiMessages.dice.sharing.toggleTitle` with `{service}` (rename `discordToggleTitle` in
      `sharing.yaml` en/ru; run `yarn build:translations`).
- [x] T019 [US3] Add button tests to `tests/dice_roller/components/roll-sharing-ui.test.tsx`:
      hidden without a valid address; Matrix label and logo with a Matrix address; left click
      toggles `enableDiscordWebhook`, right click toggles anonymize, for Matrix.

**Checkpoint**: commit.

---

## Phase 6: User Story 4 — Setup guide (P2)

**Goal**: an en/ru page explaining both setups; linked from settings and the Matrix notice.

**Independent test**: `/docs/roll-sharing` and `/ru/docs/roll-sharing` build with the four
anchors; `yarn validate:i18n` passes.

- [x] T020 [P] [US4] Write `docs/roll-sharing/index.mdx` (sidebar position 5, `In short` tip):
      `## Discord {#discord}` (channel → Integrations → Webhooks → copy URL; the address is a
      secret, kept for the browser session only); `## Matrix {#matrix}` (admin: hookshot
      `generic.enabled`, `urlPrefix`, `waitForComplete: true` recommended; in the room invite
      the bot and run `!hookshot webhook <name>`; give players the URL; use an unencrypted room;
      display-name highlight limit, R4); `## Allow this site {#site-permission}` (why the
      browser needs `Access-Control-Allow-Origin`; nginx and Caddy snippets echoing
      `https://ttgamer.vercel.app` and `http://localhost:3000` on the webhook path; no `OPTIONS`
      needed); `## Test the address {#test-address}` (the `curl` checks from quickstart §3).
- [x] T021 [P] [US4] Write the Russian mirror
      `i18n/ru/docusaurus-plugin-content-docs/current/roll-sharing/index.mdx` with the same
      anchors.
- [x] T022 [US4] Add `'roll-sharing'` to `DOCUMENT_ROOTS` in `scripts/docs-source.ts`; run
      `yarn validate:i18n` and `yarn i18n:verify` (glossary: Matrix, hookshot, webhook stay
      English).

**Checkpoint**: commit.

---

## Phase 7: Polish & cross-cutting

- [x] T023 [P] Module notes: `AGENTS.md` §6 tree (`roll-sharing/  # Queued roll sharing to
Discord, Matrix (service registry)`), `src/dice_roller/AGENTS.md` (Discord → roll sharing
      service; subscription name), and any skill mentioning the Discord integration.
- [x] T024 [P] `ROADMAP.md` `offline-support`: the optional network capability is "sharing roll
      results to an external chat service (Discord, Matrix)"; add a dated note.
- [x] T025 [P] `TODO.md`: T-087 notes updated to the shipped design (select, per-service
      addresses, live check pending); T-016 wording covers every service's webhook secret.
      Run `yarn validate:backlog`.
- [x] T026 `CHANGELOG.md` v3.19.0 entry (Matrix sharing, service select, logo, guide) and
      `package.json` version 3.19.0; `yarn check:version`.
- [x] T027 Run `yarn verify:full`; fix findings (knip: removed exports, unused static files).
- [x] T028 Local UI check per quickstart §2 with `playwright-cli` against
      `http://localhost:3000` (reuse the running dev server).
- [x] T029 Live hookshot check per quickstart §3 with the admin's address; record date,
      homeserver, per-step result, and the time from opening the settings to the first roll in
      the room (SC-001) in `quickstart.md`. Only then mark T-087 done in
      `TODO.md` and merge into `testing` (FR-014).

---

## Dependencies & execution order

- Phase 1 → Phase 2 → US1. T011 (subscription) needs T010 (setting).
- US2 needs US1's setting and registry (T009, T010). US3 needs T009 and T010. US4 is
  independent of code and can run any time after Phase 2.
- Polish after all stories; T029 needs the admin's instance and blocks the merge only.

## Parallel examples

- After Phase 2: T008 (tests) ‖ T020 + T021 (guide).
- In US3: T017 (logos) ‖ T014 (strings) once US1 lands.
- Polish: T023 ‖ T024 ‖ T025.

## Implementation strategy

1. MVP = Phases 1–3: Matrix delivery on the shared queue, selectable through the store.
2. Add US2 (select) → usable by players; US3 (logo) and US4 (guide) complete the experience.
3. Each phase ends green (`yarn vitest run` on touched tests + `yarn verify:fast` in the
   pre-commit hook) and is committed.
4. Stop at T028 until the admin's hookshot is ready; T029 gates the merge.
