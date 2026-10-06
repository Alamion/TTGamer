import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { TemplateNode } from '../../../types/template';
import { type GroupKind, type ListKind, switchGroupKind, switchListKind } from '../elements/kinds';
import { findNode, replaceNode } from '../model/tree';
import { droppedSettings, switchElement, type SwitchStash } from '../settings/keepSettings';
import { settingDescription, type SettingKey } from '../settings/registry';
import type { Announcement, MessageDescriptor, Operation } from './types';

const editor = uiMessages.sheet.templates.editor;

/** Names the settings a switch dropped (FR-002); switching back restores them. */
function droppedAnnouncement(dropped: readonly SettingKey[]): Announcement | undefined {
    if (dropped.length === 0) return undefined;
    const settings = dropped.map(
        (key): MessageDescriptor => settingDescription(key)?.label ?? { id: key, message: key }
    );
    return { message: editor.settingsDropped, values: { settings } };
}

/** Shows a group or list as its other kind (spec 022, US6); settings it lacks wait in `stash`. */
export function switchKind(
    nodeId: string,
    kind: GroupKind | ListKind,
    stash: SwitchStash
): Operation {
    return (draft) => {
        const node = findNode(draft, nodeId);
        let next: TemplateNode | undefined;
        if (node?.type === 'section' || node?.type === 'group') {
            next = switchGroupKind(node, kind as GroupKind, stash);
        } else if (node?.type === 'list' || node?.type === 'table') {
            next = switchListKind(node, kind as ListKind, stash).node;
        }
        if (!node || !next) return { ok: true, draft };
        const announce = droppedAnnouncement(droppedSettings(node, next));
        return {
            ok: true,
            draft: replaceNode(draft, nodeId, next),
            ...(announce ? { announce } : {}),
        };
    };
}

/** Swaps an element for the one a new value source builds (spec 025, US1). */
export function switchSource(nodeId: string, built: TemplateNode, stash: SwitchStash): Operation {
    return (draft) => {
        const node = findNode(draft, nodeId);
        if (!node) return { ok: true, draft };
        const { node: next, dropped } = switchElement(node, built, stash);
        const announce = droppedAnnouncement(dropped);
        return {
            ok: true,
            draft: replaceNode(draft, nodeId, next),
            ...(announce ? { announce } : {}),
        };
    };
}
