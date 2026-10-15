import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';
import { X } from 'lucide-react';
import type { KeyboardEvent, ReactNode } from 'react';

import { tabId } from './paneIds';

const labels = uiMessages.sheet.documents.panes;

export interface PaneTab {
    key: string;
    name: string;
}

/**
 * A strip of tabs, one shown: arrows, Home, and End move between them, each has its own close
 * button, and `end` holds the shown tab's controls (spec 036, US1).
 */
export function PaneTabs({
    end,
    label,
    onClose,
    onMaximize,
    onSelect,
    selected,
    tabs,
}: {
    end?: ReactNode;
    label: string;
    onClose: (key: string) => void;
    /** Double click on a tab; absent where its group cannot take the whole area. */
    onMaximize?: (key: string) => void;
    onSelect: (key: string) => void;
    selected: string | null;
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
        onSelect(next.key);
        document.getElementById(tabId(next.key))?.focus();
    };

    return (
        <div className="flex items-end gap-2 border-b border-border">
            <div
                role="tablist"
                aria-label={label}
                className="flex min-w-0 flex-1 gap-1 overflow-x-auto"
            >
                {tabs.map((tab, index) => {
                    const isSelected = tab.key === selected;
                    return (
                        <div
                            key={tab.key}
                            role="presentation"
                            className={clsx(
                                'flex shrink-0 items-stretch rounded-t-md border border-b-0',
                                isSelected
                                    ? 'border-border bg-bgSurface text-textPrimary'
                                    : 'border-transparent text-textSecondary hover:bg-bgBase'
                            )}
                        >
                            <button
                                type="button"
                                role="tab"
                                id={tabId(tab.key)}
                                aria-selected={isSelected}
                                tabIndex={isSelected ? 0 : -1}
                                onClick={() => onSelect(tab.key)}
                                onDoubleClick={() => onMaximize?.(tab.key)}
                                onKeyDown={(event) => move(event, index)}
                                className="max-w-48 truncate px-3 py-1.5 text-sm pointer-coarse:min-h-8"
                            >
                                {tab.name}
                            </button>
                            <button
                                type="button"
                                aria-label={translate(labels.close, { name: tab.name })}
                                onClick={() => onClose(tab.key)}
                                className="px-1.5 text-textSecondary hover:text-textPrimary pointer-coarse:min-h-8 pointer-coarse:min-w-8"
                            >
                                <X className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                        </div>
                    );
                })}
            </div>
            {end && <div className="flex shrink-0 items-center gap-1 pb-1">{end}</div>}
        </div>
    );
}
