import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { shortLabelFor } from '../../sheet/declarative/shortLabels';
import { useDraftIsBrief } from '../session/context';
import { inputClasses } from '../settings/inputClasses';
import { settingLabel } from '../settings/registry';
import { SettingField } from '../settings/SettingField';
import { ToggleRow } from './LayoutControls';

const editor = uiMessages.sheet.templates.editor;

/**
 * A rating's label on a brief (spec 033, 041): short letters by default, the author's own, or the
 * full name. A full page always shows the name, so nothing is offered there.
 */
export function ShortFormSettings({
    node,
    label,
    prefix = '',
    onChange,
}: {
    node: { fullLabel?: true; shortLabel?: string; labelMessage?: string; termRef?: string };
    /** The label the rating shows, for the letters it would take by default. */
    label: string;
    prefix?: string;
    onChange: (updates: { fullLabel?: true; shortLabel?: string }) => void;
}) {
    const brief = useDraftIsBrief();
    if (!brief) return null;
    const derived = shortLabelFor(node, label, 'en', 'ru');
    return (
        <>
            <ToggleRow
                checked={node.fullLabel === true}
                label={settingLabel('fullLabel')}
                setting={`${prefix}fullLabel`}
                onChange={(checked) =>
                    onChange(
                        checked
                            ? { fullLabel: true, shortLabel: undefined }
                            : { fullLabel: undefined }
                    )
                }
            />
            {node.fullLabel !== true && (
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
