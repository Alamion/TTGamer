// @vitest-environment jsdom

import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { ArmorSection } from '@site/src/sheet_manager/features/sheet/body/ArmorSection';
import { ImplantsSection } from '@site/src/sheet_manager/features/sheet/body/ImplantsSection';
import { InventorySection } from '@site/src/sheet_manager/features/sheet/body/InventorySection';
import { WeaponsSection } from '@site/src/sheet_manager/features/sheet/body/WeaponsSection';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { createElement, type ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { setTestLocale } from '../stubs/testLocale';

afterEach(() => {
    cleanup();
    setTestLocale('en');
});

type Tree = { readonly [key: string]: Tree | { id: string; message: string } };

/** English source messages of a descriptor subtree. */
function englishMessages(tree: Tree): string[] {
    return Object.values(tree).flatMap((node) =>
        'id' in node && typeof node.id === 'string'
            ? [node.message as string]
            : englishMessages(node as Tree)
    );
}

const english = new Set([
    ...englishMessages(uiMessages.sheet.items as unknown as Tree),
    ...englishMessages(uiMessages.sheet.controls as unknown as Tree),
]);

const handlers = {
    readOnly: false,
    onAdd: () => {},
    onRemove: () => {},
    onUpdate: () => {},
    onCatalogSelect: () => {},
    catalog: [],
};

const sections: Record<string, (items: 'empty' | 'filled') => ReactElement> = {
    weapons: (items) =>
        createElement(WeaponsSection, {
            ...handlers,
            items:
                items === 'empty'
                    ? []
                    : [{ id: 'w', name: '', damage: '', range: '', ammo: 0, maxAmmo: 0 }],
        }),
    armor: (items) =>
        createElement(ArmorSection, {
            ...handlers,
            items: items === 'empty' ? [] : [{ id: 'a', name: '', classVal: '', ar: '', dex: '' }],
        }),
    inventory: (items) =>
        createElement(InventorySection, {
            ...handlers,
            items:
                items === 'empty'
                    ? []
                    : [
                          {
                              id: 'i',
                              text: '',
                              description: '',
                              effects: '',
                              weight: '',
                              price: '',
                              quantity: 1,
                              maxQuantity: 1,
                              equipped: false,
                          },
                      ],
        }),
    implants: (items) =>
        createElement(ImplantsSection, {
            ...handlers,
            items: items === 'empty' ? [] : [{ id: 'm', name: '', type: '', effect: '' }],
        }),
};

/** Every text node and translatable attribute rendered inside `root`. */
function renderedStrings(root: HTMLElement): string[] {
    const strings: string[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = node.textContent?.trim();
        if (text) strings.push(text);
    }
    for (const element of root.querySelectorAll('*')) {
        for (const attribute of ['aria-label', 'placeholder', 'title']) {
            const value = element.getAttribute(attribute);
            if (value) strings.push(value);
        }
    }
    return strings;
}

describe('item cards in Russian', () => {
    it.each(Object.keys(sections))('%s section renders no English source message', (name) => {
        setTestLocale('ru');
        const empty = render(sections[name]!('empty'));
        const emptyStrings = renderedStrings(empty.container);
        empty.unmount();

        const filled = render(sections[name]!('filled'));
        // Expand the card so its fields and remove button render.
        const toggle = filled.container.querySelector('button[aria-expanded]');
        expect(toggle).not.toBeNull();
        fireEvent.click(toggle!);
        const strings = [...emptyStrings, ...renderedStrings(filled.container)];

        expect(strings.length).toBeGreaterThan(5);
        expect(strings.filter((text) => english.has(text))).toEqual([]);
    });

    it('renders English messages in the English locale', () => {
        const { container } = render(sections.weapons!('empty'));
        expect(renderedStrings(container)).toContain(uiMessages.sheet.items.weapons.empty.message);
    });
});
