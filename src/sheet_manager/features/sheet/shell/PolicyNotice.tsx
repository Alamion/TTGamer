import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { useSitePath } from '@site/src/shared/hooks/useSitePath';
import { clsx } from 'clsx';

import { type PolicyId, PUBLISHER_POLICIES, type PublisherPolicy } from '../../../systems';

const notice = uiMessages.sheet.policies.notice;

function uniquePolicies(policies: readonly PublisherPolicy[]) {
    return policies.filter(
        (item, index, all) => all.findIndex((other) => other.id === item.id) === index
    );
}

/** Where the badges sit: under the page, at the end of the toolbar, or at a window's foot. */
export type BadgePlace = 'page' | 'toolbar' | 'window';

const PLACE_CLASS: Record<BadgePlace, string> = {
    page: 'px-4 pb-4 pt-2 lg:px-6',
    toolbar: 'items-center sm:ml-auto [&_img]:h-8 [&_img]:w-8',
    window: 'shrink-0 border-t border-border px-3 py-2 [&_img]:h-8 [&_img]:w-8',
};

/**
 * Publisher policy badges for material shown on a sheet (constitution VIII): small, once per
 * surface that shows the material (under one document's page, at the end of the toolbar over a
 * layout of groups, at the foot of a floating window), each linking to the policy's
 * documentation page with the full statement. Renders nothing when no shown document uses policy
 * material.
 */
export function PolicyBadges({
    policies,
    place = 'page',
}: {
    policies: readonly PublisherPolicy[];
    place?: BadgePlace;
}) {
    const sitePath = useSitePath();
    const resolved = uniquePolicies(policies);
    if (resolved.length === 0) return null;
    return (
        <aside
            aria-label={translate(notice.label)}
            data-badge-place={place}
            className={clsx('flex gap-2', PLACE_CLASS[place])}
        >
            {resolved.map((policy) => (
                <a
                    key={policy.id}
                    href={sitePath(policy.aboutPage)}
                    title={translate(notice.policyLink, { policy: policy.label })}
                    className="block opacity-80 transition-opacity hover:opacity-100"
                >
                    <img
                        src={sitePath(policy.badge)}
                        alt={policy.label}
                        width={40}
                        height={40}
                        loading="lazy"
                        className="h-10 w-10"
                    />
                </a>
            ))}
        </aside>
    );
}

/**
 * The full statement of one policy for its documentation page: badge, the required notice
 * (verbatim English), the translated explanation, and the publisher's policy link.
 */
export function PolicyStatement({ policy: policyId }: { policy: PolicyId }) {
    const sitePath = useSitePath();
    const policy = PUBLISHER_POLICIES[policyId];
    return (
        <aside
            aria-label={translate(notice.label)}
            className="my-4 flex flex-col items-start gap-4 rounded-lg border border-border bg-bgBase p-4 text-sm text-textSecondary sm:flex-row"
        >
            <img
                src={sitePath(policy.badge)}
                alt={policy.label}
                width={120}
                height={120}
                className="h-[120px] w-[120px] shrink-0"
            />
            <div className="grid gap-2">
                {policy.officialNotice.map((sentence) => (
                    <p key={sentence} lang="en" className="m-0 font-medium text-textPrimary">
                        {sentence}
                    </p>
                ))}
                <p className="m-0">{translate(policy.explanation)}</p>
                <a
                    href={policy.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-fit text-primary underline"
                >
                    {translate(notice.policyLink, { policy: policy.label })}
                </a>
            </div>
        </aside>
    );
}
