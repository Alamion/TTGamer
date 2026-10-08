# Tasks: Online API contract, first version

**Input**: [spec.md](spec.md), [design.md](design.md)

Delivery order follows design.md "Approach": US4 (ids change stored data, so it lands first), US3
(its vectors go into the contract), US1, then US2 (needs the contract and the wire names).

## User Story 4 - Documents keep their id when they move (P4)

**Check**: new documents get UUIDv7 ids, new user types, settings, and catalogs get `user-…-` plus
32 hex digits; documents saved before the change open with their templates.

- [x] T001 [US4] Write `tests/shared/random.test.ts`: `generateId()` returns a UUID with version 7
      and variant `10`, ids from later milliseconds sort after earlier ones, 10 000 ids have no
      duplicate; `randomToken(8)` returns 8 lowercase hex characters and 1 000 tokens made in one
      synchronous loop have no duplicate
- [x] T002 [US4] Write `tests/sheet_manager/user-ids.test.ts`: `newUserTypeId()`,
      `newUserSettingId()`, and `newUserCatalogId()` keep their prefixes, end in 32 hex digits, pass
      the kebab-case identifier schema in `src/sheet_manager/types/document.ts`, and pass
      `isUserTypeId`/the setting and catalog checks; 8-digit ids such as `user-1a2b3c4d`,
      `user-setting-1a2b3c4d`, and `user-catalog-1a2b3c4d` still pass the same checks;
      `generateDraftId('tpl')` ends in 32 hex digits, `generateDraftId('f')` in 8, and 1 000
      `generateDraftId('f')` ids made in one synchronous loop have no duplicate
- [x] T003 [US4] Rewrite `generateId()` in `src/shared/utils/random.ts` as UUIDv7 from
      `crypto.getRandomValues` (48-bit millisecond time, version 7, variant, random rest); remove
      the `randomUUID` fallback branch; add `randomToken(length)` (lowercase hex from
      `crypto.getRandomValues`) in the same file (design D8)
- [x] T004 [US4] Change `token()` in `src/sheet_manager/systems/userTypes.ts` and
      `src/sheet_manager/systems/userCatalogs.ts` to the 32 hex digits of `generateId()` (no slice
      to 8), keeping the prefixes; in `src/sheet_manager/features/template-editor/model/ids.ts` use
      the 32 hex digits for `tpl` and `randomToken(8)` for every other prefix; replace the sliced
      `generateId()` in `src/sheet_manager/features/sheet/data/trackerDefaults.ts` and
      `src/sheet_manager/features/sheet/declarative/TrackerFieldControl.tsx` with `randomToken(8)`
- [x] T005 [US4] Run `yarn verify` (store and persistence ids) and commit:
      `feat(ids): UUIDv7 ids created on the device (spec 030, US4)`

## User Story 3 - A shared roll anyone can recompute (P3)

**Check**: each vector's notation evaluated with its seed gives the vector's dice and total; local
rolls unchanged.

- [x] T006 [US3] Add `@noble/hashes` (^2) to dependencies in `package.json`
- [x] T007 [US3] Write `tests/dice_roller/seeded-random.test.ts`: draws equal an independent
      computation with Node `crypto` `createHash('sha256')` over `seed:i`; 1 000 draws all in [0,
      1); the same seed gives the same `rollDices` result twice; a different seed differs
- [x] T008 [US3] Create `src/dice_roller/dice-logic/seeded-random.ts`: `createSeededRandom(seed)`
      returning `() => number` (draw `i` = first four bytes of SHA-256 of UTF-8 `seed:i`, big-endian
      uint32 ÷ 2^32) and `SEEDED_ROLL_ALGORITHM = 'ttg-sha256-ctr-1'`; export both from
      `src/dice_roller/dice-logic/index.ts`
- [x] T009 [US3] Create `contracts/cloud-api/roll-vectors.json`: the algorithm id; draw vectors
      (three seeds × draws 0–4); roll vectors for `2d6`, `4d6!`, `4d6kh3`, `1d100`, `4dF`, and a
      `5d10>=6 f=1` pool, each with notation, seed, the dice values, and the total, produced by
      `rollDices(notation, createSeededRandom(seed))` and checked by hand for one vector
- [x] T010 [US3] Extend `tests/dice_roller/seeded-random.test.ts` to read `roll-vectors.json` and
      match every draw and every roll's dice and total exactly
- [x] T011 [US3] Run `yarn verify:full` (new dependency, constitution VII); record the dice chunk's
      size before and after `@noble/hashes` in design.md "Implementation notes"; commit:
      `feat(dice): seeded generator for shared rolls, with test vectors (spec 030, US3)`

## User Story 1 - A first contract both sides can review (P1)

**Check**: `yarn validate:contract` passes; every decision in the ROADMAP `online-mode` 2026-10-08
note maps to an operation, model, or rule in the contract.

- [ ] T012 [US1] Add `@apidevtools/swagger-parser` to devDependencies in `package.json`
- [ ] T013 [US1] Create `scripts/validate-contract.ts`: validate and dereference
      `contracts/cloud-api/openapi.yaml` as OpenAPI 3.1, check `info.version` is semver and that
      every schema property name is snake_case; script `validate:contract` in `package.json`, added
      to `ci:validate`
- [ ] T014 [US1] Write `contracts/cloud-api/openapi.yaml` v0.1.0 per design D10, snake_case fields:
      `GET /version`; `POST /auth/sign-up`, `/auth/sign-in`, `/auth/refresh`, `/auth/sign-out`;
      `GET`/`DELETE /account` (no password material in any response); `GET /usage` (bytes used and
      limits, documents and images separately); `/documents` (`POST` move-in keeping the client id,
      `GET` list) and `/documents/{id}` (`GET`, `PUT` with `If-Match` revision → 409 on a stale
      write, `DELETE`); `/library/{kind}` and `/library/{kind}/{id}` the same way, keyed by owner
      plus id; `POST /dependencies` (library refs → which the cloud lacks); `POST /rolls` (notation
      → `roll_id`, `seed` of at least 128 bits, issued after the notation is stored) and
      `GET /rolls/{id}` (notation, seed, dice, total, `algorithm`); models `DocumentEnvelope`
      (opaque `data`, `template_values`), `LibraryItem`, `Usage`, `Account`, `SharedRoll`, and one
      `Error` with `kind` (validation, conflict, quota, unauthorized, forbidden, not_found,
      rate_limit) and quota usage/limit on `quota`; the quota error as 413 with `kind: quota` (the
      backend may change the status in review)
- [ ] T015 [US1] In the same file's `info.description`, state the rules: who migrates what (FR-013)
      and the read-only rule for newer `schema_version`; opaque content keys cross unchanged
      (FR-012); the generator and its vectors file (FR-011); which ids are UUIDs and which are fixed
      names; what is deferred to later versions (sharing, published library versions, rooms, the
      roll-sharing proxy, data export, email verification)
- [ ] T016 [US1] Create `contracts/cloud-api/CHANGES.md`: how a change is proposed and approved,
      semver rules (breaking = major), each side declaring its version (FR-002); first entry 0.1.0
      with author and "approval pending: backend"; and `contracts/cloud-api/README.md` with what the
      folder holds and that the frontend's declared version is in
      `src/integrations/cloud-api/version.ts`
- [ ] T017 [US1] Check SC-001: list every bullet of the ROADMAP `online-mode` 2026-10-08 note
      against the contract in design.md "Implementation notes"; add whatever is missing to the
      contract or mark it deferred with the reason
- [ ] T018 [US1] Run `yarn verify:full` (new dev dependency, constitution VII) and commit:
      `feat(contract): cloud API contract v0.1.0 and its validation (spec 030, US1)`

## User Story 2 - The frontend knows where it differs from the contract (P2)

**Check**: a changed field in a copy of the contract is named in the report; unmapped models show as
not implemented.

- [ ] T019 [US2] Write `tests/integrations/cloud-api/wire-names.test.ts`: an envelope with
      `schemaVersion`, `definitionId`, `templateValues: { strengthBonus: 2 }`, and
      `data: { someKey: { innerKey: 1 } }` maps to snake_case top-level fields and back to an
      identical object; keys inside `data` and `templateValues` never change
- [ ] T020 [US2] Create `src/integrations/cloud-api/wireNames.ts` (`toWire(model, value)`,
      `fromWire(model, value)` from a declared field list per model, opaque fields copied as is) and
      `src/integrations/cloud-api/version.ts` (`IMPLEMENTED_CONTRACT_VERSION = '0.1.0'`)
- [ ] T021 [US2] Write `tests/scripts/contract-report.test.ts`: on a temporary copy of
      `openapi.yaml` with one envelope field's type changed, the report lists that field as
      differing with both shapes; a contract model without a mapped schema is listed as not
      implemented; the unchanged contract reports the envelope as matching
- [ ] T022 [US2] Create `scripts/contract-report.ts`: the model → Zod schema table (start:
      `DocumentEnvelope` → `UnknownDocumentEnvelopeSchema`), `z.toJSONSchema` input side, names
      through `wireNames.ts`, compare presence, required, type, enum, and limits; print the declared
      and contract versions and a table per model; exit 0 unless the contract cannot be read; script
      `contract:report` in `package.json` (not in `ci:*`, design D3)
- [ ] T023 [US2] Run `yarn verify` and commit:
      `feat(contract): frontend conformance report (spec 030, US2)`

## Finish

- [ ] T024 Update guidance: `AGENTS.md` §3 (`validate:contract`, `contract:report`), §6
      (`contracts/` folder), §8 (`integrations/cloud-api/`, the wire-name rule for opaque content),
      §11 (`validate:contract` in `ci:validate`); the `dice-logic` skill (seeded generator, 2D only,
      algorithm id); `src/sheet_manager/AGENTS.md` if it describes id formats; TODO T-105, T-106,
      T-107 notes (what this spec did, what remains); no user guide change (no visible behavior)
- [ ] T025 Run `yarn verify:full`; walk design.md "Manual walk"; record results and deviations in
      design.md
- [ ] T026 Hand `contracts/cloud-api/` to the backend developer for review (SC-002); their approval
      or change requests are recorded in `CHANGES.md` after this spec merges

## Coverage

| Requirement | Tasks                                                    |
| ----------- | -------------------------------------------------------- |
| FR-001      | T014, T016                                               |
| FR-002      | T014 (`/version`), T016, T020                            |
| FR-003      | T014, T016                                               |
| FR-004      | T021, T022                                               |
| FR-005      | T014                                                     |
| FR-006      | T014                                                     |
| FR-007      | T014                                                     |
| FR-008      | T014                                                     |
| FR-009      | T014                                                     |
| FR-010      | T014                                                     |
| FR-011      | T008, T009, T015                                         |
| FR-012      | T013, T015, T019, T020                                   |
| FR-013      | T015                                                     |
| FR-014      | T014                                                     |
| FR-015      | T007, T008, T010                                         |
| FR-016      | T001–T004                                                |
| FR-017      | T008, T014                                               |
| SC-001      | T017                                                     |
| SC-002      | T026 (measured after merge, by the review)               |
| SC-003      | T010 (frontend side; the backend runs the same file)     |
| SC-004      | T021                                                     |
| SC-005      | T002, T025 (manual walk step 2)                          |
| SC-006      | T011, T025 (full unit, perf, and browser runs)           |
| SC-007      | T019 (wire round trip; the server round trip is T-012's) |
