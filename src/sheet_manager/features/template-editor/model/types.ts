import type {
    CustomTemplate,
    PoolTrackerOverride,
    PrimitivePreset,
    PrimitiveTrackOverride,
    TrackerOverride,
    VisibleWhen,
} from '../../../types/template';

/** Type-safe structural updates for a node (type/id/children are managed separately). */
export type NodeUpdates = {
    title?: string;
    visibleWhen?: VisibleWhen;
    defaultCollapsed?: boolean;
    columns?: number;
    columnWidths?: number[];
    column?: number;
    span?: number;
    hideTitle?: boolean;
    hideLabel?: boolean;
    /** `false` turns the book-term hint off (spec 009); `undefined` restores it. */
    termHint?: false;
    part?: 'current' | 'max';
    minFrom?: string;
    /** Pool resources drawn as a tracker (spec 020). */
    poolTracker?: PoolTrackerOverride;
    maxMinFrom?: string;
    showTitle?: boolean;
    framed?: boolean;
    collapsible?: boolean;
    docsPath?: string;
    minRows?: number;
    maxRows?: number;
    valueKey?: string;
    bindingKey?: string;
    formula?: string;
    maxFrom?: string;
    label?: string;
    compact?: boolean;
    multiline?: boolean;
    track?: PrimitiveTrackOverride;
    trackLayout?: 'table' | 'strip';
    tracker?: TrackerOverride;
    presets?: PrimitivePreset[];
};

export type EditorDraft = CustomTemplate;

export type DraftOpResult =
    | { ok: true; draft: EditorDraft }
    | { ok: false; error: 'depth' | 'count' | 'self-move'; limit?: number; actual?: number };
