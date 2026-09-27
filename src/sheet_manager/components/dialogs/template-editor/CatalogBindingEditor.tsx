import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { Link2Off } from 'lucide-react';
import { useMemo } from 'react';

import {
    catalogDisplayName,
    type CatalogFillKind,
    getCatalogBinding,
    listCatalogBindingsFor,
} from '../../../features/sheet/data/catalogBindings';
import { useDocumentTypeStore } from '../../../store/documentTypeStore';
import { systemRegistry } from '../../../systems';
import type { TemplateField } from '../../../types/template';
import { EditorHelp } from './EditorHelp';
import { type FillTarget, useEditorModel, useFillTargets } from './EditorModel';

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

function kindCompatible(detailKind: CatalogFillKind, target: FillTarget): boolean {
    if (detailKind === 'text') return target.type === 'text';
    return target.type === 'number' || target.type === 'rating' || target.type === 'resource';
}

interface CatalogBindingEditorProps {
    callbacks: CatalogBindingEditorCallbacks;
    field: Extract<TemplateField, { type: 'select' }>;
    selfId: string;
}

/**
 * The catalogs a draft may bind, as `<option>`s grouped by owner (spec 015): this setting, its
 * ruleset, then the system's shipped catalogs. A bound catalog outside that scope stays listed.
 */
function useCatalogOptions(bound: string | undefined) {
    const { systemId, documentKind, settingId } = useEditorModel();
    const t = (descriptor: { message: string }) => translate(descriptor);
    // Re-list when the user's catalogs change (created or renamed in the library).
    const userCatalogs = useDocumentTypeStore((state) => state.catalogs);
    const groups = useMemo(() => {
        const scoped = listCatalogBindingsFor({ systemId, documentKind, settingId });
        const ruleset = scoped.rulesetId ? systemRegistry.getSystem(scoped.rulesetId) : undefined;
        const system = systemRegistry.getSystem(systemId);
        return [
            { label: t(bindingMessages.groupSetting), catalogs: scoped.setting },
            {
                label: ruleset ? translate(ruleset.label) : t(bindingMessages.groupSetting),
                catalogs: scoped.ruleset,
            },
            {
                label: translate(bindingMessages.groupShipped, {
                    system: system ? translate(system.label) : systemId,
                }),
                catalogs: scoped.shipped,
            },
        ].filter(({ catalogs }) => catalogs.length > 0);
        // userCatalogs: the scoped list reads the registry overlay, which follows the store.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [systemId, documentKind, settingId, userCatalogs]);
    const listed = new Set(groups.flatMap(({ catalogs }) => catalogs.map((c) => c.catalogId)));
    return (
        <>
            {bound && !listed.has(bound) && (
                <option value={bound}>{catalogDisplayName(bound)}</option>
            )}
            {groups.map(({ label, catalogs }) => (
                <optgroup key={label} label={label}>
                    {catalogs.map(({ catalogId }) => (
                        <option key={catalogId} value={catalogId}>
                            {catalogDisplayName(catalogId)}
                        </option>
                    ))}
                </optgroup>
            ))}
        </>
    );
}

/** A custom list's catalog: names suggest its entries, and a number column may set the value. */
export function ListCatalogPicker({
    catalog,
    onChange,
}: {
    catalog: { catalogId: string; valueFrom?: string } | undefined;
    onChange: (next: { catalogId: string; valueFrom?: string } | undefined) => void;
}) {
    const t = (descriptor: { message: string }) => translate(descriptor);
    const options = useCatalogOptions(catalog?.catalogId);
    const numbers = catalog
        ? (getCatalogBinding(catalog.catalogId)?.fillableDetails ?? []).filter(
              ({ kind }) => kind === 'number'
          )
        : [];
    return (
        <div className="flex flex-wrap items-center gap-2">
            <select
                value={catalog?.catalogId ?? ''}
                onChange={(event) =>
                    onChange(event.target.value ? { catalogId: event.target.value } : undefined)
                }
                aria-label={t(bindingMessages.listCatalog)}
                className={inputClasses}
            >
                <option value="">{t(bindingMessages.listCatalog)}</option>
                {options}
            </select>
            {catalog && (
                <select
                    value={catalog.valueFrom ?? ''}
                    onChange={(event) =>
                        onChange({
                            catalogId: catalog.catalogId,
                            ...(event.target.value ? { valueFrom: event.target.value } : {}),
                        })
                    }
                    aria-label={t(bindingMessages.valueFrom)}
                    className={inputClasses}
                >
                    <option value="">
                        {t(bindingMessages.valueFrom)}: {t(bindingMessages.none)}
                    </option>
                    {numbers.map(({ key, label }) => (
                        <option key={key} value={key}>
                            {label}
                        </option>
                    ))}
                </select>
            )}
            <EditorHelp topic="catalogs" about={t(bindingMessages.listCatalog)} />
        </div>
    );
}

export function CatalogBindingEditor({ callbacks, field, selfId }: CatalogBindingEditorProps) {
    const fillTargets = useFillTargets();
    const t = (descriptor: { message: string }) => translate(descriptor);
    const options = useCatalogOptions(field.binding?.catalogId);

    if (!field.binding) {
        return (
            <div className="flex items-center gap-2">
                <select
                    value=""
                    onChange={(event) => {
                        if (event.target.value) callbacks.onAttach(event.target.value);
                    }}
                    aria-label={t(bindingMessages.attach)}
                    className={inputClasses}
                >
                    <option value="">{t(bindingMessages.attach)}</option>
                    {options}
                </select>
                <EditorHelp topic="catalogs" about={t(bindingMessages.attach)} />
            </div>
        );
    }

    const binding = getCatalogBinding(field.binding.catalogId);
    const targets = fillTargets
        .filter((target) => target.id !== selfId)
        .map((target) => [target.id, target] as const);

    return (
        <div className="mt-2 rounded border border-border bg-bgBase p-2">
            <div className="flex items-center gap-2">
                <select
                    value={field.binding.catalogId}
                    onChange={(event) => callbacks.onAttach(event.target.value)}
                    aria-label={t(bindingMessages.catalog)}
                    className={inputClasses}
                >
                    {options}
                </select>
                <EditorHelp topic="catalogs" about={t(bindingMessages.catalog)} />
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
