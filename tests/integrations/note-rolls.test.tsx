// @vitest-environment happy-dom
import { useDiceRollerStore } from '@site/src/dice_roller/store/diceRollerStore';
import { useNoteRollCode } from '@site/src/integrations/sheet-dice/noteRolls';
import { MarkdownView } from '@site/src/shared/components/markdown/MarkdownView';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { noteEnvelope } from '@site/src/sheet_manager/systems/general/note';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

/** `dice:` code in a markdown text rolls through the dice roller (spec 043, US3). */

function Note({ source }: { source: string }) {
    return <MarkdownView source={source} renderCode={useNoteRollCode()} />;
}

let roll: ReturnType<typeof vi.fn>;

beforeEach(() => {
    roll = vi.fn(async () => null);
    useDiceRollerStore.setState({ roll } as never);
    useDocumentStore.setState({
        documents: [noteEnvelope('note-1', 'Session 12', '')],
        currentDocumentId: 'note-1',
    });
});

afterEach(cleanup);

describe('rolls in a note', () => {
    it('rolls exactly the written notation, named after the note, with the note as its source', async () => {
        render(<Note source="Ambush: `dice: 6d10>=6`" />);
        const button = screen.getByRole('button', { name: /6d10>=6/ });
        await act(async () => {
            fireEvent.click(button);
        });
        expect(roll).toHaveBeenCalledWith('6d10>=6', {
            characterName: 'Session 12',
            statLabels: undefined,
            origin: { kind: 'sheet', source: { systemId: 'general', definitionId: 'note' } },
        });
    });

    it('keeps invalid notation as code with the reason, and reports it', () => {
        render(<Note source="`dice: 6q`" />);
        expect(screen.queryByRole('button')).toBeNull();
        const code = screen.getByText('dice: 6q');
        expect(code.getAttribute('title')).toBeTruthy();
        const reason = document.getElementById(code.getAttribute('aria-describedby')!);
        expect(reason?.textContent).toBe(code.getAttribute('title'));
        expect(takeSheetIssues().map(({ code: issue }) => issue)).toEqual([
            'markdown-roll-invalid',
        ]);
    });

    it('leaves other inline code as code', () => {
        render(<Note source="`npm test` and `dice:`" />);
        expect(screen.queryByRole('button')).toBeNull();
        expect(screen.getByText('npm test').tagName).toBe('CODE');
    });
});
