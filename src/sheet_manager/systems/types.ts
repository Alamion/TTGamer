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

export type SheetAccentColor = 'primary' | 'secondary';

export interface SheetBlockPlacement {
    id: string;
    accentColor?: SheetAccentColor;
}

export interface BuiltInDocumentLayout {
    type: 'built-in';
    blocks: readonly SheetBlockPlacement[];
}

export interface DeclarativeDocumentLayout {
    type: 'declarative';
    template: CustomTemplate;
}

export type DocumentLayout = BuiltInDocumentLayout | DeclarativeDocumentLayout;

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
}

export interface ParsedRegisteredDocument<TData = unknown> {
    definition: DocumentDefinition<TData>;
    envelope: DocumentEnvelope<TData>;
}
