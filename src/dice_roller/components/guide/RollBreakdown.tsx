import { translate } from '@docusaurus/Translate';
import { type UiMessageDescriptor, uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';

import type { DiceRoll, RollResult } from '../../dice-logic/types';

const legend = uiMessages.dice.guide.legend;

type Mark =
    | 'dropped'
    | 'success'
    | 'botch'
    | 'critSuccess'
    | 'critFailure'
    | 'exploded'
    | 'raised'
    | 'capped'
    | 'special';

const MARK_LABELS: Record<Mark, UiMessageDescriptor> = {
    dropped: legend.dropped,
    success: legend.success,
    botch: legend.botch,
    critSuccess: legend.critSuccess,
    critFailure: legend.critFailure,
    exploded: legend.exploded,
    raised: legend.raised,
    capped: legend.capped,
    special: legend.special,
};

/** Small signs drawn on a chip; colours and strike-through carry the other marks. */
const MARK_SIGNS: Partial<Record<Mark, string>> = {
    exploded: '!',
    critSuccess: '★',
    critFailure: '✕',
    raised: '↑',
    capped: '↓',
};

function marksOf(roll: DiceRoll): Mark[] {
    const marks: Mark[] = [];
    if (roll.dropped) marks.push('dropped');
    if (roll.targetSuccess) marks.push('success');
    if (roll.targetFailure) marks.push('botch');
    if (roll.criticalSuccess) marks.push('critSuccess');
    if (roll.criticalFailure) marks.push('critFailure');
    if (roll.exploded) marks.push('exploded');
    if (roll.minRaised) marks.push('raised');
    if (roll.maxCapped) marks.push('capped');
    if (roll.label) marks.push('special');
    return marks;
}

function chipClass(marks: readonly Mark[]): string {
    return clsx(
        'relative inline-flex items-center justify-center rounded-md border font-mono font-semibold tabular-nums',
        marks.includes('dropped')
            ? 'border-dashed border-border text-textSecondary line-through opacity-50'
            : marks.includes('botch')
              ? 'border-red-500/70 bg-red-500/15 text-red-700 dark:text-red-300'
              : marks.includes('success')
                ? 'border-green-500/70 bg-green-500/15 text-green-700 dark:text-green-300'
                : 'border-border bg-bgBase text-textPrimary',
        marks.includes('special') && 'ring-2 ring-purple-500/60',
        marks.includes('critSuccess') && 'ring-2 ring-amber-400',
        marks.includes('critFailure') && 'ring-2 ring-red-500'
    );
}

function Signs({ marks }: { marks: readonly Mark[] }) {
    const signs = marks.map((mark) => MARK_SIGNS[mark]).filter(Boolean);
    if (signs.length === 0) return null;
    return (
        <span
            aria-hidden="true"
            className="absolute -right-1.5 -top-2 rounded-full bg-bgSurface px-0.5 text-[10px] leading-none text-textSecondary"
        >
            {signs.join('')}
        </span>
    );
}

function DieChip({ roll }: { roll: DiceRoll }) {
    const marks = marksOf(roll);
    const face = roll.faceLabel?.trim() || String(roll.value);
    const description = [`d${roll.sides}: ${face}`, ...marks.map((m) => translate(MARK_LABELS[m]))];
    return (
        <span
            role="img"
            aria-label={description.join(', ')}
            title={description.join(', ')}
            className={clsx(chipClass(marks), 'h-8 min-w-8 px-1.5 text-sm')}
        >
            {face}
            <Signs marks={marks} />
        </span>
    );
}

/** Every die of a roll as a chip with its marks, the total, and a legend of the marks used. */
export function RollBreakdown({ result }: { result: RollResult }) {
    const used = new Set(
        result.diceGroups.flatMap((group) => group.rolls.flatMap((roll) => marksOf(roll)))
    );
    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
                {result.diceGroups.map((group, index) => (
                    <span key={index} className="inline-flex flex-wrap items-center gap-1.5">
                        {index > 0 && (
                            <span aria-hidden="true" className="px-0.5 text-textSecondary">
                                {group.operation}
                            </span>
                        )}
                        {group.rolls.map((roll, rollIndex) => (
                            <DieChip key={rollIndex} roll={roll} />
                        ))}
                    </span>
                ))}
                <span className="ml-1 text-sm text-textSecondary">
                    {translate(uiMessages.dice.guide.total)}{' '}
                    <strong className="text-lg text-textPrimary">{result.total}</strong>
                </span>
            </div>
            <code className="self-start text-xs text-textSecondary">
                {result.formatted} = {result.total}
            </code>
            {used.size > 0 && (
                <ul
                    aria-label={translate(legend.label)}
                    className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 text-xs text-textSecondary"
                >
                    {(Object.keys(MARK_LABELS) as Mark[])
                        .filter((mark) => used.has(mark))
                        .map((mark) => (
                            <li key={mark} className="m-0 inline-flex items-center gap-1.5">
                                <span
                                    aria-hidden="true"
                                    className={clsx(chipClass([mark]), 'h-4 w-4 text-[9px]')}
                                >
                                    <Signs marks={[mark]} />
                                </span>
                                {translate(MARK_LABELS[mark])}
                            </li>
                        ))}
                </ul>
            )}
        </div>
    );
}
