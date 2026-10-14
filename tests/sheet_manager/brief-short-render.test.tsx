// @vitest-environment happy-dom

import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { createDefaultStarWarsCharacterData } from '@site/src/sheet_manager/systems/star-wars-wod';
import { starWarsWodDefaultTemplates } from '@site/src/sheet_manager/systems/star-wars-wod/defaultTemplates';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';
import { setTestLocale } from '../stubs/testLocale';
import { mountSheet } from './helpers/sheet';

const brief = starWarsWodDefaultTemplates.find(({ id }) => id === 'brief')!;

function seedCharacter() {
    const character = {
        id: 'doc-brief',
        kind: 'character',
        systemId: 'star-wars-wod',
        definitionId: 'star-wars-wod-character',
        schemaVersion: 1,
        metadata: { title: 'Brief target', tags: [] },
        data: createDefaultStarWarsCharacterData(),
    };
    useDocumentStore.setState({ documents: [character as never], currentDocumentId: 'doc-brief' });
}

/** The weapons list needs the sheet's body handlers, which a bare page does not have. */
function mountBrief() {
    const mounted = mountSheet(brief);
    takeSheetIssues();
    return mounted;
}

describe('a short-form rating in the brief (spec 033)', () => {
    beforeEach(seedCharacter);
    afterEach(() => {
        cleanup();
        setTestLocale('en');
    });

    it('shows three letters, keeps the full name as the input name, and hints it', () => {
        const { container } = mountBrief();
        const cell = container.querySelector('[data-term-hint="Alertness"]');
        expect(cell?.textContent).toContain('ALR');
        const input = cell?.querySelector('input');
        expect(input?.getAttribute('aria-label')).toBe('Alertness');
    });

    it('speaks Russian: glossary letters, the English book name in the hint, the Russian name below it', () => {
        setTestLocale('ru');
        const { container } = mountBrief();
        const cell = container.querySelector('[data-term-hint="Alertness"]');
        expect(cell?.textContent).toContain('БДИ');
        expect(cell?.getAttribute('data-term-detail')).toBe('Бдительность');
        expect(cell?.querySelector('input')?.getAttribute('aria-label')).toBe('Бдительность');
    });

    it('gives every short cell a hint and a named input, and keeps all its ratings', () => {
        const { container } = mountBrief();
        const cells = [...container.querySelectorAll('label[data-term-hint]')];
        expect(cells.length).toBeGreaterThanOrEqual(39);
        for (const cell of cells) {
            const input = cell.querySelector('input');
            expect(input?.getAttribute('aria-label'), cell.textContent ?? '').toBeTruthy();
            expect(cell.getAttribute('data-term-hint')).toBe(input?.getAttribute('aria-label'));
        }
    });
});
