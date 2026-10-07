import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import { test } from '@playwright/test';

export const TIMINGS_FILE = 'test-results/timings.jsonl';

/** Warm runs per measurement after one warm-up; the best one is reported (AGENTS.md §11). */
export const RUNS = 5;

export interface Timing {
    name: string;
    value: number;
    unit: 'ms' | 'bytes';
    /** No budget yet: the first measurements become the baseline. */
    budget?: number;
}

/**
 * Reports a browser timing next to its budget and never fails the run (spec 026, D7): shared
 * runners and loaded machines make absolute times noisy, so a regression is read, not asserted.
 */
export function recordTiming(timing: Timing) {
    const over = timing.budget !== undefined && timing.value > timing.budget;
    const budget =
        timing.budget === undefined ? 'no budget' : `budget ${timing.budget} ${timing.unit}`;
    const line = `${timing.name}: ${Math.round(timing.value)} ${timing.unit} (${budget})${over ? ' — OVER BUDGET' : ''}`;
    console.log(line);
    test.info().annotations.push({ type: over ? 'over budget' : 'timing', description: line });
    mkdirSync(dirname(TIMINGS_FILE), { recursive: true });
    appendFileSync(TIMINGS_FILE, `${JSON.stringify({ ...timing, over })}\n`);
}

export const best = (values: readonly number[]) => Math.min(...values);
