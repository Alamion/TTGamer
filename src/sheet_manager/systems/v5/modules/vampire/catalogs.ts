import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import {
    anyCatalog,
    type CatalogBindingEntry,
    defineCatalog,
    textDetail,
    withTexts,
} from '../../../catalogs';
import {
    VAMPIRE_CLAN_ENTRIES,
    VAMPIRE_DISCIPLINE_ENTRIES,
    VAMPIRE_POWER_ENTRIES,
    VAMPIRE_PREDATOR_TYPE_ENTRIES,
    VAMPIRE_RITUAL_ENTRIES,
} from './catalogEntries';

const columns = uiMessages.sheet.v5Vampire.catalogColumns;

/** Texts From catalog fields can show; all of them load on demand (design D9 of spec 037). */
const lazy = (...keys: Array<keyof typeof columns>) =>
    keys.map((key) => ({ key, label: columns[key], lazy: true as const }));

/**
 * Vampire: the Masquerade 5e catalogs (spec 037). Names follow the books; summaries, banes,
 * compulsions, and predator grants are our own words and load on demand from
 * `catalogText/<catalogId>` (their English sources mark them `_lazy`, design D9).
 */

export const VAMPIRE_CATALOG_IDS = {
    clans: 'v5-vampire-clans',
    disciplines: 'v5-vampire-disciplines',
    powers: 'v5-vampire-powers',
    rituals: 'v5-vampire-rituals',
    predatorTypes: 'v5-vampire-predator-types',
} as const;

export const VAMPIRE_CLANS_CATALOG = withTexts(
    defineCatalog(
        VAMPIRE_CATALOG_IDS.clans,
        VAMPIRE_CLAN_ENTRIES,
        [textDetail('name', 'Name')],
        undefined,
        {
            columns: [
                {
                    key: 'disciplines',
                    header: columns.disciplines,
                    entriesOf: VAMPIRE_CATALOG_IDS.disciplines,
                },
            ],
        }
    ),
    lazy('summary', 'bane', 'variantBane', 'compulsion')
);

export const VAMPIRE_DISCIPLINES_CATALOG = withTexts(
    defineCatalog(
        VAMPIRE_CATALOG_IDS.disciplines,
        VAMPIRE_DISCIPLINE_ENTRIES,
        [textDetail('name', 'Name')],
        undefined,
        {
            columns: [],
            children: {
                catalogId: VAMPIRE_CATALOG_IDS.powers,
                key: 'discipline',
                header: columns.powers,
            },
        }
    ),
    lazy('summary')
);

/** Powers: a pick fills the row's level, Rouse cost, and catalog id; the parent fills itself. */
export const VAMPIRE_POWERS_CATALOG = withTexts(
    defineCatalog(
        VAMPIRE_CATALOG_IDS.powers,
        VAMPIRE_POWER_ENTRIES,
        [
            textDetail('name', 'Name'),
            textDetail('discipline', 'Discipline id'),
            textDetail('level', 'Level'),
            textDetail('rouse', 'Rouse checks'),
            textDetail('id', 'Entry id'),
        ],
        undefined,
        {
            columns: [
                { key: 'level', header: columns.level, filter: true },
                { key: 'rouse', header: columns.rouse },
                {
                    key: 'amalgam',
                    header: columns.amalgam,
                    entriesOf: VAMPIRE_CATALOG_IDS.disciplines,
                },
            ],
        }
    ),
    lazy('summary')
);

export const VAMPIRE_RITUALS_CATALOG = withTexts(
    defineCatalog(
        VAMPIRE_CATALOG_IDS.rituals,
        VAMPIRE_RITUAL_ENTRIES,
        [
            textDetail('name', 'Name'),
            textDetail('discipline', 'Discipline id'),
            textDetail('level', 'Level'),
            textDetail('id', 'Entry id'),
        ],
        undefined,
        {
            columns: [
                {
                    key: 'kind',
                    header: columns.kind,
                    labels: uiMessages.sheet.v5Vampire.ritualKinds,
                    filter: true,
                },
                { key: 'level', header: columns.level, filter: true },
            ],
        }
    ),
    lazy('summary')
);

export const VAMPIRE_PREDATOR_TYPES_CATALOG = withTexts(
    defineCatalog(VAMPIRE_CATALOG_IDS.predatorTypes, VAMPIRE_PREDATOR_TYPE_ENTRIES, [
        textDetail('name', 'Name'),
    ]),
    lazy('summary', 'grants')
);

export const vampireCatalogs: readonly CatalogBindingEntry[] = [
    anyCatalog(VAMPIRE_CLANS_CATALOG),
    anyCatalog(VAMPIRE_DISCIPLINES_CATALOG),
    anyCatalog(VAMPIRE_POWERS_CATALOG),
    anyCatalog(VAMPIRE_RITUALS_CATALOG),
    anyCatalog(VAMPIRE_PREDATOR_TYPES_CATALOG),
];
