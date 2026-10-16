// @vitest-environment happy-dom
import { CharacterSheet } from '@site/src/sheet_manager/features/sheet/CharacterSheet';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { hunterData, seedHunter } from './systems/v5/hunterFixtures';

afterEach(cleanup);

describe('one document on the page (spec 034, FR-014)', () => {
    it('draws the sheet with no strip, divider, pane header, or wrapper', () => {
        seedHunter(hunterData());
        const { container } = render(createElement(CharacterSheet));

        const sheet = container.querySelector('[data-template-root]');
        expect(sheet).toBeTruthy();
        // Nothing between the page and the sheet: the sheet is a direct child of the root.
        expect(sheet!.parentElement).toBe(container);
        expect(screen.queryByRole('tablist')).toBeNull();
        expect(screen.queryByRole('separator')).toBeNull();
        expect(screen.queryByRole('region')).toBeNull();
    }, 20_000);
});
