import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { type DocumentViewLabel, systemRegistry } from '../../../systems';
import { isUserKind } from '../../../systems/userTypes';
import { DocumentKindSchema, SystemIdSchema } from '../../../types/document';
import {
    type CustomTemplate,
    CustomTemplateSchema,
    TEMPLATE_SCHEMA_VERSION,
} from '../../../types/template';

const libraryMessages = uiMessages.sheet.templates.library;

/** Definition label of each skeleton, so its name and description follow the active locale. */
const skeletonLabels = new Map<string, DocumentViewLabel>();

function skeletonText(label: DocumentViewLabel): Pick<CustomTemplate, 'name' | 'description'> {
    const pageLabel = translate(label);
    return {
        name: translate(libraryMessages.skeletonName, { label: pageLabel }),
        description: translate(libraryMessages.skeletonDescription, {
            label: pageLabel.toLowerCase(),
        }),
    };
}

/**
 * Starter skeletons offered as "copy of a built-in page layout" bases. Each skeleton mirrors the
 * REAL current structure of its document definition's default view (feature 005): it is copied
 * from the explicit primitive-composed default template, then re-identified as an independent
 * custom template. Skeletons are copied (never referenced) when chosen.
 */
function skeletonFromDefaultView(
    systemId: string,
    definitionId: string
): CustomTemplate | undefined {
    const definition = systemRegistry.getDocumentDefinition(systemId, definitionId);
    if (!definition) return undefined;
    const source = systemRegistry
        .getSystem(systemId)
        ?.defaultTemplates?.find((template) => template.id === definition.defaultViewId);
    if (!source) return undefined;
    const id = `skeleton-${systemId}-${definition.id}`;
    skeletonLabels.set(id, definition.label);
    return {
        ...source,
        id,
        ...skeletonText(definition.label),
    } as CustomTemplate;
}

function buildSkeletons(): readonly CustomTemplate[] {
    const skeletons: CustomTemplate[] = [];
    for (const system of systemRegistry.getSystems()) {
        for (const definition of system.documents) {
            const skeleton = skeletonFromDefaultView(system.id, definition.id);
            if (skeleton) skeletons.push(skeleton);
        }
    }
    return skeletons;
}

/** Built when offered: its titles become authored template text in the active locale. */
function buildFallbackSkeleton(): CustomTemplate {
    return CustomTemplateSchema.parse({
        id: 'skeleton-blank',
        name: translate(libraryMessages.blankSkeletonName),
        systemId: SystemIdSchema.parse('star-wars-wod'),
        documentKind: DocumentKindSchema.parse('character'),
        schemaVersion: TEMPLATE_SCHEMA_VERSION,
        children: [
            {
                id: 'identity',
                type: 'section',
                title: translate(libraryMessages.skeletonIdentity),
                children: [
                    {
                        id: 'name',
                        type: 'text',
                        label: translate(libraryMessages.skeletonNameField),
                        required: true,
                        compact: false,
                        multiline: false,
                    },
                ],
            },
        ],
    });
}

export const TEMPLATE_SKELETONS: readonly CustomTemplate[] = buildSkeletons();

export function getSkeletonsForKind(
    documentKind: CustomTemplate['documentKind'],
    systemId?: string
): readonly CustomTemplate[] {
    const skeletons = TEMPLATE_SKELETONS.filter(
        (template) =>
            template.documentKind === documentKind &&
            (systemId === undefined || template.systemId === systemId)
    ).map((template) => {
        const label = skeletonLabels.get(template.id);
        return label ? { ...template, ...skeletonText(label) } : template;
    });
    if (skeletons.length > 0) return skeletons;
    // A user type starts from an empty page of its own system and kind ("New page"); the blank
    // skeleton is a Star Wars character page and would target another kind.
    if (isUserKind(documentKind)) return [];
    return [buildFallbackSkeleton()];
}
