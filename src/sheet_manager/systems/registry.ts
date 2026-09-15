import { UnknownDocumentEnvelopeSchema } from '../types/document';
import { isPolicyId } from './policies';
import type { DocumentDefinition, ParsedRegisteredDocument, SystemPlugin } from './types';

/**
 * The setting a document belongs to, for lists and create dialogs: its module's name when the
 * definition belongs to a module (V5 lines), otherwise its system's name. The document type
 * (`definition.label`) stays setting-neutral, e.g. "Character".
 */
export function documentSettingLabel(system: SystemPlugin, definition: DocumentDefinition) {
    return definition.module?.label ?? system.label;
}

function assertPolicies(owner: string, policies: readonly string[] | undefined) {
    for (const policy of policies ?? []) {
        if (!isPolicyId(policy))
            throw new Error(`Unknown publisher policy "${policy}" in ${owner}`);
    }
}

export class SystemRegistry {
    readonly #systems = new Map<string, SystemPlugin>();

    constructor(systems: readonly SystemPlugin[]) {
        // View ids key shipped templates and their overrides, so they are unique across systems.
        const viewOwners = new Map<string, string>();
        for (const system of systems) {
            if (this.#systems.has(system.id)) {
                throw new Error(`Duplicate system ID: ${system.id}`);
            }
            assertPolicies(system.id, system.policies);
            const definitionIds = new Set<string>();
            for (const definition of system.documents) {
                if (definitionIds.has(definition.id)) {
                    throw new Error(
                        `Duplicate document definition ID: ${system.id}/${definition.id}`
                    );
                }
                definitionIds.add(definition.id);
                assertPolicies(`${system.id}/${definition.id}`, definition.module?.policies);
                const viewIds = new Set<string>();
                for (const view of definition.views) {
                    if (viewIds.has(view.id)) {
                        throw new Error(
                            `Duplicate document view ID: ${system.id}/${definition.id}/${view.id}`
                        );
                    }
                    viewIds.add(view.id);
                    const owner = viewOwners.get(view.id);
                    if (owner && owner !== system.id) {
                        throw new Error(
                            `Document view ID "${view.id}" is declared by both ${owner} and ${system.id}`
                        );
                    }
                    viewOwners.set(view.id, system.id);
                }
                if (!viewIds.has(definition.defaultViewId)) {
                    throw new Error(
                        `Missing default document view: ${system.id}/${definition.id}/${definition.defaultViewId}`
                    );
                }
            }
            this.#systems.set(system.id, system);
        }
    }

    getSystems(): readonly SystemPlugin[] {
        return [...this.#systems.values()];
    }

    getSystem(systemId: string): SystemPlugin | undefined {
        return this.#systems.get(systemId);
    }

    /** Every registered definition with its system, in registration order. */
    listDefinitions(): readonly { system: SystemPlugin; definition: DocumentDefinition }[] {
        return this.getSystems().flatMap((system) =>
            system.documents.map((definition) => ({ system, definition }))
        );
    }

    getDocumentDefinition(systemId: string, definitionId: string) {
        return this.getSystem(systemId)?.documents.find(({ id }) => id === definitionId);
    }

    getDocumentView(systemId: string, definitionId: string, viewId?: string) {
        const definition = this.getDocumentDefinition(systemId, definitionId);
        if (!definition) return undefined;
        const selectedViewId = viewId ?? definition.defaultViewId;
        return definition.views.find(({ id }) => id === selectedViewId);
    }

    parseDocument(input: unknown): ParsedRegisteredDocument {
        const envelope = UnknownDocumentEnvelopeSchema.parse(input);
        const definition = this.getDocumentDefinition(envelope.systemId, envelope.definitionId);
        if (!definition || definition.kind !== envelope.kind) {
            throw new Error(
                `Unsupported document definition: ${envelope.systemId}/${envelope.definitionId}`
            );
        }
        if (envelope.schemaVersion > definition.schemaVersion) {
            throw new Error(
                `Document version ${envelope.schemaVersion} is newer than supported version ${definition.schemaVersion}`
            );
        }

        const migratedData =
            envelope.schemaVersion < definition.schemaVersion
                ? definition.migrate?.(envelope.data, envelope.schemaVersion)
                : envelope.data;
        if (migratedData === undefined) {
            throw new Error(
                `No migration from version ${envelope.schemaVersion} for ${envelope.systemId}/${envelope.definitionId}`
            );
        }

        return {
            definition,
            envelope: {
                ...envelope,
                schemaVersion: definition.schemaVersion,
                data: definition.schema.parse(migratedData),
            },
        };
    }
}
