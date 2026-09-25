import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { usePluralMessage } from '@site/src/shared/hooks/usePluralMessage';
import { Globe2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { useDocumentStore } from '../../store/documentStore';
import { useDocumentTypeStore } from '../../store/documentTypeStore';
import { useTemplateStore } from '../../store/templateStore';
import { systemRegistry } from '../../systems';
import { newUserSettingId, type UserSetting } from '../../systems/userTypes';
import { SystemIdSchema } from '../../types/document';
import type { CustomTemplate } from '../../types/template';
import { ConfirmDialog } from './ConfirmDialog';

const library = uiMessages.sheet.templates.library;

const actionButton =
    'rounded border border-border bg-bgSurface px-2 py-1 text-xs font-medium text-textPrimary hover:bg-bgBase disabled:opacity-40';

/** The systems a user setting can be built on: those declaring engine-only core definitions. */
function rulesets() {
    return systemRegistry
        .getSystems()
        .filter((system) => (system.coreDefinitions ?? []).length > 0);
}

export interface SettingPageRequest {
    /** The page to open: the setting's existing page, or a new copy of the shipped one. */
    base: { kind: 'edit' | 'skeleton'; template: CustomTemplate };
    onSaved: (template: CustomTemplate) => void;
}

/**
 * User settings (spec 012): a named setting on a ruleset. Its characters use the ruleset's core
 * definitions on the setting's own pages; its document types live in it.
 */
export function UserSettingsPanel({
    onEditPage,
}: {
    onEditPage: (request: SettingPageRequest) => void;
}) {
    const settings = useDocumentTypeStore((state) => state.settings);
    const types = useDocumentTypeStore((state) => state.types);
    const saveSetting = useDocumentTypeStore((state) => state.saveSetting);
    const removeSetting = useDocumentTypeStore((state) => state.removeSetting);
    const removeType = useDocumentTypeStore((state) => state.removeType);
    const templates = useTemplateStore((state) => state.templates);
    const removeTemplate = useTemplateStore((state) => state.removeTemplate);
    const documents = useDocumentStore((state) => state.documents);
    const plural = usePluralMessage();
    const available = rulesets();
    const [ruleset, setRuleset] = useState<string>(available[0]?.id ?? '');
    const [name, setName] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<{ setting: UserSetting; count: number }>();

    const createSetting = () => {
        const trimmed = name.trim();
        if (!trimmed || !ruleset) return;
        const now = new Date().toISOString();
        saveSetting({
            id: newUserSettingId(),
            name: trimmed,
            systemId: SystemIdSchema.parse(ruleset),
            pages: {},
            createdAt: now,
            updatedAt: now,
        });
        setName('');
    };

    const editPage = (setting: UserSetting, definitionId: string) => {
        const system = systemRegistry.getSystem(setting.systemId);
        const definition = systemRegistry.getDocumentDefinition(setting.systemId, definitionId);
        if (!system || !definition) return;
        const existing = templates.find(({ id }) => id === setting.pages[definitionId]);
        const shipped = system.defaultTemplates?.find(({ id }) => id === definition.defaultViewId);
        const base = existing
            ? { kind: 'edit' as const, template: existing }
            : shipped
              ? {
                    kind: 'skeleton' as const,
                    template: {
                        ...shipped,
                        name: `${setting.name} — ${translate(definition.label)}`,
                        settingId: setting.id,
                    },
                }
              : undefined;
        if (!base) return;
        onEditPage({
            base,
            onSaved: (template) => {
                const current = useDocumentTypeStore.getState().settings[setting.id];
                if (!current) return;
                saveSetting({
                    ...current,
                    pages: { ...current.pages, [definitionId]: template.id },
                    updatedAt: new Date().toISOString(),
                });
            },
        });
    };

    const requestDelete = (setting: UserSetting) => {
        const ownTypes = new Set(
            Object.values(types)
                .filter(({ owner }) => 'settingId' in owner && owner.settingId === setting.id)
                .map(({ id }) => id)
        );
        const count = documents.filter(
            (document) =>
                document.metadata.settingId === setting.id || ownTypes.has(document.definitionId)
        ).length;
        setDeleteTarget({ setting, count });
    };

    const deleteSetting = (setting: UserSetting) => {
        // Types and pages go with the setting; documents stay (their pages fall back).
        for (const type of Object.values(types)) {
            if (!('settingId' in type.owner) || type.owner.settingId !== setting.id) continue;
            for (const template of templates) {
                if (template.documentKind === type.id) removeTemplate(template.id);
            }
            removeType(type.id);
        }
        for (const template of templates) {
            if (template.settingId === setting.id) removeTemplate(template.id);
        }
        removeSetting(setting.id);
    };

    return (
        <div className="mt-4" data-testid="user-settings-section">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-textSecondary">
                {translate(library.userSettings)}
            </h3>
            <ul className="mb-2 space-y-2">
                {Object.values(settings).map((setting) => {
                    const system = systemRegistry.getSystem(setting.systemId);
                    return (
                        <li
                            key={setting.id}
                            className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-bgBase p-3"
                        >
                            <Globe2
                                className="h-4 w-4 shrink-0 text-textSecondary"
                                aria-hidden="true"
                            />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-textPrimary">
                                    {setting.name}
                                </span>
                                <span className="block text-xs text-textSecondary">
                                    {system ? translate(system.label) : setting.systemId}
                                </span>
                            </span>
                            {(system?.coreDefinitions ?? []).map((definitionId) => {
                                const definition = systemRegistry.getDocumentDefinition(
                                    setting.systemId,
                                    definitionId
                                );
                                return definition ? (
                                    <button
                                        key={definitionId}
                                        type="button"
                                        onClick={() => editPage(setting, definitionId)}
                                        className={actionButton}
                                    >
                                        <Pencil
                                            className="mr-1 inline h-3 w-3"
                                            aria-hidden="true"
                                        />
                                        {translate(library.settingPage, {
                                            type: translate(definition.label),
                                        })}
                                    </button>
                                ) : null;
                            })}
                            <button
                                type="button"
                                onClick={() => requestDelete(setting)}
                                className={actionButton}
                            >
                                <Trash2 className="mr-1 inline h-3 w-3" aria-hidden="true" />
                                {translate(library.deleteSetting)}
                            </button>
                        </li>
                    );
                })}
            </ul>
            <p className="mb-2 text-xs text-textSecondary">{translate(library.newSettingHint)}</p>
            <div className="flex flex-wrap items-center gap-2">
                <select
                    value={ruleset}
                    onChange={(event) => setRuleset(event.target.value)}
                    aria-label={translate(library.settingRuleset)}
                    className="rounded border border-border bg-bgSurface px-2 py-1 text-xs text-textPrimary"
                >
                    {available.map((system) => (
                        <option key={system.id} value={system.id}>
                            {translate(system.label)}
                        </option>
                    ))}
                </select>
                <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    aria-label={translate(library.settingName)}
                    placeholder={translate(library.settingName)}
                    maxLength={80}
                    className="min-w-0 flex-1 rounded border border-border bg-bgSurface px-2 py-1 text-xs text-textPrimary"
                />
                <button
                    type="button"
                    onClick={createSetting}
                    disabled={name.trim().length === 0 || !ruleset}
                    className={actionButton}
                >
                    <Plus className="mr-1 inline h-3 w-3" aria-hidden="true" />
                    {translate(library.createSetting)}
                </button>
            </div>

            <ConfirmDialog
                open={deleteTarget !== undefined}
                onOpenChange={(isOpen) => {
                    if (!isOpen) setDeleteTarget(undefined);
                }}
                onConfirm={() => {
                    if (deleteTarget) deleteSetting(deleteTarget.setting);
                    setDeleteTarget(undefined);
                }}
                title={translate(library.deleteSetting)}
                description={
                    deleteTarget
                        ? plural(library.deleteSettingDescription, deleteTarget.count, {
                              name: deleteTarget.setting.name,
                          })
                        : ''
                }
                confirmLabel={translate(library.deleteSetting)}
                cancelLabel={translate(library.title)}
                variant="danger"
            />
        </div>
    );
}
