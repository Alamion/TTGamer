import { z } from 'zod';

import { TemplatePageValuesSchema } from './templateValues';

const identifierSchema = z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/, 'Expected a lowercase kebab-case identifier');

export const DocumentKindSchema = identifierSchema.brand<'DocumentKind'>();
/**
 * System ids renamed after documents were already saved: stored documents, files, and templates
 * that still carry the old id read as the current one.
 */
const RENAMED_SYSTEM_IDS: Readonly<Record<string, string>> = { v5: 'wod-v5' };

export const SystemIdSchema = z
    .preprocess(
        (value) =>
            typeof value === 'string' && Object.hasOwn(RENAMED_SYSTEM_IDS, value)
                ? RENAMED_SYSTEM_IDS[value]
                : value,
        identifierSchema
    )
    .brand<'SystemId'>();
export const DocumentDefinitionIdSchema = identifierSchema.brand<'DocumentDefinitionId'>();
export const DocumentViewIdSchema = identifierSchema.brand<'DocumentViewId'>();

export const DocumentMetadataSchema = z.object({
    title: z.string().max(200).default(''),
    templateId: identifierSchema.optional(),
    preferredViewId: DocumentViewIdSchema.optional(),
    tags: z.array(z.string().min(1).max(64)).max(50).default([]),
    /** Feature 005: template ids whose preset entries were seeded into this document (FR-16). */
    seededPresets: z.array(z.string()).optional(),
    /** Spec 012: the user setting the document was created in. */
    settingId: z.string().min(1).max(64).optional(),
});

const DocumentEnvelopeBaseSchema = z.object({
    id: z.string().min(1).max(128),
    kind: DocumentKindSchema,
    systemId: SystemIdSchema,
    definitionId: DocumentDefinitionIdSchema,
    schemaVersion: z.number().int().positive().max(1_000_000),
    metadata: DocumentMetadataSchema,
    /**
     * Document-global value bag (clarification D1/D3): keyed by valueKey, one flat namespace per
     * document. Fields in different templates sharing a valueKey address the same entry here.
     */
    templateValues: TemplatePageValuesSchema.optional().default({}),
});

export const UnknownDocumentEnvelopeSchema = DocumentEnvelopeBaseSchema.extend({
    data: z.unknown(),
});

export type DocumentKind = z.infer<typeof DocumentKindSchema>;
export type SystemId = z.infer<typeof SystemIdSchema>;
export type DocumentDefinitionId = z.infer<typeof DocumentDefinitionIdSchema>;
export type DocumentViewId = z.infer<typeof DocumentViewIdSchema>;
export type DocumentMetadata = z.infer<typeof DocumentMetadataSchema>;
export type UnknownDocumentEnvelope = z.infer<typeof UnknownDocumentEnvelopeSchema>;
export type DocumentEnvelope<TData> = Omit<UnknownDocumentEnvelope, 'data'> & { data: TData };
