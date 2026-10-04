import { describe, expect, it } from 'vitest';

import { changelogEntry, nextVersion } from '../../scripts/release';

describe('release script (spec 024)', () => {
    it('bumps the version', () => {
        expect(nextVersion('3.21.0', 'minor')).toBe('3.22.0');
        expect(nextVersion('3.21.4', 'patch')).toBe('3.21.5');
        expect(nextVersion('3.21.4', 'major')).toBe('4.0.0');
    });

    it('drafts one entry from the commits since the last release', () => {
        expect(
            changelogEntry('3.22.0', 'minor', [
                'docs(specs): spec 024 tasks',
                'feat(editor): shared settings for fields of one type (spec 023, US3)',
                'fix(editor): shortcut tables',
                'test: unit/perf projects (spec 024, US2)',
                'Merge branch testing',
            ])
        ).toBe(
            [
                '## v3.22.0',
                '',
                '### Minor feat',
                '',
                '- shared settings for fields of one type (spec 023, US3)',
                '',
                '### Fix',
                '',
                '- shortcut tables',
                '',
                '### Chore',
                '',
                '- unit/perf projects (spec 024, US2)',
                '',
            ].join('\n')
        );
    });
});
