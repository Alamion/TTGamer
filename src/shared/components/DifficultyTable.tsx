import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { useMemo, useState } from 'react';

import { usePluralMessage } from '../hooks/usePluralMessage';
import { NumberInput } from './NumberInput';

const messages = uiMessages.shared.difficultyTable;

function computeProb(pool: number, diff: number, minNet: number, cancelOnes: boolean): number {
    const pOne = cancelOnes ? 0.1 : 0;
    const pSucc = (11 - diff) / 10;
    const pFail = 1 - pSucc - pOne;
    let prob = 0;
    for (let s = 0; s <= pool; s++) {
        for (let o = 0; o <= pool - s; o++) {
            const f = pool - s - o;
            if (f < 0) continue;
            const net = cancelOnes ? s - o : s;
            if (net < minNet) continue;
            const ways = factorial(pool) / (factorial(s) * factorial(o) * factorial(f));
            prob += ways * pSucc ** s * pOne ** o * pFail ** f;
        }
    }
    return Math.round(prob * 10000) / 100;
}

const factorialCache = new Map<number, number>();
function factorial(n: number): number {
    if (n <= 1) return 1;
    const cached = factorialCache.get(n);
    if (cached !== undefined) return cached;
    const result = n * factorial(n - 1);
    factorialCache.set(n, result);
    return result;
}

const DIFFICULTIES = [3, 4, 5, 6, 7, 8, 9, 10];
const DIFF_LABELS: Record<number, { id: string; message: string }> = {
    3: messages.difficulty.easy,
    4: messages.difficulty.routine,
    5: messages.difficulty.straightforward,
    6: messages.difficulty.standard,
    7: messages.difficulty.challenging,
    8: messages.difficulty.difficult,
    9: messages.difficulty.extremelyDifficult,
    10: messages.difficulty.nearlyImpossible,
};

const DIFF_BG: Record<number, string> = {
    3: 'bg-green-100 dark:bg-green-900/30',
    4: 'bg-emerald-100 dark:bg-emerald-900/30',
    5: 'bg-lime-100 dark:bg-lime-900/30',
    6: 'bg-yellow-100 dark:bg-yellow-900/30',
    7: 'bg-orange-100 dark:bg-orange-900/30',
    8: 'bg-red-100 dark:bg-red-900/30',
    9: 'bg-rose-100 dark:bg-rose-900/30',
    10: 'bg-fuchsia-100 dark:bg-fuchsia-900/30',
};

function cellClass(v: number): string {
    if (v >= 90) return 'text-green-700 dark:text-green-400 font-bold';
    if (v >= 70) return 'text-lime-700 dark:text-lime-400';
    if (v >= 50) return 'text-yellow-700 dark:text-yellow-400';
    if (v >= 30) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
}

const THRESHOLDS = [1, 2, 3, 4, 5];

export function DifficultyTable() {
    const [cancelOnes, setCancelOnes] = useState(true);
    const [currentPool, setCurrentPool] = useState(7);
    const plural = usePluralMessage();

    const rows = useMemo(() => {
        return THRESHOLDS.map((minNet) => ({
            threshold: minNet,
            cells: DIFFICULTIES.map((d) => computeProb(currentPool, d, minNet, cancelOnes)),
        }));
    }, [cancelOnes, currentPool]);

    return (
        <div className="tailwind-root overflow-x-auto">
            <div className="flex flex-wrap gap-4 items-end mb-4">
                <label className="flex flex-col gap-1 text-sm">
                    {translate(messages.pool)}
                    <NumberInput
                        min={1}
                        max={20}
                        step={1}
                        optional={false}
                        value={currentPool}
                        onChange={(pool) => setCurrentPool(pool ?? currentPool)}
                        label={translate(messages.pool)}
                        className="w-20 border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600"
                    />
                </label>
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={cancelOnes}
                        onChange={(e) => setCancelOnes(e.target.checked)}
                        className="w-4 h-4"
                    />
                    {translate(messages.cancelOnes)}
                </label>
            </div>

            <table className="min-w-full text-sm border-collapse">
                <thead>
                    <tr>
                        <th
                            scope="col"
                            className="sticky left-0 bg-white dark:bg-gray-900 border px-2 py-1.5 text-left z-10"
                        >
                            {translate(messages.corner)}
                        </th>
                        {DIFFICULTIES.map((d) => (
                            <th
                                key={d}
                                scope="col"
                                className={`border px-2 py-1.5 text-center ${DIFF_BG[d]}`}
                                title={translate(DIFF_LABELS[d])}
                            >
                                {d}
                                <span className="block text-[10px] font-normal">
                                    {translate(DIFF_LABELS[d])}
                                </span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr
                            key={row.threshold}
                            className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                            <th
                                scope="row"
                                className="sticky left-0 bg-white dark:bg-gray-900 border px-2 py-1 font-bold z-10"
                            >
                                {row.threshold}+
                            </th>
                            {row.cells.map((v, i) => (
                                <td
                                    key={DIFFICULTIES[i]}
                                    className={`border px-2 py-1 text-right ${DIFF_BG[DIFFICULTIES[i]]} ${cellClass(v)}`}
                                >
                                    {v.toFixed(2)}%
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>

            <p className="text-xs text-gray-500 mt-2">
                {plural(messages.summary, currentPool)}{' '}
                {translate(cancelOnes ? messages.cancelEach : messages.onesIgnored)}{' '}
                {translate(messages.liveUpdate)}
            </p>
        </div>
    );
}
