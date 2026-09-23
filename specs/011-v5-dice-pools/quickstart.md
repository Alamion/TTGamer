# Quickstart: validating V5 dice pools and notation diagnostics

## Prerequisites

- `yarn install`; dev server at `http://localhost:3000/` (usually already running —
  check before starting another).
- One hunter document and one Star Wars WoD character in the sheet workspace
  (`/universal_sheet`); the hunter example from the V5 docs works.
- Discord webhook optional (scenario 6).

Fixed dice: force values per dice term with `@v1,v2,…` after the term (and after its
`:h` label), e.g. `(4d10@7,3,3,3+2d10:h@6,1)>=6`. Forced values are 2D only; turn 3D off
in settings for the fixed-value scenarios.

## Automated gates

```bash
yarn test tests/dice_roller          # parser, evaluator, diagnostics, helpers, components
yarn test tests/integrations         # roll-reading contexts, sheet-dice sources, Discord text
yarn test tests/sheet_manager        # V5 and classic trait pools, dice rules
yarn verify                          # Tier 2: dice-logic and store changed
yarn build:translations && yarn validate:i18n && yarn i18n:verify
```

Expected: all green; the pre-existing dice tests keep their expected roll results — only
error-message assertions move to error kinds (SC-004).

## Manual scenarios

1. **Set bonus is system-neutral** (US1 #5). Standard tab, type `6d10@6,7,10,10,4,2>=6x2=10`
   → total 6, the two 10s marked with `x`. Type `6d10@6,7,10,10,4,2>=6` → 4.
2. **WoD tab modes** (US1, FR-007). Open the WoD tab: Classic mode by default, with the
   target-number difficulty and botch button as before. Switch to V5: the V5 die, the
   special-die button (in the special colour), the line choice, the optional Difficulty,
   and both settings (on) appear; no Dark Pack badge.
3. **Criticals** (US1 #1–4). WoD tab in V5 mode, add six V5 dice, edit the input to
   `6d10@6,7,10,10,4,2>=6` and roll → 6 successes, critical marked, notation recorded with `x2=10`.
   Turn critical pairs off → 4.
4. **Desperation** (US2 #2, #7). V5 mode, line Desperation; click the special-die button
   twice, right-click once → one labelled die. Roll `(4d10@7,3,3,3+2d10:h@6,1)>=6` → the
   outcome names the price of a 1 and both choices; with `…2d10:h@6,6` → no outcome. Turn outcomes off → count only, the labelled dice still
   marked.
5. **Hunger** (US2 #3–5). Line Hunger, Difficulty 3: `(4d10@10,6,6,3+2d10:h@10,4)>=6` →
   messy critical (6 successes); `(4d10@3,3,3,3+2d10:h@6,1)>=6` → bestial failure. Clear the
   Difficulty and repeat the second roll → the conditional wording.
6. **Presentation** (US2 #1, FR-005). With 3D on, roll `(4d10+2d10:h)>=6`: the labelled
   dice are in the special colour, including any that explode. Expand the history entry:
   labelled values in the special colour with the `:h` marker and the outcome line. With a
   webhook set, the Discord message names the line and lists the outcomes.
7. **Where the reading applies** (US3, SC-003). With both settings on, roll the same
   pool in the ten contexts of the spec: WoD V5 ✔; WoD Classic ✘; Standard ✘; D&D ✘;
   a docs inline roll ✘; right-click a Star Wars stat ✘; right-click a hunter stat ✔;
   left-click a hunter stat and roll from the header with Standard selected ✘; the same
   with no tab selected ✔ (Desperation); left-click a Star Wars stat and roll with no tab
   ✘. Repeat the queued cases with the panel's roll button.
8. **Persistence** (US3 #8–9). In a private window the panel opens with no tab selected.
   Select WoD, switch to V5, change the line, reload → all kept.
9. **V5 sheet pools** (US3 #7, FR-015). Left-click a hunter skill with 3 dots → `3d10>=6`
   (no `f=1`, no `!`); a Star Wars skill with a specialization and not experienced still
   builds `…d10>=6f=1!`.
10. **Diagnostics** (US4). Type `5d10>=6f` → the `f` span highlighted and "expected a
    number"; `(2d10:h` → the `(` highlighted; `2d10>=6:h` → label position; `3d6x3=6` →
    needs a success target; `300d6` → the dice-count limit with its value; switch the
    site to Russian → the same messages in Russian. With a screen reader, the message is
    announced once after typing stops.
