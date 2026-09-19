# Contract: Book-Term Hint, Game Terms Preference, Short Forms

## Components and modules

| Unit                              | Location                                                  | Responsibility                                                                                              |
| --------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `TermHintProvider`                | `src/sheet_manager/components/terms/TermHintProvider.tsx` | wraps one sheet view; owns delegated listeners, the single popover, and the hidden live description         |
| `TermLabel`                       | `src/sheet_manager/components/terms/TermLabel.tsx`        | renders a label; adds hint attributes when a term applies; renders full + short spans when `ruShort` exists |
| `resolveTerm(ref, locale, prefs)` | `src/sheet_manager/components/terms/resolveTerm.ts`       | pure: `{ display, short?, hint? }` or `null`                                                                |
| `TermHintNotice`                  | same folder                                               | one-time dismissible notice                                                                                 |
| `GameTermsMenu`                   | `src/sheet_manager/features/sheet/shell/`                 | toolbar menu for the preference                                                                             |
| `readerPrefsStore`                | `src/shared/store/readerPrefsStore.ts`                    | persisted preference (data-model §6)                                                                        |

`StatLabel`, `CompactRating`, the plain field label in `DeclarativeSheetView`, and resource rows render
their label through `TermLabel`. `TermLabel` receives `termRef` (effective ref, data-model §4),
`termHint`, and the already localized text.

## `resolveTerm` truth table (locale `ru`)

| `gameTerms` | ref in `bookTerms`               | `termHint` | Label shows                      | Hint shows                                                    |
| ----------- | -------------------------------- | ---------- | -------------------------------- | ------------------------------------------------------------- |
| `ru`        | yes                              | on         | Russian (short form when narrow) | English book name; plus full Russian when short form is shown |
| `ru`        | yes                              | off        | Russian                          | none                                                          |
| `ru-plain`  | yes                              | any        | Russian                          | none                                                          |
| `en`        | yes                              | on         | English book name                | Russian name                                                  |
| `en`        | yes                              | off        | English book name                | none                                                          |
| `en`        | yes, label renamed by the author | on         | author's label                   | English book name                                             |
| any         | no (custom, renamed without ref) | any        | stored/localized label           | none                                                          |

Locale `en`: label as today, no hint, no notice, no tab stop.

## DOM contract for a hint-bearing label

```html
<span
    class="term-label"
    data-term-ref="ttgamer.ui.sheet.v5.skills.larceny"
    tabindex="0"
    aria-describedby="term-hint-larceny-3"
>
    <span class="term-full">Воровство</span>
    <span id="term-hint-larceny-3" class="sr-only">Larceny</span>
    <span class="term-short" aria-hidden="true">…</span>
    <!-- only when ruShort exists -->
</span>
```

- No per-label React state, effect, listener, or portal.
- Cursor `help` on pointer devices (`@media (hover: hover)`); no underline, icon, or color change (clarification Q2).
- `.term-short` is shown instead of `.term-full` by a container query on the row container below the
  row-kind threshold; screen readers always get the full name.

## Provider behavior

| Event on a `[data-term-ref]` element           | Result                                                            |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| `pointerover` (mouse/pen), 300 ms dwell        | open popover anchored to the element                              |
| `pointerout`                                   | close after 100 ms unless the pointer is over the popover         |
| `focusin`                                      | open immediately                                                  |
| `focusout`                                     | close                                                             |
| `click` / tap (any pointer)                    | toggle; does not change any value; tap outside or `Escape` closes |
| events on inputs, dots, buttons inside the row | ignored (the delegated handler only matches `[data-term-ref]`)    |

Only one popover exists per provider, created on first open. Popover content: English book name as the
heading line; in `en` mode the Russian name; when the label shows its short form, the full Russian name.

## One-time notice

Shown once per reader above the first sheet view in a non-English locale when `gameTerms !== 'ru-plain'`
and `termHintNoticeDismissed` is false. Text (YAML): "Hover or tap a trait name to see its English
book name." Actions: dismiss (sets the flag), "Game terms…" (opens `GameTermsMenu`). The menu has a
"Show tip again" item that clears the flag.

## Template editor

`FieldEditor.tsx` and `PrimitiveConfig.tsx`, after the "Show label" toggle:

- read-only line "Book term: Larceny" when the effective ref is in `bookTerms`;
- toggle "Show book name hint" bound to `termHint` (hidden when there is no book term).

Rename paths in `draft.ts` (`updateNode`, `updateField`) set `termRef = termRef ?? labelMessage`
before deleting `labelMessage`.

## Performance budget (SC-009, FR-016b)

- `bookTerms` is part of the generated i18n bundle already loaded with the sheet; the hint adds no
  request.
- Largest shipped sheet: render and edit time with hints on ≤ 105% of hints off, measured with the
  React Profiler over 20 renders in `tests/sheet_manager/term-hint.perf.test.tsx` (reported, not a
  hard CI gate) and confirmed manually in quickstart §5.
