import { useCharacterStore } from '../../../store/characterStore';
import type { ConditionMark } from '../../../types/character';

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
        <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
            <h3 className="text-rebel-red text-sm font-semibold uppercase tracking-wider text-right mb-4 pr-3">
                Health
            </h3>

            <table className="w-full">
                <thead>
                    <tr className="text-xs text-slate-500 uppercase">
                        <th className="text-right pr-4 pb-2">Level</th>
                        <th className="w-12 pb-2 text-center">Penalty</th>
                        <th className="w-20 pb-2 text-center">Damage</th>
                    </tr>
                </thead>
                <tbody>
                    {HEALTH_LEVELS.map((level, index) => {
                        const mark = currentCharacter.health.levels?.[index] ?? 'empty';
                        const isIncapacitated = level.name === 'Incapacitated';

                        return (
                            <tr
                                key={level.name}
                                className={`
                                    border-t border-slate-700/50
                                    ${mark === 'cross' ? 'text-rebel-red' : 'text-slate-400'}
                                `}
                            >
                                <td
                                    className={`py-1 pr-4 text-right ${isIncapacitated ? 'font-semibold' : ''}`}
                                >
                                    {level.name}
                                </td>
                                <td className="py-1 w-12 text-center text-xs text-slate-600">
                                    {level.penalty !== 0 ? `${level.penalty}` : '—'}
                                </td>
                                <td className="py-1 w-20 text-center">
                                    <button
                                        type="button"
                                        onClick={() => handleHealthChange(index, mark)}
                                        className={`
                                            w-8 h-8 mx-auto flex items-center justify-center border-2 rounded font-mono font-bold transition-all duration-200
                                            ${
                                                mark === 'cross'
                                                    ? 'bg-rebel-red border-rebel-red text-white'
                                                    : mark === 'slash'
                                                      ? 'bg-slate-600 border-slate-600 text-slate-200'
                                                      : 'bg-transparent border-slate-600 text-slate-500 hover:border-slate-400 hover:text-slate-300'
                                            }
                                        `}
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
