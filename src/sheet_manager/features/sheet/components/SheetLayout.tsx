import * as Dialog from '@radix-ui/react-dialog';
import { generateId } from '@site/src/shared/utils/random';
import { deletePortrait } from '@site/src/sheet_manager/persistence/portraitStorage';
import { Download, Plus, RotateCcw, Upload, Users } from 'lucide-react';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { CharacterManagerModal, ConfirmDialog } from '../../../components';
import { useCharacterStore } from '../../../store/characterStore';
import type { BaseCharacter } from '../../../types/character';
import { BaseCharacterSchema, createDefaultCharacter } from '../../../types/character';

type SheetLayoutProps = {
    children: React.ReactNode;
};
const btnBase =
    'flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed';

const btnSecondary = `${btnBase} text-textPrimary bg-bgSurface hover:bg-bgBase`;
const btnDanger = `${btnBase} text-error bg-bgSurface hover:bg-bgBase`;
const btnPrimary = `${btnBase} text-white bg-primary hover:bg-primary/90 border-transparent`;

export function SheetLayout({ children }: SheetLayoutProps) {
    const {
        currentCharacter,
        setCurrentCharacter,
        createNewCharacter,
        importCharacter,
        updateCharacter,
    } = useCharacterStore();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [managerModalOpen, setManagerModalOpen] = useState(false);
    const [importConflict, setImportConflict] = useState<BaseCharacter | null>(null);
    const conflictResolverRef = useRef<
        ((resolution: 'replace' | 'duplicate' | 'cancel') => void) | null
    >(null);

    const handleExport = () => {
        if (!currentCharacter) return;
        const dataStr = JSON.stringify(
            currentCharacter,
            (key, value) => (key === 'portraitId' ? undefined : value),
            2
        );
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const safeName = currentCharacter.metadata.name.trim().replace(/[^\p{L}\p{N}_-]+/gu, '_');
        link.download = `ttgamer_${safeName || 'new_character'}_${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success(`Exported "${currentCharacter.metadata.name}"`);
    };

    const handleResetConfirm = () => {
        if (!currentCharacter) return;
        const resetData = {
            ...createDefaultCharacter(),
            id: currentCharacter.id,
        };
        setCurrentCharacter(resetData);
        updateCharacter(currentCharacter.id, resetData);
        setResetDialogOpen(false);
    };

    const requestConflictResolution = (character: BaseCharacter) =>
        new Promise<'replace' | 'duplicate' | 'cancel'>((resolve) => {
            conflictResolverRef.current = resolve;
            setImportConflict(character);
        });

    const resolveConflict = (resolution: 'replace' | 'duplicate' | 'cancel') => {
        conflictResolverRef.current?.(resolution);
        conflictResolverRef.current = null;
        setImportConflict(null);
    };

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        event.target.value = '';

        for (const file of Array.from(files)) {
            try {
                const parsed = BaseCharacterSchema.parse(JSON.parse(await file.text()));
                // Portrait blobs are device-local and never travel in character JSON.
                const characterFromFile = {
                    ...parsed,
                    metadata: { ...parsed.metadata, portraitId: undefined },
                };
                const existingCharacter = useCharacterStore
                    .getState()
                    .characters.find(({ id }) => id === characterFromFile.id);
                let characterToImport = characterFromFile;
                let replacedCharacter: BaseCharacter | undefined;
                if (existingCharacter) {
                    const resolution = await requestConflictResolution(characterFromFile);
                    if (resolution === 'cancel') continue;
                    if (resolution === 'duplicate') {
                        characterToImport = { ...characterFromFile, id: generateId() };
                    } else {
                        replacedCharacter = existingCharacter;
                    }
                }
                importCharacter(characterToImport, {
                    preserveReplacedPortrait: !!replacedCharacter,
                });
                const characterName = characterToImport.metadata.name || 'New Character';
                if (replacedCharacter) {
                    const oldPortraitId = replacedCharacter.metadata.portraitId;
                    const portraitCleanupTimer = setTimeout(() => {
                        void deletePortrait(oldPortraitId);
                    }, 10_000);
                    toast(
                        (notification) => (
                            <span className="flex items-center gap-3">
                                Replaced “{characterName}”.
                                <button
                                    type="button"
                                    className="font-semibold underline"
                                    onClick={() => {
                                        clearTimeout(portraitCleanupTimer);
                                        importCharacter(replacedCharacter);
                                        toast.dismiss(notification.id);
                                        toast.success('Previous character restored.');
                                    }}
                                >
                                    Undo
                                </button>
                            </span>
                        ),
                        { duration: 10_000 }
                    );
                } else {
                    toast.success(`Imported "${characterName}"`);
                }
            } catch {
                toast.error(`Failed to import "${file.name}"`);
            }
        }
    };

    return (
        <>
            <div className="bg-bgSurface p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-4 sm:pb-0">
                    <div className="flex flex-wrap items-center gap-2.5 justify-around">
                        <div className="flex items-center gap-1.5 bg-bgSurface/50 p-1 rounded-lg border border-border/20">
                            <button
                                onClick={handleExport}
                                disabled={!currentCharacter}
                                className={btnSecondary}
                                title="Export character as JSON"
                            >
                                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Export</span>
                            </button>

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className={btnSecondary}
                                title="Import characters from JSON"
                            >
                                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Import</span>
                            </button>
                        </div>

                        <div className="flex items-center gap-1.5 bg-bgSurface/50 p-1 rounded-lg border border-border/20">
                            <button
                                onClick={() => setManagerModalOpen(true)}
                                className={btnSecondary}
                                title="Manage characters"
                            >
                                <Users className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Manage</span>
                            </button>

                            <button
                                onClick={() => setResetDialogOpen(true)}
                                disabled={!currentCharacter}
                                className={btnDanger}
                                title="Reset all sheet data"
                            >
                                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Reset</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center">
                        <button
                            onClick={createNewCharacter}
                            className={`${btnPrimary} w-full sm:w-auto px-4 py-2 text-sm`}
                            title="Create new character"
                        >
                            <Plus className="w-4 h-4" aria-hidden="true" />
                            <span>New</span>
                        </button>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json,application/json"
                        onChange={handleImport}
                        className="hidden"
                        aria-label="Import character file"
                        multiple
                    />
                </div>

                {!currentCharacter && (
                    <div className="text-center py-6">
                        <h2 className="text-xl font-bold text-textPrimary mb-2">
                            No Character Loaded
                        </h2>
                        <p className="text-sm text-textSecondary mb-4">
                            Create a new character or load one from the manager.
                        </p>
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={resetDialogOpen}
                onOpenChange={setResetDialogOpen}
                onConfirm={handleResetConfirm}
                title="Reset Character Sheet"
                description="Are you sure you want to reset all sheet data? This cannot be undone."
                confirmLabel="Reset"
                cancelLabel="Cancel"
                variant="danger"
            />

            <CharacterManagerModal open={managerModalOpen} onOpenChange={setManagerModalOpen} />

            <Dialog.Root
                open={importConflict !== null}
                onOpenChange={(isOpen) => {
                    if (!isOpen && importConflict) resolveConflict('cancel');
                }}
            >
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[9998]" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 z-[9999] w-[min(28rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-bgSurface p-6 shadow-xl focus:outline-none">
                        <Dialog.Title className="text-lg font-semibold text-textPrimary">
                            Character already exists
                        </Dialog.Title>
                        <Dialog.Description className="mt-2 text-sm text-textSecondary">
                            A character with this ID is already stored. Replace it, import a
                            duplicate with a new ID, or cancel this file.
                        </Dialog.Description>
                        <div className="mt-6 flex flex-wrap justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => resolveConflict('cancel')}
                                className={btnSecondary}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => resolveConflict('duplicate')}
                                className={btnSecondary}
                            >
                                Duplicate
                            </button>
                            <button
                                type="button"
                                onClick={() => resolveConflict('replace')}
                                className={btnPrimary}
                            >
                                Replace
                            </button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {currentCharacter && children}
        </>
    );
}
