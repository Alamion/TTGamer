import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { Link2Off } from 'lucide-react';

import {
    CATALOG_BINDINGS,
    type CatalogFillKind,
} from '../../../features/sheet/data/catalogBindings';
import type { CustomTemplate, TemplateField } from '../../../types/template';
import { collectTemplateFields } from '../../../types/template';

const bindingMessages = uiMessages.sheet.templates.binding;

const inputClasses =
    'rounded border border-border bg-bgSurface px-2 py-1 text-xs text-textPrimary focus:outline-none focus:ring-1 focus:ring-primary';

export interface CatalogBindingEditorCallbacks {
    onAttach: (catalogId: string) => void;
    onDetach: () => void;
    onUpdateFill: (
        detailKey: string,
        rule: { targetFieldId: string; disabled?: boolean } | undefined
    ) => void;
}

function kindCompatible(detailKind: CatalogFillKind, target: TemplateField): boolean {
    if (detailKind === 'text') return target.type === 'text';
    return target.type === 'number' || target.type === 'rating' || target.type === 'resource';
}

interface CatalogBindingEditorProps {
    callbacks: CatalogBindingEditorCallbacks;
    draft: CustomTemplate;
    field: Extract<TemplateField, { type: 'select' }>;
    selfId: string;
}

export function CatalogBindingEditor({
    callbacks,
    draft,
    field,
    selfId,
}: CatalogBindingEditorProps) {
    const t = (descriptor: { message: string }) => translate(descriptor);
    const catalogOptions = [...CATALOG_BINDINGS.values()];

    if (!field.binding) {
        return (
            <select
                value=""
                onChange={(event) => {
                    if (event.target.value) callbacks.onAttach(event.target.value);
                }}
                aria-label={t(bindingMessages.attach)}
                className={inputClasses}
            >
                <option value="">{t(bindingMessages.attach)}</option>
                {catalogOptions.map((binding) => (
                    <option key={binding.catalogId} value={binding.catalogId}>
                        {binding.catalogId}
                    </option>
                ))}
            </select>
        );
    }

    const binding = CATALOG_BINDINGS.get(field.binding.catalogId);
    const targets = [...collectTemplateFields(draft).entries()].filter(([id]) => id !== selfId);

    return (
        <div className="mt-2 rounded border border-border bg-bgBase p-2">
            <div className="flex items-center gap-2">
                <select
                    value={field.binding.catalogId}
                    onChange={(event) => callbacks.onAttach(event.target.value)}
                    aria-label={t(bindingMessages.catalog)}
                    className={inputClasses}
                >
                    {catalogOptions.map((option) => (
                        <option key={option.catalogId} value={option.catalogId}>
                            {option.catalogId}
                        </option>
                    ))}
                </select>
                <button
                    type="button"
                    onClick={callbacks.onDetach}
                    aria-label={t(bindingMessages.attach)}
                    className="rounded p-1 text-textSecondary hover:bg-bgSurface hover:text-error"
                >
                    <Link2Off className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
            </div>

            {binding && (
                <div className="mt-2 space-y-1">
                    <p className="text-xs font-medium text-textSecondary">
                        {t(bindingMessages.fills)}
                    </p>
                    {binding.fillableDetails.map((detail) => {
                        const rule = field.binding?.fills[detail.key];
                        const compatible = targets.filter(([, target]) =>
                            kindCompatible(detail.kind, target)
                        );
                        return (
                            <div key={detail.key} className="flex items-center gap-2">
                                <label className="flex min-w-0 flex-1 items-center gap-1 text-xs text-textSecondary">
                                    <input
                                        type="checkbox"
                                        checked={rule !== undefined && !rule.disabled}
                                        onChange={(event) =>
                                            callbacks.onUpdateFill(
                                                detail.key,
                                                event.target.checked
                                                    ? { targetFieldId: rule?.targetFieldId ?? '' }
                                                    : rule
                                                      ? { ...rule, disabled: true }
                                                      : undefined
                                            )
                                        }
                                        className="h-3.5 w-3.5"
                                    />
                                    {detail.label}
                                </label>
                                <select
                                    value={rule?.targetFieldId ?? ''}
                                    onChange={(event) =>
                                        callbacks.onUpdateFill(detail.key, {
                                            targetFieldId: event.target.value,
                                            disabled: rule?.disabled,
                                        })
                                    }
                                    aria-label={`${detail.label} — ${t(bindingMessages.fillTarget)}`}
                                    className={inputClasses}
                                >
                                    <option value="">{t(bindingMessages.fillTarget)}</option>
                                    {compatible.map(([id, target]) => (
                                        <option key={id} value={id}>
                                            {target.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
