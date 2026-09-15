import Translate, { translate } from '@docusaurus/Translate';
import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';

import { useDocumentStore } from '../../store/documentStore';
import { documentSettingLabel, systemRegistry } from '../../systems';

interface DocumentCreateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const optionValue = (systemId: string, definitionId: string) => `${systemId}/${definitionId}`;

/** Definitions grouped by setting (a system, or a module of a shared ruleset), in registry order. */
function settingGroups() {
    const groups: Array<{
        key: string;
        label: ReturnType<typeof documentSettingLabel>;
        entries: Array<ReturnType<typeof systemRegistry.listDefinitions>[number]>;
    }> = [];
    for (const entry of systemRegistry.listDefinitions()) {
        const label = documentSettingLabel(entry.system, entry.definition);
        const key = `${entry.system.id}/${label.id}`;
        const group = groups.find((candidate) => candidate.key === key);
        if (group) group.entries.push(entry);
        else groups.push({ key, label, entries: [entry] });
    }
    return groups;
}

/** Lists every registered document definition, grouped by setting. */
export function DocumentCreateDialog({ open, onOpenChange }: DocumentCreateDialogProps) {
    const createDocument = useDocumentStore((state) => state.createDocument);
    const groups = settingGroups();
    const first = systemRegistry.listDefinitions()[0];
    const [selected, setSelected] = useState(
        first ? optionValue(first.system.id, first.definition.id) : ''
    );
    const modalRoot =
        typeof document === 'undefined' ? undefined : document.getElementById('modal-root');

    const handleCreate = () => {
        const [systemId, definitionId] = selected.split('/');
        if (!systemId || !definitionId) return;
        createDocument(systemId, definitionId);
        onOpenChange(false);
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal container={modalRoot ?? undefined}>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[9998]" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-[9999] max-h-[calc(100%-2rem)] w-[min(30rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-bgSurface p-6 shadow-xl focus:outline-none">
                    <Dialog.Title className="text-lg font-semibold text-textPrimary">
                        <Translate id="ttgamer.ui.sheet.documents.create.title" />
                    </Dialog.Title>
                    <Dialog.Description className="mt-2 text-sm text-textSecondary">
                        <Translate id="ttgamer.ui.sheet.documents.create.prompt" />
                    </Dialog.Description>
                    <div className="mt-5 grid gap-4">
                        {groups.map((group) => (
                            <fieldset key={group.key} className="grid gap-2">
                                <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-textSecondary">
                                    {translate(group.label)}
                                </legend>
                                {group.entries.map(({ system, definition }) => {
                                    const value = optionValue(system.id, definition.id);
                                    return (
                                        <label
                                            key={value}
                                            className="flex cursor-pointer items-center gap-3 rounded border border-border p-3 hover:bg-bgBase"
                                        >
                                            <input
                                                type="radio"
                                                name="document-definition"
                                                value={value}
                                                checked={selected === value}
                                                onChange={() => setSelected(value)}
                                            />
                                            <span className="text-sm font-medium text-textPrimary">
                                                {translate(definition.label)}
                                            </span>
                                        </label>
                                    );
                                })}
                            </fieldset>
                        ))}
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        <Dialog.Close asChild>
                            <button
                                type="button"
                                className="rounded border border-border bg-bgSurface px-3 py-2 text-sm text-textPrimary hover:bg-bgBase"
                            >
                                <Translate id="ttgamer.ui.sheet.documents.create.cancel" />
                            </button>
                        </Dialog.Close>
                        <button
                            type="button"
                            onClick={handleCreate}
                            className="rounded border border-transparent bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90"
                        >
                            <Translate id="ttgamer.ui.sheet.documents.create.confirm" />
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
