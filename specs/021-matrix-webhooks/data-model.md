# Data Model: Roll sharing to Matrix

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

## SharingService (static registry, `src/integrations/roll-sharing/services.ts`)

| Field            | Type                                         | Notes                                                                   |
| ---------------- | -------------------------------------------- | ----------------------------------------------------------------------- |
| `id`             | `'discord' \| 'matrix'` (`SharingServiceId`) | Stable; persisted in dice settings                                      |
| `name`           | string                                       | Brand name, not translated ("Discord", "Matrix")                        |
| `color`          | string                                       | Logo fill when sharing is on (`#5865F2`; Matrix `currentColor`)         |
| `addressKey`     | string                                       | Session storage key (`discord_webhook_url`, `matrix_webhook_url`)       |
| `contentLimit`   | number                                       | 2 000 for both                                                          |
| `isValidAddress` | `(url: string) => boolean`                   | Discord: existing pattern. Matrix: `https:` URL, parseable, not Discord |
| `prepare`        | `(text: string) => string`                   | Service escaping (Matrix: break `@room`, R4)                            |
| `request`        | `(content: string) => RequestInit`           | Discord: JSON + `allowed_mentions`; Matrix: form `text` (R1)            |
| `guideAnchor`    | string                                       | `discord` / `matrix` on the roll-sharing guide                          |

Order of the list is the order of the settings select; the first entry (Discord) is the
default.

Validation rules:

- Matrix address: `new URL(url)` succeeds, protocol is `https:`, and the Discord rule fails
  (FR-004, spec edge case "Discord address with Matrix chosen").
- Empty address: not valid for any service (button hidden, nothing sent).

## Sharing settings

| Value                                    | Where                                   | Default     | Notes                                           |
| ---------------------------------------- | --------------------------------------- | ----------- | ----------------------------------------------- |
| `sharingService`                         | dice settings (localStorage, persisted) | `'discord'` | New key; filled by `mergeStoredSettings`        |
| `enableDiscordWebhook`                   | dice settings                           | `true`      | Existing key, now "share rolls" for any service |
| `includeCharacterName/Stats/RollContext` | dice settings                           | `true`      | Unchanged (anonymize)                           |
| address per service                      | sessionStorage, key from `addressKey`   | `''`        | One per service; never cleared by switching     |

Derived: **active share target** = `{ service, address }` when `enableDiscordWebhook`, the
service's address is non-empty and valid; otherwise none.

Reading the stored id: `sharingServiceOf(id)` returns the matching entry or Discord.

## PendingShare (queue item, in memory)

| Field     | Type               | Notes                                                |
| --------- | ------------------ | ---------------------------------------------------- |
| `service` | `SharingServiceId` | Fixed when queued (switching later does not move it) |
| `address` | string             |                                                      |
| `text`    | string             | Already prepared and truncated                       |
| `resolve` | callback           | Receives `RollShareResult`                           |

Flush groups by `service + address`; batches are split at the service's `contentLimit`;
requests share one spacing clock (1 100 ms).

## RollShareResult

`{ ok: true } | { ok: false; reason: 'invalid-webhook' | 'network' | 'rate-limited' |
'rejected'; status?: number; retryAfterMs?: number }` — unchanged shape (was
`DiscordDeliveryResult`).

State transitions: queued → (coalesce 250 ms) → batched → sent → resolved (ok or reason).
