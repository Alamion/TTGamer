import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { PrimitiveNode, TemplateField } from '../../../types/template';
import { elementHelpFor } from '../../sheet/declarative/elementHelp';
import { ToggleRow } from '../panels/LayoutControls';
import { inputClasses } from './inputClasses';
import { settingLabel } from './registry';
import { SettingField } from './SettingField';

/** Fields and bound values share the same optional rules link and element-help switch. */
export function HelpSettings({
    node,
    update,
    prefix = '',
}: {
    node: TemplateField | PrimitiveNode;
    update: (updates: { docsPath?: string; hideHelp?: boolean }) => void;
    prefix?: string;
}) {
    return (
        <>
            <SettingField
                label={settingLabel('docsPath')}
                help="documentationLink"
                setting={`${prefix}docsPath`}
            >
                {(control) => (
                    <input
                        {...control}
                        value={node.docsPath ?? ''}
                        maxLength={500}
                        onChange={(event) =>
                            update({ docsPath: event.target.value.trim() || undefined })
                        }
                        className={`${inputClasses} w-full`}
                    />
                )}
            </SettingField>
            {elementHelpFor(node) && (
                <ToggleRow
                    checked={node.hideHelp === true}
                    label={settingLabel('hideHelp')}
                    hint={translate(uiMessages.sheet.templates.editor.hideHelpHint)}
                    setting={`${prefix}hideHelp`}
                    onChange={(checked) => update({ hideHelp: checked || undefined })}
                />
            )}
        </>
    );
}
