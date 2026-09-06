import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { ChevronDown, ChevronUp, LayoutGrid, Rows3, Table, Trash2 } from 'lucide-react';

import { useExpandedState } from '../../../hooks';
import { listDocumentBindings } from '../../../systems/star-wars-wod/documentBindings';
import type { TemplateSection } from '../../../types/template';
import { TEMPLATE_LIMITS } from '../../../types/template';
import { BlockEditor } from './BlockEditor';

const editor = uiMessages.sheet.templates.editor;
const primitives = uiMessages.sheet.templates.primitives;

// Feature 005 review: system-backed content (traits, resources, identity fields) is composed
// through regular field groups with shared value keys (bridged to document data at render) —
// no dedicated buttons. Only the explicitly custom primitives that declarative fields cannot
// express (condition tracks, custom lists with presets) stay in the picker.
const PRIMITIVE_GROUPS: ReadonlyArray<{
    kind: 'track' | 'list';
    label: { id: string; message: string };
}> = [
    { kind: 'track', label: primitives.groupTrack },
    { kind: 'list', label: primitives.groupList },
];

const inputClasses =
    'rounded border border-border bg-bgSurface px-2 py-1.5 text-sm text-textPrimary focus:outline-none focus:ring-1 focus:ring-primary';

interface SectionEditorProps {
    draft: import('../../../types/template').CustomTemplate;
    section: TemplateSection;
    callbacks: {
        onRename: (title: string) => void;
        onMove: (offset: -1 | 1) => void;
        onRemove: () => void;
        onAddBlock: (
            type: 'fields' | 'table' | { type: 'built-in'; blockId: string; label: string }
        ) => void;
        onAddPrimitive: (bindingKey: string) => void;
        blockCallbacks: (blockId: string) => React.ComponentProps<typeof BlockEditor>['callbacks'];
    };
}

export function SectionEditor({ callbacks, draft, section }: SectionEditorProps) {
    const t = (descriptor: { message: string }) => translate(descriptor);
    const atBlockLimit = section.blocks.length >= TEMPLATE_LIMITS.blocksPerSection;
    // Feature 005: document-bound primitives, kind-scoped (FR-2/FR-4). Legacy ready-made
    // placements are no longer offered for composition (FR-11) — they live only inside the
    // code-owned hybrid defaults.
    const availableBindings = listDocumentBindings(draft.systemId, draft.documentKind);
    // Editor UX (review 2026-09-05): collapsible sections with persistent state, reusing the
    // same expanded-state storage the sheet sections use.
    const [isExpanded, toggleExpanded] = useExpandedState(
        `template-editor-${draft.id}-${section.id}`
    );

    return (
        <div className="rounded-lg border border-border bg-bgBase p-4" data-section-id={section.id}>
            <div className="flex items-center gap-2">
                <input
                    value={section.title}
                    onChange={(event) => callbacks.onRename(event.target.value)}
                    aria-label={t(editor.sectionTitle)}
                    className={`${inputClasses} flex-1 font-medium`}
                />
                <button
                    type="button"
                    onClick={toggleExpanded}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? t(editor.collapse) : t(editor.expand)}
                    className="rounded p-1 text-textSecondary hover:bg-bgSurface hover:text-textPrimary"
                >
                    {isExpanded ? (
                        <ChevronUp className="h-4 w-4" aria-hidden="true" />
                    ) : (
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    )}
                </button>
                {isExpanded && (
                    <button
                        type="button"
                        onClick={() => callbacks.onMove(-1)}
                        aria-label={t(editor.moveUp)}
                        className="rounded p-1 text-textSecondary hover:bg-bgSurface hover:text-textPrimary"
                    >
                        <ChevronUp className="h-4 w-4" aria-hidden="true" />
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => callbacks.onMove(1)}
                    aria-label={t(editor.moveDown)}
                    className="rounded p-1 text-textSecondary hover:bg-bgSurface hover:text-textPrimary"
                >
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    onClick={callbacks.onRemove}
                    disabled={section.blocks.length === 0 && false}
                    aria-label={t(editor.remove)}
                    className="rounded p-1 text-textSecondary hover:bg-bgSurface hover:text-error"
                >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
            </div>

            {isExpanded && (
                <>
                    <div className="mt-3 space-y-3">
                        {section.blocks.map((block) => (
                            <BlockEditor
                                key={block.id}
                                block={block}
                                draft={draft}
                                callbacks={callbacks.blockCallbacks(block.id)}
                            />
                        ))}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => callbacks.onAddBlock('fields')}
                            disabled={atBlockLimit}
                            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-primary hover:bg-bgSurface disabled:opacity-40"
                        >
                            <Rows3 className="h-3.5 w-3.5" aria-hidden="true" />
                            {t(editor.addFieldsBlock)}
                        </button>
                        <button
                            type="button"
                            onClick={() => callbacks.onAddBlock('table')}
                            disabled={atBlockLimit}
                            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-primary hover:bg-bgSurface disabled:opacity-40"
                        >
                            <Table className="h-3.5 w-3.5" aria-hidden="true" />
                            {t(editor.addTableBlock)}
                        </button>
                    </div>

                    {/* Document-bound primitives (feature 005): grouped by binding kind, kind-scoped. */}
                    {PRIMITIVE_GROUPS.map(({ kind, label }) => {
                        const groupBindings = availableBindings.filter(
                            (binding) => binding.kind === kind
                        );
                        if (groupBindings.length === 0) return null;
                        return (
                            <div key={kind} className="mt-2">
                                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-textSecondary">
                                    {translate(label)}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {groupBindings.map((binding) => (
                                        <button
                                            key={binding.key}
                                            type="button"
                                            onClick={() => callbacks.onAddPrimitive(binding.key)}
                                            disabled={atBlockLimit}
                                            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-primary hover:bg-bgSurface disabled:opacity-40"
                                            data-primitive-binding-option={binding.key}
                                        >
                                            <LayoutGrid
                                                className="h-3.5 w-3.5"
                                                aria-hidden="true"
                                            />
                                            {binding.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </>
            )}
        </div>
    );
}
