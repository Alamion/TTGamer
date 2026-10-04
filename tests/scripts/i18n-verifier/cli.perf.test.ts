import { describe, expect, it } from 'vitest';

import { runVerifier } from '../../../scripts/i18n-verifier/run';

describe('verifier run time', () => {
    // A command-line budget, measured in the sequential perf group where the machine is not shared.
    it('scans the whole repository in under 30 seconds (SC-008)', async () => {
        const started = performance.now();
        await runVerifier();
        expect(performance.now() - started).toBeLessThan(30_000);
    }, 60_000);
});
