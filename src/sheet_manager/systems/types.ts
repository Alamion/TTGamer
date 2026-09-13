import type { z } from 'zod';

import type {
    DocumentDefinitionId,
    DocumentEnvelope,
    DocumentKind,
    DocumentViewId,
    SystemId,
} from '../types/document';
import type { CustomTemplate } from '../types/template';
import type { DocumentCapabilities } from './capabilities';
import type { DocumentBindingDescriptor } from './templateBindings';

/** The view's page is the system's shipped default template with this id (and the view's kind). */
export interface DeclarativeDocumentLayout {
    type: 'declarative';
    templateId: string;
}

export type DocumentLayout = DeclarativeDocumentLayout;

export interface DocumentViewLabel {
    id: string;
    message: string;
}

export interface DocumentViewDefinition {
    id: DocumentViewId;
    label: DocumentViewLabel;
    layout: DocumentLayout;
    legacyIds?: readonly DocumentViewId[];
}

export interface DocumentDefinition<TData = unknown> {
    id: DocumentDefinitionId;
    kind: DocumentKind;
    label: string;
    schemaVersion: number;
    schema: z.ZodType<TData>;
    createDefault: () => TData;
    defaultViewId: DocumentViewId;
    views: readonly DocumentViewDefinition[];
    capabilities?: DocumentCapabilities;
    derive?: (data: TData) => unknown;
    migrate?: (data: unknown, fromVersion: number) => unknown;
}

export interface SystemPlugin {
    id: SystemId;
    label: string;
    documents: readonly DocumentDefinition[];
    /**
     * Feature 005: explicit primitive-composed default templates for this setup's views.
     * Identity = view id; absent entries fall back to legacy view derivation.
     */
    defaultTemplates?: readonly CustomTemplate[];
    /** Document data addresses templates may bind to; generic template code reads only these. */
    templateBindings?: readonly DocumentBindingDescriptor[];
}

export interface ParsedRegisteredDocument<TData = unknown> {
    definition: DocumentDefinition<TData>;
    envelope: DocumentEnvelope<TData>;
}
