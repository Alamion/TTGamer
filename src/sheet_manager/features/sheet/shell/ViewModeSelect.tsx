import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { DocumentDefinition } from '../../../systems';
import type { DocumentViewId } from '../../../types/document';

export interface TemplatePageOption {
    id: string;
    name: string;
    /** Feature 004: subtle "default" badge for default templates (clarification Q5). */
    isDefault?: boolean;
}

export interface ViewModeSelectProps {
    /** The built-in views the reader can pick (see `selectableViews`). */
    views: DocumentDefinition['views'];
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

/**
 * The built-in views a document can switch to. A user setting that assigns its own page to the
 * document's type replaces them: picking one would only fall back to the setting's page.
 */
export function selectableViews(
    definition: DocumentDefinition,
    document: { definitionId: string; metadata: { settingId?: string } },
    settings: Readonly<Record<string, { pages: Readonly<Record<string, string>> } | undefined>>
): DocumentDefinition['views'] {
    const settingId = document.metadata.settingId;
    const settingPage = settingId ? settings[settingId]?.pages[document.definitionId] : undefined;
    return settingPage ? [] : definition.views;
}

export function ViewModeSelect({
    views,
    onChangeTemplate,
    onChangeView,
    templateOptions,
    value,
}: ViewModeSelectProps) {
    // FR-13: exactly one entry per page — view ids are default templates; skip custom-template
    // options whose id collides with a registered view id (they resolve through the same page).
    const viewIds = new Set<string>(views.map(({ id }) => id));
    const extraTemplates = templateOptions.filter((option) => !viewIds.has(option.id));
    // One page leaves nothing to switch to.
    if (views.length + extraTemplates.length < 2) return null;

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
                {views.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                        {translate(candidate.label)}
                    </option>
                ))}
                {extraTemplates.map((template) => (
                    <option key={template.id} value={`${TEMPLATE_PREFIX}${template.id}`}>
                        {template.name}
                    </option>
                ))}
            </select>
        </label>
    );
}
