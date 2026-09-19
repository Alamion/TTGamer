import type { I18nException } from '../translation-source.ts';
import { globToRegExp } from './config.ts';
import { type LoadOptions, loadVerifierContext } from './context.ts';
import { RULES } from './rules/index.ts';
import type {
    Area,
    AreaSummary,
    Coverage,
    Finding,
    GateLevel,
    RuleId,
    VerifierContext,
} from './types.ts';

export interface VerifierRun {
    findings: Finding[];
    excepted: Finding[];
    summary: AreaSummary[];
    /** Gate per rule id; `unused` and `exceptions` never fail the run. */
    gates: Record<RuleId, GateLevel>;
    exitCode: 0 | 1;
}

export interface RunFilter {
    areas?: readonly Area[];
    rules?: readonly RuleId[];
}

function exceptionMatches(exception: I18nException, finding: Finding): boolean {
    if (exception.rule !== finding.rule) return false;
    if (exception.file && !(finding.file && globToRegExp(exception.file).test(finding.file))) {
        return false;
    }
    const regex = /^\/(.*)\/([a-z]*)$/.exec(exception.match);
    return regex
        ? new RegExp(regex[1], regex[2]).test(finding.match)
        : exception.match === finding.match;
}

/** Whether a finding makes the run fail under the current gates. */
export function isFailing(finding: Finding, gates: Record<RuleId, GateLevel>): boolean {
    return finding.level === 'error' && gates[finding.rule] === 'error';
}

export function runRules(context: VerifierContext, filter: RunFilter = {}): VerifierRun {
    const gates = {
        ...context.config.levels,
        unused: 'report',
        exceptions: 'error',
    } as Record<RuleId, GateLevel>;
    const rules = RULES.filter(
        (rule) =>
            (!filter.areas || filter.areas.includes(rule.area)) &&
            (!filter.rules || filter.rules.includes(rule.id))
    );
    const raw: Finding[] = [];
    const coverage: Partial<Record<Area, Coverage>> = {};
    for (const rule of rules) {
        const result = rule.run(context);
        raw.push(...result.findings);
        for (const [area, value] of Object.entries(result.coverage ?? {}) as [Area, Coverage][]) {
            const current = coverage[area] ?? { covered: 0, missing: 0 };
            coverage[area] = {
                covered: current.covered + value.covered,
                missing: current.missing + value.missing,
            };
        }
    }
    const used = new Set<I18nException>();
    const findings: Finding[] = [];
    const excepted: Finding[] = [];
    for (const finding of raw) {
        const exception = context.exceptions.find((item) => exceptionMatches(item, finding));
        if (exception) {
            used.add(exception);
            excepted.push(finding);
        } else {
            findings.push(finding);
        }
    }
    const ranRules = new Set(rules.map((rule) => rule.id));
    for (const exception of context.exceptions) {
        if (!used.has(exception) && ranRules.has(exception.rule as RuleId)) {
            findings.push({
                rule: 'exceptions',
                level: 'warning',
                location: context.config.paths.exceptions,
                message:
                    'exception matches nothing: ' + exception.rule + ' "' + exception.match + '"',
                match: exception.match,
            });
        }
    }
    const areaOf = new Map(RULES.map((rule) => [rule.id, rule.area]));
    const summary: AreaSummary[] = (['interface', 'catalog', 'docs'] as const).map((area) => {
        const errors = findings.filter(
            (finding) => finding.level === 'error' && areaOf.get(finding.rule) === area
        ).length;
        return {
            area,
            covered: coverage[area]?.covered ?? 0,
            missing: Math.max(coverage[area]?.missing ?? 0, errors),
            excepted: excepted.filter((finding) => areaOf.get(finding.rule) === area).length,
        };
    });
    return {
        findings,
        excepted,
        summary,
        gates,
        exitCode: findings.some((finding) => isFailing(finding, gates)) ? 1 : 0,
    };
}

export async function runVerifier(
    options: LoadOptions = {},
    filter: RunFilter = {}
): Promise<VerifierRun> {
    return runRules(await loadVerifierContext(options), filter);
}
