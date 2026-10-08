/**
 * Field names at the cloud API boundary (spec 030, FR-012): the contract is snake_case on the
 * wire, the app stays camelCase. Only fields a model declares are renamed; opaque fields (document
 * data, value keys) cross as they are, because their keys are user content, never contract names.
 */
type WireField = 'plain' | 'opaque' | WireModel;

export interface WireModel {
    readonly fields: Readonly<Record<string, WireField>>;
}

const DocumentMetadata: WireModel = {
    fields: {
        title: 'plain',
        templateId: 'plain',
        preferredViewId: 'plain',
        tags: 'plain',
        seededPresets: 'plain',
        settingId: 'plain',
    },
};

const DocumentEnvelope: WireModel = {
    fields: {
        id: 'plain',
        kind: 'plain',
        systemId: 'plain',
        definitionId: 'plain',
        schemaVersion: 'plain',
        metadata: DocumentMetadata,
        templateValues: 'opaque',
        data: 'opaque',
    },
};

/** Contract models the frontend implements, by their contract name. */
export const WIRE_MODELS = { DocumentEnvelope, DocumentMetadata } as const;

export const toSnakeCase = (name: string) =>
    name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

function convert(
    model: WireModel,
    value: Record<string, unknown>,
    direction: 'toWire' | 'fromWire'
): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [appName, field] of Object.entries(model.fields)) {
        const wireName = toSnakeCase(appName);
        const [from, to] = direction === 'toWire' ? [appName, wireName] : [wireName, appName];
        if (!Object.hasOwn(value, from)) continue;
        const fieldValue = value[from];
        result[to] =
            typeof field === 'object' && isRecord(fieldValue)
                ? convert(field, fieldValue, direction)
                : fieldValue;
    }
    return result;
}

export const toWire = (model: WireModel, value: Record<string, unknown>) =>
    convert(model, value, 'toWire');

export const fromWire = (model: WireModel, value: Record<string, unknown>) =>
    convert(model, value, 'fromWire');
