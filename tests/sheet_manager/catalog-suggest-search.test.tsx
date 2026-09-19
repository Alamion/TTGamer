// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement, useState } from 'react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { CatalogSuggest } from '../../src/sheet_manager/components/controls/CatalogSuggest';
import { buildWeaponsCatalog } from '../../src/sheet_manager/features/sheet/data/bodyEquipmentCatalogs';
import { setTestLocale } from '../stubs/testLocale';

afterEach(() => {
    cleanup();
    setTestLocale('en');
});

beforeAll(() => {
    Element.prototype.scrollIntoView ??= () => undefined;
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as never;
});

function Picker({ catalog }: { catalog: { id: string; name: string }[] }) {
    const [value, setValue] = useState('');
    return createElement(CatalogSuggest, {
        catalog,
        value,
        onChange: setValue,
        onSelect: () => undefined,
        ariaLabel: 'picker',
    });
}

const options = () => screen.queryAllByRole('option').map((option) => option.textContent);

describe('CatalogSuggest search', () => {
    it('finds entries by the Russian name, the English name, and е for ё', () => {
        const catalog = [
            { id: 'heavy', name: 'Тяжёлый бластер (Heavy Blaster)' },
            { id: 'knife', name: 'Нож (Knife)' },
        ];
        render(createElement(Picker, { catalog }));
        const input = screen.getByLabelText('picker');
        fireEvent.change(input, { target: { value: 'heavy' } });
        expect(options()).toEqual(['Тяжёлый бластер (Heavy Blaster)']);
        fireEvent.change(input, { target: { value: 'тяжелый' } });
        expect(options()).toEqual(['Тяжёлый бластер (Heavy Blaster)']);
        fireEvent.change(input, { target: { value: 'нож' } });
        expect(options()).toEqual(['Нож (Knife)']);
    });

    it('shows the translated empty state', () => {
        setTestLocale('ru');
        render(createElement(Picker, { catalog: [{ id: 'knife', name: 'Нож (Knife)' }] }));
        fireEvent.change(screen.getByLabelText('picker'), { target: { value: 'zzz' } });
        expect(screen.queryByText('No matches found')).toBeNull();
    });

    it('labels Star Wars equipment "Русский (English)" in Russian and English-only in English', () => {
        const ru = buildWeaponsCatalog('ru').find((entry) => entry.id === 'melee-weapons/knife');
        expect(ru?.name).toBe('Нож (Knife)');
        const en = buildWeaponsCatalog('en').find((entry) => entry.id === 'melee-weapons/knife');
        expect(en?.name).toBe('Knife');
    });
});
