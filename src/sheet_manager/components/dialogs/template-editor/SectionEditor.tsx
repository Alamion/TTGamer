import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { ChevronDown, ChevronUp, Rows3, Table, Trash2 } from 'lucide-react';

import type { TemplateSection } from '../../../types/template';
import { TEMPLATE_LIMITS } from '../../../types/template';
import { BlockEditor } from './BlockEditor';

const editor = uiMessages.sheet.templates.editor;

const inputClasses =
    'rounded border border-border bg-bgSurface px-2 py-1.5 text-sm text-textPrimary focus:outline-none focus:ring-1 focus:ring-primary';

interface SectionEditorProps {
    draft: import('../../../types/template').CustomTemplate;
    section: TemplateSection;
    callbacks: {
        onRename: (title: string) => void;
        onMove: (offset: -1 | 1) => void;
        onRemove: () => void;
        onAddBlock: (type: 'fields' | 'table') => void;
        blockCallbacks: (blockId: string) => React.ComponentProps<typeof BlockEditor>['callbacks'];
    };
}

export function SectionEditor({ callbacks, draft, section }: SectionEditorProps) {
    const t = (descriptor: { message: string }) => translate(descriptor);
    const atBlockLimit = section.blocks.length >= TEMPLATE_LIMITS.blocksPerSection;

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
                    onClick={() => callbacks.onMove(-1)}
                    aria-label={t(editor.moveUp)}
                    className="rounded p-1 text-textSecondary hover:bg-bgSurface hover:text-textPrimary"
                >
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                </button>
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

            <div className="mt-3 flex gap-2">
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
        </div>
    );
}
