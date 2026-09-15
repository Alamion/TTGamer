import { translate } from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { type PolicyId, PUBLISHER_POLICIES, type PublisherPolicy } from '../../../systems';

const notice = uiMessages.sheet.policies.notice;

/** Site-relative path under the current locale's base URL (`/ru/...` in the Russian build). */
function useSitePath() {
    const baseUrl = useDocusaurusContext().siteConfig.baseUrl ?? '/';
    return (path: string) => `${baseUrl.replace(/\/$/, '')}${path}`;
}

function uniquePolicies(policies: readonly PublisherPolicy[]) {
    return policies.filter(
        (item, index, all) => all.findIndex((other) => other.id === item.id) === index
    );
}

/**
 * Publisher policy badges for material shown on a sheet (constitution VIII): small, in the
 * bottom-left corner, each linking to the policy's documentation page with the full statement.
 * Renders nothing when the document uses no policy material.
 */
export function PolicyBadges({ policies }: { policies: readonly PublisherPolicy[] }) {
    const sitePath = useSitePath();
    const resolved = uniquePolicies(policies);
    if (resolved.length === 0) return null;
    return (
        <aside aria-label={translate(notice.label)} className="flex gap-2 px-4 pb-4 pt-2 lg:px-6">
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
