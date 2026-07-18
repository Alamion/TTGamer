import { HelpCircle } from 'lucide-react';
import { useCharacter } from '../../../hooks';
import { HEALTH_LEVELS } from '../../../types/character';
import type { ConditionMark } from '../../../types/character';
import { clsx } from 'clsx';

const NEXT_MARK: Record<ConditionMark, ConditionMark> = {
    empty: 'slash',
    slash: 'cross',
    cross: 'empty',
};

const MARK_SYMBOLS: Record<ConditionMark, string> = {
    empty: '',
    slash: '/',
    cross: 'X',
};

interface HealthBlockProps {
    docsPath?: string;
}

export function HealthBlock({ docsPath }: HealthBlockProps) {
    const { character, readOnly, updateCharacter } = useCharacter();
    if (!character) return null;

    const handleHealthChange = (index: number, mark: ConditionMark) => {
        const newLevels = [...character.health.levels];
        newLevels[index] = NEXT_MARK[mark];
        updateCharacter(character.id, {
            health: { levels: newLevels },
        });
    };

    return (
        // can't use <SectionCard> because I need header on right side and overall div flex-start
        <div className="bg-bgSurface border rounded-lg p-4 self-start">
            <h3 className="text-sm text-textSecondary font-semibold uppercase tracking-wider text-right mb-4 pr-3 flex items-center justify-end gap-2">
                Health
                {docsPath && (
                    <a
                        href={docsPath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-textSecondary hover:text-textPrimary transition-colors"
                        aria-label="Documentation for Health"
                    >
                        <HelpCircle className="w-4 h-4" />
                    </a>
                )}
            </h3>

            <table className="w-full table-fixed">
                <colgroup>
                    <col className="w-full" />
                    <col className="w-12" />
                    <col className="w-20" />
                </colgroup>
                <thead>
                    <tr className="text-xs text-textSecondary uppercase">
                        <th className="text-right pr-4 pb-2">Level</th>
                        <th className="pb-2 text-center">Penalty</th>
                        <th className="pb-2 text-center">Damage</th>
                    </tr>
                </thead>
                <tbody>
                    {HEALTH_LEVELS.map((level, index) => {
                        const mark = character.health.levels?.[index] ?? 'empty';
                        const isIncapacitated = level.name === 'Incapacitated';

                        return (
                            <tr
                                key={level.name}
                                className={clsx(
                                    'border-t/50',
                                    mark === 'cross' ? 'text-error' : 'text-textSecondary'
                                )}
                            >
                                <td
                                    className={clsx(
                                        'py-1 pr-4 text-right',
                                        isIncapacitated ? 'font-semibold' : ''
                                    )}
                                >
                                    {level.name}
                                </td>
                                <td className="py-1 w-12 text-center">
                                    {level.penalty !== 0 ? `${level.penalty}` : '—'}
                                </td>
                                <td className="py-1 w-20 text-center">
                                    <button
                                        type="button"
                                        onClick={() => handleHealthChange(index, mark)}
                                        disabled={readOnly}
                                        className={clsx(
                                            'w-8 h-8 mx-auto flex items-center justify-center border-2 rounded font-mono font-bold transition-all duration-200',
                                            mark === 'cross'
                                                ? 'bg-error border-error text-primary-on'
                                                : mark === 'slash'
                                                  ? 'bg-secondary border-secondary text-secondary-on'
                                                  : 'bg-transparent text-textSecondary hover:border-primary hover:text-textPrimary'
                                        )}
                                        aria-label={`${level.name}: ${MARK_SYMBOLS[mark] || 'empty'}`}
                                    >
                                        {MARK_SYMBOLS[mark]}
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
