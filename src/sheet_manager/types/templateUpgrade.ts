import type { CustomTemplate } from './template';

/**
 * Templates of schema 3 and older read as schema 4 (spec 041, design D4). Schema 4 gives every page
 * a kind: a brief is built from brief blocks and draws its fields compact; a full page is built
 * from sections and cards and draws its fields full size. The per-field `compact` and `shortForm`
 * flags and the groups' `layout` go; the page kind decides the look instead.
 *
 * Runs on raw JSON before the schema parses it, so it imports only types from `template.ts`.
 */

/** Template file/schema generation authored by this build (contracts/template-node-model.md). */
export const TEMPLATE_SCHEMA_VERSION = 4;

/** The kind of the shipped page with this id, or `undefined` for a user's own page. */
export type ShippedKindLookup = (
    systemId: string,
    templateId: string
) => 'brief' | 'full' | undefined;

export interface UpgradeSummary {
    kind: 'brief' | 'full';
    /** Cards and section parts made into brief blocks (brief-look cards are not counted). */
    blocks: number;
    /** Containers inside a block whose fields moved up into it. */
    flattened: number;
    /** Brief-look cards of a full page made into ordinary cards. */
    cards: number;
    /** Fields of a full page that lost their compact look. */
    lookDropped: number;
    /** More changed than a shipped-style brief's cards becoming blocks: tell the author. */
    notable: boolean;
}

type Raw = Record<string, unknown>;

/**
 * The pages shipped with schema 3, by id: an edited shipped page keeps its page's kind. The list is
 * frozen — pages added later are born schema 4 — and stores hydrate before the systems load, so the
 * upgrade cannot ask the registry.
 */
const SCHEMA_3_SHIPPED: Readonly<Record<string, readonly string[]>> = {
    'star-wars-wod': ['brief', 'droid-brief', 'creature-brief', 'vehicle-brief', 'fodder-brief'],
    'wod-2e': ['wod2e-brief'],
    'wod-v5': [
        'v5-hunter-brief',
        'v5-vampire-brief',
        'v5-core-brief',
        'v5-storyteller-brief',
        'v5-group-brief',
    ],
};

const SCHEMA_3_FULL: Readonly<Record<string, readonly string[]>> = {
    'star-wars-wod': [
        'full-sheet',
        'droid-sheet',
        'creature-sheet',
        'vehicle-sheet',
        'fodder-sheet',
    ],
    'wod-2e': ['wod2e-sheet'],
    'wod-v5': [
        'v5-hunter-sheet',
        'v5-vampire-sheet',
        'v5-core-sheet',
        'v5-storyteller-sheet',
        'v5-group-sheet',
    ],
};

const schema3Shipped: ShippedKindLookup = (systemId, templateId) =>
    SCHEMA_3_SHIPPED[systemId]?.includes(templateId)
        ? 'brief'
        : SCHEMA_3_FULL[systemId]?.includes(templateId)
          ? 'full'
          : undefined;

export function needsUpgrade(raw: unknown): raw is Raw {
    if (typeof raw !== 'object' || raw === null) return false;
    const version = (raw as Raw).schemaVersion;
    return typeof version === 'number' && version < TEMPLATE_SCHEMA_VERSION;
}

const isRecord = (value: unknown): value is Raw => typeof value === 'object' && value !== null;
const childrenOf = (node: Raw): unknown[] =>
    Array.isArray(node.children) ? (node.children as unknown[]) : [];
const isContainer = (node: Raw) => node.type === 'section' || node.type === 'group';
const isAreaGroup = (node: Raw) => node.type === 'group' && node.layout === 'area';

/** Ratings and pools: what draws a short label on a brief. */
function isRatingLike(node: Raw): boolean {
    if (node.type === 'rating') return true;
    return (
        node.type === 'primitive' &&
        typeof node.bindingKey === 'string' &&
        /^(trait|resource):/.test(node.bindingKey) &&
        node.poolTracker === undefined
    );
}

/** Drops the per-field look flags of a leaf (and of a table's columns and a list's entry). */
function dropLook(node: Raw, brief: boolean, counts: { lookDropped: number }): Raw {
    const { compact, shortForm, ...rest } = node;
    if (!brief && compact === true) counts.lookDropped += 1;
    const next: Raw = rest;
    if (brief && isRatingLike(node) && shortForm !== true) next.fullLabel = true;
    if (Array.isArray(node.columns) && node.type === 'table') {
        next.columns = (node.columns as unknown[]).map((column) =>
            isRecord(column) ? dropLook(column, false, { lookDropped: 0 }) : column
        );
    }
    if (isRecord(node.item)) next.item = dropLook(node.item, false, { lookDropped: 0 });
    return next;
}

function allIds(nodes: unknown[], into: Set<string>): Set<string> {
    for (const node of nodes) {
        if (!isRecord(node)) continue;
        if (typeof node.id === 'string') into.add(node.id);
        allIds(childrenOf(node), into);
    }
    return into;
}

const CONTAINER_KEYS = [
    'id',
    'title',
    'labelMessage',
    'column',
    'span',
    'visibleWhen',
    'hideTitle',
    'docsPath',
    'defaultCollapsed',
    'columns',
    'columnWidths',
] as const;

function blockFrom(container: Raw, children: Raw[]): Raw {
    const block: Raw = { type: 'brief' };
    for (const key of CONTAINER_KEYS) {
        if (container[key] !== undefined) block[key] = container[key];
    }
    block.collapsible = container.collapsible === true;
    block.children = children;
    return block;
}

interface BriefCounts {
    blocks: number;
    flattened: number;
    lookDropped: number;
}

/** The leaves of a block: nested containers give up their fields in reading order. */
function blockLeaves(nodes: unknown[], counts: BriefCounts): Raw[] {
    return nodes.filter(isRecord).flatMap((node) => {
        if (!isContainer(node)) return [dropLook(node, true, counts)];
        counts.flattened += 1;
        return blockLeaves(childrenOf(node), counts);
    });
}

function toBrief(children: unknown[], counts: BriefCounts): unknown[] {
    const taken = allIds(children, new Set());
    const freshId = (base: string) => {
        let index = 2;
        while (taken.has(`${base}-${index}`)) index += 1;
        const id = `${base}-${index}`;
        taken.add(id);
        return id;
    };
    return children.flatMap((node) => {
        if (!isRecord(node)) return [node];
        if (node.type === 'group') {
            if (!isAreaGroup(node)) counts.blocks += 1;
            return [blockFrom(node, blockLeaves(childrenOf(node), counts))];
        }
        if (node.type !== 'section') return [dropLook(node, true, counts)];
        // A section: each card a block, each run of loose fields a block named after it.
        const blocks: Raw[] = [];
        let run: Raw[] = [];
        let usedOwnId = false;
        const closeRun = () => {
            if (run.length === 0) return;
            const id = usedOwnId ? freshId(String(node.id)) : String(node.id);
            usedOwnId = true;
            blocks.push(blockFrom({ ...node, id, collapsible: false }, run));
            counts.blocks += 1;
            run = [];
        };
        for (const child of childrenOf(node).filter(isRecord)) {
            if (isContainer(child)) {
                closeRun();
                counts.blocks += 1;
                blocks.push(blockFrom(child, blockLeaves(childrenOf(child), counts)));
            } else {
                run.push(dropLook(child, true, counts));
            }
        }
        closeRun();
        return blocks;
    });
}

function toFull(nodes: unknown[], counts: { cards: number; lookDropped: number }): unknown[] {
    return nodes.map((node) => {
        if (!isRecord(node)) return node;
        if (!isContainer(node)) return dropLook(node, false, counts);
        const { layout, ...rest } = node;
        if (layout === 'area') counts.cards += 1;
        return { ...rest, children: toFull(childrenOf(node), counts) };
    });
}

/** The kind a page saved before schema 4 takes (design D4). */
function kindOf(raw: Raw, lookup: ShippedKindLookup): 'brief' | 'full' {
    const shipped =
        typeof raw.systemId === 'string' && typeof raw.id === 'string'
            ? lookup(raw.systemId, raw.id)
            : undefined;
    if (shipped) return shipped;
    const containers = childrenOf(raw).filter(isRecord).filter(isContainer);
    return containers.length > 0 && containers.every(isAreaGroup) ? 'brief' : 'full';
}

const UNCHANGED: Omit<UpgradeSummary, 'kind'> = {
    blocks: 0,
    flattened: 0,
    cards: 0,
    lookDropped: 0,
    notable: false,
};

/** Upgrades one raw template to schema 4 and says what changed; a current one is returned as is. */
export function upgradeTemplate(
    raw: unknown,
    lookup: ShippedKindLookup = schema3Shipped
): { template: CustomTemplate; summary: UpgradeSummary } {
    if (!needsUpgrade(raw)) {
        const kind = isRecord(raw) && raw.pageKind === 'brief' ? 'brief' : 'full';
        return { template: raw as CustomTemplate, summary: { kind, ...UNCHANGED } };
    }
    const kind = kindOf(raw, lookup);
    const { pageKind: _pageKind, ...rest } = raw;
    void _pageKind;
    if (kind === 'brief') {
        const counts: BriefCounts = { blocks: 0, flattened: 0, lookDropped: 0 };
        const children = toBrief(childrenOf(raw), counts);
        return {
            template: {
                ...rest,
                pageKind: 'brief',
                schemaVersion: TEMPLATE_SCHEMA_VERSION,
                children,
            } as unknown as CustomTemplate,
            summary: {
                kind,
                blocks: counts.blocks,
                flattened: counts.flattened,
                cards: 0,
                lookDropped: 0,
                notable: counts.blocks > 0 || counts.flattened > 0,
            },
        };
    }
    const counts = { cards: 0, lookDropped: 0 };
    const children = toFull(childrenOf(raw), counts);
    return {
        template: {
            ...rest,
            schemaVersion: TEMPLATE_SCHEMA_VERSION,
            children,
        } as unknown as CustomTemplate,
        summary: {
            kind,
            blocks: 0,
            flattened: 0,
            cards: counts.cards,
            lookDropped: counts.lookDropped,
            notable: counts.cards > 0 || counts.lookDropped > 0,
        },
    };
}
