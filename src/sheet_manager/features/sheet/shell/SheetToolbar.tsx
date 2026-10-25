import Translate, { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { Download, LayoutTemplate, Plus, RotateCcw, Upload, Users } from 'lucide-react';
import { useRef } from 'react';

interface SheetToolbarProps {
    hasDocument: boolean;
    onCreate: () => void;
    onExport: () => void;
    onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
    /** File types the import offers: JSON and the kinds' own formats (spec 043). */
    importAccept?: string;
    onManage: () => void;
    onReset: () => void;
    onManageTemplates: () => void;
    viewMode?: React.ReactNode;
    /** The end of the toolbar, where the publisher badges of a layout of groups go. */
    end?: React.ReactNode;
}

const buttonBase =
    'flex items-center justify-center gap-1.5 rounded-sm border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-hidden focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButton = `${buttonBase} border-border bg-bgSurface text-textPrimary hover:bg-bgBase`;
const dangerButton = `${buttonBase} border-border bg-bgSurface text-error hover:bg-bgBase`;
const primaryButton = `${buttonBase} border-transparent bg-primary-muted text-white hover:bg-primary`;

export function SheetToolbar({
    hasDocument,
    onCreate,
    onExport,
    onImport,
    importAccept = '.json,application/json',
    onManage,
    onReset,
    onManageTemplates,
    viewMode,
    end,
}: SheetToolbarProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:pb-0">
            <div className="flex flex-wrap items-center justify-around gap-2.5">
                <div className="flex items-center gap-1.5 rounded-lg border border-border/20 bg-bgSurface/50 p-1">
                    <button
                        type="button"
                        onClick={onExport}
                        disabled={!hasDocument}
                        className={secondaryButton}
                        title={translate(uiMessages.sheet.documents.toolbar.exportTitle)}
                    >
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        <Translate id="ttgamer.ui.sheet.documents.toolbar.export" />
                    </button>
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={secondaryButton}
                        title={translate(uiMessages.sheet.documents.toolbar.importTitle)}
                    >
                        <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                        <Translate id="ttgamer.ui.sheet.documents.toolbar.import" />
                    </button>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg border border-border/20 bg-bgSurface/50 p-1">
                    <button
                        type="button"
                        onClick={onManageTemplates}
                        className={secondaryButton}
                        title={translate(uiMessages.sheet.library.buttonTitle)}
                    >
                        <LayoutTemplate className="h-3.5 w-3.5" aria-hidden="true" />
                        {translate(uiMessages.sheet.library.button)}
                    </button>
                    <button
                        type="button"
                        onClick={onManage}
                        className={secondaryButton}
                        title={translate(uiMessages.sheet.documents.toolbar.manageTitle)}
                    >
                        <Users className="h-3.5 w-3.5" aria-hidden="true" />
                        <Translate id="ttgamer.ui.sheet.documents.toolbar.manage" />
                    </button>
                    <button
                        type="button"
                        onClick={onReset}
                        disabled={!hasDocument}
                        className={dangerButton}
                        title={translate(uiMessages.sheet.documents.toolbar.resetTitle)}
                    >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                        <Translate id="ttgamer.ui.sheet.documents.toolbar.reset" />
                    </button>
                </div>
            </div>
            <button
                type="button"
                onClick={onCreate}
                className={`${primaryButton} w-full px-4 py-2 text-sm sm:w-auto`}
                title={translate(uiMessages.sheet.documents.toolbar.newTitle)}
            >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <Translate id="ttgamer.ui.sheet.documents.toolbar.new" />
            </button>
            {viewMode}
            {end}
            <input
                ref={fileInputRef}
                type="file"
                accept={importAccept}
                onChange={onImport}
                className="hidden"
                aria-label={translate(uiMessages.sheet.documents.toolbar.importLabel)}
                multiple
            />
        </div>
    );
}
