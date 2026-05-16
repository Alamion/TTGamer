import { useCharacterStore } from '../../../store/characterStore';
import type { ConditionMark } from '../../../types/character';
import { clsx } from 'clsx';

const HEALTH_LEVELS = [
    { name: 'Bruised', penalty: 0 },
    { name: 'Hurt', penalty: -1 },
    { name: 'Injured', penalty: -2 },
    { name: 'Wounded', penalty: -3 },
    { name: 'Mauled', penalty: -4 },
    { name: 'Crippled', penalty: -5 },
    { name: 'Incapacitated', penalty: 0 },
] as const;

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

export function HealthBlock() {
    const { currentCharacter, updateCharacter } = useCharacterStore();

    if (!currentCharacter) return null;

    const handleHealthChange = (index: number, mark: ConditionMark) => {
        const newLevels = [...currentCharacter.health.levels];
        newLevels[index] = NEXT_MARK[mark];
        updateCharacter(currentCharacter.id, {
            health: { levels: newLevels },
        });
    };

    return (
        <div className="bg-bgSurface border rounded-lg p-4 self-start">
            <h3 className="text-sm text-textSecondary font-semibold uppercase tracking-wider text-right mb-4 pr-3">
                Health
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
                        const mark = currentCharacter.health.levels?.[index] ?? 'empty';
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
