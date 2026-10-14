import { generateId } from '@site/src/shared/utils/random';
import { z } from 'zod';

import {
    type DocumentIndexEntry,
    DocumentIndexEntrySchema,
    type Folder,
    FolderSchema,
    sameEntry,
} from '../../store/documentIndex';

/**
 * The tree of folders and documents changes only through these operations (spec 032, D6). They are
 * plain JSON, applied by one pure function, described by one function, and undone by their own
 * inverse, so a person's drag and a future AI role's proposal run the same code.
 */

export const MAX_TREE_DEPTH = 32;
const MIN_RANK_GAP = 1e-6;

const id = z.string().min(1).max(128);
const folderName = z.string().trim().min(1).max(200);
const ids = z.array(id).min(1).max(10000);

export const TreeOperationSchema = z.discriminatedUnion('op', [
    z.object({
        op: z.literal('createFolder'),
        id: id.optional(),
        name: folderName,
        parentId: id.nullable(),
        before: id.nullable().optional(),
    }),
    /** A folder or a document; a document may be given an empty name (its kind's name shows). */
    z.object({ op: z.literal('rename'), id, name: z.string().trim().max(200) }),
    z.object({
        op: z.literal('move'),
        ids,
        parentId: id.nullable(),
        /** The sibling the moved rows go before; absent or unknown means last. */
        before: id.nullable().optional(),
    }),
    z.object({ op: z.literal('delete'), ids }),
    /** Puts records back as they were; the inverse of the other operations. */
    z.object({
        op: z.literal('restore'),
        entries: z.array(DocumentIndexEntrySchema),
        folders: z.array(FolderSchema),
    }),
]);

export type TreeOperation = z.infer<typeof TreeOperationSchema>;

/** The part of the index the operations read and change. */
export interface TreeState {
    entries: DocumentIndexEntry[];
    folders: Folder[];
}

export type TreeProblemCode =
    /** The id names nothing in the tree. */
    | 'missing'
    /** A folder cannot go into itself or one of its own folders. */
    | 'cycle'
    | 'depth'
    /** The target of a move or a new folder is not a folder. */
    | 'not-a-folder'
    /** A folder needs a name. */
    | 'name';

export interface TreeProblem {
    code: TreeProblemCode;
    id?: string;
}

export interface TreeResult {
    state: TreeState;
    /** Operations that undo this batch; empty when nothing changed. */
    inverse: TreeOperation[];
    problems: TreeProblem[];
    /** Ids no longer in the tree and ids that are new in it (for tombstones and counts). */
    removed: string[];
    added: string[];
}

/** The operations of an untrusted list (a model's reply, a stored file), or why it is refused. */
export function parseOperations(
    raw: unknown
): { ok: true; operations: TreeOperation[] } | { ok: false; error: string } {
    const parsed = z.array(TreeOperationSchema).safeParse(raw);
    return parsed.success
        ? { ok: true, operations: parsed.data }
        : { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid operations' };
}

const sameFolder = (a: Folder, b: Folder) =>
    a.id === b.id &&
    a.name === b.name &&
    a.parentId === b.parentId &&
    a.rank === b.rank &&
    a.createdAt === b.createdAt &&
    a.changedAt === b.changedAt;

const byRank = <T extends { rank: number }>(a: T, b: T) => a.rank - b.rank;

/** The folders inside a folder at any depth. */
export function descendantFolderIds(folders: readonly Folder[], rootId: string): Set<string> {
    const children = new Map<string, string[]>();
    for (const folder of folders) {
        if (folder.parentId === null) continue;
        const list = children.get(folder.parentId);
        if (list) list.push(folder.id);
        else children.set(folder.parentId, [folder.id]);
    }
    const found = new Set<string>();
    const queue = [rootId];
    while (queue.length > 0) {
        for (const child of children.get(queue.pop()!) ?? []) {
            if (found.has(child)) continue;
            found.add(child);
            queue.push(child);
        }
    }
    return found;
}

/** Everything a deletion removes: the folders named and inside them, and their documents. */
export function collectDeletion(
    state: TreeState,
    selected: readonly string[]
): { folderIds: string[]; documentIds: string[] } {
    const folderIds = new Set<string>();
    const wanted = new Set(selected);
    for (const folder of state.folders) {
        if (!wanted.has(folder.id)) continue;
        folderIds.add(folder.id);
        descendantFolderIds(state.folders, folder.id).forEach((child) => folderIds.add(child));
    }
    const documentIds = state.entries
        .filter(
            (entry) => wanted.has(entry.id) || (entry.parentId && folderIds.has(entry.parentId))
        )
        .map(({ id: entryId }) => entryId);
    return { folderIds: [...folderIds], documentIds };
}

/** Folders in a loop would be unreachable from the top; each loop is cut at one folder. */
export function repairFolders(
    folders: readonly Folder[],
    now: number
): { folders: Folder[]; repaired: number } {
    const byId = new Map(folders.map((folder) => [folder.id, folder]));
    const cut = new Set<string>();
    for (const folder of folders) {
        const seen = new Set<string>([folder.id]);
        let at = byId.get(folder.parentId ?? '');
        while (at) {
            if (seen.has(at.id)) {
                cut.add(folder.id);
                break;
            }
            seen.add(at.id);
            at = byId.get(at.parentId ?? '');
        }
    }
    if (cut.size === 0) return { folders: [...folders], repaired: 0 };
    return {
        folders: folders.map((folder) =>
            cut.has(folder.id) ? { ...folder, parentId: null, updatedAt: now } : folder
        ),
        repaired: cut.size,
    };
}

/** The working copy one batch changes; ids keep their insertion order. */
class Working {
    readonly folders: Map<string, Folder>;
    readonly entries: Map<string, DocumentIndexEntry>;
    readonly touched = new Set<string>();
    readonly problems: TreeProblem[] = [];

    readonly now: number;

    constructor(state: TreeState, now: number) {
        this.now = now;
        this.folders = new Map(state.folders.map((folder) => [folder.id, folder]));
        this.entries = new Map(state.entries.map((entry) => [entry.id, entry]));
    }

    get stamp() {
        return new Date(this.now).toISOString();
    }

    problem(code: TreeProblemCode, problemId?: string) {
        this.problems.push(problemId === undefined ? { code } : { code, id: problemId });
    }

    /** The place a parent id stands for: a folder that exists, else the top level. */
    placeOf(parentId: string | null): string | null {
        return parentId !== null && this.folders.has(parentId) ? parentId : null;
    }

    /** The folders ahead of a folder, itself included; 0 for the top level. */
    depthOf(folderId: string | null): number {
        let depth = 0;
        const seen = new Set<string>();
        let at = folderId === null ? undefined : this.folders.get(folderId);
        while (at && !seen.has(at.id)) {
            seen.add(at.id);
            depth += 1;
            at = at.parentId === null ? undefined : this.folders.get(at.parentId);
        }
        return depth;
    }

    /** The levels a folder and what it holds take (1 for a folder with no folder inside). */
    heightOf(folderId: string): number {
        const children = [...this.folders.values()].filter(
            (folder) => folder.parentId === folderId
        );
        return 1 + Math.max(0, ...children.map((child) => this.heightOf(child.id)));
    }

    siblings(place: string | null, kind: 'folder' | 'document', leaving: ReadonlySet<string>) {
        const list: Array<Folder | DocumentIndexEntry> =
            kind === 'folder'
                ? [...this.folders.values()].filter(
                      (folder) => this.placeOf(folder.parentId) === place
                  )
                : [...this.entries.values()].filter(
                      (entry) => this.placeOf(entry.parentId) === place
                  );
        return list.filter(({ id: siblingId }) => !leaving.has(siblingId)).sort(byRank);
    }

    setRank(kind: 'folder' | 'document', rankId: string, rank: number) {
        if (kind === 'folder') {
            const folder = this.folders.get(rankId);
            if (folder) this.folders.set(rankId, { ...folder, rank, updatedAt: this.now });
        } else {
            const entry = this.entries.get(rankId);
            if (entry) this.entries.set(rankId, { ...entry, rank, updatedAt: this.now });
        }
        this.touched.add(rankId);
    }

    /** The ranks for `count` rows that go before `before` among the siblings of one kind. */
    ranksFor(
        place: string | null,
        kind: 'folder' | 'document',
        leaving: ReadonlySet<string>,
        before: string | null | undefined,
        count: number
    ): number[] {
        let siblings = this.siblings(place, kind, leaving);
        let index = siblings.length;
        if (before) {
            const found = siblings.findIndex((sibling) => sibling.id === before);
            if (found >= 0) index = found;
            // Folders always list first, so a document dropped before a folder goes to the top of
            // the documents.
            else if (kind === 'document' && this.folders.has(before)) index = 0;
        }
        const spread = () => {
            const low = siblings[index - 1]?.rank;
            const high = siblings[index]?.rank;
            if (low === undefined && high === undefined) {
                return Array.from({ length: count }, (_, step) => step + 1);
            }
            if (high === undefined) {
                return Array.from({ length: count }, (_, step) => low! + step + 1);
            }
            if (low === undefined) {
                return Array.from({ length: count }, (_, step) => high - count + step);
            }
            const gap = (high - low) / (count + 1);
            return gap < MIN_RANK_GAP
                ? null
                : Array.from({ length: count }, (_, step) => low + gap * (step + 1));
        };
        let ranks = spread();
        if (!ranks) {
            siblings.forEach((sibling, position) => this.setRank(kind, sibling.id, position + 1));
            siblings = this.siblings(place, kind, leaving);
            ranks = spread() ?? Array.from({ length: count }, (_, step) => step + 1);
        }
        return ranks;
    }

    createFolder(op: Extract<TreeOperation, { op: 'createFolder' }>) {
        const name = op.name.trim().slice(0, 200);
        if (!name) return this.problem('name');
        if (op.parentId !== null) {
            if (this.entries.has(op.parentId)) return this.problem('not-a-folder', op.parentId);
            if (!this.folders.has(op.parentId)) return this.problem('missing', op.parentId);
        }
        if (this.depthOf(op.parentId) + 1 > MAX_TREE_DEPTH) return this.problem('depth');
        const folderId = op.id ?? generateId();
        if (this.folders.has(folderId) || this.entries.has(folderId)) return;
        const [rank] = this.ranksFor(op.parentId, 'folder', new Set(), op.before, 1);
        this.folders.set(folderId, {
            id: folderId,
            name,
            parentId: op.parentId,
            rank: rank!,
            createdAt: this.stamp,
            changedAt: this.stamp,
            updatedAt: this.now,
        });
        this.touched.add(folderId);
    }

    rename(op: Extract<TreeOperation, { op: 'rename' }>) {
        const name = op.name.trim().slice(0, 200);
        const folder = this.folders.get(op.id);
        if (folder) {
            if (!name) return this.problem('name', op.id);
            if (folder.name === name) return;
            this.folders.set(op.id, {
                ...folder,
                name,
                changedAt: this.stamp,
                updatedAt: this.now,
            });
            this.touched.add(op.id);
            return;
        }
        const entry = this.entries.get(op.id);
        if (!entry) return this.problem('missing', op.id);
        if (entry.name === name) return;
        this.entries.set(op.id, { ...entry, name, updatedAt: this.now });
        this.touched.add(op.id);
    }

    move(op: Extract<TreeOperation, { op: 'move' }>) {
        if (op.parentId !== null) {
            if (this.entries.has(op.parentId)) return this.problem('not-a-folder', op.parentId);
            if (!this.folders.has(op.parentId)) return this.problem('missing', op.parentId);
        }
        const wanted = [...new Set(op.ids)];
        const known = wanted.filter((moved) => {
            const exists = this.folders.has(moved) || this.entries.has(moved);
            if (!exists) this.problem('missing', moved);
            return exists;
        });
        // A folder that moves takes what it holds, so rows inside it do not move on their own.
        const inside = new Set(
            known.flatMap((moved) =>
                this.folders.has(moved)
                    ? [...descendantFolderIds([...this.folders.values()], moved)]
                    : []
            )
        );
        const movable = known.filter((moved) => {
            const parent = (this.folders.get(moved) ?? this.entries.get(moved))!.parentId;
            return !(parent !== null && (inside.has(parent) || known.includes(parent)));
        });
        const valid = movable.filter((moved) => {
            if (!this.folders.has(moved)) return true;
            const loop =
                op.parentId === moved ||
                (op.parentId !== null &&
                    descendantFolderIds([...this.folders.values()], moved).has(op.parentId));
            if (loop) {
                this.problem('cycle', moved);
                return false;
            }
            if (this.depthOf(op.parentId) + this.heightOf(moved) > MAX_TREE_DEPTH) {
                this.problem('depth', moved);
                return false;
            }
            return true;
        });
        const leaving = new Set(valid);
        for (const kind of ['folder', 'document'] as const) {
            const group = valid.filter((moved) =>
                kind === 'folder' ? this.folders.has(moved) : this.entries.has(moved)
            );
            if (group.length === 0) continue;
            const ranks = this.ranksFor(op.parentId, kind, leaving, op.before, group.length);
            group.forEach((moved, position) => {
                if (kind === 'folder') {
                    const folder = this.folders.get(moved)!;
                    this.folders.set(moved, {
                        ...folder,
                        parentId: op.parentId,
                        rank: ranks[position]!,
                        changedAt: this.stamp,
                        updatedAt: this.now,
                    });
                } else {
                    const entry = this.entries.get(moved)!;
                    this.entries.set(moved, {
                        ...entry,
                        parentId: op.parentId,
                        rank: ranks[position]!,
                        updatedAt: this.now,
                    });
                }
                this.touched.add(moved);
            });
        }
    }

    delete(op: Extract<TreeOperation, { op: 'delete' }>) {
        for (const missing of op.ids) {
            if (!this.folders.has(missing) && !this.entries.has(missing)) {
                this.problem('missing', missing);
            }
        }
        const { folderIds, documentIds } = collectDeletion(
            { entries: [...this.entries.values()], folders: [...this.folders.values()] },
            op.ids
        );
        folderIds.forEach((gone) => {
            this.folders.delete(gone);
            this.touched.add(gone);
        });
        documentIds.forEach((gone) => {
            this.entries.delete(gone);
            this.touched.add(gone);
        });
    }

    /**
     * A row that is gone comes back whole; one still here gets back only its place (and a folder's
     * changed time), so undoing a move never undoes a rename made since.
     */
    restore(op: Extract<TreeOperation, { op: 'restore' }>) {
        for (const folder of op.folders) {
            const here = this.folders.get(folder.id);
            this.folders.set(
                folder.id,
                here
                    ? {
                          ...here,
                          parentId: folder.parentId,
                          rank: folder.rank,
                          changedAt: folder.changedAt,
                          updatedAt: this.now,
                      }
                    : { ...folder, updatedAt: this.now }
            );
            this.touched.add(folder.id);
        }
        for (const entry of op.entries) {
            const here = this.entries.get(entry.id);
            this.entries.set(
                entry.id,
                here
                    ? { ...here, parentId: entry.parentId, rank: entry.rank, updatedAt: this.now }
                    : { ...entry, updatedAt: this.now }
            );
            this.touched.add(entry.id);
        }
    }
}

/**
 * Applies a batch to a state without changing it. An operation with a problem changes nothing for
 * the rows it names; the rest of the batch still applies. The inverse is built from what really
 * changed, so applying it returns the original tree (bar the merge stamps).
 */
export function applyOperations(
    state: TreeState,
    operations: readonly TreeOperation[],
    now: number = Date.now()
): TreeResult {
    const work = new Working(state, now);
    for (const operation of operations) {
        switch (operation.op) {
            case 'createFolder':
                work.createFolder(operation);
                break;
            case 'rename':
                work.rename(operation);
                break;
            case 'move':
                work.move(operation);
                break;
            case 'delete':
                work.delete(operation);
                break;
            case 'restore':
                work.restore(operation);
                break;
        }
    }

    const originalFolders = new Map(state.folders.map((folder) => [folder.id, folder]));
    const originalEntries = new Map(state.entries.map((entry) => [entry.id, entry]));
    const undoFolders: Folder[] = [];
    const undoEntries: DocumentIndexEntry[] = [];
    const undoRenames: TreeOperation[] = [];
    const added: string[] = [];
    const removed: string[] = [];
    for (const touched of work.touched) {
        const folder = work.folders.get(touched);
        const entry = work.entries.get(touched);
        const wasFolder = originalFolders.get(touched);
        const wasEntry = originalEntries.get(touched);
        if (folder) {
            if (wasFolder && sameFolder(wasFolder, folder)) work.folders.set(touched, wasFolder);
            else if (wasFolder) {
                undoFolders.push(wasFolder);
                if (wasFolder.name !== folder.name) {
                    undoRenames.push({ op: 'rename', id: touched, name: wasFolder.name });
                }
            } else added.push(touched);
        } else if (wasFolder) {
            undoFolders.push(wasFolder);
            removed.push(touched);
        }
        if (entry) {
            if (wasEntry && sameEntry(wasEntry, entry)) work.entries.set(touched, wasEntry);
            else if (wasEntry) {
                undoEntries.push(wasEntry);
                if (wasEntry.name !== entry.name) {
                    undoRenames.push({ op: 'rename', id: touched, name: wasEntry.name });
                }
            } else added.push(touched);
        } else if (wasEntry) {
            undoEntries.push(wasEntry);
            removed.push(touched);
        }
    }
    const inverse: TreeOperation[] = [...undoRenames];
    if (undoFolders.length > 0 || undoEntries.length > 0) {
        inverse.push({ op: 'restore', entries: undoEntries, folders: undoFolders });
    }
    if (added.length > 0) inverse.push({ op: 'delete', ids: added });
    return {
        state: {
            entries: [...work.entries.values()],
            folders: [...work.folders.values()],
        },
        inverse,
        problems: work.problems,
        removed,
        added,
    };
}

const nameOf = (state: TreeState, rowId: string | null): string => {
    if (rowId === null) return 'the top level';
    const folder = state.folders.find((candidate) => candidate.id === rowId);
    if (folder) return `"${folder.name}"`;
    const entry = state.entries.find((candidate) => candidate.id === rowId);
    return `"${entry?.name || rowId}"`;
};

const count = (amount: number, noun: string) => `${amount} ${noun}${amount === 1 ? '' : 's'}`;

/** One line saying what an operation will do, for a preview before it is applied (FR-010). */
export function describeOperation(operation: TreeOperation, state: TreeState): string {
    switch (operation.op) {
        case 'createFolder':
            return `Create the folder "${operation.name}" in ${nameOf(state, operation.parentId)}`;
        case 'rename':
            return `Rename ${nameOf(state, operation.id)} to "${operation.name}"`;
        case 'move': {
            const names = operation.ids.slice(0, 3).map((moved) => nameOf(state, moved));
            const more = operation.ids.length > 3 ? ` and ${operation.ids.length - 3} more` : '';
            return `Move ${names.join(', ')}${more} into ${nameOf(state, operation.parentId)}`;
        }
        case 'delete': {
            const { folderIds, documentIds } = collectDeletion(state, operation.ids);
            const parts = [
                ...(folderIds.length > 0 ? [count(folderIds.length, 'folder')] : []),
                ...(documentIds.length > 0 ? [count(documentIds.length, 'document')] : []),
            ];
            return `Delete ${parts.join(' and ') || 'nothing'}`;
        }
        case 'restore':
            return `Restore ${count(operation.entries.length, 'document')} and ${count(operation.folders.length, 'folder')}`;
    }
}
