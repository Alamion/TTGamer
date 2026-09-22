import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { anyCatalog, type CatalogBindingEntry, defineCatalog, textDetail } from '../../../catalogs';
import {
    HUNTER_ADVANTAGE_ENTRIES,
    HUNTER_ARMOR_ENTRIES,
    HUNTER_GEAR_ENTRIES,
    HUNTER_WEAPON_ENTRIES,
} from './catalogEntries';

const hunter = uiMessages.sheet.v5Hunter;
const summaries = hunter.summaries;
const categories = hunter.categories;
const columns = hunter.catalogColumns;

/**
 * Hunter: the Reckoning 5e suggestion catalogs. Names follow the book (trait names may be used);
 * one-line summaries are the project's own words and live in `ui/sheet/v5Hunter.yaml`.
 * Perk ids are `<edge>-<perk>` so perks sharing a name under different Edges stay distinct.
 */

const HUNTER_CREED_NAMES = [
    { id: 'entrepreneurial', name: 'Entrepreneurial' },
    { id: 'faithful', name: 'Faithful' },
    { id: 'inquisitive', name: 'Inquisitive' },
    { id: 'martial', name: 'Martial' },
    { id: 'underground', name: 'Underground' },
] as const;

const HUNTER_DRIVE_NAMES = [
    { id: 'curiosity', name: 'Curiosity' },
    { id: 'vengeance', name: 'Vengeance' },
    { id: 'oath', name: 'Oath' },
    { id: 'greed', name: 'Greed' },
    { id: 'pride', name: 'Pride' },
    { id: 'envy', name: 'Envy' },
    { id: 'atonement', name: 'Atonement' },
] as const;

const HUNTER_EDGE_NAMES = [
    { id: 'arsenal', name: 'Arsenal', category: 'assets' },
    { id: 'fleet', name: 'Fleet', category: 'assets' },
    { id: 'ordnance', name: 'Ordnance', category: 'assets' },
    { id: 'library', name: 'Library', category: 'assets' },
    { id: 'improvised-gear', name: 'Improvised Gear', category: 'aptitudes' },
    { id: 'global-access', name: 'Global Access', category: 'aptitudes' },
    { id: 'drone-jockey', name: 'Drone Jockey', category: 'aptitudes' },
    { id: 'beast-whisperer', name: 'Beast Whisperer', category: 'aptitudes' },
    { id: 'sense-the-unnatural', name: 'Sense the Unnatural', category: 'endowments' },
    { id: 'repel-the-unnatural', name: 'Repel the Unnatural', category: 'endowments' },
    { id: 'thwart-the-unnatural', name: 'Thwart the Unnatural', category: 'endowments' },
    { id: 'artifact', name: 'Artifact', category: 'endowments' },
] as const;

export const HUNTER_PERKS = [
    { id: 'arsenal-team-requisition', name: 'Team Requisition', edge: 'arsenal' },
    { id: 'arsenal-special-features', name: 'Special Features', edge: 'arsenal' },
    { id: 'arsenal-exotics', name: 'Exotics', edge: 'arsenal' },
    { id: 'arsenal-untraceable', name: 'Untraceable', edge: 'arsenal' },
    { id: 'fleet-armor', name: 'Armor', edge: 'fleet' },
    { id: 'fleet-performance', name: 'Performance', edge: 'fleet' },
    { id: 'fleet-surveillance', name: 'Surveillance', edge: 'fleet' },
    { id: 'fleet-untraceable', name: 'Untraceable', edge: 'fleet' },
    { id: 'ordnance-multiple-payloads', name: 'Multiple Payloads', edge: 'ordnance' },
    { id: 'ordnance-non-lethal-munitions', name: 'Non-Lethal Munitions', edge: 'ordnance' },
    { id: 'ordnance-exotics', name: 'Exotics', edge: 'ordnance' },
    { id: 'ordnance-disguised-delivery', name: 'Disguised Delivery', edge: 'ordnance' },
    { id: 'library-where-they-hide', name: 'Where They Hide', edge: 'library' },
    { id: 'library-who-they-are', name: 'Who They Are', edge: 'library' },
    { id: 'library-how-to-halt-them', name: 'How to Halt Them', edge: 'library' },
    { id: 'library-how-to-harm-them', name: 'How to Harm Them', edge: 'library' },
    { id: 'improvised-gear-frugal', name: 'Frugal', edge: 'improvised-gear' },
    { id: 'improvised-gear-mass-production', name: 'Mass Production', edge: 'improvised-gear' },
    { id: 'improvised-gear-specialization', name: 'Specialization', edge: 'improvised-gear' },
    { id: 'improvised-gear-speed-crafting', name: 'Speed Crafting', edge: 'improvised-gear' },
    {
        id: 'global-access-watching-big-brother',
        name: 'Watching Big Brother',
        edge: 'global-access',
    },
    { id: 'global-access-all-access-pass', name: 'All-Access Pass', edge: 'global-access' },
    { id: 'global-access-money-tap', name: 'Money Tap', edge: 'global-access' },
    {
        id: 'global-access-the-letter-of-the-law',
        name: 'The Letter of the Law',
        edge: 'global-access',
    },
    { id: 'drone-jockey-autonomous', name: 'Autonomous', edge: 'drone-jockey' },
    { id: 'drone-jockey-variants', name: 'Variants', edge: 'drone-jockey' },
    { id: 'drone-jockey-specialist-skill', name: 'Specialist Skill', edge: 'drone-jockey' },
    { id: 'drone-jockey-armaments', name: 'Armaments', edge: 'drone-jockey' },
    { id: 'drone-jockey-payload', name: 'Payload', edge: 'drone-jockey' },
    { id: 'beast-whisperer-incorruptible', name: 'Incorruptible', edge: 'beast-whisperer' },
    { id: 'beast-whisperer-menagerie', name: 'Menagerie', edge: 'beast-whisperer' },
    { id: 'beast-whisperer-complex-commands', name: 'Complex Commands', edge: 'beast-whisperer' },
    { id: 'beast-whisperer-incognito', name: 'Incognito', edge: 'beast-whisperer' },
    {
        id: 'sense-the-unnatural-creature-specialization',
        name: 'Creature Specialization',
        edge: 'sense-the-unnatural',
    },
    { id: 'sense-the-unnatural-range', name: 'Range', edge: 'sense-the-unnatural' },
    { id: 'sense-the-unnatural-precision', name: 'Precision', edge: 'sense-the-unnatural' },
    { id: 'sense-the-unnatural-handsfree', name: 'Handsfree', edge: 'sense-the-unnatural' },
    { id: 'repel-the-unnatural-ward', name: 'Ward', edge: 'repel-the-unnatural' },
    { id: 'repel-the-unnatural-damage', name: 'Damage', edge: 'repel-the-unnatural' },
    {
        id: 'repel-the-unnatural-creature-specialization',
        name: 'Creature Specialization',
        edge: 'repel-the-unnatural',
    },
    { id: 'repel-the-unnatural-handsfree', name: 'Handsfree', edge: 'repel-the-unnatural' },
    {
        id: 'thwart-the-unnatural-creature-specialization',
        name: 'Creature Specialization',
        edge: 'thwart-the-unnatural',
    },
    { id: 'thwart-the-unnatural-ward', name: 'Ward', edge: 'thwart-the-unnatural' },
    { id: 'thwart-the-unnatural-recognition', name: 'Recognition', edge: 'thwart-the-unnatural' },
    { id: 'thwart-the-unnatural-handsfree', name: 'Handsfree', edge: 'thwart-the-unnatural' },
    { id: 'artifact-empower', name: 'Empower', edge: 'artifact' },
    { id: 'artifact-attraction', name: 'Attraction', edge: 'artifact' },
    { id: 'artifact-detection', name: 'Detection', edge: 'artifact' },
    { id: 'artifact-shield', name: 'Shield', edge: 'artifact' },
] as const;

/** Entries carry translated own-words summaries (and Edge category names) for docs tables. */
export const HUNTER_CREEDS = HUNTER_CREED_NAMES.map((entry) => ({
    ...entry,
    summary: summaries.creeds[entry.id],
}));

export const HUNTER_DRIVES = HUNTER_DRIVE_NAMES.map((entry) => ({
    ...entry,
    summary: summaries.drives[entry.id],
}));

export const HUNTER_EDGES = HUNTER_EDGE_NAMES.map((entry) => ({
    ...entry,
    summary: summaries.edges[entry.id],
    categoryLabel: categories[entry.category],
}));

export const HUNTER_CREEDS_CATALOG = defineCatalog('v5-hunter-creeds', HUNTER_CREEDS, [
    textDetail('name', 'Name'),
]);

export const HUNTER_DRIVES_CATALOG = defineCatalog('v5-hunter-drives', HUNTER_DRIVES, [
    textDetail('name', 'Name'),
]);

export const HUNTER_EDGES_CATALOG = defineCatalog(
    'v5-hunter-edges',
    HUNTER_EDGES,
    [textDetail('name', 'Name'), textDetail('category', 'Category')],
    undefined,
    {
        columns: [
            { key: 'categoryLabel', header: columns.category, filter: true },
            { key: 'summary', header: columns.summary },
        ],
        children: { catalogId: 'v5-hunter-perks', key: 'edge', header: columns.perks },
    }
);

const EDGE_NAME_BY_ID: Readonly<Record<string, string>> = Object.fromEntries(
    HUNTER_EDGE_NAMES.map(({ id, name }) => [id, name])
);

/** Perks with the name of their Edge (a Perk row fills its Edge column from it). */
export const HUNTER_PERK_ENTRIES = HUNTER_PERKS.map((entry) => ({
    ...entry,
    edgeName: EDGE_NAME_BY_ID[entry.edge] ?? entry.edge,
}));

export const HUNTER_PERKS_CATALOG = defineCatalog('v5-hunter-perks', HUNTER_PERK_ENTRIES, [
    textDetail('name', 'Name'),
    textDetail('edge', 'Edge id'),
    textDetail('edgeName', 'Edge'),
]);

/** Merits, Backgrounds, and Flaws (names from the book, summaries in our own words). */
export const HUNTER_ADVANTAGES_CATALOG = defineCatalog(
    'v5-hunter-advantages',
    HUNTER_ADVANTAGE_ENTRIES,
    [textDetail('name', 'Name'), textDetail('dots', 'Dots')],
    undefined,
    {
        columns: [
            { key: 'type', header: columns.type, labels: hunter.advantageTypes, filter: true },
            { key: 'group', header: columns.group, labels: hunter.advantageGroups, filter: true },
            { key: 'dots', header: columns.dots },
            { key: 'summary', header: columns.summary },
        ],
    }
);

/** Weapon types by damage bonus; picking one on the sheet fills the weapon's damage. */
export const HUNTER_WEAPONS_CATALOG = defineCatalog(
    'v5-hunter-weapons',
    HUNTER_WEAPON_ENTRIES,
    [textDetail('name', 'Name'), textDetail('damage', 'Damage')],
    undefined,
    {
        columns: [
            { key: 'kind', header: columns.kind, labels: hunter.weaponKinds, filter: true },
            { key: 'damage', header: columns.damage },
            { key: 'examples', header: columns.examples },
        ],
    }
);

export const HUNTER_ARMOR_CATALOG = defineCatalog(
    'v5-hunter-armor',
    HUNTER_ARMOR_ENTRIES.map((entry) => ({ ...entry, effect: `Armor ${entry.armor}` })),
    [textDetail('name', 'Name'), textDetail('effect', 'Effect')],
    undefined,
    {
        columns: [
            { key: 'armor', header: columns.armor },
            { key: 'note', header: columns.note },
        ],
    }
);

export const HUNTER_GEAR_CATALOG = defineCatalog(
    'v5-hunter-gear',
    HUNTER_GEAR_ENTRIES,
    [textDetail('name', 'Name')],
    undefined,
    { columns: [{ key: 'effect', header: columns.effect }] }
);

export const hunterCatalogs: readonly CatalogBindingEntry[] = [
    anyCatalog(HUNTER_CREEDS_CATALOG),
    anyCatalog(HUNTER_DRIVES_CATALOG),
    anyCatalog(HUNTER_EDGES_CATALOG),
    anyCatalog(HUNTER_PERKS_CATALOG),
    anyCatalog(HUNTER_ADVANTAGES_CATALOG),
    anyCatalog(HUNTER_WEAPONS_CATALOG),
    anyCatalog(HUNTER_ARMOR_CATALOG),
    anyCatalog(HUNTER_GEAR_CATALOG),
];
