import { createContext, useContext } from 'react';

import type { DocumentBindingDescriptor } from '../../../systems/templateBindings';
import type { TemplateField } from '../../../types/template';

/**
 * Draft-derived data the editor panels need, provided once by the dialog. Panels never receive
 * the whole draft: its identity changes on every keystroke, which would re-render all of them.
 * Each context value changes only when what it describes changes.
 */
export interface EditorModel {
    draftId: string;
    systemId: string;
    documentKind: string;
    bindings: readonly DocumentBindingDescriptor[];
    /** Id of the single shared `<datalist>` of numeric coordinates for formula inputs. */
    coordinateListId: string;
    /** True when the template reached its node budget (adding elements is disabled). */
    atNodeLimit: boolean;
}

export const EditorModelContext = createContext<EditorModel | null>(null);

export function useEditorModel(): EditorModel {
    const model = useContext(EditorModelContext);
    if (!model) throw new Error('Template editor panels must render inside EditorModelContext');
    return model;
}

/** Catalog fill targets: every fillable field (id, type, label) of the draft. */
export type FillTarget = Pick<TemplateField, 'id' | 'type' | 'label'>;

export const EditorFillTargetsContext = createContext<readonly FillTarget[]>([]);

export function useFillTargets(): readonly FillTarget[] {
    return useContext(EditorFillTargetsContext);
}
