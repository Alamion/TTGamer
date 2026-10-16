import { z } from 'zod';

import {
    EMPTY_LAYOUT,
    type FloatingTab,
    groupsInOrder,
    type LayoutNode,
    type LayoutState,
    makeGroup,
    newGroupId,
    normalize,
} from './layoutTree';
import { docKey, documentIdOf, parseTabKey, type TabKey } from './tabKeys';

/** The most open documents, groups, and floating windows (spec 036, FR-012). */
export const MAX_DOCUMENTS = 12;
export const MAX_GROUPS = 6;
export const MAX_FLOATING = 4;

/** What the device keeps of the layout (the key says the version). */
export const PANES_STORAGE_KEY = 'ttgamer:panes:v2';
/** The spec 034 arrangement, read once to move it into the layout. */
export const PANES_V1_STORAGE_KEY = 'ttgamer:panes:v1';

/** Bounds on stored lists, before the limits above are applied. */
const MAX_STORED = 64;

const StoredArrangementSchema = z.object({
    ids: z.array(z.string()),
    recent: z.array(z.string()),
    weights: z.record(z.string(), z.number()),
    views: z.record(z.string(), z.string()),
    maximized: z.string().nullable(),
});

export type StoredArrangement = z.infer<typeof StoredArrangementSchema>;

/**
 * A stored spec 034 arrangement made safe to use: no duplicates, at most six panes, only entries of
 * panes that exist, only usable weights. `null` when the value is not an arrangement at all.
 */
export function readArrangement(raw: unknown): StoredArrangement | null {
    const parsed = StoredArrangementSchema.safeParse(raw);
    if (!parsed.success) return null;
    const stored = parsed.data;
    const ids = [...new Set(stored.ids)].slice(0, MAX_GROUPS);
    const own = <T>(record: Record<string, T>, keep: (value: T) => boolean) =>
        Object.fromEntries(
            Object.entries(record).filter(([id, value]) => ids.includes(id) && keep(value))
        );
    return {
        ids,
        recent: [...new Set(stored.recent)].filter((id) => ids.includes(id)),
        weights: own(stored.weights, (weight) => Number.isFinite(weight) && weight > 0),
        views: own(stored.views, (view) => view.length > 0),
        maximized:
            stored.maximized !== null && ids.includes(stored.maximized) ? stored.maximized : null,
    };
}

/** A spec 034 arrangement as a layout: one row of one-tab groups, in pane order (FR-015). */
export function layoutFromArrangement(arrangement: StoredArrangement): LayoutState {
    const groups = arrangement.ids.map((id) => makeGroup([docKey(id)]));
    const root: LayoutNode | null =
        groups.length === 0
            ? null
            : groups.length === 1
              ? groups[0]!
              : {
                    type: 'split',
                    direction: 'row',
                    children: groups,
                    weights: arrangement.ids.map((id) => arrangement.weights[id] ?? 1),
                };
    const maximized =
        arrangement.maximized === null
            ? null
            : (groups[arrangement.ids.indexOf(arrangement.maximized)]?.id ?? null);
    return {
        ...EMPTY_LAYOUT,
        root,
        recent: arrangement.recent.map(docKey),
        views: arrangement.views,
        maximized,
    };
}

const RectSchema = z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
});

interface RawGroup {
    type: 'group';
    id: string;
    tabs: string[];
    shown: string;
    collapsed?: boolean;
}
interface RawSplit {
    type: 'split';
    direction: 'row' | 'column';
    children: RawNode[];
    weights: number[];
}
type RawNode = RawGroup | RawSplit;

const NodeSchema: z.ZodType<RawNode> = z.lazy(() =>
    z.union([
        z.object({
            type: z.literal('group'),
            id: z.string().min(1).max(MAX_STORED),
            tabs: z.array(z.string()).max(MAX_STORED),
            shown: z.string(),
            collapsed: z.boolean().optional(),
        }),
        z.object({
            type: z.literal('split'),
            direction: z.enum(['row', 'column']),
            children: z.array(NodeSchema).max(MAX_STORED),
            weights: z.array(z.number()).max(MAX_STORED),
        }),
    ])
);

const StoredLayoutSchema = z.object({
    root: NodeSchema.nullable(),
    recent: z.array(z.string()).max(MAX_STORED),
    views: z.record(z.string(), z.string()),
    maximized: z.string().nullable(),
    floating: z.array(z.object({ key: z.string(), rect: RectSchema })).max(MAX_STORED),
    lastRect: z.record(z.string(), RectSchema),
    lastSide: z.record(z.string(), z.enum(['left', 'right'])),
});

const finiteRect = (rect: z.infer<typeof RectSchema>) =>
    [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) &&
    rect.width > 0 &&
    rect.height > 0;

/**
 * A stored layout made safe to use (spec 036, FR-015): unknown and repeated tabs, documents past
 * twelve, groups past six, and floating windows past four go (in reading order), and the tree is
 * put in its normal form. `dropped` names what went, for the diagnostics. `null` when the value is
 * not a layout at all.
 */
export function readLayout(raw: unknown): { layout: LayoutState; dropped: string[] } | null {
    const parsed = StoredLayoutSchema.safeParse(raw);
    if (!parsed.success) return null;
    const stored = parsed.data;
    const dropped: string[] = [];
    const seen = new Set<TabKey>();
    const groupIds = new Set<string>();
    let documents = 0;
    let groups = 0;
    const admit = (key: string) => {
        if (parseTabKey(key) === null || seen.has(key)) {
            dropped.push(seen.has(key) ? `repeated tab ${key}` : `unknown tab ${key}`);
            return false;
        }
        if (documentIdOf(key) !== null && documents >= MAX_DOCUMENTS) {
            dropped.push(`document past ${MAX_DOCUMENTS}: ${key}`);
            return false;
        }
        seen.add(key);
        if (documentIdOf(key) !== null) documents += 1;
        return true;
    };
    const clean = (node: RawNode): LayoutNode => {
        if (node.type === 'split') {
            return { ...node, children: node.children.map(clean), weights: node.weights };
        }
        if (groups >= MAX_GROUPS) {
            if (node.tabs.length > 0) dropped.push(`group past ${MAX_GROUPS}: ${node.id}`);
            return { ...node, tabs: [] };
        }
        const tabs = node.tabs.filter(admit);
        if (tabs.length > 0) groups += 1;
        const id = groupIds.has(node.id) ? newGroupId() : node.id;
        groupIds.add(id);
        return {
            type: 'group',
            id,
            tabs,
            shown: node.shown,
            ...(node.collapsed ? { collapsed: true } : {}),
        };
    };
    const root = stored.root ? normalize(clean(stored.root)) : null;
    const floating: FloatingTab[] = [];
    for (const entry of stored.floating) {
        if (floating.length >= MAX_FLOATING) {
            dropped.push(`floating window past ${MAX_FLOATING}: ${entry.key}`);
        } else if (!finiteRect(entry.rect)) {
            dropped.push(`floating window without a place: ${entry.key}`);
        } else if (admit(entry.key)) {
            floating.push({ key: entry.key, rect: entry.rect });
        }
    }
    const open = new Set(seen);
    const groupList = groupsInOrder(root);
    const toolEntries = <T>(record: Record<string, T>, keep: (value: T) => boolean) =>
        Object.fromEntries(
            Object.entries(record).filter(
                ([key, value]) => parseTabKey(key)?.kind === 'tool' && keep(value)
            )
        );
    return {
        layout: {
            root,
            recent: [...new Set(stored.recent)].filter((key) => open.has(key)),
            views: Object.fromEntries(
                Object.entries(stored.views).filter(
                    ([id, view]) => open.has(docKey(id)) && view.length > 0
                )
            ),
            maximized:
                stored.maximized !== null &&
                groupList.length > 1 &&
                groupList.some((group) => group.id === stored.maximized)
                    ? stored.maximized
                    : null,
            floating,
            lastRect: toolEntries(stored.lastRect, finiteRect),
            lastSide: toolEntries(stored.lastSide, () => true),
        },
        dropped,
    };
}
