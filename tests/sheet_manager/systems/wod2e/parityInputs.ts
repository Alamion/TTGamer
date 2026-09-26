import { JAX_VORN_PRESET } from '@site/src/sheet_manager/data/presets';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import { characterDocumentFromBase } from '@site/src/sheet_manager/systems/star-wars-wod/characterDocument';
import {
    STAR_WARS_EXAMPLE_IDS,
    starWarsExampleDocument,
} from '@site/src/sheet_manager/systems/star-wars-wod/examples';

/** Star Wars behaviour frozen before the WoD 2e ruleset split (spec 012, T002 / T066). */
export interface StarWarsParitySnapshot {
    documents: Record<string, unknown>;
    defaults: Record<string, unknown>;
    templates: Record<string, unknown>;
    traitPools: Record<string, string | null>;
}

const SYSTEM_ID = 'star-wars-wod';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Defaults mint random ids (list entries, members); only their presence is comparable. */
export function withStableIds<T>(value: T): T {
    return JSON.parse(
        JSON.stringify(value, (key, entry) =>
            key === 'id' && typeof entry === 'string' && UUID.test(entry) ? '<random-id>' : entry
        )
    ) as T;
}

function parsedData(raw: unknown): unknown {
    return systemRegistry.parseDocument(structuredClone(raw)).envelope.data;
}

export function captureStarWarsParity(): StarWarsParitySnapshot {
    const system = systemRegistry.getSystem(SYSTEM_ID);
    if (!system) throw new Error('Star Wars system is not registered');

    const documents: Record<string, unknown> = {};
    for (const id of STAR_WARS_EXAMPLE_IDS) documents[id] = parsedData(starWarsExampleDocument(id));
    documents['legacy-character'] = parsedData(characterDocumentFromBase(JAX_VORN_PRESET));
    documents['legacy-droid'] = parsedData(
        characterDocumentFromBase({
            ...JAX_VORN_PRESET,
            id: 'legacy-droid',
            metadata: { ...JAX_VORN_PRESET.metadata, type: 'droid' },
        })
    );

    const defaults: Record<string, unknown> = {};
    for (const definition of system.documents) {
        defaults[definition.id] = definition.schema.parse(definition.createDefault());
    }

    const templates: Record<string, unknown> = {};
    for (const template of system.defaultTemplates ?? []) templates[template.id] = template;

    const traitPools: Record<string, string | null> = {};
    const traitPool = system.dice?.traitPool;
    for (let value = 0; value <= 10; value++) {
        for (const specialization of [false, true]) {
            for (const experienced of [false, true]) {
                traitPools[`${value}:${specialization}:${experienced}`] =
                    traitPool?.(value, { specialization, experienced, practiced: false }) ?? null;
            }
        }
    }

    return JSON.parse(JSON.stringify({ documents, defaults, templates, traitPools }));
}
