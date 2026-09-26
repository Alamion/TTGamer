import Translate, { translate } from '@docusaurus/Translate';
import * as Dialog from '@radix-ui/react-dialog';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { useState } from 'react';

import { newDocumentPage } from '../../features/sheet/data/libraryPages';
import { useDocumentStore } from '../../store/documentStore';
import { useDocumentTypeStore } from '../../store/documentTypeStore';
import { useTemplateStore } from '../../store/templateStore';
import { documentSettingLabel, systemRegistry } from '../../systems';
import { isUserKind, type UserSetting } from '../../systems/userTypes';

interface DocumentCreateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type DefinitionEntry = ReturnType<typeof systemRegistry.listDefinitions>[number];

/** `system/definition`, plus `/setting` for entries of a user setting. */
const optionValue = (systemId: string, definitionId: string, settingId?: string) =>
    settingId ? `${systemId}/${definitionId}/${settingId}` : `${systemId}/${definitionId}`;

interface CreateGroup {
    key: string;
    /** A translated setting label, or a user setting's own name. */
    label: string;
    settingId?: string;
    entries: DefinitionEntry[];
}

/**
 * Shipped settings (a system, or a module of a shared ruleset) with their user types, in registry
 * order; then each user setting with its ruleset's core definitions and its own types (spec 012).
 */
function createGroups(settings: Readonly<Record<string, UserSetting>>): CreateGroup[] {
    const { types } = systemRegistry.getUserDocumentTypes();
    const settingOf = (definitionId: string) => {
        const owner = types[definitionId]?.owner;
        return owner && 'settingId' in owner ? owner.settingId : undefined;
    };
    const groups: CreateGroup[] = [];
    const all = systemRegistry.listDefinitions();
    for (const entry of all) {
        if (settingOf(entry.definition.id)) continue;
        const label = documentSettingLabel(entry.system, entry.definition);
        const key = `${entry.system.id}/${label.id}`;
        const group = groups.find((candidate) => candidate.key === key);
        if (group) group.entries.push(entry);
        else groups.push({ key, label: translate(label), entries: [entry] });
    }
    for (const setting of Object.values(settings)) {
        const system = systemRegistry.getSystem(setting.systemId);
        if (!system) continue;
        const core = all.filter(
            ({ system: owner, definition }) =>
                owner.id === system.id && (system.coreDefinitions ?? []).includes(definition.id)
        );
        const own = all.filter(({ definition }) => settingOf(definition.id) === setting.id);
        groups.push({
            key: setting.id,
            label: setting.name,
            settingId: setting.id,
            entries: [...core, ...own],
        });
    }
    return groups;
}

/** Lists every registered document definition, grouped by setting. */
export function DocumentCreateDialog({ open, onOpenChange }: DocumentCreateDialogProps) {
    const createDocument = useDocumentStore((state) => state.createDocument);
    // The registry lists installed user types; subscribing re-renders when they change.
    const userTypes = useDocumentTypeStore((state) => state.types);
    const settings = useDocumentTypeStore((state) => state.settings);
    const groups = createGroups(settings);
    const first = systemRegistry.listDefinitions()[0];
    const [selected, setSelected] = useState(
        first ? optionValue(first.system.id, first.definition.id) : ''
    );
    const modalRoot =
        typeof document === 'undefined' ? undefined : document.getElementById('modal-root');

    const handleCreate = () => {
        const [systemId, definitionId, settingId] = selected.split('/');
        if (!systemId || !definitionId) return;
        // A core definition in a user setting opens on the setting's own page, when it has one.
        const templateId = settingId ? settings[settingId]?.pages[definitionId] : undefined;
        // A shipped type opens on the page the library chose as its default (spec 013).
        const page = newDocumentPage(systemRegistry, systemId, definitionId, settingId, {
            templates: useTemplateStore.getState().templates,
            defaultPages: useDocumentTypeStore.getState().defaultPages,
        });
        createDocument(systemId, definitionId, {
            settingId,
            templateId: templateId ?? page.templateId,
            ...(page.preferredViewId ? { preferredViewId: page.preferredViewId } : {}),
        });
        onOpenChange(false);
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal container={modalRoot ?? undefined}>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[9998]" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-[9999] max-h-[calc(100%-2rem)] w-[min(30rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-bgSurface p-6 shadow-xl focus:outline-none">
                    <Dialog.Title className="text-lg font-semibold text-textPrimary">
                        <Translate id="ttgamer.ui.sheet.documents.create.title" />
                    </Dialog.Title>
                    <Dialog.Description className="mt-2 text-sm text-textSecondary">
                        <Translate id="ttgamer.ui.sheet.documents.create.prompt" />
                    </Dialog.Description>
                    <div className="mt-5 grid gap-4">
                        {groups.map((group) => (
                            <fieldset key={group.key} className="grid gap-2">
                                <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-textSecondary">
                                    {group.label}
                                </legend>
                                {group.entries.map(({ system, definition }) => {
                                    const value = optionValue(
                                        system.id,
                                        definition.id,
                                        group.settingId
                                    );
                                    return (
                                        <label
                                            key={value}
                                            className="flex cursor-pointer items-center gap-3 rounded border border-border p-3 hover:bg-bgBase"
                                        >
                                            <input
                                                type="radio"
                                                name="document-definition"
                                                value={value}
                                                checked={selected === value}
                                                onChange={() => setSelected(value)}
                                            />
                                            <span className="grid gap-0.5">
                                                <span className="text-sm font-medium text-textPrimary">
                                                    {translate(definition.label)}
                                                </span>
                                                {isUserKind(definition.id) && (
                                                    // Types may share a name; the description
                                                    // tells them apart.
                                                    <span className="text-xs text-textSecondary">
                                                        {userTypes[definition.id]?.description ||
                                                            translate(
                                                                uiMessages.sheet.templates.library
                                                                    .noDescription
                                                            )}
                                                    </span>
                                                )}
                                            </span>
                                        </label>
                                    );
                                })}
                            </fieldset>
                        ))}
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        <Dialog.Close asChild>
                            <button
                                type="button"
                                className="rounded border border-border bg-bgSurface px-3 py-2 text-sm text-textPrimary hover:bg-bgBase"
                            >
                                <Translate id="ttgamer.ui.sheet.documents.create.cancel" />
                            </button>
                        </Dialog.Close>
                        <button
                            type="button"
                            onClick={handleCreate}
                            className="rounded border border-transparent bg-primary-muted px-3 py-2 text-sm font-medium text-white hover:bg-primary"
                        >
                            <Translate id="ttgamer.ui.sheet.documents.create.confirm" />
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
