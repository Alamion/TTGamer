import { isTemplateCompatible } from '../../../systems/view';
import {
    type CustomTemplate,
    fieldValueKey,
    type TrackerColumn,
    walkTemplateNodes,
} from '../../../types/template';
import { type TrackerValue, TrackerValueSchema } from '../../../types/templateValues';

/** What saving a tracker's new settings stops showing (spec 018, FR-026). */
export interface TrackerChange {
    nodeId: string;
    title: string;
    /** Documents with at least one affected value. */
    documents: number;
    lostMarks: number;
    lostTexts: number;
    lostCopies: number;
}

interface StoredDocument {
    systemId: string;
    kind: string;
    templateValues?: Readonly<Record<string, unknown>>;
}

/** The parts of a tracker that decide which stored values show. */
interface TrackerShape {
    key: string;
    title: string;
    columns: readonly TrackerColumn[];
    /** Own trackers only: built-in levels and marks are the game's and never change here. */
    levelIds?: ReadonlySet<string>;
    markIds?: ReadonlySet<string>;
    /** Built-in member tracks: extra-column copies follow the members, not a column maximum. */
    membersCopies?: boolean;
}

function trackerShapes(template: CustomTemplate): Map<string, TrackerShape> {
    const shapes = new Map<string, TrackerShape>();
    walkTemplateNodes(template.children, (node) => {
        if (node.type === 'tracker') {
            shapes.set(node.id, {
                key: fieldValueKey(node),
                title: node.label,
                columns: node.columns,
                levelIds: new Set(node.levels.map(({ id }) => id)),
                markIds: new Set(node.marks.map(({ id }) => id)),
            });
        } else if (node.type === 'primitive' && node.tracker?.columns) {
            shapes.set(node.id, {
                key: node.tracker.valueKey ?? node.id,
                title: node.label ?? node.id,
                columns: node.tracker.columns,
                membersCopies: node.bindingKey.startsWith('track:members-'),
            });
        }
    });
    return shapes;
}

interface Shown {
    marks: number;
    texts: number;
    copies: number;
}

/** Stored marks, notes, and copies holding values that a tracker shape shows. */
function shownValues(shape: TrackerShape, value: TrackerValue): Shown {
    const shown: Shown = { marks: 0, texts: 0, copies: 0 };
    for (const column of shape.columns) {
        const copies = value.columns[column.id] ?? [];
        const limit = shape.membersCopies ? copies.length : (column.copies?.max ?? 1);
        copies.slice(0, limit).forEach((copy) => {
            let held = 0;
            if (column.kind === 'marks') {
                for (const [levelId, markId] of Object.entries(copy.marks ?? {})) {
                    if (shape.levelIds && !shape.levelIds.has(levelId)) continue;
                    if (shape.markIds && !shape.markIds.has(markId)) continue;
                    shown.marks += 1;
                    held += 1;
                }
            } else {
                for (const levelId of Object.keys(copy.texts ?? {})) {
                    if (shape.levelIds && !shape.levelIds.has(levelId)) continue;
                    shown.texts += 1;
                    held += 1;
                }
            }
            if (held > 0) shown.copies += 1;
        });
    }
    return shown;
}

/**
 * Per tracker present in both versions: how many stored marks, notes, and copies with values the
 * saved version would stop showing in the documents it can render. Reordering drops nothing
 * (values are keyed by id). Nothing is deleted; the report is what the author confirms.
 */
export function trackerChangeReport(
    before: CustomTemplate | undefined,
    after: CustomTemplate,
    documents: readonly StoredDocument[]
): TrackerChange[] {
    if (!before) return [];
    const previous = trackerShapes(before);
    const changes: TrackerChange[] = [];
    for (const [nodeId, shape] of trackerShapes(after)) {
        const old = previous.get(nodeId);
        if (!old || old.key !== shape.key) continue;
        let affected = 0;
        const lost: Shown = { marks: 0, texts: 0, copies: 0 };
        for (const document of documents) {
            if (!isTemplateCompatible(after, document)) continue;
            const parsed = TrackerValueSchema.safeParse(document.templateValues?.[shape.key]);
            if (!parsed.success) continue;
            const was = shownValues(old, parsed.data);
            const now = shownValues(shape, parsed.data);
            const marks = Math.max(0, was.marks - now.marks);
            const texts = Math.max(0, was.texts - now.texts);
            const copies = Math.max(0, was.copies - now.copies);
            if (marks + texts + copies === 0) continue;
            affected += 1;
            lost.marks += marks;
            lost.texts += texts;
            lost.copies += copies;
        }
        if (affected > 0) {
            changes.push({
                nodeId,
                title: shape.title,
                documents: affected,
                lostMarks: lost.marks,
                lostTexts: lost.texts,
                lostCopies: lost.copies,
            });
        }
    }
    return changes;
}
