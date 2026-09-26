import { translate } from '@docusaurus/Translate';
import * as Popover from '@radix-ui/react-popover';
import clsx from 'clsx';
import type { KeyboardEvent } from 'react';
import { useRef } from 'react';

import { ACTION_UI, type LibraryActionId } from './actions';

export interface ContextMenuProps {
    label: string;
    /**
     * The dialog content: the menu renders inside it, so the dialog's focus trap keeps it, and
     * the anchor is placed relative to it (the dialog is transformed, fixed children follow it).
     */
    container: HTMLElement | null;
    anchor: { x: number; y: number };
    actions: readonly LibraryActionId[];
    onAction: (id: LibraryActionId) => void;
    onClose: () => void;
}

/**
 * The selected row's actions at the pointer or the row (contracts/library-ui.md "Context menu"):
 * arrows move, Enter activates, Escape closes and returns focus to the row.
 */
export function ContextMenu({
    label,
    container,
    anchor,
    actions,
    onAction,
    onClose,
}: ContextMenuProps) {
    const origin = container?.getBoundingClientRect();
    const listRef = useRef<HTMLDivElement>(null);
    const items = () =>
        Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const list = items();
        const index = list.indexOf(document.activeElement as HTMLElement);
        const focus = (next: number) => list[(next + list.length) % list.length]?.focus();
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                focus(index + 1);
                break;
            case 'ArrowUp':
                event.preventDefault();
                focus(index - 1);
                break;
            case 'Home':
                event.preventDefault();
                focus(0);
                break;
            case 'End':
                event.preventDefault();
                focus(list.length - 1);
                break;
            case 'Tab':
                event.preventDefault();
                onClose();
                break;
            default:
                break;
        }
    };

    return (
        <Popover.Root open onOpenChange={(open) => !open && onClose()}>
            <Popover.Anchor asChild>
                <span
                    aria-hidden="true"
                    style={{
                        position: 'fixed',
                        left: anchor.x - (origin?.left ?? 0),
                        top: anchor.y - (origin?.top ?? 0),
                        width: 0,
                        height: 0,
                    }}
                />
            </Popover.Anchor>
            <Popover.Portal container={container ?? undefined}>
                <Popover.Content
                    align="start"
                    sideOffset={4}
                    onOpenAutoFocus={(event) => {
                        event.preventDefault();
                        items()[0]?.focus();
                    }}
                    className="z-[10000] min-w-48 rounded-md border border-border bg-bgSurface p-1 shadow-lg"
                >
                    <div
                        ref={listRef}
                        role="menu"
                        aria-label={label}
                        tabIndex={-1}
                        onKeyDown={onKeyDown}
                    >
                        {actions.map((id) => {
                            const { label: itemLabel, icon: Icon, danger } = ACTION_UI[id];
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    role="menuitem"
                                    tabIndex={-1}
                                    onClick={() => {
                                        onClose();
                                        onAction(id);
                                    }}
                                    className={clsx(
                                        'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm outline-none',
                                        'hover:bg-secondary/15 focus:bg-secondary/15',
                                        danger ? 'text-error' : 'text-textPrimary'
                                    )}
                                >
                                    <Icon className="h-4 w-4" aria-hidden="true" />
                                    {translate(itemLabel)}
                                </button>
                            );
                        })}
                    </div>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}
