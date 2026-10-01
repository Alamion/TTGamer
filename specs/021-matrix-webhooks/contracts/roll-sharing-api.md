# Contract: `src/integrations/roll-sharing` public API

Replaces `src/integrations/discord`. Consumers (dice roller UI, `src/theme/Root.tsx`) import
only from `@site/src/integrations/roll-sharing` (index).

```ts
type SharingServiceId = 'discord' | 'matrix';

interface SharingService { /* see data-model.md */ }

const SHARING_SERVICES: readonly SharingService[];        // select order, Discord first
function sharingServiceOf(id: unknown): SharingService;  // unknown → Discord

type RollShareResult = /* data-model.md */;
interface RollShareReadingLines { verdict?; specialDice?; outcomes? } // was DiscordReadingLines

function buildRollShareMessage(result: RollResult, reading?: RollShareReadingLines): string;
function queueRollShare(text: string, target: { service: SharingServiceId; address: string })
    : Promise<RollShareResult>;   // invalid address → { ok: false, reason: 'invalid-webhook' }

function ServiceLogo(props: { service: SharingServiceId; active: boolean }): JSX.Element;
// <path> elements only; the caller owns the <svg> and the anonymize ring
```

Guarantees:

- Discord requests are byte-identical to today's (`application/json`, `allowed_mentions:
{ parse: [] }`, `content`) — SC-003.
- Matrix requests: `POST`, body `URLSearchParams({ text })`, no custom headers, no preflight.
- Logs carry `{ service, reason, status }` only — never address, text, or response body
  (FR-010).

# Contract: outbound HTTP (Matrix, hookshot generic webhook)

| Item      | Value                                                                  |
| --------- | ---------------------------------------------------------------------- |
| Method    | `POST`                                                                 |
| URL       | the user's address (`https://<host>/<urlPrefix path>/<webhook id>`)    |
| Body      | `text=<url-encoded Markdown>` (`application/x-www-form-urlencoded`)    |
| Success   | any `2xx`                                                              |
| Responses | `429` → rate-limited; other non-2xx → rejected; thrown fetch → network |
| Needs     | `Access-Control-Allow-Origin` echoing the site origin on the response  |

# Contract: UI

- Dice settings, "Sharing" block: **Service** select (Discord, Matrix) → address field whose
  label, placeholder, and validity hint name the chosen service → link "How to set up
  sharing" to `/docs/roll-sharing#<guideAnchor>`.
- Sharing button (next to dice settings): visible when the active service has a valid
  address; shows `ServiceLogo`; `aria-label` and `title` name the service; left click toggles
  sharing, right click toggles anonymize.
- Notices: `{service}` in every failure text; Matrix `network` notice adds the site-permission
  hint and a link to `/docs/roll-sharing#site-permission`.

# Contract: guide anchors

`/docs/roll-sharing` with `#discord`, `#matrix`, `#site-permission`, `#test-address` in both
locales; the app links to these anchors only.
