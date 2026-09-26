import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { usePluralMessage } from '@site/src/shared/hooks/usePluralMessage';
import clsx from 'clsx';
import { FileText, Globe2, LayoutTemplate, Upload } from 'lucide-react';
import type { ChangeEvent, ReactNode } from 'react';
import { useId, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import type { LibraryLevel } from '../../../features/sheet/data/libraryTree';
import {
    type LibraryFileError,
    type LibraryPayload,
    parseLibraryFile,
} from '../../../features/sheet/shell/libraryFile';
import {
    buildImportPreview,
    effectivePicks,
    type ImportChoices,
    type ImportEntry,
    initialChoices,
    installImport,
    recordKey,
    setChoice,
    togglePick,
} from '../../../features/sheet/shell/libraryImport';
import { useDocumentTypeStore } from '../../../store/documentTypeStore';
import { useTemplateStore } from '../../../store/templateStore';
import { systemRegistry } from '../../../systems';
import { EditorHelp } from '../template-editor/EditorHelp';
import { TickBox } from './TickBox';

const labels = uiMessages.sheet.library;

const LEVEL_ICON: Record<LibraryLevel, typeof Globe2> = {
    ruleset: Globe2,
    setting: Globe2,
    type: LayoutTemplate,
    page: FileText,
};

const STATE_CLASS = {
    new: 'bg-primary/10 text-primary',
    same: 'bg-bgBase text-textSecondary',
    conflict: 'bg-secondary/20 text-textPrimary',
    unavailable: 'bg-bgBase text-textSecondary',
} as const;

function installed() {
    const { types, settings } = useDocumentTypeStore.getState();
    const { templates, defaultOverrides } = useTemplateStore.getState();
    return { types, settings, templates, defaultOverrides };
}

interface Loaded {
    payload: LibraryPayload;
    preview: ImportEntry[];
}

/**
 * Import mode (spec 013, US5): choose a file, see its tree with new / same / conflict /
 * unavailable states, choose Replace or Keep both per conflict, and import only what is ticked.
 */
export function useImportMode(onDone: () => void): { tree: ReactNode; details: ReactNode } {
    const plural = usePluralMessage();
    const inputId = useId();
    const [loaded, setLoaded] = useState<Loaded>();
    const [choices, setChoices] = useState<ImportChoices>({});
    const [error, setError] = useState<{ error: LibraryFileError; entry?: string }>();

    const picks = useMemo(
        () => (loaded ? effectivePicks(loaded.preview, choices) : undefined),
        [loaded, choices]
    );

    const readFile = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        const parsed = parseLibraryFile(await file.text());
        if (!parsed.ok) {
            setLoaded(undefined);
            setError({ error: parsed.error, entry: parsed.entry });
            return;
        }
        const preview = buildImportPreview(parsed.payload, installed(), systemRegistry);
        setError(undefined);
        setLoaded({ payload: parsed.payload, preview });
        setChoices(initialChoices(preview));
    };

    const submit = () => {
        if (!loaded) return;
        const summary = installImport(
            loaded.payload,
            loaded.preview,
            choices,
            installed(),
            systemRegistry
        );
        toast.success(
            translate(labels.import.done, {
                settings: plural(labels.counts.settings, summary.settings),
                types: plural(labels.counts.types, summary.types),
                pages: plural(labels.counts.pages, summary.pages),
            })
        );
        setLoaded(undefined);
        onDone();
    };

    const errorText = error
        ? error.error === 'schema' && error.entry
            ? translate(labels.import.errors.schemaEntry, { entry: error.entry })
            : translate(labels.import.errors[error.error])
        : undefined;

    /** The first picked entry below an automatically picked parent (the one that needs it). */
    const pickedBelow = (entry: ImportEntry): string => {
        for (const child of entry.children) {
            const childKey = child.record ? recordKey(child.record.kind, child.record.id) : '';
            if (picks?.picked.has(childKey)) return child.name;
            const deeper = pickedBelow(child);
            if (deeper) return deeper;
        }
        return '';
    };

    const renderEntry = (entry: ImportEntry, depth: number): ReactNode[] => {
        const Icon = LEVEL_ICON[entry.level];
        const record = entry.record;
        const key = record ? recordKey(record.kind, record.id) : undefined;
        const pickable = record?.state === 'new' || record?.state === 'conflict';
        const auto = key !== undefined && (picks?.auto.has(key) ?? false);
        const checked = key !== undefined && (picks?.picked.has(key) ?? false);
        const choice = key ? choices[key]?.choice : undefined;
        const row = (
            <div
                key={entry.key}
                role="treeitem"
                aria-level={depth}
                aria-selected={false}
                data-import-row={entry.key}
                className="flex min-h-8 flex-wrap items-center gap-1.5 rounded px-1 text-sm text-textPrimary"
                style={{ paddingLeft: `${(depth - 1) * 0.875 + 0.25}rem` }}
            >
                {record && (
                    <TickBox
                        value={checked ? 'checked' : 'unchecked'}
                        auto={auto}
                        disabled={!pickable}
                        label={translate(labels.import.tick, { name: entry.name })}
                        onToggle={() => setChoices((current) => togglePick(entry, current))}
                    />
                )}
                <Icon className="h-4 w-4 shrink-0 text-textSecondary" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{entry.name}</span>
                {auto && (
                    <span className="text-[11px] text-tertiary">
                        {translate(labels.import.addedFor, { child: pickedBelow(entry) })}
                    </span>
                )}
                {record && (
                    <span
                        className={clsx(
                            'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                            STATE_CLASS[record.state]
                        )}
                    >
                        {translate(labels.import.states[record.state])}
                    </span>
                )}
                {record?.state === 'conflict' && key && (
                    <div
                        role="group"
                        aria-label={translate(labels.import.choiceLabel, { name: entry.name })}
                        className="flex shrink-0 rounded border border-border p-0.5"
                    >
                        {(['replace', 'keep-both'] as const).map((value) => (
                            <button
                                key={value}
                                type="button"
                                aria-pressed={choice === value}
                                onClick={() =>
                                    setChoices((current) => setChoice(current, key, value))
                                }
                                className={clsx(
                                    'rounded px-1.5 py-0.5 text-[11px]',
                                    choice === value
                                        ? 'bg-primary-muted text-white'
                                        : 'text-textSecondary hover:bg-secondary/10'
                                )}
                            >
                                {translate(
                                    value === 'replace'
                                        ? labels.import.replace
                                        : labels.import.keepBoth
                                )}
                            </button>
                        ))}
                    </div>
                )}
                {record?.reason && (
                    <span className="basis-full pl-10 text-xs text-textSecondary">
                        {translate(labels.import.reasons[record.reason])}
                    </span>
                )}
            </div>
        );
        return [row, ...entry.children.flatMap((child) => renderEntry(child, depth + 1))];
    };

    const tree = (
        <div className="space-y-3 p-2">
            <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
                <p className="text-xs text-textSecondary">{translate(labels.import.hint)}</p>
                <label
                    htmlFor={inputId}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-border px-3 py-1 text-sm text-textPrimary hover:border-secondary hover:bg-secondary/10"
                >
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    {translate(labels.import.choose)}
                </label>
                <input
                    id={inputId}
                    type="file"
                    accept=".json,application/json"
                    aria-label={translate(labels.import.fileLabel)}
                    onChange={(event) => void readFile(event)}
                    className="sr-only"
                />
                {errorText && (
                    <p role="alert" className="text-sm text-error">
                        {errorText}
                    </p>
                )}
            </div>
            {loaded && (
                <div
                    role="tree"
                    aria-label={translate(labels.import.title)}
                    className="space-y-0.5"
                >
                    {loaded.preview.flatMap((entry) => renderEntry(entry, 1))}
                </div>
            )}
        </div>
    );

    const count = picks ? picks.picked.size + picks.auto.size : 0;
    const details = (
        <section aria-labelledby="library-import-title" className="space-y-3 p-4">
            <div className="flex items-center gap-2">
                <h3
                    id="library-import-title"
                    className="flex-1 text-lg font-semibold text-textPrimary"
                >
                    {translate(labels.import.title)}
                </h3>
                <EditorHelp topic="libraryImport" about={translate(labels.import.title)} />
            </div>
            <p className="text-xs text-textSecondary">{translate(labels.import.hint)}</p>
            {loaded && count === 0 && (
                <p className="text-sm text-textSecondary">
                    {translate(labels.import.nothingPicked)}
                </p>
            )}
            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    disabled={!loaded || count === 0}
                    onClick={submit}
                    className="rounded bg-primary-muted px-3 py-1.5 text-sm font-medium text-white hover:bg-primary disabled:opacity-40"
                >
                    {translate(labels.import.submit)}
                </button>
                <button
                    type="button"
                    disabled={!loaded}
                    onClick={() => {
                        setLoaded(undefined);
                        setChoices({});
                    }}
                    className="rounded border border-border px-3 py-1.5 text-sm text-textPrimary hover:bg-bgSurface disabled:opacity-40"
                >
                    {translate(labels.import.cancel)}
                </button>
            </div>
        </section>
    );

    return { tree, details };
}
