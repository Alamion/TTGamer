import { UnknownDocumentEnvelopeSchema } from '../types/document';
import type { ParsedRegisteredDocument, SystemPlugin } from './types';

export class SystemRegistry {
    readonly #systems = new Map<string, SystemPlugin>();

    constructor(systems: readonly SystemPlugin[]) {
        for (const system of systems) {
            if (this.#systems.has(system.id)) {
                throw new Error(`Duplicate system ID: ${system.id}`);
            }
            const definitionIds = new Set<string>();
            for (const definition of system.documents) {
                if (definitionIds.has(definition.id)) {
                    throw new Error(
                        `Duplicate document definition ID: ${system.id}/${definition.id}`
                    );
                }
                definitionIds.add(definition.id);
                const viewIds = new Set<string>();
                for (const view of definition.views) {
                    if (viewIds.has(view.id)) {
                        throw new Error(
                            `Duplicate document view ID: ${system.id}/${definition.id}/${view.id}`
                        );
                    }
                    viewIds.add(view.id);
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
