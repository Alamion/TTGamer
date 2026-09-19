import { translate } from '@docusaurus/Translate';
import { ARMOR } from '@site/src/data/armorData';
import { CONSUMABLE_WEAPONS } from '@site/src/data/consumableWeaponsData';
import { MELEE_WEAPONS } from '@site/src/data/meleeWeaponsData';
import { MERITS_FLAWS } from '@site/src/data/meritsFlawsData';
import { RANGED_WEAPONS } from '@site/src/data/rangedWeaponsData';
import { TOOLS_GEAR } from '@site/src/data/toolsGearData';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { CatalogEntry } from '../../../components';
import {
    bookNameLabel,
    catalogEntryText,
    type CatalogLike,
    entryEnumLabel,
} from '../../../systems/catalogs';

/**
 * Star Wars equipment sources of the character body sections, by catalog id. Picker options use
 * `<catalogId>/<entryId>` ids so a pick can record which entry it came from (`entryRef`).
 */
export const EQUIPMENT_SOURCES = {
    'ranged-weapons': RANGED_WEAPONS,
    'melee-weapons': MELEE_WEAPONS,
    armor: ARMOR,
    'tools-gear': TOOLS_GEAR,
    'consumable-weapons': CONSUMABLE_WEAPONS,
    'merits-flaws': MERITS_FLAWS,
} as const satisfies Record<string, readonly CatalogLike[]>;

export type EquipmentSourceId = keyof typeof EQUIPMENT_SOURCES;

function option(
    catalogId: EquipmentSourceId,
    entry: CatalogLike,
    lang: string,
    subtitle?: string
): CatalogEntry {
    return {
        id: `${catalogId}/${entry.id}`,
        name: bookNameLabel(catalogEntryText(catalogId, entry, 'name', lang), entry.name),
        ...(subtitle ? { subtitle } : {}),
    };
}

const text = (catalogId: EquipmentSourceId, entry: CatalogLike, key: string, lang: string) =>
    catalogEntryText(catalogId, entry, key, lang) ?? '';

export function buildWeaponsCatalog(lang: string): CatalogEntry[] {
    return [
        ...RANGED_WEAPONS.map((w) =>
            option(
                'ranged-weapons',
                w,
                lang,
                translate(uiMessages.sheet.items.catalog.rangedWeapon, {
                    damage: w.damage,
                    range: w.range,
                    ammo: w.ammo,
                })
            )
        ),
        ...MELEE_WEAPONS.map((w) => option('melee-weapons', w, lang, w.damage)),
    ];
}

export function buildArmorCatalog(lang: string): CatalogEntry[] {
    return ARMOR.map((a) =>
        option(
            'armor',
            a,
            lang,
            translate(uiMessages.sheet.items.catalog.armor, {
                classVal: a.classVal,
                ar: a.ar,
                dexPenalty: a.dexPenalty,
            })
        )
    );
}

export function buildInventoryCatalog(lang: string): CatalogEntry[] {
    return [
        ...TOOLS_GEAR.map((g) =>
            option('tools-gear', g, lang, text('tools-gear', g, 'effect', lang))
        ),
        ...CONSUMABLE_WEAPONS.map((w) =>
            option(
                'consumable-weapons',
                w,
                lang,
                `[${entryEnumLabel('consumable-weapons', 'type', w.type, lang)}] ${w.damage} ${entryEnumLabel('consumable-weapons', 'damageType', w.damageType, lang)}`
            )
        ),
        ...ARMOR.map((a) =>
            option(
                'armor',
                a,
                lang,
                translate(uiMessages.sheet.items.catalog.armorShort, {
                    classVal: a.classVal,
                    ar: a.ar,
                })
            )
        ),
        ...RANGED_WEAPONS.map((w) =>
            option(
                'ranged-weapons',
                w,
                lang,
                translate(uiMessages.sheet.items.catalog.rangedWeaponShort, {
                    damage: w.damage,
                    range: w.range,
                })
            )
        ),
        ...MELEE_WEAPONS.map((w) => option('melee-weapons', w, lang, w.damage)),
    ];
}

export function buildImplantsCatalog(lang: string): CatalogEntry[] {
    return MERITS_FLAWS.filter((e) => e.implantType !== undefined).map((e) =>
        option(
            'merits-flaws',
            e,
            lang,
            `[${entryEnumLabel('merits-flaws', 'implantType', e.implantType!, lang)}] ${text('merits-flaws', e, 'implantEffect', lang)}`
        )
    );
}

/** `{ catalogId, entryId }` of a picker option id or a stored `entryRef`. */
export function parseEntryRef(ref: string | undefined) {
    const match = ref ? /^([a-z0-9-]+)\/([a-z0-9-]+)$/.exec(ref) : null;
    return match ? { catalogId: match[1], entryId: match[2] } : undefined;
}

function sourceEntry<K extends EquipmentSourceId>(entry: CatalogEntry, catalogId: K) {
    const ref = parseEntryRef(entry.id);
    if (ref?.catalogId !== catalogId) return undefined;
    return (EQUIPMENT_SOURCES[catalogId] as readonly CatalogLike[]).find(
        (candidate) => candidate.id === ref.entryId
    ) as (typeof EQUIPMENT_SOURCES)[K][number] | undefined;
}

export function findArmorEntry(entry: CatalogEntry) {
    return sourceEntry(entry, 'armor');
}

export function findWeaponEntry(entry: CatalogEntry) {
    const ranged = sourceEntry(entry, 'ranged-weapons');
    if (ranged) return { type: 'ranged' as const, entry: ranged };
    const melee = sourceEntry(entry, 'melee-weapons');
    if (melee) return { type: 'melee' as const, entry: melee };
    return null;
}

export function findInventorySource(entry: CatalogEntry) {
    const toolGear = sourceEntry(entry, 'tools-gear');
    if (toolGear) return { type: 'toolGear' as const, entry: toolGear };
    const consumable = sourceEntry(entry, 'consumable-weapons');
    if (consumable) return { type: 'consumable' as const, entry: consumable };
    const armorEntry = sourceEntry(entry, 'armor');
    if (armorEntry) return { type: 'armor' as const, entry: armorEntry };
    const ranged = sourceEntry(entry, 'ranged-weapons');
    if (ranged) return { type: 'ranged' as const, entry: ranged };
    const melee = sourceEntry(entry, 'melee-weapons');
    if (melee) return { type: 'melee' as const, entry: melee };
    return null;
}

export function findImplantEntry(entry: CatalogEntry) {
    return sourceEntry(entry, 'merits-flaws');
}
