import * as ContextMenu from '@radix-ui/react-context-menu';
import { clsx } from 'clsx';
import { createContext, Fragment, type ReactNode, useContext, useRef, useState } from 'react';

import type { CommandGroup, EditorCommandId } from '../commands/list';

/** One menu entry, built when the menu opens from the current selection. */
export interface MenuCommand {
    id: EditorCommandId;
    group: CommandGroup | 'remove';
    label: string;
    keys?: string;
    disabled: boolean;
    run: () => void;
}

/** What the dialog offers the menu surfaces (spec 023, US4). Stable for the dialog's lifetime. */
export interface EditorMenuSource {
    /**
     * Selects the element under the pointer unless it already belongs to the selection. On touch
     * screens a selection is kept, so "Add to selection" can grow it (spec 023, US4 #4).
     */
    prepare(targetId: string | null, touch: boolean): void;
    items(targetId: string | null, touch: boolean): MenuCommand[];
    dragging(): boolean;
}

export const EditorMenuContext = createContext<EditorMenuSource | null>(null);

const SURFACE_TARGET = {
    page: '[data-editor-frame]',
    outline: '[data-outline-row]',
} as const;

function targetIdOf(element: Element | null, surface: keyof typeof SURFACE_TARGET) {
    const target = element?.closest(SURFACE_TARGET[surface]);
    return target?.getAttribute(surface === 'page' ? 'data-node-id' : 'data-outline-row') ?? null;
}

/** The element to focus when the menu closes: the frame's grip or the outline row's button. */
function focusTarget(targetId: string | null, surface: keyof typeof SURFACE_TARGET) {
    if (!targetId) return null;
    return surface === 'page'
        ? document.querySelector<HTMLElement>(`[data-testid="page-grip-${targetId}"]`)
        : document.querySelector<HTMLElement>(
              `[data-outline-row="${targetId}"] button:not([data-drag-handle])`
          );
}

/**
 * The element menu of a surface (page or outline): right click, a touch long press, the menu key,
 * or Shift+F10. One menu per surface, not per element, keeps large pages fast (research R4).
 */
export function EditorContextMenu({
    children,
    surface,
}: {
    children: ReactNode;
    surface: keyof typeof SURFACE_TARGET;
}) {
    const source = useContext(EditorMenuContext);
    const [items, setItems] = useState<MenuCommand[]>([]);
    const target = useRef<string | null>(null);
    const touch = useRef(false);
    if (!source) return <>{children}</>;
    return (
        <ContextMenu.Root modal={false}>
            <ContextMenu.Trigger
                className="block min-h-full"
                data-editor-menu-surface={surface}
                onPointerDownCapture={(event) => {
                    touch.current = event.pointerType === 'touch';
                }}
                onContextMenuCapture={(event) => {
                    if (source.dragging()) {
                        // A right click during a drag does nothing (spec edge case).
                        event.preventDefault();
                        event.stopPropagation();
                        return;
                    }
                    const id = targetIdOf(event.target as Element, surface);
                    target.current = id;
                    source.prepare(id, touch.current);
                    setItems(source.items(id, touch.current));
                }}
            >
                {children}
            </ContextMenu.Trigger>
            <ContextMenu.Content
                data-editor-menu=""
                className="z-[10000] min-w-56 rounded-lg border border-border bg-bgSurface p-1 text-sm shadow-xl"
                onCloseAutoFocus={(event) => {
                    const element = focusTarget(target.current, surface);
                    if (!element) return;
                    event.preventDefault();
                    element.focus();
                }}
            >
                {items.map((item, index) => (
                    <Fragment key={item.id}>
                        {index > 0 && items[index - 1]!.group !== item.group && (
                            <ContextMenu.Separator className="my-1 h-px bg-border" />
                        )}
                        <ContextMenu.Item
                            disabled={item.disabled}
                            onSelect={item.run}
                            data-command={item.id}
                            className={clsx(
                                'flex cursor-default items-center gap-4 rounded px-2 py-1.5 text-textPrimary outline-none',
                                'data-[highlighted]:bg-primary/15 data-[disabled]:text-textSecondary data-[disabled]:opacity-60',
                                item.group === 'remove' && 'data-[highlighted]:text-error'
                            )}
                        >
                            <span className="flex-1">{item.label}</span>
                            {item.keys && (
                                <kbd className="font-sans text-xs text-textSecondary">
                                    {item.keys}
                                </kbd>
                            )}
                        </ContextMenu.Item>
                    </Fragment>
                ))}
            </ContextMenu.Content>
        </ContextMenu.Root>
    );
}
