import type { ArmorEntry } from '@site/src/data/armorData';
import { ARMOR } from '@site/src/data/armorData';
import type { ConsumableWeaponEntry } from '@site/src/data/consumableWeaponsData';
import { CONSUMABLE_WEAPONS } from '@site/src/data/consumableWeaponsData';
import type { MeleeWeaponEntry } from '@site/src/data/meleeWeaponsData';
import { MELEE_WEAPONS } from '@site/src/data/meleeWeaponsData';
import type { MeritFlawEntry } from '@site/src/data/meritsFlawsData';
import { MERITS_FLAWS } from '@site/src/data/meritsFlawsData';
import type { RangedWeaponEntry } from '@site/src/data/rangedWeaponsData';
import { RANGED_WEAPONS } from '@site/src/data/rangedWeaponsData';
import type { ToolGearEntry } from '@site/src/data/toolsGearData';
import { TOOLS_GEAR } from '@site/src/data/toolsGearData';

import type { CatalogEntry } from '../../../components';

export function buildWeaponsCatalog(): CatalogEntry[] {
    return [
        ...RANGED_WEAPONS.map((w: RangedWeaponEntry) => ({
            id: w.id,
            name: w.name,
            subtitle: `${w.damage} | ${w.range}m | ${w.ammo} shots`,
        })),
        ...MELEE_WEAPONS.map((w: MeleeWeaponEntry) => ({
            id: w.id,
            name: w.name,
            subtitle: w.damage,
        })),
    ];
}

export function buildArmorCatalog(): CatalogEntry[] {
    return ARMOR.map((a: ArmorEntry) => ({
        id: a.id,
        name: a.name,
        subtitle: `Class ${a.classVal} | AR ${a.ar} | Dex ${a.dexPenalty}`,
    }));
}

export function buildInventoryCatalog(): CatalogEntry[] {
    return [
        ...TOOLS_GEAR.map((g: ToolGearEntry) => ({
            id: g.id,
            name: g.name,
            subtitle: g.effect,
        })),
        ...CONSUMABLE_WEAPONS.map((w: ConsumableWeaponEntry) => ({
            id: w.id,
            name: w.name,
            subtitle: `[${w.type}] ${w.damage} ${w.damageType}`,
        })),
        ...ARMOR.map((a: ArmorEntry) => ({
            id: a.id,
            name: a.name,
            subtitle: `Class ${a.classVal} | AR ${a.ar}`,
        })),
        ...RANGED_WEAPONS.map((w: RangedWeaponEntry) => ({
            id: w.id,
            name: w.name,
            subtitle: `${w.damage} | ${w.range}m`,
        })),
        ...MELEE_WEAPONS.map((w: MeleeWeaponEntry) => ({
            id: w.id,
            name: w.name,
            subtitle: w.damage,
        })),
    ];
}

export function buildImplantsCatalog(): CatalogEntry[] {
    return MERITS_FLAWS.filter((e) => e.implantType !== undefined).map((e: MeritFlawEntry) => ({
        id: e.id,
        name: e.name,
        subtitle: `[${e.implantType}] ${e.implantEffect}`,
    }));
}

export function findArmorEntry(entry: CatalogEntry) {
    return ARMOR.find((a) => a.id === entry.id);
}

export function findWeaponEntry(entry: CatalogEntry) {
    const ranged = RANGED_WEAPONS.find((w) => w.id === entry.id);
    if (ranged) return { type: 'ranged' as const, entry: ranged };
    const melee = MELEE_WEAPONS.find((w) => w.id === entry.id);
    if (melee) return { type: 'melee' as const, entry: melee };
    return null;
}

export function findInventorySource(entry: CatalogEntry) {
    const toolGear = TOOLS_GEAR.find((g) => g.id === entry.id);
    if (toolGear) return { type: 'toolGear' as const, entry: toolGear };
    const consumable = CONSUMABLE_WEAPONS.find((w) => w.id === entry.id);
    if (consumable) return { type: 'consumable' as const, entry: consumable };
    const armorEntry = ARMOR.find((a) => a.id === entry.id);
    if (armorEntry) return { type: 'armor' as const, entry: armorEntry };
    const ranged = RANGED_WEAPONS.find((w) => w.id === entry.id);
    if (ranged) return { type: 'ranged' as const, entry: ranged };
    const melee = MELEE_WEAPONS.find((w) => w.id === entry.id);
    if (melee) return { type: 'melee' as const, entry: melee };
    return null;
}

export function findImplantEntry(entry: CatalogEntry) {
    return MERITS_FLAWS.find((e) => e.id === entry.id);
}
