/**
 * Markup edits of the markdown editor (spec 043, FR-006a): each takes the text and a selection and
 * returns the replaced range and the selection to show afterwards, so the control can apply it
 * through the browser's undoable insert.
 */
export interface MarkdownEdit {
    /** The range of the old text that is replaced. */
    from: number;
    to: number;
    insert: string;
    /** The selection after the edit, in the new text. */
    selectFrom: number;
    selectTo: number;
}

export interface Selection {
    start: number;
    end: number;
}

/** Wraps the selection in a marker (`**`, `*`), or inserts a placeholder word between markers. */
export function wrapSelection(
    text: string,
    { start, end }: Selection,
    marker: string,
    placeholder: string
): MarkdownEdit {
    const inner = text.slice(start, end) || placeholder;
    return {
        from: start,
        to: end,
        insert: `${marker}${inner}${marker}`,
        selectFrom: start + marker.length,
        selectTo: start + marker.length + inner.length,
    };
}

/** A link around the selection with the address selected, ready to type over. */
export function linkSelection(
    text: string,
    { start, end }: Selection,
    placeholder: string
): MarkdownEdit {
    const label = text.slice(start, end) || placeholder;
    const address = 'https://';
    const insert = `[${label}](${address})`;
    const addressAt = start + label.length + 3;
    return {
        from: start,
        to: end,
        insert,
        selectFrom: addressAt,
        selectTo: addressAt + address.length,
    };
}

/** The start and end of the whole lines a selection touches. */
function lineRange(text: string, { start, end }: Selection): { from: number; to: number } {
    const from = text.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = text.indexOf('\n', end);
    return { from, to: lineEnd === -1 ? text.length : lineEnd };
}

const CHECKLIST_ITEM = /^(\s*)- \[[ xX]\] /;
const LIST_MARKER = /^(\s*)[-*+] /;

/**
 * Turns the selected lines into checklist items, or back into plain lines when every one already
 * is one (Obsidian's "toggle checkbox").
 */
export function toggleChecklist(text: string, selection: Selection): MarkdownEdit {
    const { from, to } = lineRange(text, selection);
    const lines = text.slice(from, to).split('\n');
    const allChecklist = lines.every((line) => CHECKLIST_ITEM.test(line));
    const next = lines.map((line) => {
        if (allChecklist) return line.replace(CHECKLIST_ITEM, '$1');
        if (CHECKLIST_ITEM.test(line)) return line;
        if (LIST_MARKER.test(line)) return line.replace(LIST_MARKER, '$1- [ ] ');
        return `- [ ] ${line}`;
    });
    const insert = next.join('\n');
    return { from, to, insert, selectFrom: from + insert.length, selectTo: from + insert.length };
}

/**
 * Puts the selected lines in a callout (`> [!note] Title`); `folded` adds `-` so it starts folded.
 * The title is selected afterwards.
 */
export function insertCallout(
    text: string,
    selection: Selection,
    title: string,
    folded: boolean
): MarkdownEdit {
    const { from, to } = lineRange(text, selection);
    const selected = text.slice(from, to);
    const head = `> [!note]${folded ? '-' : ''} `;
    const body =
        selected === ''
            ? '> '
            : selected
                  .split('\n')
                  .map((line) => `> ${line}`)
                  .join('\n');
    const insert = `${head}${title}\n${body}`;
    return {
        from,
        to,
        insert,
        selectFrom: from + head.length,
        selectTo: from + head.length + title.length,
    };
}

/** The text after an edit (the fallback when the browser's undoable insert is unavailable). */
export function applyEdit(text: string, edit: MarkdownEdit): string {
    return `${text.slice(0, edit.from)}${edit.insert}${text.slice(edit.to)}`;
}
