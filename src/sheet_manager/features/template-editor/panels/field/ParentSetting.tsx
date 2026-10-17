import { useDocumentTypeStore } from '../../../../store/documentTypeStore';
import type { CatalogParent, LimitByParent } from '../../../../types/template';
import { getCatalogBinding } from '../../../sheet/data/catalogBindings';
import { useEditorModel } from '../../session/EditorModel';
import { inputClasses } from '../../settings/inputClasses';
import { SettingField } from '../../settings/SettingField';
import { ToggleRow } from '../LayoutControls';
import { editor, t } from './shared';

/**
 * A catalog choice under a parent list (spec 038, US5): the list naming the parents, the entry
 * detail that names an entry's parent, and the detail holding its level (kept at or below the
 * parent's rating).
 */
export function CatalogParentSetting({
    catalogId,
    value,
    onChange,
    setting,
}: {
    catalogId: string;
    value: CatalogParent | undefined;
    onChange: (next: CatalogParent | undefined) => void;
    setting: string;
}) {
    const { coordinateListId } = useEditorModel();
    const userCatalogs = useDocumentTypeStore((state) => state.catalogs);
    const details = getCatalogBinding(catalogId, userCatalogs)?.fillableDetails ?? [];
    const detailOptions = (kinds: readonly string[]) =>
        details
            .filter(({ kind }) => kinds.includes(kind))
            .map(({ key, label }) => (
                <option key={key} value={key}>
                    {label}
                </option>
            ));
    return (
        <div className="grid gap-2">
            <ToggleRow
                checked={value !== undefined}
                label={t(editor.limitByParent)}
                hint={t(editor.limitByParentHint)}
                setting={setting}
                onChange={(checked) =>
                    onChange(
                        checked
                            ? {
                                  list: 'parents',
                                  via: details.find(({ kind }) => kind === 'text')?.key ?? 'parent',
                              }
                            : undefined
                    )
                }
            />
            {value && (
                <div className="grid gap-2 pl-5">
                    <SettingField label={t(editor.parentList)}>
                        {(control) => (
                            <input
                                {...control}
                                value={value.list}
                                list={coordinateListId}
                                spellCheck={false}
                                onChange={(event) =>
                                    onChange({ ...value, list: event.target.value })
                                }
                                className={`${inputClasses} w-full font-mono`}
                            />
                        )}
                    </SettingField>
                    <SettingField label={t(editor.parentVia)}>
                        {(control) => (
                            <select
                                {...control}
                                value={value.via}
                                onChange={(event) =>
                                    onChange({ ...value, via: event.target.value })
                                }
                                className={`${inputClasses} w-full`}
                            >
                                {detailOptions(['text'])}
                            </select>
                        )}
                    </SettingField>
                    <SettingField label={t(editor.parentLevel)}>
                        {(control) => (
                            <select
                                {...control}
                                value={value.level ?? ''}
                                onChange={(event) => {
                                    const { level: _old, ...rest } = value;
                                    void _old;
                                    onChange(
                                        event.target.value
                                            ? { ...rest, level: event.target.value }
                                            : rest
                                    );
                                }}
                                className={`${inputClasses} w-full`}
                            >
                                <option value="">{t(editor.parentNoLevel)}</option>
                                {detailOptions(['number', 'text'])}
                            </select>
                        )}
                    </SettingField>
                </div>
            )}
        </div>
    );
}

const DEFAULT_LIMIT: LimitByParent = { entryKey: 'level', column: 'level', parentValue: 'value' };

/** Built-in rows under a parent (a power by its discipline): the page's limit by the parent row. */
export function RowsLimitSetting({
    value,
    onChange,
}: {
    value: LimitByParent | undefined;
    onChange: (next: LimitByParent | undefined) => void;
}) {
    const text = (key: keyof LimitByParent, label: { message: string }) => (
        <SettingField label={t(label)}>
            {(control) => (
                <input
                    {...control}
                    value={value?.[key] ?? ''}
                    spellCheck={false}
                    onChange={(event) =>
                        value &&
                        onChange({ ...value, [key]: event.target.value || DEFAULT_LIMIT[key] })
                    }
                    className={`${inputClasses} w-full font-mono`}
                />
            )}
        </SettingField>
    );
    return (
        <div className="grid gap-2">
            <ToggleRow
                checked={value !== undefined}
                label={t(editor.limitByParent)}
                hint={t(editor.limitByParentHint)}
                setting="limitByParent"
                onChange={(checked) => onChange(checked ? DEFAULT_LIMIT : undefined)}
            />
            {value && (
                <div className="grid gap-2 pl-5">
                    {text('entryKey', editor.limitEntryLevel)}
                    {text('column', editor.limitRowLevel)}
                    {text('parentValue', editor.limitParentRating)}
                </div>
            )}
        </div>
    );
}
