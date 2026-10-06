import { translate } from '@docusaurus/Translate';
import * as Popover from '@radix-ui/react-popover';
import { Plus } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { type TemplateNode } from '../../../types/template';
import { PALETTE } from '../elements/registry';

function MenuItems({
    atRoot,
    disabled,
    onChoose,
}: {
    atRoot: boolean;
    disabled: boolean;
    onChoose: (node: TemplateNode) => void;
}) {
    return PALETTE.map((option) => (
        <button
            key={option.key}
            type="button"
            role="menuitem"
            onClick={() => onChoose(option.build(atRoot))}
            disabled={disabled}
            data-palette-option={option.key}
            className="flex items-start gap-2 rounded p-2 text-left hover:bg-secondary/15 focus:bg-secondary/15 focus:outline-none disabled:opacity-40"
        >
            <Plus className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="grid gap-0.5">
                <span className="text-sm font-medium text-textPrimary">
                    {translate(option.label)}
                </span>
                <span className="text-xs text-textSecondary">{translate(option.hint)}</span>
            </span>
        </button>
    ));
}

/**
 * A popover of element kinds anchored to its trigger (an insertion slot). The items are built
 * only while it is open: a page has hundreds of slots.
 */
export function AddElementMenu({
    atRoot,
    children,
    disabled,
    onInsert,
}: {
    /** The slot is on the page itself, not inside a group. */
    atRoot: boolean;
    children: ReactNode;
    disabled: boolean;
    onInsert: (node: TemplateNode) => void;
}) {
    const [open, setOpen] = useState(false);
    return (
        <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger asChild>{children}</Popover.Trigger>
            {open && (
                <Popover.Content
                    className="z-50 grid w-72 gap-1 rounded-lg border border-border bg-bgSurface p-2 shadow-xl"
                    sideOffset={4}
                    align="center"
                    role="menu"
                >
                    <MenuItems
                        atRoot={atRoot}
                        disabled={disabled}
                        onChoose={(node) => {
                            onInsert(node);
                            setOpen(false);
                        }}
                    />
                </Popover.Content>
            )}
        </Popover.Root>
    );
}
