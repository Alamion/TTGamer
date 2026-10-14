import * as Popover from '@radix-ui/react-popover';
import clsx from 'clsx';
import type { ComponentType, KeyboardEvent } from 'react';
import { useRef } from 'react';

/** One entry of a row menu: the owner's id, its text, and an icon. */
export interface TreeMenuItem {
    id: string;
    label: string;
    icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' }>;
    danger?: boolean;
}

export interface TreeContextMenuProps {
    label: string;
    /**
     * The dialog content: the menu renders inside it, so the dialog's focus trap keeps it, and
     * the anchor is placed relative to it (the dialog is transformed, fixed children follow it).
     * Omit it for a menu over the page (a window that is not transformed).
     */
    container: HTMLElement | null;
    anchor: { x: number; y: number };
    actions: readonly TreeMenuItem[];
    onAction: (id: string) => void;
    onClose: () => void;
}

/**
 * A row's actions at the pointer or the row (contracts/library-ui.md "Context menu"): arrows move,
 * Enter activates, Escape closes and returns focus to the row. Shared by every tree.
 */
export function TreeContextMenu({
    label,
    container,
    anchor,
    actions,
    onAction,
    onClose,
}: TreeContextMenuProps) {
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
                        {actions.map(({ id, label: itemLabel, icon: Icon, danger }) => {
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
                                        'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-hidden',
                                        'hover:bg-secondary/15 focus:bg-secondary/15',
                                        danger ? 'text-error' : 'text-textPrimary'
                                    )}
                                >
                                    <Icon className="h-4 w-4" aria-hidden="true" />
                                    {itemLabel}
                                </button>
                            );
                        })}
                    </div>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}
