import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { DocumentDefinition, DocumentViewLabel, SystemPlugin } from './types';

/**
 * Publisher community policies (constitution VIII). Rulesets, modules, and settings declare the
 * policies their material relies on. Sheets show only the policy badge, linking to the policy's
 * docs page, which carries the full statement once; exported files carry the notice text.
 * Nothing is shown for documents that use no such material. One policy may serve several systems
 * (Dark Pack covers World of Darkness 5th Edition lines only, not classic WoD or conversions built
 * on it), so policies live outside any system.
 */

export type PolicyId = 'dark-pack';

export interface PublisherPolicy {
    id: PolicyId;
    /** Policy name as the publisher uses it (not translated). */
    label: string;
    /** Required notice sentences, verbatim; never translated or paraphrased. */
    officialNotice: readonly string[];
    /** Own-words explanation of what the notice means for readers (translated). */
    explanation: DocumentViewLabel;
    url: string;
    /** Required badge, a site-relative static path (shown small on sheets). */
    badge: string;
    /** Site-relative docs page that carries the full statement: badge, notice, explanation. */
    aboutPage: string;
    /** Material under this policy stays free of purchases and monetized transactions. */
    nonCommercial: boolean;
}

export const PUBLISHER_POLICIES: Readonly<Record<PolicyId, PublisherPolicy>> = {
    'dark-pack': {
        id: 'dark-pack',
        label: 'Dark Pack',
        officialNotice: [
            'Portions of the materials are the copyrights and trademarks of Paradox Interactive AB, and are used with permission. All rights reserved. For more information please visit worldofdarkness.com.',
            'This material is not official World of Darkness material.',
        ],
        explanation: uiMessages.sheet.policies.darkPack.explanation,
        url: 'https://www.paradoxinteractive.com/games/world-of-darkness/community/dark-pack-agreement',
        badge: '/img/dark-pack-badge.webp',
        aboutPage: '/docs/wod-v5/dark-pack',
        nonCommercial: true,
    },
};

export function isPolicyId(id: string): id is PolicyId {
    return Object.hasOwn(PUBLISHER_POLICIES, id);
}

interface PolicyRegistry {
    getSystem(systemId: string): SystemPlugin | undefined;
    getDocumentDefinition?(systemId: string, definitionId: string): DocumentDefinition | undefined;
}

function toPolicies(ids: readonly PolicyId[]): PublisherPolicy[] {
    return [...new Set(ids)].filter(isPolicyId).map((id) => PUBLISHER_POLICIES[id]);
}

/** Policies of a system's ruleset/setting layer (templates, docs of the whole system). */
export function resolveSystemPolicies(
    registry: PolicyRegistry,
    systemId: string
): PublisherPolicy[] {
    return toPolicies(registry.getSystem(systemId)?.policies ?? []);
}

/** Policies a document inherits: its system's plus its module's, deduplicated, stable order. */
export function resolveDocumentPolicies(
    registry: PolicyRegistry,
    document: { systemId: string; definitionId: string }
): PublisherPolicy[] {
    const system = registry.getSystem(document.systemId);
    // Through the registry when it offers the lookup, so user types resolve too (spec 012).
    const definition =
        registry.getDocumentDefinition?.(document.systemId, document.definitionId) ??
        system?.documents.find(({ id }) => id === document.definitionId);
    return toPolicies([...(system?.policies ?? []), ...(definition?.module?.policies ?? [])]);
}

/** The export form of a notice (`notices` entries in document and template files). */
export function exportNotices(policies: readonly PublisherPolicy[]) {
    return policies.map((policy) => ({
        policy: policy.id,
        text: [...policy.officialNotice],
        url: policy.url,
    }));
}
