import { systemRegistry } from '../../../systems';
import { DocumentKindSchema, SystemIdSchema } from '../../../types/document';
import {
    type CustomTemplate,
    CustomTemplateSchema,
    TEMPLATE_SCHEMA_VERSION,
} from '../../../types/template';

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
    return {
        ...source,
        id: `skeleton-${definition.id}`,
        name: `${definition.label} page skeleton`,
        description: `Starts from the current structure of the built-in ${definition.label.toLowerCase()} page.`,
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

const fallbackSkeleton = CustomTemplateSchema.parse({
    id: 'skeleton-blank',
    name: 'Blank page skeleton',
    systemId: SystemIdSchema.parse('star-wars-wod'),
    documentKind: DocumentKindSchema.parse('character'),
    schemaVersion: TEMPLATE_SCHEMA_VERSION,
    children: [
        {
            id: 'identity',
            type: 'section',
            title: 'Identity',
            children: [
                {
                    id: 'name',
                    type: 'text',
                    label: 'Name',
                    required: true,
                    compact: false,
                    multiline: false,
                },
            ],
        },
    ],
});

export const TEMPLATE_SKELETONS: readonly CustomTemplate[] = buildSkeletons();

export function getSkeletonsForKind(
    documentKind: CustomTemplate['documentKind']
): readonly CustomTemplate[] {
    const skeletons = TEMPLATE_SKELETONS.filter(
        (template) => template.documentKind === documentKind
    );
    return skeletons.length > 0 ? skeletons : [fallbackSkeleton];
}

/** Skeletons of every kind, offered when the document kind is not known yet. */
export const ALL_TEMPLATE_SKELETONS = TEMPLATE_SKELETONS;
