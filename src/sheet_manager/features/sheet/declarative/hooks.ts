import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useCallback, useMemo } from 'react';

import { useCharacterContext } from '../../../context/CharacterContext';
import { useDocumentStore } from '../../../store/documentStore';
import type { CustomTemplate, TemplateField } from '../../../types/template';
import { fieldValueKey } from '../../../types/template';
import { collectTemplateFields } from '../../../types/template';
import type { TemplatePageValues } from '../../../types/templateValues';
import {
    CATALOG_BINDINGS,
    type CatalogFillableDetail,
    readDetailValue,
} from '../data/catalogBindings';
import type { CatalogOption, DocumentOption } from './fieldControls';

export type TemplatePageStatus = 'none' | 'ready' | 'missing';

export interface CatalogFieldRuntime {
    catalogId: string;
    /** True when the catalog is unavailable on this device (manual fallback, FR-21). */
    degraded: boolean;
    options: ReadonlyArray<CatalogOption>;
    /** Detail descriptors for fill mapping (closed set declared by the catalog). */
    details: ReadonlyMap<string, CatalogFillableDetail>;
    /** Entry lookup for copy-on-select fills; absent when degraded. */
    getEntry: (entryId: string) => { id: string; name: string } | undefined;
    /** Extracts one fillable detail value from an entry. */
    readDetail: (entry: { id: string; name: string }, key: string) => string | number | undefined;
}

export interface UseTemplatePageResult {
    addRow: (blockId: string) => void;
    disabled: boolean;
    /** Documents for reference controls (current store, excluding the active document). */
    documentOptions: ReadonlyArray<DocumentOption>;
    removeRow: (blockId: string, rowIndex: string) => void;
    resolveCatalogField: (field: TemplateField) => CatalogFieldRuntime | undefined;
    setRowValue: (blockId: string, rowIndex: string, columnId: string, value: unknown) => void;
    /** Writes by storage coordinate (valueKey); resolves template field ids internally. */
    setValue: (fieldOrKey: string, value: unknown) => void;
    status: TemplatePageStatus;
    template: CustomTemplate | undefined;
    values: TemplatePageValues;
}

const templateFieldCoords = new WeakMap<CustomTemplate, Map<string, string>>();

/** field id → valueKey map for a template; computed lazily, cached per template object. */
function templateFieldCoordsFor(template: CustomTemplate): Map<string, string> {
    let map = templateFieldCoords.get(template);
    if (!map) {
        map = new Map();
        for (const field of collectTemplateFields(template).values()) {
            map.set(field.id, fieldValueKey(field));
        }
        templateFieldCoords.set(template, map);
    }
    return map;
}

function readRows(value: unknown): Record<string, Record<string, unknown>> {
    return typeof value === 'object' &&
        value !== null &&
        !('current' in value) &&
        !Array.isArray(value)
        ? (value as Record<string, Record<string, unknown>>)
        : {};
}

export function useTemplatePage(template: CustomTemplate | undefined): UseTemplatePageResult {
    const { currentDocumentId, documents, updateTemplateValues } = useDocumentStore();
    const { readOnly } = useCharacterContext();
    const locale = useDocusaurusContext().i18n.currentLocale;

    const document = documents.find(({ id }) => id === currentDocumentId);
    const templateId = template?.id;
    // Values live in one document-global bag keyed by valueKey (clarification D1).
    const values = useMemo<TemplatePageValues>(
        () => (templateId ? (document?.templateValues ?? {}) : {}),
        [document, templateId]
    );

    // field id → valueKey map, memoized per template object (clarification D2).
    const fieldCoords = useMemo(
        () => (template ? templateFieldCoordsFor(template) : new Map<string, string>()),
        [template]
    );

    const setValue = useCallback(
        (fieldOrKey: string, value: unknown) => {
            if (!currentDocumentId || !templateId || readOnly) return;
            // Accepts either a template field id (resolved to its valueKey) or an explicit key.
            const coordinate = fieldCoords.get(fieldOrKey) ?? fieldOrKey;
            updateTemplateValues(currentDocumentId, templateId, (page) => ({
                ...page,
                [coordinate]: value as TemplatePageValues[string],
            }));
        },
        [currentDocumentId, templateId, readOnly, updateTemplateValues, fieldCoords]
    );

    const setRowValue = useCallback(
        (blockId: string, rowIndex: string, columnId: string, value: unknown) => {
            if (!currentDocumentId || !templateId || readOnly) return;
            updateTemplateValues(currentDocumentId, templateId, (page) => {
                const rows = readRows(page[blockId]);
                const row = rows[rowIndex] ?? {};
                return {
                    ...page,
                    [blockId]: {
                        ...rows,
                        [rowIndex]: { ...row, [columnId]: value as TemplatePageValues[string] },
                    },
                } as TemplatePageValues;
            });
        },
        [currentDocumentId, templateId, readOnly, updateTemplateValues]
    );

    const addRow = useCallback(
        (blockId: string) => {
            if (!currentDocumentId || !templateId || readOnly) return;
            updateTemplateValues(currentDocumentId, templateId, (page) => {
                const rows = readRows(page[blockId]);
                let index = 0;
                while (rows[String(index)] !== undefined) index += 1;
                return {
                    ...page,
                    [blockId]: { ...rows, [String(index)]: {} },
                };
            });
        },
        [currentDocumentId, templateId, readOnly, updateTemplateValues]
    );

    const removeRow = useCallback(
        (blockId: string, rowIndex: string) => {
            if (!currentDocumentId || !templateId || readOnly) return;
            updateTemplateValues(currentDocumentId, templateId, (page) => {
                const rows = readRows(page[blockId]);
                const next = { ...rows };
                delete next[rowIndex];
                return { ...page, [blockId]: next } as TemplatePageValues;
            });
        },
        [currentDocumentId, templateId, readOnly, updateTemplateValues]
    );

    const documentOptions = useMemo<DocumentOption[]>(
        () =>
            documents
                .filter((candidate) => candidate.id !== document?.id)
                .map((candidate) => ({
                    value: candidate.id,
                    label: candidate.metadata.title || candidate.definitionId,
                })),
        [documents, document?.id]
    );

    const resolveCatalogField = useCallback(
        (field: TemplateField): CatalogFieldRuntime | undefined => {
            if (field.type !== 'select' || !field.binding) return undefined;
            const catalogId = field.binding.catalogId;
            const binding = CATALOG_BINDINGS.get(catalogId);
            if (!binding) {
                // FR-21 degradation: manual fallback with static options, binding retained.
                return {
                    catalogId,
                    degraded: true,
                    options: [],
                    details: new Map(),
                    getEntry: () => undefined,
                    readDetail: () => undefined,
                };
            }
            return {
                catalogId,
                degraded: false,
                options: binding.entries.map((entry) => ({
                    value: entry.id,
                    label: binding.entryLabel(entry, locale),
                })),
                details: new Map(binding.fillableDetails.map((detail) => [detail.key, detail])),
                getEntry: (entryId) => binding.entries.find((entry) => entry.id === entryId),
                readDetail: readDetailValue,
            };
        },
        [locale]
    );

    return {
        addRow,
        disabled: readOnly,
        documentOptions,
        removeRow,
        resolveCatalogField,
        setRowValue,
        setValue,
        status: template ? 'ready' : 'none',
        template,
        values,
    };
}
