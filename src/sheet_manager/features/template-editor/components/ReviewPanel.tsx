import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { useId, useState } from 'react';

import { itemState, type ReviewItem } from '../merge/items';
import type { EditorDraft } from '../model/types';
import { labelIn } from '../operations/selection';
import { useEditorSession, useEditorState } from '../session/context';
import { reviewMarkLabel } from './reviewLabels';

const editor = uiMessages.sheet.templates.editor;

function shortValue(value: unknown): string {
    if (value === undefined) return translate(editor.sameValueNone);
    if (typeof value === 'string') return value;
    const text = JSON.stringify(value);
    return text.length > 80 ? `${text.slice(0, 79)}…` : text;
}

function ReviewRow({ draft, item }: { draft: EditorDraft; item: ReviewItem }) {
    const session = useEditorSession();
    const radioName = useId();
    const place = item.path.map((id) => labelIn(draft, id)).join(' / ') || draft.name;
    const state = itemState(draft, item);
    const shipped = state === 'shipped';
    const action =
        item.origin === 'shipped'
            ? shipped
                ? editor.undoShippedChange
                : editor.takeShippedAgain
            : editor.useShipped;
    return (
        <li data-review-item={item.key} className="space-y-2 rounded-sm border border-border p-2">
            <p className="text-textSecondary">{translate(editor.itemPlace, { place })}</p>
            <p className="font-medium">{reviewMarkLabel(item)}</p>
            <div className="grid grid-cols-2 gap-2 break-words">
                <div>
                    <p className="text-textSecondary">{translate(editor.keepMine)}</p>
                    <p>{shortValue(item.userValue)}</p>
                </div>
                <div>
                    <p className="text-textSecondary">{translate(editor.useShipped)}</p>
                    <p>{shortValue(item.shippedValue)}</p>
                </div>
            </div>
            {item.origin === 'difference' ? (
                <div role="radiogroup" aria-label={place} className="flex flex-wrap gap-3">
                    {(['copy', 'shipped'] as const).map((side) => (
                        <label key={side} className="flex cursor-pointer items-center gap-2">
                            <input
                                type="radio"
                                name={radioName}
                                value={side}
                                checked={state === side}
                                onChange={() => session.switchReviewItem(item, side)}
                            />
                            {translate(side === 'copy' ? editor.keepMine : editor.takeShipped)}
                        </label>
                    ))}
                </div>
            ) : (
                <label className="flex cursor-pointer items-center gap-2">
                    <input
                        type="checkbox"
                        role="switch"
                        checked={shipped}
                        aria-label={`${translate(action)}: ${place}`}
                        onChange={(event) =>
                            session.switchReviewItem(
                                item,
                                event.target.checked ? 'shipped' : 'copy'
                            )
                        }
                    />
                    {translate(action)}
                </label>
            )}
        </li>
    );
}

/** Review choices share the normal draft and undo history; document values are never edited. */
export function ReviewPanel({ draft }: { draft: EditorDraft }) {
    const review = useEditorState((state) => state.review);
    const titleId = useId();
    const [open, setOpen] = useState(true);
    if (!review) return null;
    const groups = new Map<string, ReviewItem[]>();
    for (const item of review.items) {
        const path = JSON.stringify(item.path.slice(0, -1));
        const group = groups.get(path);
        if (group) group.push(item);
        else groups.set(path, [item]);
    }
    return (
        <details
            open={open}
            onToggle={(event) => setOpen(event.currentTarget.open)}
            className="rounded-sm border border-border bg-bgBase p-2 text-xs text-textPrimary"
        >
            <summary id={titleId} aria-expanded={open} className="cursor-pointer font-semibold">
                {translate(editor.reviewTitle)}
            </summary>
            <div role="region" aria-labelledby={titleId} className="mt-2 space-y-3">
                <p className="text-textSecondary">{translate(editor.reviewNote)}</p>
                {review.mode === 'differences' && (
                    <p className="text-textSecondary">{translate(editor.reviewDifferencesNote)}</p>
                )}
                {review.failed && <p role="alert">{translate(editor.reviewFailed)}</p>}
                {review.mode === 'differences' && !review.failed && review.items.length === 0 && (
                    <p>{translate(editor.reviewMatches)}</p>
                )}
                {[...groups].map(([path, items]) => (
                    <section key={path} className="space-y-2">
                        <h4 className="text-xs font-semibold">
                            {items[0]!.path
                                .slice(0, -1)
                                .map((id) => labelIn(draft, id))
                                .join(' / ') || draft.name}
                        </h4>
                        <ul className="space-y-2">
                            {items.map((item) => (
                                <ReviewRow key={item.key} draft={draft} item={item} />
                            ))}
                        </ul>
                    </section>
                ))}
            </div>
        </details>
    );
}
