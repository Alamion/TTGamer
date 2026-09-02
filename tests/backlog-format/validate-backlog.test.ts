import { describe, expect, it } from 'vitest';

import { validateBacklog } from '../../scripts/validate-backlog';

const ROADMAP = `# ROADMAP

## Overview

| Slug | Path | Status | Priority |
| ---- | ---- | ------ | -------- |
| \`campaigns\` | Campaigns | not started | 8 |

## Path entries

### \`campaigns\` — Campaigns

- **Status**: not started
- **Priority**: 8
- **Users**: GMs
- **Depends on**: \`note-tree\`
- **Scope**: A campaign is a named set of notes exported as a single archive and imported elsewhere.
`;

const TODO_OK = `# TODO

## Legend

| Encoding | Status |
| -------- | ------ |
| \`[x] ✅\` | done  |

### Major

- [x] ✅ **T-001 — Done thing** (none) — players can do the thing today.
- [ ] ⬜ **T-002 — Planned thing** (none) — GMs will plan the season faster. (task for roadmap path \`campaigns\`)
`;

const TOFIX_OK = `# TOFIX

## Legend

| Section | Severity |
| ------- | -------- |
| 🟠 Critical | Data corruption, crash, or major UX failure |

## 🟢 Medium

### F-001 — Some defect

**Area:** shared components

**Evidence:** Observed in the settings screen during manual testing.

**Recommendation:** Add a guard before the call.
`;

const run = (todo: string, tofix: string = TOFIX_OK) =>
    validateBacklog({ todo, tofix, roadmap: ROADMAP });

describe('validateBacklog', () => {
    it('passes a fully conforming backlog', () => {
        expect(run(TODO_OK)).toEqual([]);
    });

    it('detects a duplicated identifier (E-ID-DUP)', () => {
        const todo = TODO_OK.replace(
            '- [ ] ⬜ **T-002 — Planned thing**',
            '- [ ] ⬜ **T-001 — Duplicate id**'
        );
        const violations = run(todo);
        expect(violations.some((v) => v.code === 'E-ID-DUP' && v.message.includes('T-001'))).toBe(
            true
        );
    });

    it('detects a missing identifier (E-ID-FMT)', () => {
        const todo = TODO_OK.replace(
            '- [ ] ⬜ **T-002 — Planned thing** (none) — GMs will plan the season faster. (task for roadmap path `campaigns`)',
            '- [ ] ⬜ **No identifier here** (none) — GMs will plan the season faster.'
        );
        const violations = run(todo);
        expect(violations.some((v) => v.code === 'E-ID-FMT')).toBe(true);
    });

    it('detects a checkbox/emoji disagreement (E-STATUS-AGREE)', () => {
        const todo = TODO_OK.replace('- [x] ✅ **T-001', '- [x] ⬜ **T-001');
        const violations = run(todo);
        expect(violations.some((v) => v.code === 'E-STATUS-AGREE')).toBe(true);
    });

    it('detects the legacy [/] marker (E-STATUS-AGREE)', () => {
        const todo = TODO_OK.replace('- [ ] ⬜ **T-002', '- [/] 🟡 **T-002');
        const violations = run(todo);
        expect(
            violations.some((v) => v.code === 'E-STATUS-AGREE' && v.message.includes('T-002'))
        ).toBe(true);
    });

    it('detects an emoji outside the legend (E-STATUS-VAL)', () => {
        const todo = TODO_OK.replace('- [ ] ⬜ **T-002', '- [ ] 🔵 **T-002');
        const violations = run(todo);
        expect(violations.some((v) => v.code === 'E-STATUS-VAL')).toBe(true);
    });

    it('detects an empty required field in a task (E-FIELD-MISSING)', () => {
        const todo = TODO_OK.replace(
            '- [ ] ⬜ **T-002 — Planned thing** (none)',
            '- [ ] ⬜ **T-002 — Planned thing** ()'
        );
        const violations = run(todo);
        expect(violations.some((v) => v.code === 'E-FIELD-MISSING')).toBe(true);
    });

    it('detects a missing required field in a defect (E-FIELD-MISSING)', () => {
        const tofix = TOFIX_OK.replace(
            '**Evidence:** Observed in the settings screen during manual testing.',
            ''
        );
        const violations = run(TODO_OK, tofix);
        expect(
            violations.some((v) => v.code === 'E-FIELD-MISSING' && v.message.includes('Evidence'))
        ).toBe(true);
    });

    it('detects a TODO entry outside any area section (E-SECT-UNKNOWN)', () => {
        const todo = `- [ ] ⬜ **T-001 — Floating entry** (none) — scope text.\n\n${TODO_OK}`;
        const violations = run(todo);
        expect(violations.some((v) => v.code === 'E-SECT-UNKNOWN')).toBe(true);
    });

    it('detects a defect outside a severity section (E-SECT-UNKNOWN)', () => {
        const tofix = TOFIX_OK.replace('## 🟢 Medium', '## ✅ Done');
        const violations = run(TODO_OK, tofix);
        expect(violations.some((v) => v.code === 'E-SECT-UNKNOWN')).toBe(true);
    });

    it('detects a dangling roadmap slug reference (E-SLUG-DANGLING)', () => {
        const todo = TODO_OK.replace('`campaigns`)', '`missing-slug`)');
        const violations = run(todo);
        expect(violations.some((v) => v.code === 'E-SLUG-DANGLING')).toBe(true);
    });

    it('detects roadmap scope restated in a task (E-SCOPE-OVERLAP)', () => {
        const todo = TODO_OK.replace(
            '— GMs will plan the season faster.',
            '— named set of notes exported as a single archive for backups.'
        );
        const violations = run(todo);
        expect(violations.some((v) => v.code === 'E-SCOPE-OVERLAP')).toBe(true);
    });

    it('detects a self-version header in TOFIX (E-SECT-UNKNOWN)', () => {
        const tofix = TOFIX_OK.replace('# TOFIX', '# TOFIX\n\n**Version:** 3.0.0');
        const violations = run(TODO_OK, tofix);
        expect(violations.some((v) => v.code === 'E-SECT-UNKNOWN')).toBe(true);
    });
});
