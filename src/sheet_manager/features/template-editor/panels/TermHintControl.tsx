import { translate } from '@docusaurus/Translate';
import { bookTerms } from '@site/src/i18n/generated/bookTerms';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { termLinkOf } from '../../../components/terms/termLink';
import { ToggleRow } from './LayoutControls';

const editor = uiMessages.sheet.templates.editor;

interface TermNode {
    labelMessage?: string;
    termRef?: string;
    termHint?: false;
}

/** Whether the node's label is a book term, so the hint switch applies. */
export function hasTermHint(node: TermNode): boolean {
    const { termRef } = termLinkOf(node);
    return termRef !== undefined && bookTerms[termRef] !== undefined;
}

/**
 * The book term a field or primitive stands for (spec 009, FR-016a) and the switch for its
 * English-name hint; nothing for labels that are not glossary terms.
 */
export function TermHintControl({
    node,
    onChange,
    setting = 'termHint',
}: {
    node: TermNode;
    onChange: (termHint: false | undefined) => void;
    setting?: string;
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
                setting={setting}
                onChange={(checked) => onChange(checked ? undefined : false)}
            />
        </div>
    );
}
