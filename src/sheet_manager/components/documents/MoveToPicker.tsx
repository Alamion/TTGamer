import { translate } from '@docusaurus/Translate';
import * as Dialog from '@radix-ui/react-dialog';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { type TreeRowItem, TreeView } from '@site/src/shared/components/tree/TreeView';
import { Folder as FolderIcon, FolderOpen, Home } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

import { buildFolderRows, ROOT_KEY } from '../../features/documents/rows';
import type { Folder } from '../../store/documentIndex';

const labels = uiMessages.sheet.documents.manager.move;

export interface MoveToPickerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    folders: readonly Folder[];
    /** Folders being moved; they and what they hold are not offered. */
    moving: ReadonlySet<string>;
    title: string;
    /** `null` is the top level. */
    onPick: (parentId: string | null) => void;
}

const iconClass = 'h-4 w-4 shrink-0 text-textSecondary';

/** Picks the folder rows move into: the shared tree over folders only (the phone's way to move). */
export function MoveToPicker({
    open,
    onOpenChange,
    folders,
    moving,
    title,
    onPick,
}: MoveToPickerProps) {
    const modalRoot =
        typeof document === 'undefined' ? undefined : document.getElementById('modal-root');
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal container={modalRoot ?? undefined}>
                <Dialog.Overlay className="fixed inset-0 z-[9998] bg-black/50" />
                <Dialog.Content
                    aria-describedby={undefined}
                    className="fixed left-1/2 top-1/2 z-[9999] flex max-h-[min(32rem,calc(100dvh-2rem))] w-[min(26rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-border bg-bgSurface p-4 shadow-lg focus:outline-hidden"
                >
                    <Picker
                        folders={folders}
                        moving={moving}
                        title={title}
                        onPick={(parentId) => {
                            onPick(parentId);
                            onOpenChange(false);
                        }}
                    />
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

function Picker({
    folders,
    moving,
    title,
    onPick,
}: Pick<MoveToPickerProps, 'folders' | 'moving' | 'title' | 'onPick'>) {
    const [selected, setSelected] = useState<string>(ROOT_KEY);
    const scrollRef = useRef<HTMLDivElement>(null);
    const rows = useMemo(
        () => buildFolderRows(folders, translate(labels.top), moving),
        [folders, moving]
    );
    const chosen = rows.find(({ key }) => key === selected);
    const confirm = (item: TreeRowItem<Folder | null> | undefined) =>
        item && onPick(item.node ? item.node.id : null);
    return (
        <>
            <Dialog.Title className="text-lg font-semibold text-textPrimary">{title}</Dialog.Title>
            <div ref={scrollRef} className="my-3 min-h-0 flex-1 overflow-y-auto">
                <TreeView
                    label={translate(labels.treeLabel)}
                    rows={rows}
                    selectedKey={selected}
                    onSelect={(key) => setSelected(key)}
                    onToggle={() => undefined}
                    onEnter={confirm}
                    onMenu={() => undefined}
                    renderRow={(item) => ({
                        icon:
                            item.node === null ? (
                                <Home className={iconClass} aria-hidden="true" />
                            ) : item.expanded ? (
                                <FolderOpen className={iconClass} aria-hidden="true" />
                            ) : (
                                <FolderIcon className={iconClass} aria-hidden="true" />
                            ),
                        menu: false,
                    })}
                    labels={{
                        toggle: (name) => name,
                        actions: (name) => name,
                    }}
                    idPrefix="move-to-"
                    scrollRef={scrollRef}
                />
            </div>
            <div className="flex justify-end gap-2">
                <Dialog.Close asChild>
                    <button
                        type="button"
                        className="rounded-lg border border-border bg-bgSurface px-4 py-2 text-sm font-medium text-textSecondary transition-colors hover:bg-bgBase"
                    >
                        {translate(uiMessages.sheet.documents.create.cancel)}
                    </button>
                </Dialog.Close>
                <button
                    type="button"
                    onClick={() => confirm(chosen)}
                    className="rounded-lg bg-primary-muted px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary"
                >
                    {translate(labels.confirm)}
                </button>
            </div>
        </>
    );
}
