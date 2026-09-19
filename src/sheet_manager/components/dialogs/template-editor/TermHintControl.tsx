import { translate } from '@docusaurus/Translate';
import { bookTerms } from '@site/src/i18n/generated/bookTerms';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { termLinkOf } from '../../terms/termLink';
import { ToggleRow } from './LayoutControls';

const editor = uiMessages.sheet.templates.editor;

/**
 * The book term a field or primitive stands for (spec 009, FR-016a) and the switch for its
 * English-name hint; nothing for labels that are not glossary terms.
 */
export function TermHintControl({
    node,
    onChange,
}: {
    node: { labelMessage?: string; termRef?: string; termHint?: false };
    onChange: (termHint: false | undefined) => void;
}) {
    const { termRef } = termLinkOf(node);
    const term = termRef ? bookTerms[termRef] : undefined;
    if (!term) return null;
    return (
        <div className="grid gap-1">
            <span className="text-xs text-textSecondary">
                {translate(editor.bookTerm, { term: term.en })}
            </span>
            <ToggleRow
                checked={node.termHint !== false}
                label={translate(editor.showTermHint)}
                onChange={(checked) => onChange(checked ? undefined : false)}
            />
        </div>
    );
}
