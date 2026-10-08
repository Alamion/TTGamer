import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import SwaggerParser from '@apidevtools/swagger-parser';
import { parse } from 'yaml';

/**
 * Checks the cloud API contract (spec 030): valid OpenAPI 3.1 with every `$ref` resolved, a
 * semantic version, and snake_case names for every property the contract defines.
 */
export const CONTRACT_PATH = 'contracts/cloud-api/openapi.yaml';

const SNAKE_CASE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+$/;

/** Every `properties` key in the document, with where it was found. */
export function propertyNames(node: unknown, path = '#'): { name: string; path: string }[] {
    if (Array.isArray(node)) {
        return node.flatMap((child, index) => propertyNames(child, `${path}/${index}`));
    }
    if (typeof node !== 'object' || node === null) return [];
    return Object.entries(node).flatMap(([key, child]) => {
        const own =
            key === 'properties' && typeof child === 'object' && child !== null
                ? Object.keys(child).map((name) => ({ name, path: `${path}/properties` }))
                : [];
        return [...own, ...propertyNames(child, `${path}/${key}`)];
    });
}

export async function validateContract(path = CONTRACT_PATH): Promise<string[]> {
    let document: { openapi?: string; info?: { version?: string } };
    try {
        document = parse(readFileSync(path, 'utf8')) as typeof document;
    } catch (error) {
        return [error instanceof Error ? error.message : String(error)];
    }
    const problems: string[] = [];
    try {
        // `validate` mutates its argument while dereferencing; keep the parsed copy for the rest.
        await SwaggerParser.validate(structuredClone(document) as never);
    } catch (error) {
        problems.push(error instanceof Error ? error.message : String(error));
    }
    if (!document.openapi?.startsWith('3.1.')) problems.push('openapi must be 3.1.x');
    if (!SEMVER.test(document.info?.version ?? '')) problems.push('info.version must be x.y.z');
    for (const { name, path: where } of propertyNames(document)) {
        if (!SNAKE_CASE.test(name)) problems.push(`${where}: "${name}" is not snake_case`);
    }
    return problems;
}

const isMain =
    process.argv[1] !== undefined &&
    import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
    void validateContract().then((problems) => {
        if (problems.length === 0) {
            console.log(`Contract ${CONTRACT_PATH} is valid.`);
            return;
        }
        console.error(`Contract ${CONTRACT_PATH}:`);
        for (const problem of problems) console.error(`  - ${problem}`);
        process.exitCode = 1;
    });
}
