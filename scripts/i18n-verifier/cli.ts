import { formatJson, formatReport } from './report.ts';
import { runVerifier } from './run.ts';
import type { Area, RuleId } from './types.ts';

function listFlag(argv: readonly string[], name: string): string[] | undefined {
    const index = argv.indexOf(name);
    if (index < 0) return undefined;
    return argv[index + 1]?.split(',').filter(Boolean);
}

/** Runs the verifier with CLI flags and returns the exit code (0 ok, 1 failing, 2 crashed). */
export async function verifierMain(
    argv: readonly string[],
    write: (text: string) => void = console.log,
    root?: string
): Promise<number> {
    try {
        const areas = listFlag(argv, '--area') as Area[] | undefined;
        const rules = listFlag(argv, '--rule') as RuleId[] | undefined;
        const run = await runVerifier({ ...(root ? { root } : {}) }, { areas, rules });
        write(
            argv.includes('--json')
                ? formatJson(run)
                : formatReport(run, { all: argv.includes('--all'), shown: rules })
        );
        return run.exitCode;
    } catch (error) {
        write('i18n verifier failed: ' + (error instanceof Error ? error.message : String(error)));
        return 2;
    }
}
