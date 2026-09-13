import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useCallback, useEffect, useMemo } from 'react';

import { useCharacterContext } from '../../../context/CharacterContext';
import { reportSheetIssue } from '../../../diagnostics';
import { useDocumentSource } from '../../../hooks/useDocumentSource';
import { useDocumentStore } from '../../../store/documentStore';
import type { DocumentBindingDescriptor } from '../../../systems/templateBindings';
import type { SystemListShape } from '../../../systems/templateBindings';
import {
    boundWriteUpdate,
    createListEntry,
    readBoundNumber,
    readDataPath,
    resolveDocumentBinding,
    resolveWritableBinding,
} from '../../../systems/templateBindings';
import type { CustomTemplate, ListNode, TemplateField, VisibleWhen } from '../../../types/template';
import {
    collectListNodes,
    collectTemplateFields,
    fieldValueKey,
    walkTemplateNodes,
} from '../../../types/template';
import type { TemplatePageValues } from '../../../types/templateValues';
import {
    CATALOG_BINDINGS,
    type CatalogFillableDetail,
    readDetailValue,
} from '../data/catalogBindings';
import { useBoundDocument } from './boundDocument';
import type { CatalogOption, DocumentOption } from './fieldControls';
import { evaluateFormula, type Expr, type FormulaEvaluationError, parseFormula } from './formula';

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

export interface FormulaState {
    /** Computed result for a formula field; error surfaces as a labeled state (FR-15). */
    results: ReadonlyMap<
        string,
        | { state: 'ok'; value: number }
        | { state: 'error'; reason: FormulaEvaluationError | 'parse'; coordinate?: string }
    >;
    /** Per-node computed maxima for `maxFrom` (FR-12); degraded when the source is unavailable. */
    maxima: ReadonlyMap<string, { resolvedMax?: number; degraded?: boolean }>;
    /** Per-primitive computed minima for `minFrom` (absent when unset or unresolvable). */
    minima: ReadonlyMap<string, number>;
}

export interface SystemListRuntime {
    descriptor: DocumentBindingDescriptor;
    data: readonly unknown[];
    write: (next: readonly unknown[]) => void;
}

export interface CoordinateWrite {
    /** Field id or storage coordinate. */
    target: string;
    value: unknown;
}

export interface UseTemplatePageResult {
    addRow: (blockId: string) => void;
    /**
     * Writes several coordinates as one change: document-data coordinates in one data update,
     * value-bag coordinates in one bag update (catalog fills).
     */
    applyWrites: (writes: readonly CoordinateWrite[]) => void;
    /** Evaluates a node's render condition against the current values. */
    isVisible: (condition: VisibleWhen, nodeId: string) => boolean;
    /** Switches the workspace to another document (reference links); no-op in previews. */
    openDocument: (documentId: string) => void;
    /** True when references render against a fixed preview (missing targets are not reported). */
    previewSource: boolean;
    disabled: boolean;
    /** Documents for reference controls (current store, excluding the active document). */
    documentOptions: ReadonlyArray<DocumentOption>;
    formulaState: FormulaState;
    removeRow: (blockId: string, rowIndex: string) => void;
    resolveCatalogField: (field: TemplateField) => CatalogFieldRuntime | undefined;
    resolveSystemList: (list: ListNode) => SystemListRuntime | undefined;
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

function parsedFormula(source: string): { ok: true; expr: Expr } | { ok: false } {
    const parsed = parseFormula(source);
    if (parsed.ok) return { ok: true, expr: parsed.expr };
    return { ok: false };
}

function readRows(value: unknown): Record<string, Record<string, unknown>> {
    return typeof value === 'object' &&
        value !== null &&
        !('current' in value) &&
        !Array.isArray(value)
        ? (value as Record<string, Record<string, unknown>>)
        : {};
}

export interface UseTemplatePageOptions {
    /**
     * Copy list presets into the document on first render (default). Partial renders (docs
     * fragments) must not seed: the per-template marker would block the full page's lists.
     */
    seedPresets?: boolean;
}

export function useTemplatePage(
    template: CustomTemplate | undefined,
    { seedPresets = true }: UseTemplatePageOptions = {}
): UseTemplatePageResult {
    const source = useDocumentSource();
    const {
        documents,
        document,
        updateDocumentData,
        updateDocumentMetadata,
        updateTemplateValues,
    } = source;
    const readOnly = useCharacterContext().readOnly || source.readOnly;
    const bound = useBoundDocument();
    const setCurrentDocument = useDocumentStore((state) => state.setCurrentDocument);
    const locale = useDocusaurusContext().i18n.currentLocale;
    const currentDocumentId = document?.id;
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

    const documentData = document?.data as Record<string, unknown> | undefined;

    const setValue = useCallback(
        (fieldOrKey: string, value: unknown) => {
            if (!currentDocumentId || !template || readOnly) return;
            // Accepts either a template field id (resolved to its valueKey) or an explicit key.
            const coordinate = fieldCoords.get(fieldOrKey) ?? fieldOrKey;
            updateTemplateValues(currentDocumentId, template, (page) => ({
                ...page,
                [coordinate]: value as TemplatePageValues[string],
            }));
        },
        [currentDocumentId, template, readOnly, updateTemplateValues, fieldCoords]
    );

    const setRowValue = useCallback(
        (blockId: string, rowIndex: string, columnId: string, value: unknown) => {
            if (!currentDocumentId || !template || readOnly) return;
            updateTemplateValues(currentDocumentId, template, (page) => {
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
        [currentDocumentId, template, readOnly, updateTemplateValues]
    );

    const addRow = useCallback(
        (blockId: string) => {
            if (!currentDocumentId || !template || readOnly) return;
            updateTemplateValues(currentDocumentId, template, (page) => {
                const rows = readRows(page[blockId]);
                let index = 0;
                while (rows[String(index)] !== undefined) index += 1;
                return {
                    ...page,
                    [blockId]: { ...rows, [String(index)]: {} },
                };
            });
        },
        [currentDocumentId, template, readOnly, updateTemplateValues]
    );

    const removeRow = useCallback(
        (blockId: string, rowIndex: string) => {
            if (!currentDocumentId || !template || readOnly) return;
            updateTemplateValues(currentDocumentId, template, (page) => {
                const rows = readRows(page[blockId]);
                const next = { ...rows };
                delete next[rowIndex];
                return { ...page, [blockId]: next } as TemplatePageValues;
            });
        },
        [currentDocumentId, template, readOnly, updateTemplateValues]
    );

    const documentOptions = useMemo<DocumentOption[]>(
        () =>
            documents
                .filter((candidate) => candidate.id !== document?.id)
                .map((candidate) => ({
                    value: candidate.id,
                    label: candidate.metadata.title || candidate.definitionId,
                    kind: candidate.kind,
                })),
        [documents, document?.id]
    );

    const applyWrites = useCallback(
        (writes: readonly CoordinateWrite[]) => {
            if (!currentDocumentId || !template || readOnly || writes.length === 0) return;
            const bagEntries: Array<[string, unknown]> = [];
            const data: Record<string, unknown> = { ...(bound?.data ?? {}) };
            const dataKeys = new Set<string>();
            let title: string | undefined;
            for (const { target, value } of writes) {
                if (value === undefined) continue;
                const coordinate = fieldCoords.get(target) ?? target;
                const binding = bound
                    ? resolveWritableBinding(template.systemId, template.documentKind, coordinate)
                    : undefined;
                if (binding) {
                    const update = boundWriteUpdate(binding, data, value);
                    Object.assign(data, update);
                    Object.keys(update).forEach((key) => dataKeys.add(key));
                    if (binding.kind === 'field' && binding.syncsTitle) {
                        title = String(readDataPath(data, binding.path) ?? '');
                    }
                } else {
                    bagEntries.push([coordinate, value === null ? undefined : value]);
                }
            }
            if (bound && dataKeys.size > 0) {
                bound.update(Object.fromEntries([...dataKeys].map((key) => [key, data[key]])));
                if (title !== undefined) bound.setTitle(title);
            }
            if (bagEntries.length > 0) {
                updateTemplateValues(currentDocumentId, template, (page) => ({
                    ...page,
                    ...(Object.fromEntries(bagEntries) as TemplatePageValues),
                }));
            }
        },
        [bound, currentDocumentId, fieldCoords, readOnly, template, updateTemplateValues]
    );

    const isVisible = useCallback(
        (condition: VisibleWhen, nodeId: string) => {
            if (!template) return true;
            const binding = resolveWritableBinding(
                template.systemId,
                template.documentKind,
                condition.coordinate
            );
            let value: unknown;
            if (binding?.kind === 'field') {
                value = readDataPath(documentData, binding.path);
            } else if (binding?.kind === 'resource' && documentData) {
                value = documentData[binding.dataKey];
            } else if (binding) {
                const read = readBoundNumber(
                    template.systemId,
                    template.documentKind,
                    documentData ?? {},
                    condition.coordinate
                );
                value = read.bound ? read.value : undefined;
            } else if ([...fieldCoords.values()].includes(condition.coordinate)) {
                value = values[condition.coordinate];
            } else {
                reportSheetIssue({
                    code: 'binding-unresolved',
                    message: 'Render condition references an unknown coordinate; node hidden',
                    details: { templateId: template.id, nodeId, coordinate: condition.coordinate },
                });
                return false;
            }
            const matches = value === condition.equals;
            return condition.not ? !matches : matches;
        },
        [documentData, fieldCoords, template, values]
    );

    const previewSource = source.readOnly;
    const openDocument = useCallback(
        (documentId: string) => {
            if (previewSource) return;
            setCurrentDocument(documentId);
        },
        [previewSource, setCurrentDocument]
    );

    // -- Formula engine (feature 006): unified coordinate space, memoized per render pass. --
    const formulaState = useMemo<FormulaState>(() => {
        const results = new Map<
            string,
            | { state: 'ok'; value: number }
            | { state: 'error'; reason: FormulaEvaluationError | 'parse'; coordinate?: string }
        >();
        const maxima = new Map<string, { resolvedMax?: number; degraded?: boolean }>();
        const minima = new Map<string, number>();
        if (!template) return { results, maxima, minima };

        // Base numeric resolver: bag values + system-bound coordinates (undifferentiated).
        const resolveBase = (path: string): number | undefined => {
            const bagNumber = (key: string, part?: 'current' | 'max'): number | undefined => {
                const stored = values[key];
                if (typeof stored === 'number') return part === 'max' ? undefined : stored;
                if (typeof stored === 'object' && stored !== null && 'current' in stored) {
                    const pool = stored as { current: number; max: number };
                    if (part === 'max') return pool.max;
                    return part === 'current' ? pool.current : pool.current;
                }
                return undefined;
            };

            // System-bound coordinates (traits, pool parts) read document data.
            if (documentData) {
                const bound = readBoundNumber(
                    template.systemId,
                    template.documentKind,
                    documentData,
                    path
                );
                if (bound.bound) return bound.value;
            }
            const [head, part] = path.split('.');
            if (part === 'current' || part === 'max') {
                return bagNumber(head, part as 'current' | 'max');
            }
            return bagNumber(path);
        };

        // Formula fields first, evaluated in dependency order with a cycle guard.
        const formulaFields: Array<{ coordinate: string; expr: Expr }> = [];
        walkTemplateNodes(template.children, (node) => {
            if (node.type === 'formula') {
                const parsed = parsedFormula(node.formula);
                if (parsed.ok) {
                    formulaFields.push({ coordinate: fieldValueKey(node), expr: parsed.expr });
                } else {
                    results.set(fieldValueKey(node), { state: 'error', reason: 'parse' });
                    reportSheetIssue({
                        code: 'formula-error',
                        message: 'Formula field does not parse',
                        details: {
                            templateId: template.id,
                            nodeId: node.id,
                            formula: node.formula,
                        },
                    });
                }
            }
        });
        const computed = new Set<string>();
        const pending = new Set<string>(formulaFields.map(({ coordinate }) => coordinate));
        let guard = formulaFields.length + 1;
        while (pending.size > 0 && guard > 0) {
            guard -= 1;
            let progressed = false;
            for (const entry of formulaFields) {
                if (computed.has(entry.coordinate)) continue;
                const unresolved = collectDependenciesSafe(entry.expr).some(
                    (coordinate) =>
                        pending.has(coordinate) &&
                        !computed.has(coordinate) &&
                        coordinate !== entry.coordinate
                );
                if (unresolved) continue;
                const resolution = evaluateFormula(entry.expr, (path) => {
                    if (path === entry.coordinate) return undefined; // self-reference → unknown
                    const computedEntry = formulaFields.find(
                        (candidate) => candidate.coordinate === path
                    );
                    if (computedEntry && computed.has(path)) {
                        const value = results.get(path);
                        return value && value.state === 'ok' ? value.value : undefined;
                    }
                    return resolveBase(path);
                });
                results.set(
                    entry.coordinate,
                    resolution.ok
                        ? { state: 'ok', value: resolution.value }
                        : {
                              state: 'error',
                              reason: resolution.error,
                              coordinate: resolution.coordinate,
                          }
                );
                if (resolution.ok || resolution.error !== 'unknown-coordinate') {
                    computed.add(entry.coordinate);
                    pending.delete(entry.coordinate);
                    progressed = true;
                }
            }
            if (!progressed) {
                // Remaining coordinates are circular (or reference a broken chain).
                for (const coordinate of pending) {
                    results.set(coordinate, { state: 'error', reason: 'circular' });
                    computed.add(coordinate);
                }
                break;
            }
        }

        // Bound formulas (maxFrom / minFrom): display clamps for fields and pool primitives.
        const evaluateBound = (
            node: { id: string },
            source: string,
            kind: 'maxFrom' | 'minFrom'
        ): number | undefined => {
            const parsed = parsedFormula(source);
            if (!parsed.ok) {
                reportSheetIssue({
                    code: 'formula-error',
                    message: `${kind} formula does not parse`,
                    details: { templateId: template.id, nodeId: node.id, formula: source },
                });
                return undefined;
            }
            const resolution = evaluateFormula(parsed.expr, (path) => {
                if (computed.has(path)) {
                    const value = results.get(path);
                    return value && value.state === 'ok' ? value.value : undefined;
                }
                return resolveBase(path);
            });
            return resolution.ok ? resolution.value : undefined;
        };
        walkTemplateNodes(template.children, (node) => {
            const maxSource =
                node.type === 'rating' || node.type === 'number' || node.type === 'primitive'
                    ? node.maxFrom
                    : undefined;
            if (maxSource) {
                const resolvedMax = evaluateBound(node, maxSource, 'maxFrom');
                maxima.set(
                    node.id,
                    resolvedMax === undefined ? { degraded: true } : { resolvedMax }
                );
            }
            if (node.type === 'primitive' && node.minFrom) {
                const resolvedMin = evaluateBound(node, node.minFrom, 'minFrom');
                if (resolvedMin !== undefined) minima.set(node.id, resolvedMin);
            }
        });

        return { results, maxima, minima };
    }, [template, values, documentData]);

    const resolveSystemList = useCallback(
        (list: ListNode): SystemListRuntime | undefined => {
            if (!list.bindingKey || !document) return undefined;
            const descriptor = resolveDocumentBinding(
                template?.systemId ?? document.systemId,
                template?.documentKind ?? document.kind,
                list.bindingKey
            );
            if (!descriptor) {
                reportSheetIssue({
                    code: 'binding-unresolved',
                    message: 'List binding key is not registered for this system and kind',
                    details: { bindingKey: list.bindingKey, nodeId: list.id },
                });
                return undefined;
            }
            const listId =
                descriptor.kind === 'list'
                    ? descriptor.dataKey
                    : descriptor.kind === 'equipment'
                      ? descriptor.sectionId
                      : undefined;
            if (!listId) return undefined;
            const data = (documentData as Record<string, unknown> | undefined)?.[listId];
            return {
                descriptor,
                data: Array.isArray(data) ? data : [],
                write: (next) => {
                    if (!currentDocumentId || readOnly) return;
                    updateDocumentData(currentDocumentId, (raw) => ({
                        ...(raw as Record<string, unknown>),
                        [listId]: next,
                    }));
                },
            };
        },
        [document, documentData, template, currentDocumentId, readOnly, updateDocumentData]
    );

    const resolveCatalogField = useCallback(
        (field: TemplateField): CatalogFieldRuntime | undefined => {
            if (field.type !== 'select' || !field.binding) return undefined;
            const catalogId = field.binding.catalogId;
            const binding = CATALOG_BINDINGS.get(catalogId);
            if (!binding) {
                // FR-21 degradation: manual fallback with static options, binding retained.
                reportSheetIssue({
                    code: 'catalog-unavailable',
                    message: 'Catalog binding is not available; falling back to manual choice',
                    details: { catalogId, fieldId: field.id },
                });
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

    // Preset seeding (feature 005, FR-19): copy-on-assign, once per document×template.
    // Presets land as ordinary list entries; removal is final (marker prevents re-seed);
    // later author edits to presets never propagate to already-seeded documents.
    useEffect(() => {
        if (!seedPresets || !template || !currentDocumentId || readOnly) return;
        if (document?.metadata.seededPresets?.includes(template.id)) return;

        const pending: Array<{
            listId: string;
            shape: SystemListShape;
            presets: Array<{ key: string; label: string; value?: number }>;
        }> = [];
        for (const list of collectListNodes(template)) {
            if (!list.presets?.length) continue;
            if (list.bindingKey) {
                const descriptor = resolveDocumentBinding(
                    template.systemId,
                    template.documentKind,
                    list.bindingKey
                );
                if (descriptor?.kind === 'list') {
                    pending.push({
                        listId: descriptor.dataKey,
                        shape: descriptor.entryShape,
                        presets: list.presets,
                    });
                }
            } else if (list.valueKey) {
                // Value-coordinate lists seed into the bag as ordinary starting entries.
                const stored: unknown = values[list.valueKey];
                const entries = Array.isArray(stored)
                    ? (stored as Array<{ id: string; label: string; value?: number }>)
                    : [];
                const known = new Set(entries.map((entry) => String(entry.id ?? '')));
                const seeded = list.presets
                    .filter((preset) => !known.has(`preset-${template.id}-${preset.key}`))
                    .map((preset) => ({
                        id: `preset-${template.id}-${preset.key}`,
                        label: preset.label,
                        value: preset.value ?? 0,
                    }));
                if (seeded.length > 0) {
                    updateTemplateValues(currentDocumentId, template, (page) => ({
                        ...page,
                        [list.valueKey!]: [...entries, ...seeded],
                    }));
                }
            }
        }
        if (pending.length === 0) {
            // Nothing to seed, but still record the marker so future preset edits don't
            // retroactively apply to this document (copy-on-assign semantics).
            updateDocumentMetadata(currentDocumentId, {
                seededPresets: [...(document?.metadata.seededPresets ?? []), template.id],
            });
            return;
        }
        updateDocumentData(currentDocumentId, (raw) => {
            const next = { ...(raw as Record<string, unknown>) };
            for (const { listId, shape, presets } of pending) {
                const list = Array.isArray(next[listId])
                    ? (next[listId] as Array<Record<string, unknown>>)
                    : [];
                const known = new Set(list.map((item) => String(item.id ?? '')));
                const seeded = presets
                    .filter((preset) => !known.has(`preset-${template.id}-${preset.key}`))
                    .map((preset) =>
                        createListEntry(shape, {
                            id: `preset-${template.id}-${preset.key}`,
                            label: preset.label,
                            value: preset.value ?? 0,
                        })
                    );
                next[listId] = [...list, ...seeded];
            }
            return next;
        });
        updateDocumentMetadata(currentDocumentId, {
            seededPresets: [...(document?.metadata.seededPresets ?? []), template.id],
        });
    }, [
        template,
        currentDocumentId,
        seedPresets,
        readOnly,
        document,
        values,
        updateDocumentData,
        updateDocumentMetadata,
        updateTemplateValues,
    ]);

    return {
        addRow,
        applyWrites,
        isVisible,
        openDocument,
        previewSource,
        disabled: readOnly,
        documentOptions,
        formulaState,
        removeRow,
        resolveCatalogField,
        resolveSystemList,
        setRowValue,
        setValue,
        status: template ? 'ready' : 'none',
        template,
        values,
    };
}

function collectDependenciesSafe(expr: Expr): string[] {
    const coords: string[] = [];
    const walk = (node: Expr): void => {
        if (node.kind === 'coord') coords.push(node.path);
        else if (node.kind === 'neg') walk(node.operand);
        else if (node.kind === 'bin') {
            walk(node.left);
            walk(node.right);
        } else if (node.kind === 'call') node.args.forEach(walk);
    };
    walk(expr);
    return coords;
}
