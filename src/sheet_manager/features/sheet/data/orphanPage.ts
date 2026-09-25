import type { UnknownDocumentEnvelope } from '../../../types/document';
import type { CustomTemplate } from '../../../types/template';
import { TEMPLATE_SCHEMA_VERSION } from '../../../types/template';

export const STORED_VALUES_TEMPLATE_ID = 'user-type-stored-values';

/**
 * The page of a document whose user type is not installed (spec 012, FR-020): one group listing
 * every stored value as an editable text field, keyed by its own coordinate, so nothing is
 * hidden and nothing is lost. Built in memory; never saved.
 */
export function buildOrphanPage(document: UnknownDocumentEnvelope): CustomTemplate {
    const keys = Object.keys(document.templateValues ?? {}).sort();
    return {
        id: STORED_VALUES_TEMPLATE_ID,
        name: document.metadata.title,
        systemId: document.systemId,
        documentKind: document.kind,
        schemaVersion: TEMPLATE_SCHEMA_VERSION,
        children: [
            {
                id: 'stored-values',
                type: 'group',
                title: document.metadata.title || document.definitionId,
                collapsible: false,
                children: keys.map((key, index) => ({
                    id: `stored-${index + 1}`,
                    type: 'text',
                    label: key,
                    valueKey: key,
                    required: false,
                    compact: false,
                    multiline: false,
                })),
            },
        ],
    };
}
