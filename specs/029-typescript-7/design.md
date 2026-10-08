# Design: TypeScript 7

**Spec**: [spec.md](spec.md) | **Date**: 2026-10-08

## Approach

Two compilers, one job each. `typescript` stays `~6.0` (typescript-eslint, WebStorm, cosmiconfig). A
second devDependency, `typescript-native` (`npm:typescript@^7`), provides only the `tsc` binary that
`yarn typecheck` runs. Order: measure, prepare the tsconfig files so both majors accept them, switch
the type-check script, document.

1. **Baseline**: cold `yarn typecheck` time (best of three) and a set of planted errors with the
   TypeScript 6 verdicts.
2. **tsconfig**: drop `baseUrl` (with `"baseUrl": null` where `@docusaurus/tsconfig` sets it), check
   both majors pass.
3. **Script**: `scripts/typecheck.ts` runs the TypeScript 7 binary by path, and its stamp includes
   the compiler version.
4. **Guidance and backlog**.

## Decisions

- **D1 — Alias dependency**: `"typescript-native": "npm:typescript@^7.0.2"`, called as
  `node_modules/typescript-native/bin/tsc`. _Why_: `typescript` keeps resolving to 6 for every tool
  that imports it, and removing the split later is one dependency line and one script line (SC-005).
  _Rejected_: `typescript@7` as `typescript` (breaks typescript-eslint and the IDE service);
  `npx -p typescript@7` (not pinned, needs the network); the older `@typescript/native-preview` (a
  preview channel, superseded by the 7.x line).
- **D2 — tsconfig**: remove `baseUrl`, and stop extending `@docusaurus/tsconfig` (its `baseUrl: "."`
  is rejected by TypeScript 7 and cannot be unset: `null` makes Playwright's tsconfig loader throw).
  Its few options (`allowJs`, `esModuleInterop`) move into `tsconfig.app.json`; the devDependency
  goes. `paths` keep working relative to each tsconfig. `ignoreDeprecations` is kept only if
  TypeScript 6 still needs it. _Why_: TypeScript 7 rejects `baseUrl` (TS5102); both majors must
  accept the files while the split exists (editor uses 6).
- **D3 — Stamp**: the forced full check after a lockfile change (spec 026) hashes `yarn.lock` plus
  the TypeScript 7 version string; incremental `.tsbuildinfo` files stay where they are, since each
  major rewrites a file written by the other (it records its own version). _Rejected_: separate
  build-info directories (a second cache to clean).
- **D4 — Entry points unchanged**: pre-push, `ci:typecheck`, `verify:fast`, and CI keep calling
  `yarn typecheck`; only the script changes. CI needs no step: the native binary comes as an
  optional platform dependency of the package.
- **D5 — Lint stays on 6**: typescript-eslint and its type-aware rules keep loading `typescript` 6;
  a rule violation that depends on types is planted to prove it.
- **D6 — Exit condition**: T-088 stays open as "single TypeScript when typescript-eslint supports
  7": then `typescript` moves to 7, `typescript-native` and the path in the script go.

## Changed types and data

- None in code. `package.json` (+ `typescript-native`), `yarn.lock`, five tsconfig files,
  `scripts/typecheck.ts`.

## Principles at risk

- V Risk-proportional testing: the type check is a gate; planted errors prove the new compiler fails
  where the old one did.
- IV Fit-for-purpose: no wrapper beyond the existing script.

## Tests

- Planted errors in `src`, `tests`, `scripts`, `tests-e2e` (wrong type, unused local, missing
  import, `erasableSyntaxOnly` violation, JSX type error): reported by TypeScript 6 and 7 with the
  same file and line (run by hand, results in "Results").
- `yarn verify:full`, including lint with type-aware rules.

## Manual walk

1. Run `yarn typecheck` twice → first pass cold (checks every file), second is fast.
2. Break a type in `src` → it fails with file and line.
3. Open the project in WebStorm → type hints still work (uses `typescript` 6).

## Results (2026-10-08)

- Versions: `typescript` 6.0.3 (typescript-eslint, editor), `typescript-native` = TypeScript 7.0.2
  (`yarn typecheck`). typescript-eslint 8.71.1 / canary 8.71.2-alpha.1 still declare `<6.1.0`.
- Cold type check (`.tsbuildinfo` deleted, best of three): TypeScript 6 16.0 s → TypeScript 7 1.7 s.
- Planted errors (wrong type, unused local, missing import, `enum` under `erasableSyntaxOnly`, JSX
  type error, e2e type error): TypeScript 6 and the new `yarn typecheck` report the same six file
  and line positions.
- tsconfig: `baseUrl` (and `ignoreDeprecations`) removed, `"baseUrl": null` in the two files that
  inherit one from `@docusaurus/tsconfig`; both majors pass. A stale include of the deleted
  `tailwind-config.d.ts` in `tsconfig.test.json` was removed.
- ESLint (typescript-eslint on TypeScript 6) still reports a planted unused import. The ESLint
  config has no type-aware rules today, so the type-aware part of FR-003 is vacuous.
- `knip` needs `typescript-native` in `ignoreDependencies` (it is used by path, not imported).
- Manual walk: steps 1 and 2 done (cold then warm check, planted error). Step 3 (WebStorm hints) is
  left to the maintainer; the IDE reads `typescript`, which stays on 6.

## Implementation notes

- D2 changed during the work: `"baseUrl": null` passed both compilers but broke Playwright's
  tsconfig loader (`The "paths[1]" argument must be of type string`), so `tsconfig.json` and
  `tsconfig.app.json` no longer extend `@docusaurus/tsconfig` and the package was removed. Re-add it
  when it stops setting `baseUrl`.
- The root `tsconfig.json` also carries `paths` for `@site/*` now: `tsx` (the repository's scripts)
  reads it, and it used to inherit the alias from `@docusaurus/tsconfig`. Found when
  `yarn validate:i18n` could not resolve `@site/...`.
- Final `yarn verify:full`: 203 unit files (2,222 tests), 6 perf files, 10 browser tests, all
  passing.
