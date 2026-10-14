import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';
import { X } from 'lucide-react';
import type { KeyboardEvent } from 'react';

import { tabId } from './paneIds';

const labels = uiMessages.sheet.documents.panes;

export interface PaneTab {
    id: string;
    name: string;
}

/** One tab per open document: arrows move between them, each has its own close button. */
export function PaneTabs({
    focusedId,
    onClose,
    onFocus,
    tabs,
}: {
    focusedId: string | null;
    onClose: (id: string) => void;
    onFocus: (id: string) => void;
    tabs: readonly PaneTab[];
}) {
    const move = (event: KeyboardEvent<HTMLButtonElement>, from: number) => {
        const target =
            event.key === 'ArrowRight'
                ? (from + 1) % tabs.length
                : event.key === 'ArrowLeft'
                  ? (from - 1 + tabs.length) % tabs.length
                  : event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? tabs.length - 1
                      : -1;
        if (target === -1) return;
        event.preventDefault();
        const next = tabs[target]!;
        onFocus(next.id);
        document.getElementById(tabId(next.id))?.focus();
    };

    return (
        <div
            role="tablist"
            aria-label={translate(labels.tabsLabel)}
            className="flex gap-1 overflow-x-auto border-b border-border pb-1"
        >
            {tabs.map((tab, index) => {
                const selected = tab.id === focusedId;
                return (
                    <div
                        key={tab.id}
                        role="presentation"
                        className={clsx(
                            'flex shrink-0 items-stretch rounded-t-md border border-b-0',
                            selected
                                ? 'border-border bg-bgSurface text-textPrimary'
                                : 'border-transparent text-textSecondary hover:bg-bgBase'
                        )}
                    >
                        <button
                            type="button"
                            role="tab"
                            id={tabId(tab.id)}
                            aria-selected={selected}
                            tabIndex={selected ? 0 : -1}
                            onClick={() => onFocus(tab.id)}
                            onKeyDown={(event) => move(event, index)}
                            className="max-w-48 truncate px-3 py-1.5 text-sm pointer-coarse:min-h-8"
                        >
                            {tab.name}
                        </button>
                        <button
                            type="button"
                            aria-label={translate(labels.close, { name: tab.name })}
                            onClick={() => onClose(tab.id)}
                            className="px-1.5 text-textSecondary hover:text-textPrimary pointer-coarse:min-h-8 pointer-coarse:min-w-8"
                        >
                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
