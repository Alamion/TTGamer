import { UnknownDocumentEnvelopeSchema } from '../types/document';
import { isPolicyId } from './policies';
import type { DocumentDefinition, ParsedRegisteredDocument, SystemPlugin } from './types';
import {
    EMPTY_USER_TYPES,
    isUserKind,
    ownerSystemId,
    synthesizeOrphanDefinition,
    synthesizeUserDefinition,
    USER_KIND_PREFIX,
    USER_TYPE_SCHEMA_VERSION,
    UserTypeDataSchema,
    type UserTypesSnapshot,
} from './userTypes';

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
    #userTypes: UserTypesSnapshot = EMPTY_USER_TYPES;
    /** User-type definitions per system, rebuilt whenever the overlay snapshot changes. */
    #userDefinitions = new Map<string, DocumentDefinition[]>();

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
                // `user-` belongs to user document types (spec 012): shipped ids never use it.
                if (
                    definition.id.startsWith(USER_KIND_PREFIX) ||
                    definition.kind.startsWith(USER_KIND_PREFIX)
                ) {
                    throw new Error(
                        `Shipped document definition ${system.id}/${definition.id} uses the reserved "${USER_KIND_PREFIX}" prefix`
                    );
                }
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
            // User settings reuse these (spec 012): engine-only definitions of this system.
            for (const coreId of system.coreDefinitions ?? []) {
                const core = system.documents.find(({ id }) => id === coreId);
                if (!core || core.module) {
                    throw new Error(
                        `Core definition ${system.id}/${coreId} must be a definition of the system without a module`
                    );
                }
            }
            this.#systems.set(system.id, system);
        }
        // Rulesets are one level deep. A partial registry (tests, tools) may omit the ruleset.
        for (const system of systems) {
            if (!system.ruleset) continue;
            if (system.ruleset === system.id || this.#systems.get(system.ruleset)?.ruleset) {
                throw new Error(
                    `System ${system.id} names ${system.ruleset} as its ruleset, which is itself a setting`
                );
            }
        }
    }

    /** Systems that are rulesets themselves (spec 013), in registration order. */
    listRulesets(): readonly SystemPlugin[] {
        return this.getSystems().filter((system) => !system.ruleset);
    }

    /** Setting systems declared on a ruleset (Star Wars on WoD 2e). */
    settingSystemsOf(rulesetId: string): readonly SystemPlugin[] {
        return this.getSystems().filter((system) => system.ruleset === rulesetId);
    }

    /** The ruleset a system plays by: its declared ruleset, or itself. */
    rulesetOf(systemId: string): SystemPlugin | undefined {
        const system = this.getSystem(systemId);
        return system?.ruleset ? this.getSystem(system.ruleset) : system;
    }

    getSystems(): readonly SystemPlugin[] {
        return [...this.#systems.values()];
    }

    getSystem(systemId: string): SystemPlugin | undefined {
        return this.#systems.get(systemId);
    }

    /**
     * Replaces the user types the registry knows (spec 012). Generic code keeps calling the same
     * lookups; user types answer them next to the shipped definitions.
     */
    setUserDocumentTypes(snapshot: UserTypesSnapshot): void {
        this.#userTypes = snapshot;
        const bySystem = new Map<string, DocumentDefinition[]>();
        for (const type of Object.values(snapshot.types)) {
            const systemId = ownerSystemId(type, snapshot.settings);
            if (!systemId || !this.#systems.has(systemId)) continue;
            const list = bySystem.get(systemId) ?? [];
            const definition = synthesizeUserDefinition(type, snapshot.templates, systemId);
            // A type owned by a module (a V5 line) belongs to that module: its setting name and
            // its publisher policies.
            const moduleId = 'moduleId' in type.owner ? type.owner.moduleId : undefined;
            const module = moduleId
                ? this.#systems
                      .get(systemId)
                      ?.documents.find((shipped) => shipped.module?.id === moduleId)?.module
                : undefined;
            list.push(module ? { ...definition, module } : definition);
            bySystem.set(systemId, list);
        }
        this.#userDefinitions = bySystem;
    }

    getUserDocumentTypes(): UserTypesSnapshot {
        return this.#userTypes;
    }

    /** Every registered definition with its system: shipped ones, then user types. */
    listDefinitions(): readonly { system: SystemPlugin; definition: DocumentDefinition }[] {
        return this.getSystems().flatMap((system) =>
            [...system.documents, ...(this.#userDefinitions.get(system.id) ?? [])].map(
                (definition) => ({ system, definition })
            )
        );
    }

    getDocumentDefinition(systemId: string, definitionId: string) {
        const system = this.getSystem(systemId);
        if (!system) return undefined;
        if (isUserKind(definitionId)) {
            return (
                this.#userDefinitions.get(systemId)?.find(({ id }) => id === definitionId) ??
                synthesizeOrphanDefinition(definitionId)
            );
        }
        return system.documents.find(({ id }) => id === definitionId);
    }

    getDocumentView(systemId: string, definitionId: string, viewId?: string) {
        const definition = this.getDocumentDefinition(systemId, definitionId);
        if (!definition) return undefined;
        const selectedViewId = viewId ?? definition.defaultViewId;
        return definition.views.find(({ id }) => id === selectedViewId);
    }

    parseDocument(input: unknown): ParsedRegisteredDocument {
        const envelope = UnknownDocumentEnvelopeSchema.parse(input);
        // User-type documents share one data shape, so they parse without their type.
        if (isUserKind(envelope.definitionId)) {
            if (
                !this.getSystem(envelope.systemId) ||
                String(envelope.kind) !== envelope.definitionId
            ) {
                throw new Error(
                    `Unsupported document definition: ${envelope.systemId}/${envelope.definitionId}`
                );
            }
            return {
                definition: this.getDocumentDefinition(envelope.systemId, envelope.definitionId)!,
                envelope: {
                    ...envelope,
                    schemaVersion: USER_TYPE_SCHEMA_VERSION,
                    data: UserTypeDataSchema.parse(envelope.data ?? {}),
                },
            };
        }
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
