import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { z } from 'zod';

import { markdown, text } from '../../templates/builders';
import {
    DocumentDefinitionIdSchema,
    DocumentKindSchema,
    DocumentViewIdSchema,
    SystemIdSchema,
    type UnknownDocumentEnvelope,
} from '../../types/document';
import { type CustomTemplate, TEMPLATE_SCHEMA_VERSION } from '../../types/template';
import type { DocumentBindingDescriptor, FieldBinding } from '../templateBindings';
import type { DocumentDefinition, DocumentExample } from '../types';

/**
 * A note (spec 043, D3–D4): a name and one markdown text, outside every game system. The text is
 * the page's markdown field (`body` in the value bag); front matter keys a `.md` file arrived
 * with and the app does not own stay as raw YAML, so they go back out byte for byte.
 */

export const GENERAL_SYSTEM_ID = SystemIdSchema.parse('general');
export const NOTE_KIND = 'note';
export const NOTE_VIEW_ID = 'general-note';
/** The coordinate of a note's text. */
export const NOTE_BODY_KEY = 'body';

const labels = uiMessages.sheet.general.note;
const kinds: ReadonlySet<string> = new Set([NOTE_KIND]);

export const NOTE_LIMITS = { name: 200, frontMatter: 20_000 } as const;

export const NoteDataSchema = z.object({
    name: z.string().max(NOTE_LIMITS.name).default(''),
    frontMatter: z.string().max(NOTE_LIMITS.frontMatter).optional(),
});

export const noteTemplateBindings: readonly DocumentBindingDescriptor[] = [
    {
        key: 'field:name',
        kind: 'field',
        label: labels.name.message,
        documentKinds: kinds,
        path: ['name'],
        valueType: 'string',
        coordinate: 'name',
        syncsTitle: true,
    } satisfies FieldBinding,
];

/** The note's one page: its name and its text, nothing around them (a document page). */
export const noteTemplate: CustomTemplate = {
    id: NOTE_VIEW_ID,
    name: 'Note',
    systemId: GENERAL_SYSTEM_ID,
    documentKind: DocumentKindSchema.parse(NOTE_KIND),
    schemaVersion: TEMPLATE_SCHEMA_VERSION,
    children: [
        text('note-name', labels.name.message, 'name', { labelMessage: labels.name }),
        markdown('note-body', labels.body.message, NOTE_BODY_KEY, {
            labelMessage: labels.body,
            hideLabel: true,
            rows: 20,
        }),
    ],
};

/** A note envelope with a name and a text. */
export function noteEnvelope(id: string, name: string, body: string): UnknownDocumentEnvelope {
    return {
        id,
        kind: DocumentKindSchema.parse(NOTE_KIND),
        systemId: GENERAL_SYSTEM_ID,
        definitionId: DocumentDefinitionIdSchema.parse(NOTE_KIND),
        schemaVersion: 1,
        metadata: { title: name, tags: [] },
        templateValues: body ? { [NOTE_BODY_KEY]: { text: body } } : {},
        data: NoteDataSchema.parse({ name }),
    };
}

const EXAMPLES: readonly DocumentExample[] = [
    {
        id: 'how-notes-work::example',
        label: labels.example.label,
        create: (localize = ({ message }) => message) =>
            noteEnvelope(
                'how-notes-work::example',
                localize(labels.example.name),
                localize(labels.example.text)
            ),
    },
];

export const noteDefinition: DocumentDefinition = {
    id: DocumentDefinitionIdSchema.parse(NOTE_KIND),
    kind: DocumentKindSchema.parse(NOTE_KIND),
    label: labels.type,
    schemaVersion: 1,
    schema: NoteDataSchema,
    createDefault: () => NoteDataSchema.parse({}),
    defaultViewId: DocumentViewIdSchema.parse(NOTE_VIEW_ID),
    views: [
        {
            id: DocumentViewIdSchema.parse(NOTE_VIEW_ID),
            label: labels.view,
            layout: { type: 'declarative', templateId: NOTE_VIEW_ID },
        },
    ],
    migrate: (data) => data,
    examples: EXAMPLES,
    newFromLink: true,
};
