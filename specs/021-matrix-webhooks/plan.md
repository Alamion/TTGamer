# Implementation Plan: Roll sharing to Matrix

**Branch**: `021-matrix-webhooks` | **Date**: 2026-10-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/021-matrix-webhooks/spec.md`

## Summary

Turn the Discord-only roll delivery into a small registry of sharing services (Discord,
Matrix) on one queue. The user picks the service in the dice settings; each service keeps its
own session address; only the chosen one receives rolls. Matrix posts go to a hookshot
generic webhook as a form-encoded `text` field (no preflight), with `@room` neutralized. The
sharing button draws the chosen service's logo. An en/ru guide explains the Discord and
hookshot setups, including the site permission (CORS) the admin adds. Tests mock both
services; a live hookshot check gates the merge into `testing`.

## Technical Context

**Language/Version**: TypeScript 6 (strict), React 19

**Primary Dependencies**: Docusaurus 3.10, Zustand 5 (persist), react-hot-toast, Radix
Dialog; no new dependencies

**Storage**: dice settings in localStorage (persisted store, new `sharingService` key);
addresses in sessionStorage, one key per service

**Testing**: Vitest 4 (jsdom for components), `fetch` stubbed with `vi.stubGlobal`

**Target Platform**: browser (static site on Vercel; local dev on `localhost:3000`)

**Project Type**: web site with client-side tools

**Performance Goals**: unchanged queue timings (250 ms coalescing, 1 100 ms spacing)

**Constraints**: no preflight to hookshot; no secrets or message text in logs; the site stays
usable offline (sharing optional)

**Scale/Scope**: 2 services, ~6 source files, 1 docs section (en + ru), ~4 test files

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                     | Check                                                                                                                           | Status |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------ |
| I. Modular semi-autonomy      | Delivery stays in `integrations/roll-sharing`; dice roller imports its index only; no service conditionals outside the registry | PASS   |
| II. Explicit contracts        | Stored service id is read through `sharingServiceOf` (unknown → Discord); strings via YAML; guide mirrored and parity-checked   | PASS   |
| III. Pleasurable interactions | Failures name the service; Matrix "could not reach" links to the guide; switching keeps addresses; queued rolls are not lost    | PASS   |
| IV. Fit-for-purpose quality   | Adapter keeps bounded queue, spacing, retry hint; no fire-and-forget (each roll resolves a result)                              | PASS   |
| V. Risk-proportional testing  | Contract tests per service request shape, validation, error mapping, grouping; component tests for settings, button, notices    | PASS   |
| VI. Consistent, accessible UI | Button `aria-label` names the service; select has a label; storybook not affected (no template element or docs widget)          | PASS   |
| VII. Performance budget       | No new runtime cost beyond one registry lookup per roll                                                                         | PASS   |
| VIII. Third-party material    | Service logos identify the service (nominative use, as Discord's today); no rules text                                          | PASS   |

Post-design re-check: PASS (no violations; Complexity Tracking empty).

## Project Structure

### Documentation (this feature)

```text
specs/021-matrix-webhooks/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md          # includes the live hookshot gate (FR-014)
├── contracts/
│   └── roll-sharing-api.md
└── tasks.md               # /speckit-tasks
```

### Source Code (repository root)

```text
src/integrations/roll-sharing/          # renamed from integrations/discord
├── index.ts                            # public API (contract)
├── services.ts                         # SHARING_SERVICES, sharingServiceOf, address rules, requests
├── queue.ts                            # coalescing, batching, spacing, result mapping
├── message.ts                          # buildRollShareMessage (was buildDiscordHistoryMessage)
└── logos.tsx                           # ServiceLogo paths (from static/img/*-icon.svg)

src/dice_roller/
├── components/RollSharingSubscription.tsx      # was DiscordWebhookSubscription
├── components/DiceRollerSettingsModal.tsx      # Service select, per-service address, guide link
├── components/dice_pool/RollControls.tsx       # ServiceLogo, service-named label
├── utils/constants.ts                          # sharingService default + setting config
└── store/diceRollerStore.ts                    # DiceRollerSettings.sharingService
src/theme/Root.tsx                              # mounts RollSharingSubscription

translations/source/{en,ru}/ui/dice/sharing.yaml              # service select, neutral labels
translations/source/{en,ru}/ui/integrations/sharing.yaml      # was discord.yaml, {service} errors

docs/roll-sharing/index.mdx                                   # guide (new docs root)
i18n/ru/docusaurus-plugin-content-docs/current/roll-sharing/index.mdx
scripts/docs-source.ts                                        # DOCUMENT_ROOTS += roll-sharing

tests/integrations/roll-sharing.test.ts                       # was discord-webhook.test.ts
tests/dice_roller/components/roll-sharing-subscription.test.tsx
tests/dice_roller/components/roll-sharing-ui.test.tsx   # select, addresses, button
tests/dice_roller/utils/constants.test.ts

static/img/discord-icon.svg, static/img/matrix-icon.svg       # maintainer's sources (commit)
AGENTS.md, src/dice_roller/AGENTS.md, ROADMAP.md, TODO.md, CHANGELOG.md, package.json
```

**Structure Decision**: one integration module for every sharing service, so the queue and
its spacing are shared and a new service is one registry entry, its strings, and its logo.

## Phasing

1. **Foundation**: rename the module; extract the registry with Discord only; all existing
   Discord tests pass unchanged in meaning.
2. **US1/US2 (P1)**: Matrix entry, `sharingService` setting, per-service addresses, settings
   select and labels, subscription reading the active target, notices with `{service}`.
3. **US3 (P2)**: `ServiceLogo` on the button, service-named accessible label.
4. **US4 (P2)**: guide en/ru, links from settings and the Matrix notice.
5. **Polish**: module notes, ROADMAP `offline-support` wording, TODO T-087/T-016,
   CHANGELOG v3.19.0, `yarn verify:full`; then the live quickstart (§3) before merging.

## Complexity Tracking

None.
