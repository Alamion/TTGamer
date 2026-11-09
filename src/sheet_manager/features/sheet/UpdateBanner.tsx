import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { RefreshCw } from 'lucide-react';
import { lazy, Suspense, useId, useState } from 'react';

import { useTemplateStore } from '../../store/templateStore';
import { EditorHelp } from '../template-editor/components/EditorHelp';
import { reviewBaseFor, usePendingUpdate, useSilentAdvance } from './data/pendingUpdate';
import { revisionOf } from './data/shippedRevision';

const TemplateEditorDialog = lazy(() =>
    import('../template-editor/TemplateEditorDialog').then((module) => ({
        default: module.TemplateEditorDialog,
    }))
);
const page = uiMessages.sheet.templates.page;

export function UpdateBanner({ systemId, viewId }: { systemId: string; viewId: string }) {
    const pending = usePendingUpdate(systemId, viewId);
    const silent = useSilentAdvance(systemId, viewId);
    const labelId = useId();
    const [reviewing, setReviewing] = useState(false);
    const review = reviewBaseFor(pending);
    if (
        silent ||
        !review ||
        (pending.state !== 'base-differs' && pending.state !== 'no-base-differs')
    )
        return null;

    return (
        <>
            {/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- Explicit region contract (spec 048). */}
            <section
                role="region"
                aria-labelledby={labelId}
                className="mx-4 mt-4 flex items-start gap-3 rounded-lg border border-border bg-bgSurface p-4 lg:mx-6"
            >
                <RefreshCw
                    className="mt-0.5 h-5 w-5 shrink-0 text-textSecondary"
                    aria-hidden="true"
                />
                <div>
                    <span id={labelId} className="sr-only">
                        {translate(page.updateBannerRegion)}
                    </span>
                    <p className="flex items-center gap-1 text-sm font-semibold text-textPrimary">
                        {translate(page.updateBannerTitle)}
                        <EditorHelp
                            topic="libraryUpdates"
                            about={translate(page.updateBannerTitle)}
                        />
                    </p>
                    <p className="mt-1 text-xs text-textSecondary">
                        {translate(
                            pending.record?.base
                                ? page.updateBannerText
                                : page.updateBannerNoBaseText,
                            { name: review.copy.name }
                        )}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                        <button
                            type="button"
                            className="rounded border border-border px-3 py-1 text-sm text-textPrimary"
                            onClick={() => setReviewing(true)}
                        >
                            {translate(page.updateBannerReview)}
                        </button>
                        <button
                            type="button"
                            className="rounded border border-border px-3 py-1 text-sm text-textSecondary"
                            onClick={() =>
                                useTemplateStore
                                    .getState()
                                    .dismissUpdate(systemId, viewId, revisionOf(review.shipped))
                            }
                        >
                            {translate(page.updateBannerLater)}
                        </button>
                    </div>
                </div>
            </section>
            {reviewing && (
                <Suspense fallback={null}>
                    <TemplateEditorDialog base={review} onClose={() => setReviewing(false)} />
                </Suspense>
            )}
        </>
    );
}
