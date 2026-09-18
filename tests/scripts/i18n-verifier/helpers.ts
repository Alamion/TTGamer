import type { Finding, RuleId } from '../../../scripts/i18n-verifier/types';

/** `location | message` of every finding of one rule, for compact assertions. */
export function findingsOf(findings: readonly Finding[], rule: RuleId): string[] {
    return findings
        .filter((finding) => finding.rule === rule)
        .map((finding) => finding.location + ' | ' + finding.message);
}
