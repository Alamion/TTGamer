import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { GroupNode, SectionNode } from '../../../types/template';
import type { NodeUpdates } from '../model/types';
import { ColumnLayoutControl, ToggleRow } from '../panels/LayoutControls';
import { type NodeEdits } from '../session/useNodeEdits';
import { type GroupedSettings } from '../settings/groupedSettings';
import { inputClasses } from '../settings/inputClasses';
import { settingLabel } from '../settings/registry';
import { SettingField } from '../settings/SettingField';
import { KindChoice } from './KindChoice';

const editor = uiMessages.sheet.templates.editor;

const t = (descriptor: { message: string }, values?: Record<string, string | number>) =>
    translate(descriptor, values);

export function TitleSetting({
    node,
    onChange,
}: {
    node: { title?: string };
    onChange: (title: string) => void;
}) {
    return (
        <SettingField label={settingLabel('title')} setting="title">
            {(control) => (
                <input
                    {...control}
                    value={node.title ?? ''}
                    onChange={(event) => onChange(event.target.value)}
                    className={`${inputClasses} w-full font-medium`}
                />
            )}
        </SettingField>
    );
}

function DocsLinkSetting({
    node,
    onChange,
}: {
    node: { docsPath?: string };
    onChange: (docsPath: string | undefined) => void;
}) {
    return (
        <SettingField label={settingLabel('docsPath')} help="documentationLink" setting="docsPath">
            {(control) => (
                <input
                    {...control}
                    value={node.docsPath ?? ''}
                    onChange={(event) => onChange(event.target.value.trim() || undefined)}
                    className={`${inputClasses} w-full`}
                />
            )}
        </SettingField>
    );
}

export function sectionSettings(node: SectionNode, callbacks: NodeEdits): GroupedSettings {
    const update = (updates: NodeUpdates) => callbacks.onUpdate(node.id, updates);
    return {
        content: (
            <>
                <KindChoice
                    node={node}
                    onSwitch={(kind) => callbacks.onSwitchKind(node.id, kind)}
                />
                <TitleSetting node={node} onChange={(title) => update({ title })} />
            </>
        ),
        look: (
            <ColumnLayoutControl
                columns={node.columns}
                columnWidths={node.columnWidths}
                onChange={update}
            />
        ),
        visibility: (
            <>
                <ToggleRow
                    checked={node.defaultCollapsed === true}
                    label={settingLabel('defaultCollapsed')}
                    setting="defaultCollapsed"
                    onChange={(checked) => update({ defaultCollapsed: checked })}
                />
                <DocsLinkSetting node={node} onChange={(docsPath) => update({ docsPath })} />
            </>
        ),
    };
}

export function groupSettings(node: GroupNode, callbacks: NodeEdits): GroupedSettings {
    const update = (updates: NodeUpdates) => callbacks.onUpdate(node.id, updates);
    return {
        content: (
            <>
                <KindChoice
                    node={node}
                    onSwitch={(kind) => callbacks.onSwitchKind(node.id, kind)}
                />
                <TitleSetting node={node} onChange={(title) => update({ title })} />
            </>
        ),
        look: (
            <>
                <ToggleRow
                    checked={!node.hideTitle}
                    label={settingLabel('hideTitle')}
                    setting="hideTitle"
                    onChange={(checked) => update({ hideTitle: !checked })}
                />
                <ColumnLayoutControl
                    columns={node.columns}
                    columnWidths={node.columnWidths}
                    onChange={update}
                />
            </>
        ),
        visibility: (
            <>
                <ToggleRow
                    checked={node.collapsible && !node.hideTitle}
                    disabled={node.hideTitle === true}
                    hint={node.hideTitle ? t(editor.hiddenTitleHint) : undefined}
                    label={settingLabel('collapsible')}
                    setting="collapsible"
                    onChange={(checked) => update({ collapsible: checked })}
                />
                {node.collapsible && !node.hideTitle && (
                    <ToggleRow
                        checked={node.defaultCollapsed === true}
                        label={settingLabel('defaultCollapsed')}
                        setting="defaultCollapsed"
                        onChange={(checked) => update({ defaultCollapsed: checked })}
                    />
                )}
                {!node.hideTitle && (
                    <DocsLinkSetting node={node} onChange={(docsPath) => update({ docsPath })} />
                )}
            </>
        ),
    };
}
