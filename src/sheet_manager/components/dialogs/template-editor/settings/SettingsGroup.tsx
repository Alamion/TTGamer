import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { usePluralMessage } from '@site/src/shared/hooks/usePluralMessage';
import { ChevronRight } from 'lucide-react';
import { type ReactNode, useId } from 'react';

import type { SettingsGroupId } from './groupedSettings';
import { useIssueGroupCounts, useSettingsGroupState } from './groupState';

const editor = uiMessages.sheet.templates.editor;

export const SETTINGS_GROUP_TITLE = {
    content: editor.groupContent,
    value: editor.groupValue,
    limits: editor.groupLimits,
    look: editor.groupLook,
    visibility: editor.groupVisibility,
} as const satisfies Record<SettingsGroupId, { message: string }>;

/** A collapsible settings group; a closed group holding an issue of the element says so. */
export function SettingsGroup({
    children,
    id,
    nodeId,
}: {
    children: ReactNode;
    id: SettingsGroupId;
    nodeId: string;
}) {
    const { open, setOpen } = useSettingsGroupState();
    const issues = useIssueGroupCounts().get(nodeId)?.[id] ?? 0;
    const plural = usePluralMessage();
    const bodyId = useId();
    const expanded = open[id];
    return (
        <div className="border-t border-border" data-settings-group={id}>
            <button
                type="button"
                aria-expanded={expanded}
                aria-controls={bodyId}
                onClick={() => setOpen(id, !expanded)}
                className="flex w-full items-center gap-1.5 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-textSecondary hover:text-textPrimary"
            >
                <ChevronRight
                    className={`h-3 w-3 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
                    aria-hidden="true"
                />
                {translate(SETTINGS_GROUP_TITLE[id])}
                {issues > 0 && (
                    <span className="ml-auto rounded-full bg-error px-1.5 text-[10px] normal-case tracking-normal text-white">
                        {plural(editor.groupIssues, issues)}
                    </span>
                )}
            </button>
            <div id={bodyId} hidden={!expanded} className="grid gap-3 pb-3">
                {children}
            </div>
        </div>
    );
}
