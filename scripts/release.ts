import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

export type Bump = 'major' | 'minor' | 'patch';

/** The version after `bump`. */
export function nextVersion(version: string, bump: Bump): string {
    const [major, minor, patch] = version.split('.').map(Number) as [number, number, number];
    if (bump === 'major') return `${major + 1}.0.0`;
    if (bump === 'minor') return `${major}.${minor + 1}.0`;
    return `${major}.${minor}.${patch + 1}`;
}

const SECTIONS = [
    ['feat', 'feat'],
    ['fix', 'Fix'],
    ['chore', 'Chore'],
] as const;

/**
 * A changelog entry skeleton from conventional commit subjects (spec 024): one bullet per
 * `feat`, `fix`, or maintenance commit (`chore`, `refactor`, `test`, `perf`), for the maintainer
 * to rewrite into reader-facing lines. Docs and style commits are left out.
 */
export function changelogEntry(version: string, bump: Bump, subjects: readonly string[]): string {
    const groups = new Map<string, string[]>();
    for (const subject of subjects) {
        const match = subject.match(/^(\w+)(?:\([^)]*\))?!?:\s*(.+)$/);
        if (!match) continue;
        const [, type, text] = match as unknown as [string, string, string];
        const kind =
            type === 'feat'
                ? 'feat'
                : type === 'fix'
                  ? 'fix'
                  : ['chore', 'refactor', 'test', 'perf'].includes(type)
                    ? 'chore'
                    : null;
        if (!kind) continue;
        groups.set(kind, [...(groups.get(kind) ?? []), text]);
    }
    const featTitle = bump === 'major' ? 'Major feat' : 'Minor feat';
    const sections = SECTIONS.filter(([kind]) => groups.has(kind)).map(
        ([kind, title]) =>
            `### ${kind === 'feat' ? featTitle : title}\n\n` +
            groups
                .get(kind)!
                .map((text) => `- ${text}`)
                .join('\n')
    );
    return `## v${version}\n\n${sections.join('\n\n') || '### Chore\n\n- (describe the release)'}\n`;
}

function git(...args: string[]): string {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

async function main() {
    const bump = process.argv[2] as Bump;
    if (!['major', 'minor', 'patch'].includes(bump)) {
        console.error('usage: yarn release <major|minor|patch>');
        process.exitCode = 1;
        return;
    }
    const manifest = await readFile('package.json', 'utf8');
    const current = (JSON.parse(manifest) as { version: string }).version;
    const version = nextVersion(current, bump);
    // Subjects since the commit that last changed the version line.
    const lastBump = git('log', '-1', '--format=%H', '-G', '"version"', '--', 'package.json');
    const subjects = git('log', '--no-merges', '--format=%s', `${lastBump}..HEAD`)
        .split('\n')
        .filter(Boolean)
        .reverse();
    const changelog = await readFile('CHANGELOG.md', 'utf8');
    const entry = changelogEntry(version, bump, subjects);
    await writeFile('CHANGELOG.md', changelog.replace(/^(# Changelog\n\n)/, `$1${entry}\n`));
    await writeFile(
        'package.json',
        manifest.replace(`"version": "${current}"`, `"version": "${version}"`)
    );
    console.log(
        `Version ${current} → ${version}. Edit the new CHANGELOG entry into reader-facing lines, then commit.`
    );
}

if (process.argv[1]?.endsWith('release.ts')) void main();
