import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { usePluralMessage } from '@site/src/shared/hooks/usePluralMessage';
import { Download } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { readLibraryState } from '../../../features/sheet/data/libraryActions';
import {
    findNode,
    type LibraryNode,
    type RulesetNode,
} from '../../../features/sheet/data/libraryTree';
import {
    buildLibraryFilename,
    buildLibraryPayload,
    downloadTextFile,
    exportClosure,
    isExportable,
    type LibraryPayload,
    serializeLibraryFile,
    tickState,
    toggleTick,
} from '../../../features/sheet/shell/libraryFile';
import { systemRegistry } from '../../../systems';
import { EditorHelp } from '../template-editor/EditorHelp';
import type { RowExtras } from './LibraryTree';
import { TickBox } from './TickBox';

const labels = uiMessages.sheet.library;

function addressName(address: LibraryPayload['addresses'][number]): string {
    const system = systemRegistry.getSystem(address.systemId);
    const parts = [system ? translate(system.label) : address.systemId];
    if (address.moduleId) {
        const module = system?.documents.find((d) => d.module?.id === address.moduleId)?.module;
        parts.push(module ? translate(module.label) : address.moduleId);
    }
    if (address.definitionId) {
        const definition = systemRegistry.getDocumentDefinition(
            address.systemId,
            address.definitionId
        );
        parts.push(definition ? translate(definition.label) : address.definitionId);
    }
    if (address.viewId) parts.push(address.viewId);
    return parts.join(' › ');
}

/** The export summary beside the tree: counts, addresses, the file preview, and Save. */
export function ExportPanel({
    payload,
    preview,
    onSave,
}: {
    payload: LibraryPayload;
    /** The file as it will be saved. */
    preview: string;
    onSave: () => void;
}) {
    const plural = usePluralMessage();
    const empty =
        payload.settings.length +
            payload.types.length +
            payload.templates.length +
            payload.overrides.length ===
        0;
    return (
        <section aria-labelledby="library-export-title" className="space-y-3 p-4">
            <div className="flex items-center gap-2">
                <h3
                    id="library-export-title"
                    className="flex-1 text-lg font-semibold text-textPrimary"
                >
                    {translate(labels.export.title)}
                </h3>
                <EditorHelp topic="libraryExport" about={translate(labels.export.title)} />
            </div>
            <p className="text-xs text-textSecondary">{translate(labels.export.hint)}</p>
            {empty ? (
                <p className="text-sm text-textSecondary">
                    {translate(labels.export.nothingPicked)}
                </p>
            ) : (
                <p className="text-sm text-textPrimary" data-testid="library-export-counts">
                    {translate(labels.export.counts, {
                        settings: plural(labels.counts.settings, payload.settings.length),
                        types: plural(labels.counts.types, payload.types.length),
                        pages: plural(
                            labels.counts.pages,
                            payload.templates.length + payload.overrides.length
                        ),
                    })}
                </p>
            )}
            {payload.addresses.length > 0 && (
                <div className="space-y-1">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-textSecondary">
                        {translate(labels.export.addresses)}
                    </h4>
                    <ul className="list-inside list-disc text-xs text-textSecondary">
                        {payload.addresses.map((address) => (
                            <li key={JSON.stringify(address)}>{addressName(address)}</li>
                        ))}
                    </ul>
                </div>
            )}
            <details className="rounded border border-border bg-bgBase">
                <summary className="cursor-pointer px-3 py-1.5 text-xs font-medium text-textPrimary">
                    {translate(labels.export.preview)}
                </summary>
                <pre
                    className="max-h-64 overflow-auto px-3 py-2 text-[11px] text-textSecondary"
                    data-testid="library-export-preview"
                >
                    {preview}
                </pre>
            </details>
            <button
                type="button"
                disabled={empty}
                onClick={onSave}
                className="inline-flex items-center gap-1.5 rounded bg-primary-muted px-3 py-1.5 text-sm font-medium text-white hover:bg-primary disabled:opacity-40"
            >
                <Download className="h-4 w-4" aria-hidden="true" />
                {translate(labels.export.save)}
            </button>
        </section>
    );
}

/**
 * Export mode (spec 013, US4): tri-state boxes over the tree, parents added automatically in
 * tertiary, and the summary with Save.
 */
export function useExportMode(tree: readonly RulesetNode[]) {
    const [picked, setPicked] = useState<Set<string>>(() => new Set());
    const closure = useMemo(() => exportClosure(tree, picked), [tree, picked]);
    const payload = useMemo(
        () => buildLibraryPayload(tree, closure, readLibraryState()),
        [tree, closure]
    );
    const preview = useMemo(() => serializeLibraryFile(payload), [payload]);

    const start = useCallback(
        (key?: string) => {
            const node = key ? findNode(tree, key)?.node : undefined;
            setPicked(node ? toggleTick(node, new Set()) : new Set());
        },
        [tree]
    );

    const toggle = useCallback((node: LibraryNode) => {
        if (!isExportable(node)) return;
        setPicked((current) => toggleTick(node, current));
    }, []);

    const rowExtras = (node: LibraryNode): RowExtras | undefined => {
        if (!isExportable(node)) return undefined;
        const autoFor = closure.auto.get(node.key);
        const value = tickState(node, picked);
        return {
            checkbox: (
                <TickBox
                    value={value}
                    auto={autoFor !== undefined}
                    label={translate(labels.export.tick, { name: node.name })}
                    onToggle={() => toggle(node)}
                />
            ),
            trailing:
                autoFor !== undefined ? (
                    <span className="hidden shrink-0 text-[11px] text-tertiary sm:inline">
                        {translate(labels.export.addedFor, { child: autoFor })}
                    </span>
                ) : undefined,
        };
    };

    const save = () => {
        const [first] = [...payload.settings, ...payload.types, ...payload.templates];
        const single =
            payload.settings.length + payload.types.length + payload.templates.length === 1
                ? first?.name
                : undefined;
        const filename = buildLibraryFilename(single);
        downloadTextFile(preview, filename);
        toast.success(translate(labels.export.saved, { filename }));
    };

    return {
        start,
        rowExtras,
        onSpace: toggle,
        details: <ExportPanel payload={payload} preview={preview} onSave={save} />,
    };
}
