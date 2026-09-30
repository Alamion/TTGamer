import {
    type CatalogCellValue,
    type CatalogColumn,
    type CatalogColumnType,
    type CatalogEntry,
    newCatalogColumnId,
    newCatalogEntryId,
    type UserCatalog,
} from '../../../systems/userCatalogs';
import {
    type CustomTemplate,
    isTemplateField,
    type TemplateField,
    type TemplateNode,
    walkTemplateNodes,
} from '../../../types/template';
import { TEMPLATE_LIMITS } from '../../../types/templateLimits';

/**
 * Pure edits of a user catalog (spec 015, R8). Each returns the next catalog, or a refusal the
 * details pane explains; the pane saves the result with one store write.
 */
export type CatalogEditResult =
    | { ok: true; catalog: UserCatalog }
    | { ok: false; reason: 'entries-limit' | 'columns-limit' | 'empty-name' };

const done = (
    catalog: UserCatalog,
    changes: Partial<UserCatalog>,
    now: string
): CatalogEditResult => ({
    ok: true,
    catalog: { ...catalog, ...changes, updatedAt: now },
});

function move<T>(items: readonly T[], from: number, to: number): T[] {
    const next = [...items];
    if (from < 0 || from >= next.length || to < 0 || to >= next.length) return next;
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    return next;
}

// --- Columns ---------------------------------------------------------------------------------

export function addColumn(
    catalog: UserCatalog,
    name: string,
    type: CatalogColumnType,
    now: string
): CatalogEditResult {
    if (catalog.columns.length >= TEMPLATE_LIMITS.catalogColumnsMax) {
        return { ok: false, reason: 'columns-limit' };
    }
    if (!name.trim()) return { ok: false, reason: 'empty-name' };
    return done(
        catalog,
        { columns: [...catalog.columns, { id: newCatalogColumnId(), name: name.trim(), type }] },
        now
    );
}

export function renameColumn(
    catalog: UserCatalog,
    columnId: string,
    name: string,
    now: string
): CatalogEditResult {
    if (!name.trim()) return { ok: false, reason: 'empty-name' };
    return done(
        catalog,
        {
            columns: catalog.columns.map((column) =>
                column.id === columnId ? { ...column, name: name.trim() } : column
            ),
        },
        now
    );
}

export function moveColumn(
    catalog: UserCatalog,
    columnId: string,
    offset: -1 | 1,
    now: string
): CatalogEditResult {
    const index = catalog.columns.findIndex(({ id }) => id === columnId);
    return done(catalog, { columns: move(catalog.columns, index, index + offset) }, now);
}

export function removeColumn(
    catalog: UserCatalog,
    columnId: string,
    now: string
): CatalogEditResult {
    return done(
        catalog,
        {
            columns: catalog.columns.filter(({ id }) => id !== columnId),
            entries: catalog.entries.map((entry) => {
                const values = { ...entry.values };
                delete values[columnId];
                return { ...entry, values };
            }),
        },
        now
    );
}

const TRUE_WORDS = new Set(['yes', 'y', 'true', 'да', '1', '+']);
const FALSE_WORDS = new Set(['no', 'n', 'false', 'нет', '0', '-']);

/** A cell value converted to another column type; `undefined` when it cannot convert. */
export function convertValue(
    value: CatalogCellValue,
    to: CatalogColumnType
): CatalogCellValue | undefined {
    switch (to) {
        case 'text':
            return typeof value === 'boolean' ? (value ? 'yes' : 'no') : String(value);
        case 'number': {
            if (typeof value === 'number') return value;
            if (typeof value === 'boolean') return value ? 1 : 0;
            const text = value.trim().replace(',', '.');
            if (!/^-?\d+(\.\d+)?$/.test(text)) return undefined;
            return Number(text);
        }
        case 'toggle': {
            if (typeof value === 'boolean') return value;
            if (typeof value === 'number') return value !== 0;
            const word = value.trim().toLowerCase();
            if (TRUE_WORDS.has(word)) return true;
            if (FALSE_WORDS.has(word)) return false;
            return undefined;
        }
    }
}

/** How many filled cells a retype would empty. */
export function retypeLosses(
    catalog: UserCatalog,
    columnId: string,
    to: CatalogColumnType
): number {
    return catalog.entries.filter((entry) => {
        const value = entry.values[columnId];
        return value !== undefined && convertValue(value, to) === undefined;
    }).length;
}

export function retypeColumn(
    catalog: UserCatalog,
    columnId: string,
    to: CatalogColumnType,
    now: string
): CatalogEditResult {
    return done(
        catalog,
        {
            columns: catalog.columns.map((column) =>
                column.id === columnId ? { ...column, type: to } : column
            ),
            entries: catalog.entries.map((entry) => {
                const value = entry.values[columnId];
                if (value === undefined) return entry;
                const values = { ...entry.values };
                const converted = convertValue(value, to);
                if (converted === undefined) delete values[columnId];
                else values[columnId] = converted;
                return { ...entry, values };
            }),
        },
        now
    );
}

// --- Entries ---------------------------------------------------------------------------------

export function addEntry(
    catalog: UserCatalog,
    name: string,
    now: string,
    values: CatalogEntry['values'] = {}
): CatalogEditResult {
    if (catalog.entries.length >= TEMPLATE_LIMITS.catalogEntriesMax) {
        return { ok: false, reason: 'entries-limit' };
    }
    if (!name.trim()) return { ok: false, reason: 'empty-name' };
    return done(
        catalog,
        { entries: [...catalog.entries, { id: newCatalogEntryId(), name: name.trim(), values }] },
        now
    );
}

/** Renames an entry or sets one cell (`undefined` empties it). */
export function updateEntry(
    catalog: UserCatalog,
    entryId: string,
    change: { name: string } | { columnId: string; value: CatalogCellValue | undefined },
    now: string
): CatalogEditResult {
    if ('name' in change && !change.name.trim()) return { ok: false, reason: 'empty-name' };
    return done(
        catalog,
        {
            entries: catalog.entries.map((entry) => {
                if (entry.id !== entryId) return entry;
                if ('name' in change) return { ...entry, name: change.name.trim() };
                const values = { ...entry.values };
                if (change.value === undefined) delete values[change.columnId];
                else values[change.columnId] = change.value;
                return { ...entry, values };
            }),
        },
        now
    );
}

export function moveEntry(
    catalog: UserCatalog,
    entryId: string,
    offset: -1 | 1,
    now: string
): CatalogEditResult {
    const index = catalog.entries.findIndex(({ id }) => id === entryId);
    return done(catalog, { entries: move(catalog.entries, index, index + offset) }, now);
}

export function removeEntries(
    catalog: UserCatalog,
    entryIds: ReadonlySet<string>,
    now: string
): CatalogEditResult {
    return done(catalog, { entries: catalog.entries.filter(({ id }) => !entryIds.has(id)) }, now);
}

/** Entry ids whose trimmed, case-folded name another entry also has. */
export function duplicateNames(catalog: UserCatalog): Set<string> {
    const byName = new Map<string, string[]>();
    for (const { id, name } of catalog.entries) {
        const key = name.trim().toLocaleLowerCase();
        byName.set(key, [...(byName.get(key) ?? []), id]);
    }
    return new Set([...byName.values()].filter((ids) => ids.length > 1).flat());
}

// --- Paste -----------------------------------------------------------------------------------

export interface PastedLineRejection {
    /** 1-based line of the pasted text. */
    line: number;
    text: string;
    reason: 'empty-name' | 'extra-cells' | 'bad-value' | 'entries-limit';
}

/**
 * Tab-separated lines (what spreadsheets copy): the name, then one cell per column in order.
 * Missing cells stay empty; a line with extra cells, an unconvertible value, or no name is
 * rejected whole.
 */
export function parsePastedEntries(
    text: string,
    columns: readonly CatalogColumn[],
    room: number = TEMPLATE_LIMITS.catalogEntriesMax
): {
    entries: Array<{ name: string; values: CatalogEntry['values'] }>;
    rejected: PastedLineRejection[];
} {
    const entries: Array<{ name: string; values: CatalogEntry['values'] }> = [];
    const rejected: PastedLineRejection[] = [];
    text.split(/\r?\n/).forEach((raw, index) => {
        if (!raw.trim()) return;
        const line = index + 1;
        const [name = '', ...cells] = raw.split('\t');
        const reject = (reason: PastedLineRejection['reason']) =>
            rejected.push({ line, text: raw, reason });
        if (!name.trim()) return reject('empty-name');
        if (cells.length > columns.length) return reject('extra-cells');
        const values: CatalogEntry['values'] = {};
        for (const [position, cell] of cells.entries()) {
            if (!cell.trim()) continue;
            const column = columns[position]!;
            const value = convertValue(cell.trim(), column.type);
            if (value === undefined) return reject('bad-value');
            values[column.id] = value;
        }
        if (entries.length >= room) return reject('entries-limit');
        entries.push({ name: name.trim(), values });
    });
    return { entries, rejected };
}

/** Adds pasted entries after the existing ones. */
export function appendEntries(
    catalog: UserCatalog,
    pasted: ReadonlyArray<{ name: string; values: CatalogEntry['values'] }>,
    now: string
): CatalogEditResult {
    if (catalog.entries.length + pasted.length > TEMPLATE_LIMITS.catalogEntriesMax) {
        return { ok: false, reason: 'entries-limit' };
    }
    return done(
        catalog,
        {
            entries: [
                ...catalog.entries,
                ...pasted.map(({ name, values }) => ({ id: newCatalogEntryId(), name, values })),
            ],
        },
        now
    );
}

// --- Usage -----------------------------------------------------------------------------------

/** Every catalog id a template binds: choice fields, table choice columns, and lists. */
export function boundCatalogIds(template: CustomTemplate): Set<string> {
    const ids = new Set<string>();
    const visitField = (field: TemplateField) => {
        if (field.type === 'select' && field.binding) ids.add(field.binding.catalogId);
    };
    walkTemplateNodes(template.children, (node: TemplateNode) => {
        if (node.type === 'table') node.columns.forEach(visitField);
        else if (node.type === 'list' && node.catalog) ids.add(node.catalog.catalogId);
        else if (isTemplateField(node)) visitField(node);
    });
    return ids;
}

export interface CatalogUseSite {
    template: CustomTemplate;
    nodeId: string;
    kind: 'field' | 'list' | 'column';
}

export interface CatalogUsage {
    /** Templates that bind the catalog, each once, in the given order. */
    templates: CustomTemplate[];
    sites: CatalogUseSite[];
    /** Column id → the sites whose mapping (a fill, or a list's value) reads it. */
    columns: Map<string, CatalogUseSite[]>;
}

/** Where templates use a catalog (fields, table columns, lists) and which columns they map. */
export function catalogUsage(
    catalogId: string,
    templates: readonly CustomTemplate[]
): CatalogUsage {
    const sites: CatalogUseSite[] = [];
    const columns = new Map<string, CatalogUseSite[]>();
    const mapped = (columnId: string, site: CatalogUseSite) =>
        columns.set(columnId, [...(columns.get(columnId) ?? []), site]);
    const visitField = (
        template: CustomTemplate,
        field: TemplateField,
        kind: 'field' | 'column'
    ) => {
        if (field.type !== 'select' || field.binding?.catalogId !== catalogId) return;
        const site = { template, nodeId: field.id, kind };
        sites.push(site);
        for (const [detail, rule] of Object.entries(field.binding.fills)) {
            if (!rule.disabled && rule.targetFieldId) mapped(detail, site);
        }
    };
    for (const template of templates) {
        walkTemplateNodes(template.children, (node: TemplateNode) => {
            if (node.type === 'table') {
                for (const column of node.columns) visitField(template, column, 'column');
            } else if (node.type === 'list') {
                const catalog = node.catalog;
                if (catalog?.catalogId !== catalogId) return;
                const site = { template, nodeId: node.id, kind: 'list' as const };
                sites.push(site);
                if (catalog.valueFrom) mapped(catalog.valueFrom, site);
            } else if (isTemplateField(node)) {
                visitField(template, node, 'field');
            }
        });
    }
    return {
        templates: [...new Set(sites.map(({ template }) => template))],
        sites,
        columns,
    };
}
