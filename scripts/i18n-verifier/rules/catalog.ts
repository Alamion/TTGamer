import { CATALOG_LABELS_KEY } from '../../translation-source.ts';
import type { Finding, Rule } from '../types.ts';

type Fields = Record<string, unknown>;

function asRecord(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
}

/**
 * FR-006e, FR-024: catalog translation sources. Every code catalog has an English source; each
 * locale translates every name and every enumerated label, keeps list lengths, and covers at
 * least the configured share of short descriptions. Other missing fields are warnings.
 */
export const catalogRule: Rule = {
    id: 'catalog',
    area: 'catalog',
    run(context) {
        const findings: Finding[] = [];
        let covered = 0;
        let missing = 0;
        const sourceRoot = context.config.paths.sources;
        const english = context.sources.data.en;
        for (const catalogId of context.catalogIds) {
            if (!(catalogId in english)) {
                findings.push({
                    rule: 'catalog',
                    level: 'error',
                    location: catalogId,
                    message:
                        'no translation source ' + sourceRoot + '/en/data/' + catalogId + '.yaml',
                    match: catalogId,
                });
            }
        }
        for (const locale of context.sources.locales.filter((item) => item !== 'en')) {
            for (const [catalogId, rawCatalog] of Object.entries(english)) {
                const catalog = asRecord(rawCatalog);
                const localized = asRecord(context.sources.data[locale][catalogId]);
                let withShort = 0;
                let shortTotal = 0;
                for (const [entryId, rawFields] of Object.entries(catalog)) {
                    const location = catalogId + '/' + entryId;
                    const fields = asRecord(rawFields) as Fields;
                    const target = asRecord(localized[entryId]) as Fields;
                    if (entryId === CATALOG_LABELS_KEY) {
                        for (const [field, labels] of Object.entries(fields)) {
                            for (const value of Object.keys(asRecord(labels))) {
                                if (!(value in asRecord(target[field]))) {
                                    findings.push({
                                        rule: 'catalog',
                                        level: 'error',
                                        location: location + '.' + field,
                                        message: locale + ' has no label for "' + value + '"',
                                        match: value,
                                    });
                                }
                            }
                        }
                        continue;
                    }
                    if ('name' in fields) {
                        if (typeof target.name === 'string') covered++;
                        else {
                            missing++;
                            findings.push({
                                rule: 'catalog',
                                level: 'error',
                                location: location + '.name',
                                message:
                                    'missing ' + locale + ' name for "' + String(fields.name) + '"',
                                match: String(fields.name),
                            });
                        }
                    }
                    if ('shortDescription' in fields) {
                        shortTotal++;
                        if (typeof target.shortDescription === 'string') withShort++;
                    }
                    for (const [field, value] of Object.entries(fields)) {
                        if (field === 'name') continue;
                        const translated = target[field];
                        if (translated === undefined) {
                            findings.push({
                                rule: 'catalog',
                                level: 'warning',
                                location: location + '.' + field,
                                message: 'missing ' + locale + ' ' + field,
                                match: location + '.' + field,
                            });
                        } else if (
                            Array.isArray(value) &&
                            (!Array.isArray(translated) || translated.length !== value.length)
                        ) {
                            findings.push({
                                rule: 'catalog',
                                level: 'error',
                                location: location + '.' + field,
                                message: locale + ' list length differs from English',
                                match: location + '.' + field,
                            });
                        }
                    }
                }
                for (const entryId of Object.keys(localized)) {
                    if (!(entryId in catalog)) {
                        findings.push({
                            rule: 'catalog',
                            level: 'error',
                            location: catalogId + '/' + entryId,
                            message: locale + ' entry has no English source',
                            match: catalogId + '/' + entryId,
                        });
                    }
                }
                const share = shortTotal === 0 ? 1 : withShort / shortTotal;
                if (share < context.config.shortDescriptionCoverage) {
                    findings.push({
                        rule: 'catalog',
                        level: 'error',
                        location: catalogId,
                        message:
                            locale +
                            ' short descriptions ' +
                            withShort +
                            '/' +
                            shortTotal +
                            ' (' +
                            Math.round(share * 100) +
                            '%), below ' +
                            Math.round(context.config.shortDescriptionCoverage * 100) +
                            '%',
                        match: catalogId,
                    });
                }
            }
        }
        return { findings, coverage: { catalog: { covered, missing } } };
    },
};
