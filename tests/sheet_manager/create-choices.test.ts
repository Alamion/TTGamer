// @vitest-environment happy-dom
import {
    CREATE_DIALOG_STORAGE_KEY,
    createChoices,
    filterChoices,
    listChoices,
    readCreatePreferences,
    recentChoices,
    rememberRecent,
} from '@site/src/sheet_manager/features/documents/createChoices';
import { useDocumentTypeStore } from '@site/src/sheet_manager/store/documentTypeStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';
import { setTestLocale } from '../stubs/testLocale';
import {
    currentTree,
    LUNAR_ID,
    resetUserKinds,
    seedUserKinds,
    userKindId,
} from './helpers/createDialog';

const choices = () => createChoices(currentTree(), systemRegistry);
const keys = (query = '') => listChoices(filterChoices(choices(), query)).map(({ key }) => key);

beforeEach(() => {
    window.localStorage.clear();
    resetUserKinds();
});

afterEach(() => {
    setTestLocale('en');
    resetUserKinds();
});

describe('create choices from the library tree (spec 039, D1)', () => {
    it('lists the shipped kinds by ruleset in the library order', () => {
        const groups = choices();
        expect(groups.map(({ name }) => name)).toEqual([
            'World of Darkness 2nd Edition',
            'World of Darkness 5th Edition',
        ]);
        expect(keys()).toEqual([
            'wod-2e/wod2e-character',
            'star-wars-wod/character',
            'star-wars-wod/droid',
            'star-wars-wod/creature',
            'star-wars-wod/vehicle',
            'star-wars-wod/fodder-group',
            'wod-v5/v5-character',
            'wod-v5/hunter',
            'wod-v5/vampire',
        ]);
    });

    it('collapses one-kind settings and names the setting beside the kind', () => {
        const v5 = choices()[1]!;
        expect(v5.sections.map(({ name }) => name)).toEqual([undefined, undefined, undefined]);
        const [mortal, hunter, vampire] = v5.sections.map(({ choices: [choice] }) => choice!);
        expect(mortal.context).toBeUndefined();
        expect(hunter.name).toBe('Character');
        expect(hunter.context).toBe('Hunter: the Reckoning 5e');
        expect(vampire.context).toBe('Vampire: the Masquerade 5e');
        const starWars = choices()[0]!.sections[1]!;
        expect(starWars.name).toBe('Star Wars (World of Darkness 2e)');
    });

    it('puts user settings under their ruleset with the core kinds and their own types', () => {
        seedUserKinds();
        const v5 = choices()[1]!;
        const lunar = v5.sections.find(({ name }) => name === 'Lunar Colony')!;
        expect(lunar.choices.map(({ key }) => key)).toEqual([
            `wod-v5/v5-character/${LUNAR_ID}`,
            `wod-v5/${userKindId(1)}/${LUNAR_ID}`,
            `wod-v5/${userKindId(2)}/${LUNAR_ID}`,
        ]);
        const habitats = lunar.choices.filter(({ name }) => name === 'Habitat');
        expect(habitats.map(({ description, userKind }) => [description, userKind])).toEqual([
            ['Pressurised dome', true],
            ['Mining outpost', true],
        ]);
        expect(listChoices(choices()).filter(({ userKind }) => userKind)).toHaveLength(20);
    });

    it('leaves out kinds whose owner is not installed', () => {
        seedUserKinds(3);
        // The setting is gone: its types stay in the library's "Unavailable" group only.
        useDocumentTypeStore.setState({ settings: {} });
        expect(keys().some((key) => key.includes(userKindId(1)))).toBe(false);
        expect(keys()).toContain(`wod-v5/${userKindId(3)}`);
        expect(takeSheetIssues().every(({ code }) => code === 'library-placement')).toBe(true);
    });

    it('offers the kinds that ship examples with them', () => {
        const byKey = new Map(listChoices(choices()).map((choice) => [choice.key, choice]));
        expect(byKey.get('wod-v5/vampire')!.examples.map(({ id }) => id)).toEqual([
            'mirela-voss::example',
        ]);
        expect(byKey.get('star-wars-wod/vehicle')!.examples).toHaveLength(3);
        expect(byKey.get('star-wars-wod/droid')!.examples).toEqual([]);
    });
});

describe('search (D2)', () => {
    it('matches the kind, setting, and ruleset names, ignoring case and accents', () => {
        expect(keys('vamp')).toEqual(['wod-v5/vampire']);
        expect(keys('DROID')).toEqual(['star-wars-wod/droid']);
        expect(keys('5th character')).toEqual(['wod-v5/hunter', 'wod-v5/vampire']);
        expect(keys('nothing like this')).toEqual([]);
    });

    it('finds kinds in Russian and by their English names', () => {
        setTestLocale('ru');
        expect(keys('охот')).toEqual(['wod-v5/hunter']);
        expect(keys('hunter')).toEqual(['wod-v5/hunter']);
        expect(keys('звёздные дроид')).toEqual(['star-wars-wod/droid']);
    });

    it('matches user types by description and keeps their headings', () => {
        seedUserKinds();
        const found = filterChoices(choices(), 'mining');
        expect(listChoices(found).map(({ key }) => key)).toEqual([
            `wod-v5/${userKindId(2)}/${LUNAR_ID}`,
        ]);
        expect(found[0]!.sections[0]!.name).toBe('Lunar Colony');
    });
});

describe('recent kinds and folds on the device (D5)', () => {
    it('keeps at most five recent kinds, newest first', () => {
        for (const key of [
            'wod-v5/vampire',
            'star-wars-wod/vehicle',
            'wod-v5/hunter',
            'star-wars-wod/droid',
            'wod-2e/wod2e-character',
            'wod-v5/vampire',
            'star-wars-wod/creature',
        ]) {
            rememberRecent(key);
        }
        expect(readCreatePreferences().recent).toEqual([
            'star-wars-wod/creature',
            'wod-v5/vampire',
            'wod-2e/wod2e-character',
            'star-wars-wod/droid',
            'wod-v5/hunter',
        ]);
        const recent = recentChoices(choices(), readCreatePreferences());
        expect(recent.map(({ key }) => key)[0]).toBe('star-wars-wod/creature');
    });

    it('drops and reports recent kinds that are gone', () => {
        rememberRecent('wod-v5/vampire');
        rememberRecent(`wod-v5/${userKindId(9)}`);
        const recent = recentChoices(choices(), readCreatePreferences());
        expect(recent.map(({ key }) => key)).toEqual(['wod-v5/vampire']);
        expect(takeSheetIssues().map(({ code }) => code)).toEqual(['create-recent-missing']);
        expect(readCreatePreferences().recent).toEqual(['wod-v5/vampire']);
    });

    it('ignores and reports unreadable stored preferences', () => {
        window.localStorage.setItem(CREATE_DIALOG_STORAGE_KEY, '{not json');
        expect(readCreatePreferences()).toEqual({ recent: [], toggled: [] });
        window.localStorage.setItem(CREATE_DIALOG_STORAGE_KEY, JSON.stringify({ recent: 4 }));
        expect(readCreatePreferences()).toEqual({ recent: [], toggled: [] });
        expect(takeSheetIssues().map(({ code }) => code)).toEqual([
            'create-preferences-invalid',
            'create-preferences-invalid',
        ]);
    });
});
