import { bookTerms } from '@site/src/i18n/generated/bookTerms';
import { localizeTemplate } from '@site/src/sheet_manager/features/sheet/declarative/localizeTemplate';
import {
    type ShortLabelNode,
    shortLabelsFor,
} from '@site/src/sheet_manager/features/sheet/declarative/shortLabels';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import { isContainerNode, type TemplateNode } from '@site/src/sheet_manager/types/template';
import { afterEach, describe, expect, it } from 'vitest';

import { setTestLocale } from '../stubs/testLocale';

type Rated = ShortLabelNode & { type: string };

const briefs = systemRegistry
    .getSystems()
    .flatMap((system) => system.defaultTemplates ?? [])
    .filter(({ pageKind }) => pageKind === 'brief');

/** Ratings and pools that draw a short label on a brief (spec 041). */
const isShort = (child: TemplateNode): child is TemplateNode & Rated =>
    (child.type === 'rating' ||
        (child.type === 'primitive' &&
            /^(trait|resource):/.test(child.bindingKey) &&
            child.poolTracker === undefined)) &&
    (child as ShortLabelNode).fullLabel !== true;

/** Every block's direct ratings in short form, with the block's id. */
function shortGroups(children: readonly TemplateNode[], found: Array<[string, Rated[]]> = []) {
    for (const node of children) {
        if (!isContainerNode(node)) continue;
        const ratings = node.children.filter(isShort);
        if (ratings.length > 0) found.push([node.id, ratings]);
        shortGroups(node.children, found);
    }
    return found;
}

describe('shipped briefs in short form (spec 033)', () => {
    afterEach(() => setTestLocale('en'));

    it('ships briefs for every system with short-form ratings', () => {
        expect(briefs.length).toBeGreaterThanOrEqual(7);
        const withShort = briefs.filter(({ children }) => shortGroups(children).length > 0);
        // Vehicle briefs rate nothing from the glossary; every other brief does.
        expect(withShort.map(({ id }) => id).sort()).toEqual(
            expect.arrayContaining(['brief', 'droid-brief', 'creature-brief'])
        );
    });

    for (const [locale, mode] of [
        ['en', 'ru'],
        ['ru', 'ru'],
        ['ru', 'en'],
    ] as const) {
        it(`gives every short rating its own short label (${locale}, terms ${mode})`, () => {
            setTestLocale(locale);
            let checked = 0;
            for (const template of briefs) {
                const localized = localizeTemplate(template, locale);
                for (const [groupId, ratings] of shortGroups(localized.children)) {
                    const labels = shortLabelsFor(ratings, locale, mode);
                    const seen = new Set<string>();
                    for (const rating of ratings) {
                        const where = `${template.id}/${groupId}/${rating.id}`;
                        const short = labels.get(rating.id);
                        expect(short, where).toBeDefined();
                        // Shipped terms carry hand-written abbreviations in both languages; a resource
                        // outside the glossary (Dark Side Resistance) takes the derived letters.
                        const ref = rating.termRef ?? rating.labelMessage;
                        if (bookTerms[ref ?? '']) {
                            expect(bookTerms[ref ?? '']?.abbr, `${where} abbr`).toBeDefined();
                            expect(bookTerms[ref ?? '']?.ruAbbr, `${where} ruAbbr`).toBeDefined();
                        } else {
                            expect(rating.type, `${where} is a resource`).toBe('primitive');
                        }
                        // Shipped ratings never clash: no derived fourth letter or number.
                        expect(short, where).not.toMatch(/\d/);
                        expect(short!.length, where).toBeGreaterThanOrEqual(2);
                        expect(short!.length, where).toBeLessThanOrEqual(4);
                        expect(seen.has(short!), `${where} repeats ${short}`).toBe(false);
                        seen.add(short!);
                        checked += 1;
                    }
                }
            }
            expect(checked).toBeGreaterThan(80);
        });
    }
});
