import type { VerifierRun } from './run.ts';
import { isFailing } from './run.ts';
import type { RuleId } from './types.ts';

function table(run: VerifierRun): string {
    const rows = run.summary.map((row) =>
        [
            row.area.padEnd(10),
            String(row.covered).padStart(8),
            String(row.missing).padStart(8),
            String(row.excepted).padStart(9),
        ].join('  ')
    );
    return ['Area         covered   missing   excepted', ...rows].join('\n');
}

/**
 * Human report: every finding of gated rules (and of `shown` rules), then per-rule counts for
 * rules still in report mode, then the area summary.
 */
export function formatReport(run: VerifierRun, options: { all?: boolean; shown?: RuleId[] } = {}) {
    const lines: string[] = [];
    const hidden = new Map<RuleId, number>();
    for (const finding of run.findings) {
        const show =
            options.all ||
            options.shown?.includes(finding.rule) ||
            isFailing(finding, run.gates) ||
            finding.rule === 'exceptions';
        if (!show) {
            hidden.set(finding.rule, (hidden.get(finding.rule) ?? 0) + 1);
            continue;
        }
        lines.push(
            [
                finding.rule.padEnd(10),
                (finding.level === 'error' ? 'error' : 'warn').padEnd(5),
                finding.location,
                finding.message,
            ].join('  ')
        );
    }
    if (hidden.size > 0) {
        lines.push(
            '',
            'Report-mode findings (not failing; show with --all or --rule <id>):',
            ...[...hidden].map(([rule, count]) => '  ' + rule.padEnd(11) + String(count))
        );
    }
    lines.push('', table(run));
    const failing = run.findings.filter((finding) => isFailing(finding, run.gates)).length;
    lines.push(
        '',
        failing > 0
            ? failing + ' failing finding(s).'
            : 'No failing findings (' + run.excepted.length + ' excepted).'
    );
    return lines.join('\n');
}

export function formatJson(run: VerifierRun): string {
    return JSON.stringify(
        { findings: run.findings, excepted: run.excepted.length, summary: run.summary },
        null,
        2
    );
}
