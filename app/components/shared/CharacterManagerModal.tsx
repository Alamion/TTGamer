import { useState, useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Trash2, Users } from 'lucide-react';
import { useCharacterStore } from '../../store/characterStore';
import { ConfirmDialog } from './ConfirmDialog';
import type { BaseCharacter } from '../../types/character';

export interface CharacterManagerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CharacterManagerModal({ open, onOpenChange }: CharacterManagerModalProps) {
    const { characters, currentCharacter, setCurrentCharacter, deleteCharacter } =
        useCharacterStore();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const wasOpenRef = useRef(open);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && open) {
                onOpenChange(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, onOpenChange]);

    useEffect(() => {
        if (open && contentRef.current) {
            contentRef.current.focus();
        }
    }, [open]);

    useEffect(() => {
        if (wasOpenRef.current && !open) {
            setSelectedIds(new Set());
            setDeleteDialogOpen(false);
        }
        wasOpenRef.current = open;
    }, [open]);

    const handleSelectCharacter = (character: BaseCharacter) => {
        setCurrentCharacter(character);
        onOpenChange(false);
    };

    const handleToggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleSelectAll = () => {
        if (selectedIds.size === characters.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(characters.map((c) => c.id)));
        }
    };

    const handleDeleteSelected = () => {
        const idsToDelete = Array.from(selectedIds);
        const currentId = currentCharacter?.id;
        const willDeleteCurrent = idsToDelete.includes(currentId ?? '');

        idsToDelete.forEach((id) => deleteCharacter(id));

        if (willDeleteCurrent) {
            const remaining = characters.filter((c) => !idsToDelete.includes(c.id));
            if (remaining.length > 0) {
                setCurrentCharacter(remaining[0]);
            }
        }

        setSelectedIds(new Set());
        setDeleteDialogOpen(false);
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            {open && (
                <>
                    <div
                        className="bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
                        style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
                        onClick={() => onOpenChange(false)}
                        aria-hidden="true"
                    />
                    <div
                        ref={contentRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="character-manager-title"
                        className="bg-bgSurface border border-border rounded-lg shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
                        style={{
                            position: 'fixed',
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '100%',
                            maxWidth: '42rem',
                            maxHeight: '85vh',
                            zIndex: 9999,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                        tabIndex={-1}
                    >
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-textSecondary" />
                                <Dialog.Title
                                    id="character-manager-title"
                                    className="text-lg font-semibold text-textPrimary"
                                >
                                    Manage Characters
                                </Dialog.Title>
                            </div>
                            <button
                                onClick={() => onOpenChange(false)}
                                className="text-textSecondary hover:text-textPrimary transition-colors"
                                aria-label="Close"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {characters.length === 0 ? (
                                <p className="text-sm text-textSecondary italic text-center py-8">
                                    No characters yet. Create one to get started.
                                </p>
                            ) : (
                                <table className="w-full text-sm">
                                    <colgroup>
                                        <col className="w-auto" />
                                        <col className="w-1/2" />
                                        <col className="w-1/2" />
                                    </colgroup>
                                    <thead>
                                        <tr className="text-textSecondary text-xs border-b border-border">
                                            <th scope="col" className="w-10 py-2 text-left">
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        selectedIds.size === characters.length &&
                                                        characters.length > 0
                                                    }
                                                    onChange={handleSelectAll}
                                                    className="w-4 h-4 rounded border-border bg-bgSurface text-primary focus:ring-primary focus:ring-offset-0"
                                                    aria-label="Select all characters"
                                                />
                                            </th>
                                            <th scope="col" className="py-2 text-left font-medium">
                                                Name
                                            </th>
                                            <th scope="col" className="py-2 text-left font-medium">
                                                Setting
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {characters.map((character) => (
                                            <tr
                                                key={character.id}
                                                className="border-b border-border hover:bg-bgBase/50 transition-colors"
                                            >
                                                <td className="py-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.has(character.id)}
                                                        onChange={() =>
                                                            handleToggleSelect(character.id)
                                                        }
                                                        className="w-4 h-4 rounded border-border bg-bgSurface text-primary focus:ring-primary focus:ring-offset-0"
                                                        aria-label={`Select ${character.metadata.name}`}
                                                    />
                                                </td>
                                                <td className="py-2">
                                                    <button
                                                        onClick={() =>
                                                            handleSelectCharacter(character)
                                                        }
                                                        className="text-textPrimary hover:text-primary hover:underline transition-colors text-left"
                                                    >
                                                        {character.metadata.name}
                                                        {currentCharacter?.id === character.id && (
                                                            <span className="ml-2 text-xs text-primary">
                                                                (current)
                                                            </span>
                                                        )}
                                                    </button>
                                                </td>
                                                <td className="py-2 text-textSecondary">
                                                    {character.metadata.setting ?? 'N/A'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="flex items-center justify-end p-4 border-t border-border bg-bgBase/30">
                            <button
                                onClick={() => setDeleteDialogOpen(true)}
                                disabled={selectedIds.size === 0}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-error bg-bgSurface border border-border rounded hover:bg-error/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Delete selected characters"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete Selected
                                {selectedIds.size > 0 && (
                                    <span className="ml-1">({selectedIds.size})</span>
                                )}
                            </button>
                        </div>
                    </div>
                </>
            )}

            <ConfirmDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={handleDeleteSelected}
                title="Delete Characters"
                description={`Are you sure you want to delete ${selectedIds.size} character${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`}
                confirmLabel="Delete"
                cancelLabel="Cancel"
                variant="danger"
            />
        </Dialog.Root>
    );
}
