import { translate } from '@docusaurus/Translate';

import { reportSheetIssue } from '../../diagnostics';
import { useDocumentStore } from '../../store/documentStore';
import { useDocumentTypeStore } from '../../store/documentTypeStore';
import { useTemplateStore } from '../../store/templateStore';
import { systemRegistry } from '../../systems';
import { fieldBindingUpdate, listDocumentBindings } from '../../systems/templateBindings';
import type { DocumentDefinition } from '../../systems/types';
import type { UnknownDocumentEnvelope } from '../../types/document';
import { newDocumentPage } from '../sheet/data/libraryPages';
import { choiceKey, rememberRecent } from './createChoices';

export interface CreateTarget {
    systemId: string;
    definitionId: string;
    settingId?: string;
}

export interface CreateOptions {
    /** Empty or absent: today's default naming (or the example's name). */
    name?: string;
    exampleId?: string;
    /** The folder; the top level when absent. */
    parentId?: string | null;
    /** Show it on the sheet (the default); false only adds it. */
    activate?: boolean;
}

/** The kind or the example is not installed (any more). */
export class CreateUnavailableError extends Error {
    readonly target: CreateTarget & { exampleId?: string };

    constructor(target: CreateTarget & { exampleId?: string }) {
        super(`Cannot create ${choiceKey(target.systemId, target.definitionId, target.settingId)}`);
        this.target = target;
    }
}

/**
 * Writes the name where the kind keeps it (D6): the character capability's `metadata.name`, else
 * every field binding of the kind that renames the document.
 */
function namedData(
    systemId: string,
    definition: DocumentDefinition,
    data: unknown,
    name: string
): unknown {
    const capability = definition.capabilities?.character;
    if (capability) {
        const { metadata } = capability.read('new-document', data);
        return capability.applyUpdates(data, { metadata: { ...metadata, name } });
    }
    let next = data;
    for (const binding of listDocumentBindings(systemId, definition.kind)) {
        if (binding.kind !== 'field' || !binding.syncsTitle) continue;
        next = { ...(next as Record<string, unknown>), ...fieldBindingUpdate(binding, next, name) };
    }
    return definition.schema.parse(next);
}

/** The example's data, templates values, and name, as a starting point (D8). */
function exampleStart(definition: DocumentDefinition, example: UnknownDocumentEnvelope) {
    const data =
        definition.migrate && example.schemaVersion !== definition.schemaVersion
            ? definition.migrate(example.data, example.schemaVersion)
            : example.data;
    return {
        data: structuredClone(definition.schema.parse(data)),
        templateValues: structuredClone(example.templateValues),
        title: example.metadata.title,
    };
}

/** Values naming one of the example ids now name its copy (`string` or `string[]` values). */
function relink(values: Record<string, unknown>, copies: ReadonlyMap<string, string>) {
    const swap = (value: unknown): unknown =>
        typeof value === 'string'
            ? (copies.get(value) ?? value)
            : Array.isArray(value)
              ? value.map(swap)
              : value;
    return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, swap(value)]));
}

/**
 * The one create path of the dialog and the documentation buttons: the page the library chose,
 * the name, an example's copy, the folder, and the kind recorded as recent.
 */
export function createFromChoice(
    target: CreateTarget,
    options: CreateOptions = {}
): UnknownDocumentEnvelope {
    const created = createCopy(target, options);
    rememberRecent(choiceKey(target.systemId, target.definitionId, target.settingId));
    return created;
}

function createCopy(target: CreateTarget, options: CreateOptions): UnknownDocumentEnvelope {
    const { systemId, definitionId, settingId } = target;
    const definition = systemRegistry.getDocumentDefinition(systemId, definitionId);
    const example = options.exampleId
        ? definition?.examples?.find(({ id }) => id === options.exampleId)
        : undefined;
    if (!definition || !systemRegistry.getSystem(systemId) || (options.exampleId && !example)) {
        throw new CreateUnavailableError({
            ...target,
            ...(options.exampleId ? { exampleId: options.exampleId } : {}),
        });
    }
    const settings = useDocumentTypeStore.getState().settings;
    // A core definition in a user setting opens on the setting's own page, when it has one.
    const settingPage = settingId ? settings[settingId]?.pages[definitionId] : undefined;
    // A shipped type opens on the page the library chose as its default (spec 013).
    const page = newDocumentPage(systemRegistry, systemId, definitionId, settingId, {
        templates: useTemplateStore.getState().templates,
        defaultPages: useDocumentTypeStore.getState().defaultPages,
    });
    const start = example ? exampleStart(definition, example.create(translate)) : undefined;
    // Companions first (a group's members), so the copy can name their copies.
    if (start && example?.companions?.length) {
        const copies = new Map<string, string>();
        for (const companion of example.companions) {
            const source = systemRegistry
                .getDocumentDefinition(systemId, companion.definitionId)
                ?.examples?.find(({ id }) => id === companion.exampleId);
            if (!source) {
                reportSheetIssue({
                    code: 'create-kind-unavailable',
                    message: 'An example names a companion example that is not installed',
                    details: { exampleId: options.exampleId, companion: companion.exampleId },
                });
                continue;
            }
            const copy = createCopy(
                {
                    systemId,
                    definitionId: companion.definitionId,
                    ...(settingId ? { settingId } : {}),
                },
                {
                    exampleId: companion.exampleId,
                    activate: false,
                    parentId: options.parentId ?? null,
                }
            );
            copies.set(source.create(translate).id, copy.id);
        }
        start.templateValues = relink(start.templateValues, copies) as typeof start.templateValues;
    }
    const typed = options.name?.trim() ?? '';
    const title = typed || start?.title || (example ? translate(example.label) : '');
    const data = typed
        ? namedData(
              systemId,
              definition,
              start?.data ?? definition.schema.parse(definition.createDefault()),
              typed
          )
        : start?.data;
    const created = useDocumentStore.getState().createDocument(systemId, definitionId, {
        activate: options.activate ?? true,
        parentId: options.parentId ?? null,
        ...(settingId ? { settingId } : {}),
        ...(settingPage || page.templateId ? { templateId: settingPage ?? page.templateId } : {}),
        ...(page.preferredViewId ? { preferredViewId: page.preferredViewId } : {}),
        title,
        ...(data === undefined ? {} : { data }),
        ...(start ? { templateValues: start.templateValues } : {}),
    });
    return created;
}
