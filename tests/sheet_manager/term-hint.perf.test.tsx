// @vitest-environment jsdom

import { useReaderPrefsStore } from '@site/src/shared/store/readerPrefsStore';
import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import { cleanup, render } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { setTestLocale } from '../stubs/testLocale';
import { seedHunter } from './systems/v5/hunterFixtures';

const RUNS = 20;

function renderTimes(mode: 'ru' | 'ru-plain'): number {
    useReaderPrefsStore.setState({ gameTerms: mode });
    const template = systemRegistry
        .getSystem('wod-v5')!
        .defaultTemplates!.find((candidate) => candidate.id === 'v5-hunter-sheet')!;
    const started = performance.now();
    for (let run = 0; run < RUNS; run++) {
        render(createElement(DeclarativeSheetView, { template }));
        cleanup();
    }
    return performance.now() - started;
}

/**
 * SC-009 (spec 009): hints must not add meaningful render cost. The 5% target is checked
 * manually (quickstart §5); this test logs the ratio and only fails on gross regressions.
 */
describe('book-term hint render cost', () => {
    afterEach(() => {
        cleanup();
        setTestLocale('en');
    });

    it('renders the Hunter sheet with hints close to the cost without them', () => {
        setTestLocale('ru');
        seedHunter();
        renderTimes('ru'); // warm-up
        const plain = renderTimes('ru-plain');
        const hints = renderTimes('ru');
        const ratio = hints / plain;
        console.info(`term hints render ratio: ${ratio.toFixed(3)} (${RUNS} renders each)`);
        expect(ratio).toBeLessThan(1.5);
    }, 120_000);
});
