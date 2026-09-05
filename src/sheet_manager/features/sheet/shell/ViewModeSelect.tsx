import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { DocumentDefinition } from '../../../systems';
import type { DocumentViewId } from '../../../types/document';

export interface TemplatePageOption {
    id: string;
    name: string;
}

export interface ViewModeSelectProps {
    definition: DocumentDefinition;
    /** Value is either a built-in view id or `tpl:<templateId>`. */
    value: string;
    onChangeTemplate: (templateId: string | undefined) => void;
    onChangeView: (viewId: DocumentViewId) => void;
    templateOptions: ReadonlyArray<TemplatePageOption>;
}

const TEMPLATE_PREFIX = 'tpl:';

export function templateSelectValue(
    templateId: string | undefined,
    viewId: DocumentViewId
): string {
    return templateId ? `${TEMPLATE_PREFIX}${templateId}` : viewId;
}

export function ViewModeSelect({
    definition,
    onChangeTemplate,
    onChangeView,
    templateOptions,
    value,
}: ViewModeSelectProps) {
    const hasChoices = definition.views.length > 1 || templateOptions.length > 0;
    if (!hasChoices) return null;

    return (
        <label className="flex items-center gap-2 text-sm text-textSecondary">
            {translate(uiMessages.sheet.documents.views.label)}
            <select
                value={value}
                onChange={(event) => {
                    const next = event.target.value;
                    if (next.startsWith(TEMPLATE_PREFIX)) {
                        onChangeTemplate(next.slice(TEMPLATE_PREFIX.length));
                    } else {
                        onChangeTemplate(undefined);
                        onChangeView(next as DocumentViewId);
                    }
                }}
                className="rounded border border-border bg-bgSurface px-2 py-1.5 text-textPrimary"
            >
                {definition.views.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                        {translate(candidate.label)}
                    </option>
                ))}
                {templateOptions.map((template) => (
                    <option key={template.id} value={`${TEMPLATE_PREFIX}${template.id}`}>
                        {template.name}
                    </option>
                ))}
            </select>
        </label>
    );
}
