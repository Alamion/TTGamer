import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { type DragEvent, Fragment, type KeyboardEvent, type ReactNode } from 'react';

import { gapAt } from './dropTargets';
import { tabId } from './paneIds';

const labels = uiMessages.sheet.documents.panes;

export interface PaneTab {
    key: string;
    name: string;
}

/** Dragging tabs of this strip and dropping tabs on it (spec 036, US2). */
export interface StripDrag {
    onStart: (key: string, event: DragEvent) => void;
    onEnd: () => void;
    /** A dragged tab is over the strip, at this gap. */
    onOver: (gap: number, event: DragEvent) => void;
    onDrop: (gap: number, event: DragEvent) => void;
    /** Where the dragged tab would go, marked between the tabs. */
    gap: number | null;
}

/**
 * A strip of tabs, one shown: arrows, Home, and End move between them, each has its own close
 * button, and `end` holds the shown tab's controls (spec 036, US1).
 */
export function PaneTabs({
    drag,
    end,
    label,
    onClose,
    onMaximize,
    onMenu,
    onSelect,
    selected,
    tabs,
}: {
    drag?: StripDrag;
    end?: ReactNode;
    label: string;
    onClose: (key: string) => void;
    /** Opens a tab's menu at a point: right click, Shift+F10, or the ContextMenu key. */
    onMenu?: (key: string, anchor: { x: number; y: number }) => void;
    /** Double click on a tab; absent where its group cannot take the whole area. */
    onMaximize?: (key: string) => void;
    onSelect: (key: string) => void;
    selected: string | null;
    tabs: readonly PaneTab[];
}) {
    const gapOf = (event: DragEvent<HTMLElement>) => {
        const strip = event.currentTarget;
        const rects = [...strip.querySelectorAll<HTMLElement>('[data-tab]')].map((tab) =>
            tab.getBoundingClientRect()
        );
        return gapAt(rects, event.clientX);
    };
    const move = (event: KeyboardEvent<HTMLButtonElement>, from: number) => {
        if (onMenu && (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey))) {
            event.preventDefault();
            const box = event.currentTarget.getBoundingClientRect();
            onMenu(tabs[from]!.key, { x: box.left, y: box.bottom });
            return;
        }
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
            {/* The drop area is the strip's whole width, also after its last tab. */}
            <div
                className="flex min-w-0 flex-1"
                onDragOver={drag && ((event) => drag.onOver(gapOf(event), event))}
                onDrop={drag && ((event) => drag.onDrop(gapOf(event), event))}
            >
                <div
                    role="tablist"
                    aria-label={label}
                    className="flex min-w-0 flex-1 gap-1 overflow-x-auto"
                >
                    {tabs.map((tab, index) => {
                        const isSelected = tab.key === selected;
                        return (
                            <Fragment key={tab.key}>
                                {drag?.gap === index && (
                                    <span
                                        aria-hidden="true"
                                        data-drop-gap=""
                                        className="w-0.5 shrink-0 self-stretch bg-primary"
                                    />
                                )}
                                <div
                                    role="presentation"
                                    data-tab=""
                                    draggable={drag ? true : undefined}
                                    onDragStart={drag && ((event) => drag.onStart(tab.key, event))}
                                    onDragEnd={drag?.onEnd}
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
                                        onContextMenu={
                                            onMenu &&
                                            ((event) => {
                                                event.preventDefault();
                                                onMenu(tab.key, {
                                                    x: event.clientX,
                                                    y: event.clientY,
                                                });
                                            })
                                        }
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
                            </Fragment>
                        );
                    })}
                    {drag?.gap === tabs.length && (
                        <span
                            aria-hidden="true"
                            data-drop-gap=""
                            className="w-0.5 shrink-0 self-stretch bg-primary"
                        />
                    )}
                </div>
            </div>
            {end && <div className="flex shrink-0 items-center gap-1 pb-1">{end}</div>}
        </div>
    );
}
