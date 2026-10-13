import { listDocumentBindings } from '../../../systems/templateBindings';
import { isTemplateField, walkTemplateNodes } from '../../../types/template';
import { currentValueSource } from '../elements/sources';
import type { EditorDraft } from '../model/types';

export type DraftNotice = 'noName';

/**
 * Hints that do not block a save. A page that stores no field of the document's name leaves the
 * document list and its dice rolls without one: only fields set to store the game's name write it.
 */
export function collectDraftNotices(draft: EditorDraft): DraftNotice[] {
    const bindings = listDocumentBindings(draft.systemId, draft.documentKind);
    const names = bindings.filter((binding) => binding.kind === 'field' && binding.syncsTitle);
    if (names.length === 0) return [];

    let stored = false;
    walkTemplateNodes(draft.children, (node) => {
        if (stored || (!isTemplateField(node) && node.type !== 'primitive')) return;
        stored = names.some(({ key }) => key === currentValueSource(node, bindings));
    });
    return stored ? [] : ['noName'];
}
