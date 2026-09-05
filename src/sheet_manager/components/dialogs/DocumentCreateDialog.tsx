import Translate, { translate } from '@docusaurus/Translate';
import * as Dialog from '@radix-ui/react-dialog';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { useState } from 'react';

import { useDocumentStore } from '../../store/documentStore';
import { starWarsWodSystem } from '../../systems';

interface DocumentCreateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const definitionMessages = {
    character: uiMessages.sheet.documents.types.character,
    creature: uiMessages.sheet.documents.types.creature,
    droid: uiMessages.sheet.documents.types.droid,
    'fodder-group': uiMessages.sheet.documents.types.fodderGroup,
    vehicle: uiMessages.sheet.documents.types.vehicle,
} as const;

export function DocumentCreateDialog({ open, onOpenChange }: DocumentCreateDialogProps) {
    const createDocument = useDocumentStore((state) => state.createDocument);
    const [definitionId, setDefinitionId] = useState('character');
    const modalRoot =
        typeof document === 'undefined' ? undefined : document.getElementById('modal-root');

    const handleCreate = () => {
        createDocument(starWarsWodSystem.id, definitionId);
        onOpenChange(false);
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal container={modalRoot ?? undefined}>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[9998]" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-[9999] w-[min(30rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-bgSurface p-6 shadow-xl focus:outline-none">
                    <Dialog.Title className="text-lg font-semibold text-textPrimary">
                        <Translate id="ttgamer.ui.sheet.documents.create.title" />
                    </Dialog.Title>
                    <Dialog.Description className="mt-2 text-sm text-textSecondary">
                        <Translate id="ttgamer.ui.sheet.documents.create.prompt" />
                    </Dialog.Description>
                    <fieldset className="mt-5 grid gap-2">
                        {starWarsWodSystem.documents.map((definition) => {
                            const descriptor =
                                definitionMessages[
                                    definition.id as keyof typeof definitionMessages
                                ];
                            return (
                                <label
                                    key={definition.id}
                                    className="flex cursor-pointer items-center gap-3 rounded border border-border p-3 hover:bg-bgBase"
                                >
                                    <input
                                        type="radio"
                                        name="document-definition"
                                        value={definition.id}
                                        checked={definitionId === definition.id}
                                        onChange={() => setDefinitionId(definition.id)}
                                    />
                                    <span className="text-sm font-medium text-textPrimary">
                                        {descriptor ? translate(descriptor) : definition.label}
                                    </span>
                                </label>
                            );
                        })}
                    </fieldset>
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
