import { readFile } from 'node:fs/promises';

interface PackageManifest {
    version: string;
}

async function main() {
    const packageManifest = JSON.parse(await readFile('package.json', 'utf8')) as PackageManifest;
    const [changelog, docusaurusConfig, homepage] = await Promise.all([
        readFile('CHANGELOG.md', 'utf8'),
        readFile('docusaurus.config.ts', 'utf8'),
        readFile('src/pages/index.tsx', 'utf8'),
    ]);
    const latestChangelogVersion = changelog.match(/^## v([^\s]+)/m)?.[1];
    const errors: string[] = [];

    if (latestChangelogVersion !== packageManifest.version) {
        errors.push(
            `package.json is ${packageManifest.version}, but the latest CHANGELOG entry is ${latestChangelogVersion ?? 'missing'}.`
        );
    }
    if (!docusaurusConfig.includes('version: packageJson.version')) {
        errors.push('docusaurus.config.ts must expose package.json as customFields.version.');
    }
    if (!/siteConfig\.customFields\??\.version/.test(homepage)) {
        errors.push('The homepage must render siteConfig.customFields.version.');
    }

    if (errors.length > 0) {
        console.error(errors.join('\n'));
        process.exitCode = 1;
    } else {
        console.log(`Version ${packageManifest.version} is consistent.`);
    }
}

void main();
