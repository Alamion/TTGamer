import { translate } from '@docusaurus/Translate';

import { useDocumentTypeStore } from '../../../../store/documentTypeStore';
import type { FromCatalog } from '../../../../types/template';
import { getCatalogBinding, listCatalogBindingsFor } from '../../../sheet/data/catalogBindings';
import { useEditorModel } from '../../session/EditorModel';
import { FormulaField } from '../../settings/FormulaField';
import { inputClasses } from '../../settings/inputClasses';
import { SettingField } from '../../settings/SettingField';
import { useCatalogOptions } from '../CatalogBindingEditor';
import { ToggleRow } from '../LayoutControls';
import { editor, t } from './shared';

const labelOf = (label: { id: string; message: string } | string) =>
    typeof label === 'string' ? label : translate(label);

/**
 * A text field's From catalog (spec 038 D9): the catalog, the value naming the entry, the text,
 * an optional other text while a formula holds, and whether it is shown or only suggested.
 */
export function FromCatalogSetting({
    value,
    onChange,
    setting,
}: {
    value: FromCatalog | undefined;
    onChange: (next: FromCatalog | undefined) => void;
    setting: string;
}) {
    const model = useEditorModel();
    const userCatalogs = useDocumentTypeStore((state) => state.catalogs);
    const options = useCatalogOptions(value?.catalogId);
    const catalog = value ? getCatalogBinding(value.catalogId, userCatalogs) : undefined;
    const texts = catalog?.texts ?? [];
    const start = (): FromCatalog | undefined => {
        const scoped = listCatalogBindingsFor(model);
        const first = [...scoped.setting, ...scoped.ruleset, ...scoped.shipped].find(
            (candidate) => (candidate.texts ?? []).length > 0
        );
        if (!first) return undefined;
        return {
            catalogId: first.catalogId,
            entryFrom: 'name',
            text: first.texts![0]!.key,
            mode: 'suggest',
        };
    };
    const set = (next: Partial<FromCatalog>) => value && onChange({ ...value, ...next });
    const textOptions = texts.map((text) => (
        <option key={text.key} value={text.key}>
            {labelOf(text.label)}
        </option>
    ));
    return (
        <div className="grid gap-2">
            <ToggleRow
                checked={value !== undefined}
                label={t(editor.fromCatalog)}
                hint={t(editor.fromCatalogHint)}
                setting={setting}
                onChange={(checked) => onChange(checked ? start() : undefined)}
            />
            {value && (
                <div className="grid gap-2 pl-5">
                    <SettingField label={t(editor.fromCatalogCatalog)}>
                        {(control) => (
                            <select
                                {...control}
                                value={value.catalogId}
                                onChange={(event) => {
                                    const next = getCatalogBinding(
                                        event.target.value,
                                        userCatalogs
                                    );
                                    set({
                                        catalogId: event.target.value,
                                        text: next?.texts?.[0]?.key ?? value.text,
                                        alternative: undefined,
                                    });
                                }}
                                className={`${inputClasses} w-full`}
                            >
                                {options}
                            </select>
                        )}
                    </SettingField>
                    <SettingField
                        label={t(editor.fromCatalogEntry)}
                        hint={t(editor.fromCatalogEntryHint)}
                    >
                        {(control) => (
                            <input
                                {...control}
                                value={value.entryFrom}
                                list={model.coordinateListId}
                                spellCheck={false}
                                onChange={(event) => set({ entryFrom: event.target.value })}
                                className={`${inputClasses} w-full font-mono`}
                            />
                        )}
                    </SettingField>
                    <SettingField label={t(editor.fromCatalogText)}>
                        {(control) => (
                            <select
                                {...control}
                                value={value.text}
                                onChange={(event) => set({ text: event.target.value })}
                                className={`${inputClasses} w-full`}
                            >
                                {textOptions}
                            </select>
                        )}
                    </SettingField>
                    <ToggleRow
                        checked={value.alternative !== undefined}
                        label={t(editor.fromCatalogAlternative)}
                        onChange={(checked) =>
                            set({
                                alternative: checked
                                    ? { text: texts[1]?.key ?? value.text, when: '1' }
                                    : undefined,
                            })
                        }
                    />
                    {value.alternative && (
                        <div className="grid gap-2 pl-5">
                            <SettingField label={t(editor.fromCatalogAlternativeText)}>
                                {(control) => (
                                    <select
                                        {...control}
                                        value={value.alternative!.text}
                                        onChange={(event) =>
                                            set({
                                                alternative: {
                                                    ...value.alternative!,
                                                    text: event.target.value,
                                                },
                                            })
                                        }
                                        className={`${inputClasses} w-full`}
                                    >
                                        {textOptions}
                                    </select>
                                )}
                            </SettingField>
                            <FormulaField
                                help="formulas"
                                label={t(editor.fromCatalogWhen)}
                                setting={`${setting}.when`}
                                value={value.alternative.when}
                                onChange={(when) =>
                                    set({
                                        alternative: { ...value.alternative!, when: when ?? '1' },
                                    })
                                }
                            />
                        </div>
                    )}
                    <SettingField label={t(editor.fromCatalogMode)}>
                        {(control) => (
                            <select
                                {...control}
                                value={value.mode}
                                onChange={(event) =>
                                    set({ mode: event.target.value as FromCatalog['mode'] })
                                }
                                className={`${inputClasses} w-full`}
                            >
                                <option value="suggest">{t(editor.fromCatalogModeSuggest)}</option>
                                <option value="show">{t(editor.fromCatalogModeShow)}</option>
                            </select>
                        )}
                    </SettingField>
                </div>
            )}
        </div>
    );
}
