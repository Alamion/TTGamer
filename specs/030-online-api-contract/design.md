# Design: Online API contract, first version

**Spec**: [spec.md](spec.md) | **Date**: 2026-10-08

## Approach

The contract is a file in this repository, not code: `contracts/cloud-api/` holds the OpenAPI
document, its change log, and the roll test vectors. Nothing in the app talks to a server yet; the
code this spec ships is what the frontend needs before the cloud space (T-012) and can test today.

Delivery order:

1. **US4 ids** first: it changes how new data is stored, so it lands before anything is written in
   the new format elsewhere.
2. **US3 seeded generator** with its vectors: the vectors go into the contract.
3. **US1 contract**: the OpenAPI document, change log, and validation in the checks.
4. **US2 conformance report**: needs the contract and the wire-name mapping.

## Decisions

- **D1 — Contract location**: `contracts/cloud-api/openapi.yaml`, `CHANGES.md` (one entry per
  change: version, author, approver, summary), and `roll-vectors.json`. _Why_: the clarification put
  the first version in this repository; a spec folder is a change record (AGENTS.md §9) and is never
  edited after merge, while the contract keeps changing and the report reads it. _Rejected_:
  `specs/030-…/contract/` — the live copy would sit in a historical folder.
- **D2 — Contract validation**: `@apidevtools/swagger-parser` (dev) validates the document against
  OpenAPI 3.1 in `yarn validate:contract`, part of `ci:validate`, blocking. _Why_: small, no CLI
  server, validates and dereferences 3.1. _Rejected_: `@redocly/cli` — a large toolchain for one
  lint; ajv with the meta-schema alone — misses `$ref` resolution errors.
- **D3 — Conformance report**: `scripts/contract-report.ts` (`yarn contract:report`). A table in the
  script maps contract model names to frontend Zod schemas (`DocumentEnvelope` →
  `UnknownDocumentEnvelopeSchema`, …). For each mapped model it converts the schema with
  `z.toJSONSchema` (input side), renames properties through the wire-name mapping (D4), and compares
  property presence, required, type, enum, and string/number limits; unmapped contract models print
  as "not implemented". Exit code 0 unless the contract cannot be read. Not part of `ci:*` yet
  (spec: reported, not blocking); it joins `ci:validate` as a report when T-012 starts. _Rejected_:
  generating TS types from the contract — the frontend's Zod schemas are the authority for stored
  data (constitution II) and would become a second source.
- **D4 — Wire names**: `src/integrations/cloud-api/wireNames.ts` maps contract-defined fields
  camelCase ↔ snake_case for one model at a time from its declared field list; fields marked opaque
  (`data`, `template_values`, catalog `entries`) are copied as is, keys untouched. _Why_: a
  recursive key converter would rename user value keys inside `data` (spec edge case, SC-007).
  `integrations/` because it is the adapter to an external service (AGENTS.md §8). _Rejected_: a
  generic deep converter; snake_case in storage (the clarification keeps camelCase).
- **D5 — Generator**: `src/dice_roller/dice-logic/seeded-random.ts` exports
  `createSeededRandom(seed)`, a `() => number` for the evaluator's existing `randomFn`. Draw `i` =
  first four bytes of SHA-256(UTF-8 `seed:i`), big-endian uint32, ÷ 2^32 (the same division
  `randFloat` uses today). SHA-256 from `@noble/hashes` (new dependency, synchronous, audited, ~4 KB
  in the dice chunk only). _Rejected_: `crypto.subtle.digest` — asynchronous, the evaluator draws
  synchronously; an own SHA-256 — no reason to maintain one.
- **D6 — Seeded rolls are 2D for now**: in 3D, physics decides every die except forced `@` faces
  (dice-logic skill), so a seed cannot drive a 3D roll without aiming every die. This spec ships
  seeded evaluation through `rollDices(notation, randomFn)` only; 3D shared rolls aim the dice the
  way forced faces already are, in T-106's own spec. _Rejected_: letting physics roll shared dice —
  the server could not stand behind the result.
- **D7 — Roll record carries an algorithm id**: a shared roll stores notation, seed, the resulting
  dice, and `algorithm: "ttg-sha256-ctr-1"`; a viewer recomputes and compares when it knows the
  algorithm and shows the stored dice otherwise. _Why_: the draw order is the evaluator's order, so
  a later evaluator change must not turn old rolls into "forged" ones. _Rejected_: notation and seed
  only.
- **D8 — Ids**: `generateId()` returns a UUIDv7 built from `crypto.getRandomValues` (48-bit ms time,
  version, variant, 74 random bits). User type, setting, and catalog ids become
  `user-…-<32 hex of a UUIDv7>`. _Why_: today they take the first 8 hex digits of a UUIDv4 (32
  random bits): enough on one device, collision-prone across all cloud users, and with v7 those 8
  digits would be the timestamp. `getRandomValues` also works on plain-HTTP LAN addresses, where
  `randomUUID` does not, so the fallback branch goes. _Rejected_: the `uuid` package — v7 is 15
  lines; dropping the `user-` prefixes — `isUserTypeId` and the registry rely on them.
- **D9 — Old ids stay, the server keys library items per owner**: stored 8-digit library ids and
  UUIDv4 document ids are never rewritten (references in documents, templates, and files stay
  valid). The contract keys library items by owner plus id, so old short ids cannot collide across
  users; documents are keyed by id (all UUIDs). _Rejected_: rewriting ids on load — every reference
  in documents, templates, and exported files would need the same rewrite.
- **D10 — Contract v0.1 scope**: `GET /version`; auth (`sign-up`, `sign-in`, `refresh`, `sign-out`)
  and `GET`/`DELETE /account`; `GET /usage`; documents (`POST` move-in with the client id, `GET`
  list and one, `PUT` with `If-Match` revision, `DELETE`); library items by kind the same way;
  `POST /dependencies` (which library refs the cloud lacks); `POST /rolls` → `{roll_id, seed}` and
  `GET /rolls/{id}`; one `Error` model with `kind`. Downloading a cloud document as a local copy
  needs no endpoint (read, then create locally with a new id). Sharing, published versions, rooms,
  and T-016 are listed as later versions. Session transport is the backend's proposal to make; the
  draft suggests a short access token in memory and a refresh token in an `HttpOnly`, `Secure`,
  `SameSite=Strict` cookie on the shared domain.
- **D11 — Migrations by layer**: written into the contract as rules (FR-013), no code: the server
  bumps the API version for its own structures; documents carry `schema_version`; the frontend's
  envelope parsing already rejects unknown newer versions on import, and the cloud reader in T-012
  shows them read-only.

## Changed types and data

- `src/shared/utils/random.ts`: `generateId()` → UUIDv7. All callers (documents, list entries,
  trackers, template node ids) get v7 ids; formats stay UUID strings, nothing parses them.
- `systems/userTypes.ts`, `systems/userCatalogs.ts`: the token is the 32 hex digits of a v7 id;
  prefixes unchanged; ids stay within the 64-character kebab-case identifier schema.
- New `src/integrations/cloud-api/` (wire names) and `src/dice_roller/dice-logic/seeded-random.ts`.
- `package.json`: `@noble/hashes` (dependency), `@apidevtools/swagger-parser` (dev);
  `validate:contract`, `contract:report`; `ci:validate` runs `validate:contract`.
- No persisted shape, store version, or translation changes; stored ids are untouched.

## Principles at risk

- **II Explicit contracts**: the contract and the Zod schemas must not become two authorities — Zod
  stays the authority for stored data, the contract for the wire, and the report shows drift.
- **I Modularity**: the generator stays inside dice-logic behind `randomFn`; cloud code lives in
  `integrations/cloud-api/`; `shared/` gains nothing cloud-specific.
- **VII Performance**: `@noble/hashes` enters the dice chunk only; SC-006 and the bundle bytes in
  the browser timings confirm.
- **Offline-first**: nothing networked ships; every local behavior is unchanged.

## Tests

- `tests/dice_roller/seeded-random.test.ts`: draws equal an independent Node `crypto` SHA-256
  computation; every draw is in [0, 1); same seed → same rolls; `roll-vectors.json` draws and whole
  rolls (plain, exploding `4d6!`, keep/drop, d100, fudge) match exactly (SC-003).
- `tests/shared/random.test.ts`: v7 version and variant bits, time order across milliseconds, 10 000
  ids without a duplicate.
- `tests/sheet_manager/user-ids.test.ts`: new type, setting, and catalog ids pass the identifier
  schema and their `is…Id` checks; old 8-digit ids still do (SC-005).
- `tests/integrations/cloud-api/wire-names.test.ts`: envelope round trip; keys inside `data` and
  `templateValues` unchanged (SC-007).
- `tests/scripts/contract-report.test.ts`: a changed field in a contract copy is reported, an
  unmapped model is "not implemented" (SC-004).
- `yarn validate:contract` in `ci:validate`.

## Manual walk

1. Create a document, a user type, and a setting on the dev server; read their ids in the library's
   export or devtools → UUIDv7 / `user-…-` with 32 hex digits.
2. Open documents created before the change → they open with their templates; nothing renamed.
3. Roll `4d6!` in 2D and in 3D → behaves as before.
4. `yarn contract:report` → envelope fields listed as matching; models without frontend schemas as
   not implemented.
5. Change a field's type in `openapi.yaml` → `yarn validate:contract` still passes and the report
   names the field; break a `$ref` → `yarn validate:contract` fails.
