import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { verifierMain } from '../../../scripts/i18n-verifier/cli';
import { formatReport } from '../../../scripts/i18n-verifier/report';
import { runVerifier } from '../../../scripts/i18n-verifier/run';
import { writeFixture } from '../fixtureFiles';
import { FIXTURE_FILES, fixtureOptions, REPORT_CONFIG } from './fixture';

describe('verifier run and report', () => {
    it('fails only on error findings of gated rules', async () => {
        const gated = await runVerifier(await fixtureOptions());
        expect(gated.exitCode).toBe(1);
        const reported = await runVerifier(await fixtureOptions(FIXTURE_FILES, REPORT_CONFIG));
        expect(reported.findings.length).toBe(gated.findings.length);
        expect(reported.exitCode).toBe(0);
    });

    it('filters by area and rule', async () => {
        const docs = await runVerifier(await fixtureOptions(), { areas: ['docs'] });
        expect(new Set(docs.findings.map((finding) => finding.rule))).toEqual(
            new Set(['docs', 'docs-terms'])
        );
        const one = await runVerifier(await fixtureOptions(), { rules: ['plural'] });
        expect(new Set(one.findings.map((finding) => finding.rule))).toEqual(new Set(['plural']));
    });

    it('prints findings of gated rules and a covered/missing/excepted table', async () => {
        const run = await runVerifier(await fixtureOptions(FIXTURE_FILES, REPORT_CONFIG));
        const report = formatReport(run);
        expect(report).toContain('Report-mode findings');
        expect(report).toMatch(/Area\s+covered\s+missing\s+excepted/);
        expect(report).toMatch(/interface\s+\d+\s+\d+\s+1/);
        const all = formatReport(run, { all: true });
        expect(all).toContain('JSX text "Planted label"');
    });
});

describe('verifierMain', () => {
    it('returns 2 when the verifier cannot load its inputs', async () => {
        const root = await writeFixture({
            'translations/i18n-exceptions.yaml': '- rule: interface\n  match: x\n',
            'translations/source/en/ui/a.yaml': 'a: A\n',
        });
        const output: string[] = [];
        expect(await verifierMain([], (text) => output.push(text), root)).toBe(2);
        expect(output.join('\n')).toMatch(/reason/);
    });

    it('prints JSON findings with --json', async () => {
        const output: string[] = [];
        const code = await verifierMain(
            ['--json', '--rule', 'identical'],
            (text) => output.push(text),
            path.resolve('.')
        );
        const parsed = JSON.parse(output.join('\n'));
        expect(Object.keys(parsed)).toEqual(['findings', 'excepted', 'summary']);
        expect(code).toBe(0);
    }, 60_000);

    it('scans the whole repository in under 30 seconds (SC-008)', async () => {
        const started = performance.now();
        await runVerifier();
        expect(performance.now() - started).toBeLessThan(30_000);
    }, 60_000);
});
