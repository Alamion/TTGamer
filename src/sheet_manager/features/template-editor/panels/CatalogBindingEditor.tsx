import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { Link2Off } from 'lucide-react';
import { useMemo } from 'react';

import { useDocumentTypeStore } from '../../../store/documentTypeStore';
import { systemRegistry } from '../../../systems';
import type { TemplateField } from '../../../types/template';
import {
    catalogDisplayName,
    type CatalogFillKind,
    catalogKindFitsListItem,
    getCatalogBinding,
    listCatalogBindingsFor,
} from '../../sheet/data/catalogBindings';
import { type FillTarget, useEditorModel, useFillTargets } from '../session/EditorModel';
import { SettingField } from '../settings/SettingField';

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
    /** The catalog select's `data-setting` key. */
    setting?: string;
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

/**
 * A custom list's catalog: names suggest its entries, and a column that fits the entry type may
 * set the entry's value (spec 016, R8).
 */
export function ListCatalogPicker({
    catalog,
    itemType,
    disabledNote,
    onChange,
    setting = 'catalog',
}: {
    catalog: { catalogId: string; valueFrom?: string } | undefined;
    itemType: string;
    setting?: string;
    /** Why the catalog cannot be set (unnamed entries have no name to suggest into). */
    disabledNote?: string;
    onChange: (next: { catalogId: string; valueFrom?: string } | undefined) => void;
}) {
    const t = (descriptor: { message: string }) => translate(descriptor);
    const options = useCatalogOptions(catalog?.catalogId);
    const fitting = catalog
        ? (getCatalogBinding(catalog.catalogId)?.fillableDetails ?? []).filter(({ kind }) =>
              catalogKindFitsListItem(kind, itemType)
          )
        : [];
    if (disabledNote) {
        return <p className="text-[11px] text-textSecondary">{disabledNote}</p>;
    }
    return (
        <div className="grid gap-2">
            <SettingField label={t(bindingMessages.listCatalog)} help="catalogs" setting={setting}>
                {(control) => (
                    <select
                        {...control}
                        value={catalog?.catalogId ?? ''}
                        onChange={(event) =>
                            onChange(
                                event.target.value ? { catalogId: event.target.value } : undefined
                            )
                        }
                        className={`${inputClasses} w-full`}
                    >
                        <option value="">{t(bindingMessages.none)}</option>
                        {options}
                    </select>
                )}
            </SettingField>
            {catalog && (
                <SettingField label={t(bindingMessages.valueFrom)}>
                    {(control) => (
                        <select
                            {...control}
                            value={catalog.valueFrom ?? ''}
                            onChange={(event) =>
                                onChange({
                                    catalogId: catalog.catalogId,
                                    ...(event.target.value
                                        ? { valueFrom: event.target.value }
                                        : {}),
                                })
                            }
                            className={`${inputClasses} w-full`}
                        >
                            <option value="">{t(bindingMessages.none)}</option>
                            {fitting.map(({ key, label }) => (
                                <option key={key} value={key}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    )}
                </SettingField>
            )}
        </div>
    );
}

export function CatalogBindingEditor({
    callbacks,
    field,
    selfId,
    setting = 'catalog',
}: CatalogBindingEditorProps) {
    const fillTargets = useFillTargets();
    const t = (descriptor: { message: string }) => translate(descriptor);
    const options = useCatalogOptions(field.binding?.catalogId);

    if (!field.binding) {
        return (
            <SettingField label={t(bindingMessages.attach)} help="catalogs" setting={setting}>
                {(control) => (
                    <select
                        {...control}
                        value=""
                        onChange={(event) => {
                            if (event.target.value) callbacks.onAttach(event.target.value);
                        }}
                        className={`${inputClasses} w-full`}
                    >
                        <option value="">{t(bindingMessages.none)}</option>
                        {options}
                    </select>
                )}
            </SettingField>
        );
    }

    const binding = getCatalogBinding(field.binding.catalogId);
    const targets = fillTargets
        .filter((target) => target.id !== selfId)
        .map((target) => [target.id, target] as const);

    return (
        <div className="grid gap-2 rounded border border-border bg-bgBase p-2">
            <div className="flex items-end gap-2">
                <SettingField
                    className="flex-1"
                    label={t(bindingMessages.catalog)}
                    help="catalogs"
                    setting={setting}
                >
                    {(control) => (
                        <select
                            {...control}
                            value={field.binding?.catalogId}
                            onChange={(event) => callbacks.onAttach(event.target.value)}
                            className={`${inputClasses} w-full`}
                        >
                            {options}
                        </select>
                    )}
                </SettingField>
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
                <div className="space-y-1" data-setting-list="">
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
