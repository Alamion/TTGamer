import { translate } from '@docusaurus/Translate';
import { notationDiagnosticMessage } from '@site/src/dice_roller/components/dice_pool/notationDiagnosticMessage';
import { diagnoseNotation } from '@site/src/dice_roller/dice-logic/dice-parser';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { reportSheetIssue } from '@site/src/sheet_manager/diagnostics';
import { rollNameOf } from '@site/src/sheet_manager/features/sheet/data/documentLabels';
import {
    useDocumentRollSource,
    useDocumentSource,
} from '@site/src/sheet_manager/hooks/useDocumentSource';
import { Dices } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useId, useMemo } from 'react';

import { useSheetDiceActions } from './useSheetDiceActions';

const messages = uiMessages.integrations.noteRolls;

/** `dice: <notation>`, as the Obsidian Dice Roller plugin writes it. */
const DICE_CODE = /^dice:\s*(\S.*)$/i;

/**
 * Inline `dice:` code of a markdown text as a roll (spec 043, US3): the markdown view's code slot
 * for a document's page. A roll goes through the dice roller as a sheet roll would, named after
 * the document and read by its system; other code stays code.
 */
export function useNoteRollCode(): (code: string) => ReactNode {
    const { document } = useDocumentSource();
    const rollSource = useDocumentRollSource();
    const { rollImmediately } = useSheetDiceActions({
        characterName: document ? rollNameOf(document) : undefined,
        rollSource,
    });
    return useCallback(
        (code: string) => {
            const match = DICE_CODE.exec(code.trim());
            if (!match?.[1]) return undefined;
            return <NoteRoll code={code} notation={match[1].trim()} roll={rollImmediately} />;
        },
        [rollImmediately]
    );
}

function NoteRoll({
    code,
    notation,
    roll,
}: {
    code: string;
    notation: string;
    roll: (notation: string) => unknown;
}) {
    const diagnostic = useMemo(() => diagnoseNotation(notation), [notation]);
    const reasonId = useId();
    useEffect(() => {
        if (!diagnostic) return;
        reportSheetIssue({
            code: 'markdown-roll-invalid',
            message: 'A dice code in a markdown text is not valid notation; it shows as code',
            details: { notation, kind: diagnostic.kind },
        });
    }, [diagnostic, notation]);
    if (diagnostic) {
        const reason = translate(messages.invalid, {
            reason: notationDiagnosticMessage(diagnostic),
        });
        return (
            <>
                <code
                    title={reason}
                    aria-describedby={reasonId}
                    className="rounded-sm bg-bgBase px-1 py-0.5 font-mono text-[0.9em] underline decoration-error decoration-wavy"
                >
                    {code}
                </code>
                <span id={reasonId} hidden>
                    {reason}
                </span>
            </>
        );
    }
    return (
        <button
            type="button"
            onClick={() => void roll(notation)}
            title={translate(messages.roll, { notation })}
            className="inline-flex items-center gap-1 rounded-sm border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-mono text-[0.9em] text-primary hover:bg-primary/20 focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
        >
            <Dices className="h-3.5 w-3.5" aria-hidden />
            {notation}
        </button>
    );
}
