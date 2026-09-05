import { z } from 'zod';

import { TemplateValuesBagSchema } from './templateValues';

const identifierSchema = z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/, 'Expected a lowercase kebab-case identifier');

export const DocumentKindSchema = identifierSchema.brand<'DocumentKind'>();
export const SystemIdSchema = identifierSchema.brand<'SystemId'>();
export const DocumentDefinitionIdSchema = identifierSchema.brand<'DocumentDefinitionId'>();
export const DocumentViewIdSchema = identifierSchema.brand<'DocumentViewId'>();

export const DocumentMetadataSchema = z.object({
    title: z.string().max(200).default(''),
    templateId: identifierSchema.optional(),
    preferredViewId: DocumentViewIdSchema.optional(),
    tags: z.array(z.string().min(1).max(64)).max(50).default([]),
});

const DocumentEnvelopeBaseSchema = z.object({
    id: z.string().min(1).max(128),
    kind: DocumentKindSchema,
    systemId: SystemIdSchema,
    definitionId: DocumentDefinitionIdSchema,
    schemaVersion: z.number().int().positive().max(1_000_000),
    metadata: DocumentMetadataSchema,
    templateValues: TemplateValuesBagSchema.optional().default({}),
});

export const UnknownDocumentEnvelopeSchema = DocumentEnvelopeBaseSchema.extend({
    data: z.unknown(),
});

export function createDocumentEnvelopeSchema<TSchema extends z.ZodTypeAny>(dataSchema: TSchema) {
    return DocumentEnvelopeBaseSchema.extend({ data: dataSchema });
}

export type DocumentKind = z.infer<typeof DocumentKindSchema>;
export type SystemId = z.infer<typeof SystemIdSchema>;
export type DocumentDefinitionId = z.infer<typeof DocumentDefinitionIdSchema>;
export type DocumentViewId = z.infer<typeof DocumentViewIdSchema>;
export type DocumentMetadata = z.infer<typeof DocumentMetadataSchema>;
export type UnknownDocumentEnvelope = z.infer<typeof UnknownDocumentEnvelopeSchema>;
export type DocumentEnvelope<TData> = Omit<UnknownDocumentEnvelope, 'data'> & { data: TData };
