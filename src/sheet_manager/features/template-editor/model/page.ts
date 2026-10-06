import { SystemIdSchema } from '../../../types/document';
import { type EditorDraft } from './types';

export function describeDraft(draft: EditorDraft, description: string): EditorDraft {
    return { ...draft, description: description.length > 0 ? description : undefined };
}

/**
 * Moves the draft to another system, document kind, or user setting (T-070). The tree is kept:
 * bindings the new target lacks surface as draft issues on their elements, never dropped.
 */
export function setDraftTarget(
    draft: EditorDraft,
    target: { systemId: string; documentKind: string; settingId?: string }
): EditorDraft {
    const { settingId: _previous, ...rest } = draft;
    void _previous;
    return {
        ...rest,
        systemId: SystemIdSchema.parse(target.systemId),
        documentKind: target.documentKind as EditorDraft['documentKind'],
        ...(target.settingId ? { settingId: target.settingId } : {}),
    };
}
