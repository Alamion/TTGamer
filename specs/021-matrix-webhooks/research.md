# Research: Roll sharing to Matrix

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-02

## R1. Hookshot generic webhook request format

- **Decision**: POST the body as `application/x-www-form-urlencoded` with one field, `text`
  (the Markdown roll message). Built with `URLSearchParams`, so the browser sets the content
  type itself; no custom headers.
- **Rationale**: hookshot generic webhooks parse JSON, XML, form data, and `text/*` bodies;
  with a `text` field they post it as the message body and render it from Markdown to HTML.
  A form body is a CORS-safelisted request, so the browser sends no `OPTIONS` preflight
  (hookshot rejects `OPTIONS`) — FR-008.
- **Alternatives considered**:
    - JSON body: needs a preflight that hookshot refuses; rejected.
    - `text/plain` body: also no preflight, but without a `text` field hookshot posts the raw
      payload as a dump instead of rendered Markdown; rejected.
    - `html` field: our message is already Markdown that hookshot renders; a second renderer is
      not needed.
    - `username` field: hookshot prepends it to the message; the character name is already the
      first bold line, so it would be shown twice. Not sent.

## R2. Reading the answer (CORS)

- **Decision**: a normal `fetch` (mode `cors`). The homeserver admin adds
  `Access-Control-Allow-Origin` for `https://ttgamer.vercel.app` and `http://localhost:3000`
  on the webhook path at the reverse proxy (the guide gives an nginx/Caddy snippet). If the
  header is missing, `fetch` throws a `TypeError` and the result is `network`; for Matrix
  the notice says the room could not be reached, names the missing site permission, and
  links to the guide (FR-009).
- **Rationale**: the maintainer agreed (spec decisions) that a blind send would hide real
  failures. Hookshot answers 200 right away by default; `waitForComplete` on the admin side
  makes the status reflect delivery into the room, and the guide recommends it.
- **Alternatives considered**: `mode: 'no-cors'` (opaque response, no status) — every post
  would look like a success, including a deleted webhook; rejected.

## R3. Response codes

- **Decision**: `2xx` → ok; `429` → `rate-limited` (reads `retry-after` when exposed, else
  none); any other status → `rejected` (hookshot answers 404 for an unknown webhook and 5xx
  for transformation or delivery errors); thrown `fetch` → `network`.
- **Rationale**: keeps the four existing failure kinds; the subscription layer already maps
  them to notices.

## R4. Room notifications from roll text (FR-007, SC-005)

- **Decision**: in the Matrix message, `@room` is broken with a zero-width space after the
  `@` (`@​room`), the same way Discord's triple backticks are escaped in code blocks.
  User IDs (`@user:server`) are already escaped by the Markdown escaper (`.` and `-`)
  and do not become mention pills in plain Markdown.
- **Rationale**: hookshot does not send `m.mentions`, so the legacy `.m.rule.roomnotif` push
  rule applies to a body containing `@room` when the posting user has the room-notification
  power level. Breaking the token is the only client-side guarantee.
- **Known limit** (recorded in the guide): Matrix clients may still highlight a message that
  contains a member's display name (legacy keyword rule), e.g. a character named like a
  player; the app cannot prevent that without `m.mentions`.
- **Alternatives considered**: asking admins to lower the bot's power level — outside the
  app's control; kept as advice in the guide only.

## R5. Message content and limits

- **Decision**: one message builder for both services (the current
  `buildDiscordHistoryMessage`, renamed `buildRollShareMessage`); each service has a
  `prepare(text)` step for its own escaping (Matrix: R4; Discord: none) and a content limit
  (both 2 000 characters, FR-006 "same length bounds").
- **Rationale**: the spec requires the same content and anonymizing for both; Markdown
  (bold, quotes, fenced code) is rendered by both.

## R6. Service registry and extension point (FR-001)

- **Decision**: `src/integrations/roll-sharing/services.ts` declares a readonly list of
  `SharingService` entries (`discord`, `matrix`). Each entry owns its id, display name,
  brand color, session address key, address rule, request builder, response-to-result rule,
  and guide anchor. The queue, settings select, button, and notices read only from it.
- **Rationale**: a new service is one entry plus its strings and icon, with no conditionals
  elsewhere (constitution I/III).
- **Alternatives considered**: keeping `integrations/discord` and adding
  `integrations/matrix` beside it — two queues would break shared spacing and duplicate
  coalescing; rejected. The folder is renamed to `roll-sharing` since it no longer serves one
  service.

## R7. Settings storage and existing users (FR-002, FR-003, US2-6)

- **Decision**:
    - Chosen service: new persisted dice setting `sharingService: 'discord' | 'matrix'`,
      default `'discord'`. `mergeStoredSettings` fills it for stored settings that lack it; an
      unknown stored id falls back to Discord when read (`sharingServiceOf`), and the fallback
      reports through `warn` from `shared/utils/logging` (constitution III: no silent
      fallback).
    - On/off: the existing `enableDiscordWebhook` key stays (no migration); its label becomes
      neutral ("Share rolls").
    - Addresses: one session-storage key per service. Discord keeps `discord_webhook_url`, so
      an address entered before the update stays; Matrix uses `matrix_webhook_url`.
- **Rationale**: no store version bump, no migration; existing Discord users see no change.
- **Alternatives considered**: one session object `{discord, matrix}` — would drop the
  existing Discord key and lose the address of users in an open session; rejected.

## R8. Queue grouping across services

- **Decision**: pending messages carry their service id and address; the flush groups by
  `service + address`, and the request spacing (1 100 ms) stays global across services.
- **Rationale**: rolls queued before a switch go where they were made (edge case); one
  spacing clock keeps the queue simple and stays well within both services' limits.

## R9. Logos

- **Decision**: the maintainer's `static/img/discord-icon.svg` and `static/img/matrix-icon.svg`
  are the sources of the logo paths; the button draws them inline (`ServiceLogo` in
  `integrations/roll-sharing/logos.tsx`) so the fill can follow the on/off state and tests
  render them without an SVG loader. Discord keeps `#5865F2`; Matrix's brand mark is black, so
  its "on" color is the theme text color (`currentColor`, full opacity) — readable on both
  themes — and "off" is dimmed like Discord.
- **Rationale**: the site has no SVG-as-component imports and Vitest has no SVG loader; an
  `<img>` cannot change color.
- **Placement**: `ServiceLogo` lives in the integration, not the dice roller, because a logo
  belongs to the service entry like its name and color; adding a service then touches one
  module.
- **Housekeeping**: the maintainer's working tree replaces `discord-icon-svgrepo-com.svg` with
  `discord-icon.svg` and removes the unused `logo_old.svg`; those changes are committed with
  this feature (nothing references either removed file).

## R10. Setup guide location

- **Decision**: a new docs section `docs/roll-sharing/index.mdx` (sidebar position 5) with the
  Russian mirror under `i18n/ru/docusaurus-plugin-content-docs/current/roll-sharing/`, added to
  `DOCUMENT_ROOTS` in `scripts/docs-source.ts` so `validate:i18n` checks parity. Anchors:
  `#discord`, `#matrix`, `#site-permission`, `#test-address`.
- **Rationale**: the guide is not tied to a game system; a root section like
  `template-editor` keeps it findable and checked.

## R11. Failure notice with a link

- **Decision**: notices stay `react-hot-toast` errors; the Matrix `network` notice renders a
  short element with the text and a plain link to the guide's `#site-permission` anchor
  (base URL applied; the toast renders outside page routing, so no router `Link`).
- **Rationale**: FR-009 requires the link; other notices stay plain text.
