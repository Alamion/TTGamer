import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { shortLabelFor } from '../../sheet/declarative/shortLabels';
import { inputClasses } from '../settings/inputClasses';
import { settingLabel } from '../settings/registry';
import { SettingField } from '../settings/SettingField';
import { ToggleRow } from './LayoutControls';

const editor = uiMessages.sheet.templates.editor;

/** A rating's brief look: the short label switch and the author's own letters (spec 033). */
export function ShortFormSettings({
    node,
    label,
    prefix = '',
    onChange,
}: {
    node: { shortForm?: boolean; shortLabel?: string; labelMessage?: string; termRef?: string };
    /** The label the rating shows, for the letters it would take by default. */
    label: string;
    prefix?: string;
    onChange: (updates: { shortForm?: boolean; shortLabel?: string }) => void;
}) {
    const derived = shortLabelFor(node, label, 'en', 'ru');
    return (
        <>
            <ToggleRow
                checked={node.shortForm === true}
                label={settingLabel('shortForm')}
                setting={`${prefix}shortForm`}
                onChange={(checked) =>
                    onChange(
                        checked
                            ? { shortForm: true }
                            : { shortForm: undefined, shortLabel: undefined }
                    )
                }
            />
            {node.shortForm === true && (
                <SettingField label={settingLabel('shortLabel')} setting={`${prefix}shortLabel`}>
                    {(control) => (
                        <input
                            {...control}
                            value={node.shortLabel ?? ''}
                            maxLength={4}
                            placeholder={translate(editor.shortLabelPlaceholder, { derived })}
                            onChange={(event) =>
                                onChange({
                                    shortLabel:
                                        event.target.value.trim().toUpperCase() || undefined,
                                })
                            }
                            className={`${inputClasses} w-24 uppercase`}
                        />
                    )}
                </SettingField>
            )}
        </>
    );
}
