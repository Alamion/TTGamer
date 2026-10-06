import type { DraftOpResult, EditorDraft } from '../draft';
import type { EditorSelectionState } from '../selection';

export interface MessageDescriptor {
    id: string;
    message: string;
}

/**
 * What a screen reader hears after an operation, before translation: the session translates it,
 * so operations stay plain functions of the page (spec 025, D3). Message lists in `values` are
 * translated and joined.
 */
export interface Announcement {
    message: MessageDescriptor;
    values?: Readonly<Record<string, string | number | readonly MessageDescriptor[]>>;
    /** Plural messages pick their form by this count. */
    count?: number;
}

export type OpRefusal = Extract<DraftOpResult, { ok: false }>;

export type OpResult =
    | {
          ok: true;
          draft: EditorDraft;
          /** The selection to record with the change; unset keeps the current one. */
          selection?: EditorSelectionState;
          announce?: Announcement;
      }
    | OpRefusal;

/** A change to the page given the selection: one undo step, or a reason it cannot apply. */
export type Operation = (draft: EditorDraft, selection: EditorSelectionState) => OpResult;
