// Public component surface. Keep this grouped by UI responsibility so feature code
// imports stable concepts instead of depending on the manager's file layout.

export { AutoResizeTextarea } from './controls/AutoResizeTextarea.tsx';
export type { CatalogEntry } from './controls/CatalogSuggest.tsx';
export { CatalogSuggest } from './controls/CatalogSuggest.tsx';
export { Checkbox } from './controls/Checkbox.tsx';
export type { ConfirmDialogProps } from './dialogs/ConfirmDialog.tsx';
export { ConfirmDialog } from './dialogs/ConfirmDialog.tsx';
export { DocumentCreateDialog } from './dialogs/DocumentCreateDialog.tsx';
export type { DocumentManagerDialogProps } from './dialogs/DocumentManagerDialog.tsx';
export { DocumentManagerDialog } from './dialogs/DocumentManagerDialog.tsx';
export { ImportConflictDialog } from './dialogs/ImportConflictDialog.tsx';
export type { TemplateEditorDialogProps } from './dialogs/TemplateEditorDialog.tsx';
export { TemplateEditorDialog } from './dialogs/TemplateEditorDialog.tsx';
export type { TemplateImportDialogProps } from './dialogs/TemplateImportDialog.tsx';
export { TemplateImportDialog } from './dialogs/TemplateImportDialog.tsx';
export { TemplateLibraryDialog } from './dialogs/TemplateLibraryDialog.tsx';
export type { AccentColor } from './sections/CollapsibleBlock.tsx';
export { CollapsibleBlock } from './sections/CollapsibleBlock.tsx';
export { CollapsibleItem } from './sections/CollapsibleItem.tsx';
export type { DataTableColumn, DataTableProps } from './sections/DataTable.tsx';
export { DataTable } from './sections/DataTable.tsx';
export type {
    ConditionTrackMember,
    DocumentFieldDefinition,
    DocumentResourceValue,
} from './sections/DocumentSheetSections.tsx';
export {
    ConditionTrackBlock,
    CustomTraitsBlock,
    DocumentFieldsBlock,
    EditableTableBlock,
    ResourceBlock,
    TraitGroupsBlock,
} from './sections/DocumentSheetSections.tsx';
export { SectionCard } from './sections/SectionCard.tsx';
export {
    CompactConditionTrack,
    CompactRating,
    CompactResource,
    CompactSectionHeading,
    CompactTextField,
} from './stat-fields/CompactSheetFields.tsx';
export { ForcePowerRow, ForcePowerRowCustom } from './stat-fields/ForcePowerRow.tsx';
export { MeritFlawList } from './stat-fields/MeritFlawRow.tsx';
export { StatDot } from './stat-fields/StatDot.tsx';
export { StatLabel } from './stat-fields/StatLabel.tsx';
export { CustomTraitList, TraitRow, TraitRowWithInput } from './stat-fields/TraitRow.tsx';
export { CharacterViewer } from './viewer/CharacterViewer.tsx';
