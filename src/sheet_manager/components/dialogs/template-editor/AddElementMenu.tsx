import { translate } from '@docusaurus/Translate';
import * as Popover from '@radix-ui/react-popover';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { Plus } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import type { TemplateNode } from '../../../types/template';
import { generateDraftId, newField } from './draft';
import { useEditorModel } from './EditorModel';

const editor = uiMessages.sheet.templates.editor;

interface ElementOption {
    key: string;
    label: string;
    hint: string;
    build: (() => TemplateNode) | undefined;
}

/**
 * The element kinds a slot can insert. What an element stores (a custom value, a trait, a
 * resource, a character list, equipment, a condition track) is chosen afterwards in its own
 * settings, so the menu stays short everywhere.
 */
function useElementOptions(): readonly ElementOption[] {
    const t = (descriptor: { message: string }) => translate(descriptor);
    const { bindings } = useEditorModel();
    const firstTrack = bindings.find((binding) => binding.kind === 'track');
    return [
        {
            key: 'section',
            label: t(editor.paletteSection),
            hint: t(editor.paletteSectionHint),
            build: () => ({
                id: generateDraftId('sec'),
                type: 'section',
                title: t(editor.paletteSection),
                children: [],
            }),
        },
        {
            key: 'group',
            label: t(editor.paletteGroup),
            hint: t(editor.paletteGroupHint),
            build: () => ({
                id: generateDraftId('grp'),
                type: 'group',
                title: t(editor.paletteGroup),
                collapsible: false,
                children: [],
            }),
        },
        {
            key: 'field',
            label: t(editor.paletteField),
            hint: t(editor.paletteFieldHint),
            build: () => newField('text', t(editor.paletteField)),
        },
        {
            key: 'table',
            label: t(editor.paletteTable),
            hint: t(editor.paletteTableHint),
            build: () => ({
                id: generateDraftId('blk'),
                type: 'table',
                title: t(editor.paletteTable),
                minRows: 0,
                maxRows: 100,
                columns: [newField('text', t(editor.paletteField))],
            }),
        },
        {
            key: 'list',
            label: t(editor.paletteList),
            hint: t(editor.paletteListHint),
            build: () => {
                const id = generateDraftId('lst');
                return {
                    id,
                    type: 'list',
                    title: t(editor.paletteList),
                    columns: 1,
                    valueKey: `${id}-entries`,
                };
            },
        },
        {
            key: 'tracker',
            label: t(editor.paletteTracker),
            hint: t(editor.paletteTrackerHint),
            build: firstTrack
                ? () => ({
                      id: generateDraftId('blk'),
                      type: 'primitive',
                      bindingKey: firstTrack.key,
                      label: firstTrack.label,
                      compact: false,
                  })
                : undefined,
        },
    ];
}

function MenuItems({
    disabled,
    onChoose,
}: {
    disabled: boolean;
    onChoose: (node: TemplateNode) => void;
}) {
    const options = useElementOptions();
    return options.map((option) => (
        <button
            key={option.key}
            type="button"
            role="menuitem"
            onClick={() => {
                if (option.build) onChoose(option.build());
            }}
            disabled={disabled || !option.build}
            data-palette-option={option.key}
            className="flex items-start gap-2 rounded p-2 text-left hover:bg-editor/10 focus:bg-editor/10 focus:outline-none disabled:opacity-40"
        >
            <Plus className="mt-0.5 h-4 w-4 shrink-0 text-editor" aria-hidden="true" />
            <span className="grid gap-0.5">
                <span className="text-sm font-medium text-textPrimary">{option.label}</span>
                <span className="text-xs text-textSecondary">{option.hint}</span>
            </span>
        </button>
    ));
}

/**
 * A popover of element kinds anchored to its trigger (an insertion slot). The items are built
 * only while it is open: a page has hundreds of slots.
 */
export function AddElementMenu({
    children,
    disabled,
    onInsert,
}: {
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
