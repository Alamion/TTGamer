import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { formula, text } from '../../../../../templates/builders';
import type {
    ButtonNode,
    PoolTrackerOverride,
    RowButton,
    TemplateField,
    VisibleWhen,
} from '../../../../../types/template';
import { VAMPIRE_CATALOG_IDS } from '../catalogs';

/**
 * The vampire's mechanics as ordinary template elements (spec 038): an author finds each of them
 * in the template editor and can rebuild it. Rules: core rulebook pp. 205–216.
 */

const vampire = uiMessages.sheet.v5Vampire;
const feeding = vampire.potency.feeding;

type Message = { id: string; message: string };

/** A Rouse check: one die, 6 or more keeps Hunger, a failure raises it (p. 211). */
const rouseRoll = { notation: '1d10>=6', successAt: 1, gameDice: false };
const raiseHunger = [{ target: 'hunger', op: 'add' as const, amount: '1' }];

export function rouseButton(): ButtonNode {
    return {
        id: 'rouse',
        type: 'button',
        label: vampire.rouse.action.message,
        labelMessage: vampire.rouse.action.id,
        icon: 'droplet',
        roll: rouseRoll,
        onSuccess: [],
        onFailure: raiseHunger,
        always: [],
    };
}

/**
 * A power's Rouse checks: as many as it costs; Blood Potency re-rolls a failure of a power at or
 * below half its value, rounded up (p. 216). Powers without a cost have no button.
 */
export function powerRouseButton(): RowButton {
    return {
        id: 'power-rouse',
        label: vampire.rouse.action.message,
        labelMessage: vampire.rouse.action.id,
        icon: 'droplet',
        availableWhen: 'row.rouse > 0',
        roll: {
            ...rouseRoll,
            count: 'row.rouse',
            rerollWhen: 'row.level <= ceil(blood-potency / 2)',
        },
        onSuccess: [],
        onFailure: raiseHunger,
        always: [],
    };
}

/**
 * Remorse at the end of a session with stains: a die per box neither filled nor stained (at
 * least one); a failure costs a dot of Humanity; the stains clear either way (p. 239).
 */
export function remorseButton(): ButtonNode {
    return {
        id: 'remorse',
        type: 'button',
        label: vampire.remorse.action.message,
        labelMessage: vampire.remorse.action.id,
        icon: 'heart',
        availableWhen: 'stains > 0',
        roll: { ...rouseRoll, notation: '{max(1, 10 - humanity - stains)}d10>=6' },
        onSuccess: [],
        onFailure: [{ target: 'humanity', op: 'add', amount: '-1' }],
        always: [{ target: 'stains', op: 'set', amount: '0' }],
    };
}

/** Humanity drawn as ten boxes with stains from the end (spec 037 D7); a strip in the brief. */
export function humanityTracker(compact: boolean): PoolTrackerOverride {
    return {
        display: compact ? 'strip' : 'row',
        legend: false,
        total: true,
        marksFromEnd: {
            coordinate: 'stains',
            mark: { name: vampire.marks.stain.message, nameMessage: vampire.marks.stain.id },
        },
    };
}

/** A text result of a formula, translated in the reader's language. */
const quoted = (message: Message) => `"${message.message}"`;

/** Nested `if`s from the highest threshold down: `[[10, a], [9, b]]`, else `otherwise`. */
function byThreshold(
    coordinate: string,
    steps: ReadonlyArray<readonly [number, string]>,
    otherwise: string
): string {
    return steps.reduceRight(
        (rest, [at, result]) => `if(${coordinate} >= ${at}, ${result}, ${rest})`,
        otherwise
    );
}

const FEEDING_STEPS: ReadonlyArray<readonly [number, Message]> = [
    [10, feeding.b10],
    [9, feeding.b9],
    [7, feeding.b7],
    [5, feeding.b5],
    [4, feeding.b4],
    [3, feeding.b3],
    [2, feeding.b2],
];

const textMessages = (messages: readonly Message[]) =>
    Object.fromEntries(messages.map(({ id, message }) => [message, id]));

/** Lowest and highest Blood Potency a generation allows (p. 216; thin-bloods: 0). */
const POTENCY_LOW = byThreshold(
    'generation',
    [
        [14, '0'],
        [10, '1'],
        [8, '2'],
        [6, '3'],
        [5, '4'],
    ],
    '5'
);
const POTENCY_HIGH = byThreshold(
    'generation',
    [
        [14, '0'],
        [12, '3'],
        [10, '4'],
        [9, '5'],
        [8, '6'],
        [7, '7'],
        [6, '8'],
        [5, '9'],
    ],
    '10'
);

/** What the current Blood Potency gives (pp. 214–216), as derived values. */
export function bloodPotencyEffects(): TemplateField[] {
    const effect = (id: string, label: Message, source: string, prefix?: string) =>
        formula(id, label.message, source, {
            labelMessage: label,
            compact: true,
            ...(prefix ? { prefix } : {}),
        });
    const feedingText = formula(
        'feeding-penalty',
        vampire.fields.feedingPenalty.message,
        byThreshold(
            'blood-potency',
            FEEDING_STEPS.map(([at, message]) => [at, quoted(message)] as const),
            quoted(feeding.none)
        ),
        { labelMessage: vampire.fields.feedingPenalty }
    );
    const outside = formula(
        'potency-outside',
        vampire.fields.bloodPotency.message,
        quoted(vampire.potency.outside),
        {
            labelMessage: vampire.fields.bloodPotency,
            compact: true,
            visibleWhen: {
                formula: `or(blood-potency < ${POTENCY_LOW}, blood-potency > ${POTENCY_HIGH})`,
            },
        }
    );
    return [
        effect('blood-surge', vampire.fields.bloodSurge, 'ceil(blood-potency / 2)', '+'),
        effect(
            'mend',
            vampire.fields.mend,
            byThreshold(
                'blood-potency',
                [
                    [10, '5'],
                    [8, '4'],
                    [4, '3'],
                    [2, '2'],
                ],
                '1'
            )
        ),
        effect('power-bonus', vampire.fields.powerBonus, 'floor(blood-potency / 2)', '+'),
        effect('rouse-reroll', vampire.fields.rouseReroll, 'ceil(blood-potency / 2)'),
        effect('bane-severity', vampire.fields.baneSeverity, 'ceil(blood-potency / 2)'),
        effect(
            'potency-range',
            vampire.fields.potencyRange,
            `${POTENCY_LOW} & "–" & ${POTENCY_HIGH}`
        ),
        { ...outside, textMessages: textMessages([vampire.potency.outside]) } as TemplateField,
        {
            ...feedingText,
            span: 2,
            textMessages: textMessages([
                feeding.none,
                ...FEEDING_STEPS.map(([, message]) => message),
            ]),
        } as TemplateField,
    ];
}

/** Rituals, ceremonies, and formulas show while a discipline that has them has dots. */
export const RITUALS_VISIBLE: VisibleWhen = {
    formula:
        'rating(disciplines, "Blood Sorcery") + rating(disciplines, "Oblivion") + rating(disciplines, "Thin-Blood Alchemy") > 0',
};

/** A text a clan or predator type gives, from the catalog (spec 038 D9). */
function catalogText(
    id: string,
    valueKey: string,
    label: Message,
    fromCatalog: NonNullable<Extract<TemplateField, { type: 'text' }>['fromCatalog']>,
    options: { multiline?: boolean; hideLabel?: boolean } = {}
): TemplateField {
    return {
        ...text(`${id}-field`, label.message, valueKey, { labelMessage: label, ...options }),
        fromCatalog,
    } as TemplateField;
}

/** The clan's bane (or its variant while chosen) suggested until the player writes their own. */
export function baneField(): TemplateField {
    return catalogText(
        'bane',
        'bane',
        vampire.fields.bane,
        {
            catalogId: VAMPIRE_CATALOG_IDS.clans,
            entryFrom: 'clan',
            text: 'bane',
            alternative: { text: 'variantBane', when: 'bane-variant = "variant"' },
            mode: 'suggest',
        },
        { multiline: true }
    );
}

export function compulsionField(): TemplateField {
    return catalogText(
        'compulsion',
        'compulsion',
        vampire.fields.compulsion,
        {
            catalogId: VAMPIRE_CATALOG_IDS.clans,
            entryFrom: 'clan',
            text: 'compulsion',
            mode: 'suggest',
        },
        { multiline: true }
    );
}

/** What the predator type gives: shown, never stored (spec 037 clarification). */
export function predatorGrantsField(): TemplateField {
    return catalogText(
        'predator-grants',
        'predator-grants',
        vampire.fields.predatorGrants,
        {
            catalogId: VAMPIRE_CATALOG_IDS.predatorTypes,
            entryFrom: 'predator-type',
            text: 'grants',
            mode: 'show',
        },
        { hideLabel: true }
    );
}
