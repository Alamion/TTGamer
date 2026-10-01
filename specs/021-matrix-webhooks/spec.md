# Feature Specification: Roll sharing to Matrix

**Feature Branch**: `021-matrix-webhooks` (branched from `testing`)

**Created**: 2026-10-02

**Status**: Draft

**Input**: User description: "T-087: groups on Matrix get roll results in their room the way
Discord groups do, through a matrix-hookshot generic webhook the homeserver admin sets up. The
user picks the webhook service from a fixed list (Discord, Matrix; more may follow) instead of the
address deciding it; each service keeps its own address, and only one is active at a time. The
dice panel's sharing button shows the active service's icon. Built with mocks and tests first;
checked against a real hookshot instance before the work is committed to `testing`."

## Scope

| Backlog | Entry                                | Role in this feature |
| ------- | ------------------------------------ | -------------------- |
| T-087   | Matrix roll sharing through hookshot | User Stories 1–4     |
| T-088   | Major dependency upgrades (recorded) | Not in scope         |

Today the dice roller can post each roll to one Discord channel: the user pastes a Discord
webhook address in the dice settings, turns sharing on, and every roll is queued, combined with
rolls made within a moment, spaced to respect rate limits, and posted. Failures show a short
notice. The address lives only for the browser session. A button next to the dice settings shows
the Discord logo (colored when sharing is on) and hides character data on a right click.

Groups that play over Matrix have no equivalent. A Matrix homeserver can run matrix-hookshot,
whose "generic webhooks" accept a post at an address the admin hands out and write it into a
room. This feature adds Matrix as a second sharing service on top of the same queue, combining,
and spacing, and turns the sharing settings from "a Discord address" into "a service and its
address".

Maintainer decisions (2026-10-02):

- The service is a fixed choice the user makes (Discord or Matrix today), not guessed from the
  address, so more services can join the list later.
- Each service keeps its own address, so a user can have both at hand; only the chosen service
  shares rolls. Addresses still last for the browser session only; keeping them longer belongs
  to the future backend.
- The sharing button next to the dice settings shows the chosen service's logo.
- The work happens on its own branch (`021-matrix-webhooks`) so unrelated work can continue from
  `testing` while the homeserver admin prepares hookshot.
- Delivery is first proven with simulated services in tests; before the work is committed to
  `testing`, it is checked against the admin's real hookshot instance and room.
- Major dependency upgrades are recorded as T-088 for later; this feature does not touch them.

Out of scope:

- Talking to Matrix as a user account (it would need a full account access token in the
  browser) and end-to-end encrypted rooms.
- Keeping addresses beyond the browser session, or holding them on a server (T-016, the future
  backend).
- Other services beyond Discord and Matrix (the list is built to take them later).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Share rolls to a Matrix room (Priority: P1)

A player whose group plays on Matrix opens the dice settings, picks **Matrix** as the sharing
service, pastes the webhook address their homeserver admin gave them, and turns sharing on.
Every roll they make then appears in the group's room, formatted as it is for Discord: the
character name in bold, the notation and total, the reading, and the dice details.

**Why this priority**: it is the feature; everything else supports it.

**Independent Test**: with a simulated hookshot endpoint, pick Matrix, paste an `https://`
address, turn sharing on, roll twice within a moment: one post reaches the endpoint carrying
both rolls as formatted text; the sheet shows no error.

**Acceptance Scenarios**:

1. **Given** Matrix is the chosen service with a valid address and sharing on, **When** the user
   rolls, **Then** one post reaches the address with the roll as formatted text (bold names,
   code block for dice details) that the room shows formatted.
2. **Given** several rolls within the combining moment, **Then** they arrive as one post, and
   posts are spaced as they are for Discord.
3. **Given** the address answers with an error status, **Then** the user sees the same short
   failure notice as for Discord, naming Matrix, and the roll itself is unaffected.
4. **Given** the address cannot be reached or the browser blocks the answer (the homeserver did
   not allow this site), **Then** the notice says the room could not be reached and points to the
   setup guide.
5. **Given** "anonymize" is on (right click on the sharing button), **Then** Matrix posts leave
   out the character name and stats, as Discord posts do.
6. **Given** a roll text containing `@room` or a user mention, **Then** the room does not notify
   anyone because of it.

---

### User Story 2 - Pick the service, keep both addresses (Priority: P1)

The sharing settings show a **Service** choice (Discord, Matrix) above the address. Each service
remembers its own address for the session: switching from Discord to Matrix shows the Matrix
address (empty at first), and switching back shows the Discord address again. Only the chosen
service shares rolls.

**Why this priority**: without it Matrix cannot be picked at all, and switching would lose the
other address.

**Independent Test**: enter a Discord address, switch to Matrix, enter a Matrix address, roll:
only the Matrix endpoint receives the post; switch back to Discord: the Discord address is still
there, and the next roll goes only to Discord.

**Acceptance Scenarios**:

1. **Given** the sharing settings, **Then** a Service choice lists Discord and Matrix, Discord by
   default (users who already share to Discord see no change).
2. **Given** Discord is chosen, **Then** the address must be a Discord webhook address, as today;
   **given** Matrix, any `https://` address is accepted (hookshot addresses follow the admin's
   server layout).
3. **Given** an address of the wrong kind for the chosen service (a Discord address with Matrix
   chosen, or a non-https address), **Then** it is marked invalid and nothing is sent.
4. **Given** addresses for both services, **When** the user switches the service, **Then** each
   address stays as entered and only the chosen one receives rolls.
5. **Given** the label, placeholder, and validity hint of the address field, **Then** they name
   the chosen service.
6. **Given** a user who had sharing on before this feature, **Then** after it they still share to
   Discord with the same address and setting, without doing anything.

---

### User Story 3 - The sharing button shows the service (Priority: P2)

The button next to the dice settings shows the chosen service's logo: Discord's or Matrix's,
colored in the service's color when sharing is on and dimmed when it is off. Its hint names the
service. The ring that marks "character data included" works as today.

**Why this priority**: the player sees at a glance where rolls go; it does not change delivery.

**Independent Test**: with a valid Matrix address, the button shows the Matrix logo; switch to
Discord with a valid address: the Discord logo.

**Acceptance Scenarios**:

1. **Given** a chosen service with a valid address, **Then** the button shows that service's
   logo; **given** no valid address for it, **Then** the button is hidden, as today.
2. **Given** sharing on or off, **Then** the logo is colored or dimmed; a left click toggles
   sharing, a right click toggles anonymizing, for either service.
3. **Given** a screen reader, **Then** the button's name says which service it toggles.

---

### User Story 4 - Setup guide for the admin and the group (Priority: P2)

A docs page (English and Russian) explains how to share rolls: for Discord, creating a channel
webhook; for Matrix, what the homeserver admin sets up (a hookshot generic webhook for the room,
and allowing this site to post to it), which address to give players, and why an unencrypted
room is recommended. The sharing settings and the Matrix failure notice link to it.

**Why this priority**: Matrix sharing needs a step the player cannot do alone; without the guide
the feature looks broken.

**Independent Test**: from the sharing settings, open the guide; it shows both setups in the
reader's language.

**Acceptance Scenarios**:

1. **Given** the guide, **Then** it names what the admin must allow for this site (and for local
   development) and how to test the address.
2. **Given** the Russian locale, **Then** the guide is in Russian.
3. **Given** the sharing settings or a Matrix "could not reach" notice, **Then** a link opens the
   guide.

### Edge Cases

- The user switches service while rolls are waiting in the queue: waiting rolls go to the
  service and address they were made for.
- Sharing is on but the chosen service has no valid address: nothing is sent and the button is
  hidden, as today with no Discord address.
- The Matrix room is encrypted: hookshot may not post into it; the guide says so, the app cannot
  tell.
- A long roll text: Matrix posts keep the same length bounds as Discord posts.
- A Matrix address that is also a Discord address with Matrix chosen: refused (wrong kind) so a
  Discord secret is never sent in a Matrix-shaped post.
- The homeserver accepts the post but does not let the browser read the answer: the post arrives
  but the user sees "could not reach"; the guide explains the missing site permission.

## Requirements _(mandatory)_

### Functional Requirements

**Choosing the service**

- **FR-001**: The dice sharing settings MUST offer a fixed Service choice: Discord and Matrix,
  Discord by default; the list MUST be easy to extend with more services later.
- **FR-002**: Each service MUST keep its own address for the browser session; switching the
  service MUST NOT clear or change another service's address.
- **FR-003**: Only the chosen service MUST share rolls; the existing on/off setting turns sharing
  on or off for it. Existing users MUST keep sharing to Discord with no action.
- **FR-004**: Address validation MUST follow the chosen service: Discord accepts only Discord
  webhook addresses (as today); Matrix accepts any `https://` address that is not a Discord
  webhook address.
- **FR-005**: The address field's label, placeholder, and validity hint MUST name the chosen
  service.

**Delivery**

- **FR-006**: Matrix delivery MUST reuse the existing queue: the combining moment, request
  spacing, length bounds, and per-address grouping apply to both services.
- **FR-007**: A Matrix post MUST carry the roll as formatted text the room renders (bold, quote,
  code block), with the same content and anonymizing rules as Discord, and MUST NOT trigger room
  or user notifications.
- **FR-008**: A Matrix post MUST be sent in a way a browser can send to another site without a
  permission check first (no preflight); the homeserver side only needs to allow reading the
  answer.
- **FR-009**: Failures MUST map to the existing kinds (rejected, rate-limited, could not reach,
  invalid address) with notices that name the service; the Matrix "could not reach" notice MUST
  mention the site permission and link to the guide.
- **FR-010**: Logs MUST NOT contain addresses, message text, or response bodies (as today).

**Button**

- **FR-011**: The sharing button MUST show the chosen service's logo and color, dimmed when off;
  its hint and accessible name MUST name the service; left and right clicks keep their meaning.

**Guide and records**

- **FR-012**: A docs page in English and Russian MUST describe sharing to Discord and to Matrix,
  including the admin's hookshot and site-permission setup and the unencrypted-room advice; the
  sharing settings and the Matrix "could not reach" notice MUST link to it.
- **FR-013**: The roadmap wording that names Discord as the only optional network capability
  (`offline-support`) MUST name roll sharing services instead; module notes and skills that
  describe the Discord integration MUST describe the service list.
- **FR-014**: Before the work is merged into `testing`, delivery MUST be checked against a real
  hookshot instance and room (the quickstart's live scenario); until then the work stays on its
  branch.

### Key Entities _(include if feature involves data)_

- **Sharing service**: one entry of the fixed list (id, name, logo, color, address rule, how a
  post is written, setup guide link).
- **Sharing settings**: the chosen service (kept with the dice settings), sharing on/off (the
  existing setting), anonymize (existing), and one session address per service.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A player with an address from their admin shares a first roll to a Matrix room in
  under one minute from opening the dice settings.
- **SC-002**: Rolls made within the combining moment arrive in the room as one post, as they do
  in Discord (verified on the real instance).
- **SC-003**: Every user sharing to Discord before this feature keeps sharing with no change (0
  differences in existing Discord tests).
- **SC-004**: Switching the service ten times keeps both addresses intact every time.
- **SC-005**: No roll text with `@room` notifies the room's members.

## Assumptions

- The homeserver admin runs matrix-hookshot with generic webhooks enabled, creates a webhook for
  the group's room, and allows this site (and `http://localhost:3000` for development) to read
  the answers of posts to the webhook path.
- Hookshot renders the post's text as Markdown and accepts a form-encoded body.
- The roll text is the one built for Discord today; Markdown is shared by both services.
- The Matrix logo is used to name the service, as the Discord logo is today; the maintainer may
  supply the SVG.
