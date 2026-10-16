import { translate } from '@docusaurus/Translate';
import { useSheetDiceActions } from '@site/src/integrations/sheet-dice/useSheetDiceActions';
import { Droplet } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { reportSheetIssue } from '../../../diagnostics';
import { useDocumentRollSource } from '../../../hooks/useDocumentSource';
import type { ActionBinding } from '../../../systems/templateBindings';
import { useBoundDocument } from './boundDocument';

/**
 * The button of an action binding (spec 037 D6, e.g. a V5 Rouse check): rolls through the dice
 * roller as a roll of this document — without its special dice — then writes the outcome and
 * says what changed. A cancelled roll writes nothing; a read-only document disables it.
 */
export function ActionButton({
    binding,
    row,
    rowName,
}: {
    binding: ActionBinding;
    row?: Readonly<Record<string, unknown>>;
    rowName?: string;
}) {
    const bound = useBoundDocument();
    const source = useDocumentRollSource();
    // Special dice (Hunger) belong to pools, not to the action's own roll.
    const { rollImmediately } = useSheetDiceActions({
        characterName: bound?.name,
        rollSource: source && { systemId: source.systemId, definitionId: source.definitionId },
    });
    const [busy, setBusy] = useState(false);
    if (!bound || (binding.available && !binding.available(bound.data, row))) return null;
    const label =
        row && binding.rowTranslation
            ? translate(binding.rowTranslation, { name: rowName ?? '' })
            : translate(binding.translation);

    const run = async () => {
        setBusy(true);
        try {
            const outcome = await binding.run({
                data: bound.data,
                ...(row ? { row } : {}),
                roll: rollImmediately,
            });
            if (!outcome) return;
            if (outcome.update) bound.update(outcome.update);
            const text = translate(outcome.message.descriptor, outcome.message.values);
            if (outcome.tone === 'error') toast.error(text);
            else if (outcome.tone === 'success') toast.success(text);
            else toast(text);
        } catch (error) {
            reportSheetIssue({
                code: 'binding-unresolved',
                message: 'An action failed while it ran',
                details: { bindingKey: binding.key, error: String(error) },
            });
        } finally {
            setBusy(false);
        }
    };

    return (
        <button
            type="button"
            onClick={() => void run()}
            disabled={bound.readOnly || busy}
            aria-label={label}
            title={label}
            className="inline-flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-xs text-textPrimary hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
            <Droplet className="h-3.5 w-3.5 text-error" aria-hidden="true" />
            {!row && <span>{label}</span>}
        </button>
    );
}
