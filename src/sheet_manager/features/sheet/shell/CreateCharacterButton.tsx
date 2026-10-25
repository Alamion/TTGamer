import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { useSitePath } from '@site/src/shared/hooks/useSitePath';
import { Copy, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

import { describeError, reportSheetIssue } from '../../../diagnostics';
import { documentSettingLabel, systemRegistry } from '../../../systems';
import { createFromChoice } from '../../documents/createFromChoice';

interface CreateCharacterButtonProps {
    /** System of the created document (defaults to the Star Wars character for existing docs). */
    systemId?: string;
    definitionId?: string;
    /** Creates a copy of this example of the kind instead of a blank document (spec 039). */
    exampleId?: string;
}

const labels = uiMessages.sheet.documents.docsCreate;

/** What the button makes: "Character (Vampire: the Masquerade 5e)", or the example's name. */
function describeTarget(systemId: string, definitionId: string, exampleId: string | undefined) {
    const system = systemRegistry.getSystem(systemId);
    const definition = systemRegistry.getDocumentDefinition(systemId, definitionId);
    if (!system || !definition) return undefined;
    if (exampleId) {
        const example = definition.examples?.find(({ id }) => id === exampleId);
        if (!example) return undefined;
        return { copy: example.create(translate).metadata.title || translate(example.label) };
    }
    const kind = `${translate(definition.label)} (${translate(documentSettingLabel(system, definition))})`;
    return { kind };
}

/**
 * A creation action embedded in documentation (spec 039, D9): it names what it makes, creates at
 * once through the dialog's create path, and confirms with a link to the sheet.
 */
export function CreateCharacterButton({
    systemId = 'star-wars-wod',
    definitionId = 'character',
    exampleId,
}: CreateCharacterButtonProps) {
    const sitePath = useSitePath();
    const target = describeTarget(systemId, definitionId, exampleId);
    const label = target?.copy
        ? translate(labels.copy, { name: target.copy })
        : translate(labels.newKind, { kind: target?.kind ?? definitionId });

    const create = () => {
        try {
            const created = createFromChoice(
                { systemId, definitionId },
                exampleId ? { exampleId } : {}
            );
            const name = created.metadata.title || target?.kind || definitionId;
            toast.success(
                <span>
                    {translate(labels.created, { name })}{' '}
                    <a href={sitePath('/universal_sheet')} className="font-medium underline">
                        {translate(labels.open)}
                    </a>
                </span>
            );
        } catch (error) {
            reportSheetIssue({
                code: 'create-kind-unavailable',
                message:
                    'A documentation create button names a kind or example that is not installed',
                details: { systemId, definitionId, exampleId, error: describeError(error) },
            });
            toast.error(
                translate(labels.failed, { name: target?.copy ?? target?.kind ?? definitionId })
            );
        }
    };

    const Icon = exampleId ? Copy : Plus;
    return (
        <button
            type="button"
            onClick={create}
            className="inline-flex items-center justify-center gap-1.5 rounded-sm border border-transparent bg-primary-muted px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary focus:outline-hidden focus:ring-2 focus:ring-primary/50"
        >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
        </button>
    );
}
