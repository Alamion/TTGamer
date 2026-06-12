import { Plus } from 'lucide-react';
import { useCharacterStore } from '../store/characterStore.ts';

export function NewCharacterButton() {
    const { createNewCharacter } = useCharacterStore();
    return (
        <button
            className="items-center justify-center gap-1.5 font-medium border rounded transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed text-white bg-primary hover:bg-primary/90 border-transparent px-4 py-2 text-sm inline-flex"
            onClick={createNewCharacter}
            title="Create new character"
        >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>New</span>
        </button>
    );
}
