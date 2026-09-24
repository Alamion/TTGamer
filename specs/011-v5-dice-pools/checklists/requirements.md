# Specification Quality Checklist: V5 dice pools and precise notation errors

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-24
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- FR-016 resolved in Clarifications (session 2026-09-24): settings on, WoD tab Classic / V5
  mode, no tab selected by default, tab choice remembered.
- The notation spellings `:h` (user-chosen) and the set-bonus syntax are named as notation
  surface, not implementation; the set-bonus spelling is deliberately left to planning.
- Items marked incomplete require spec updates before `$speckit-clarify` or `$speckit-plan`
- Implementation walk-through (2026-09-24, headless Chromium against the dev server, Russian
  locale, 3D off): first visit opens with no tab selected; WoD tab starts in Classic; V5 mode
  shows the line choice, Difficulty "не задана", both switches on; the special-die button adds
  and removes `d10:h>=6`; `6d10@6,7,10,10,4,2>=6` rolls as `…x2=10 = 6`; a Desperation 1 is
  named in the toast and in history with the special dice listed; diagnostics for `5d10>=6f`,
  `2d6 & 1`, `(2d10:h`, `300d6` show translated messages with the span marked. Sheet contexts
  (quickstart 7, 9) and 3D colours (6) are covered by `tests/integrations/roll-reading.test.ts`,
  `tests/sheet_manager/systems/dice-rules.test.ts`, and the orchestrator colour tests, not yet
  by hand with a real hunter document.
