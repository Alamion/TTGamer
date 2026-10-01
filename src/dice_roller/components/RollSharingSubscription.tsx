import { translate } from '@docusaurus/Translate';
import { type UiMessageDescriptor, uiMessages } from '@site/src/i18n/generated/uiMessages';
import {
    buildRollShareMessage,
    queueRollShare,
    type RollShareReadingLines,
    type RollShareResult,
    type SharingService,
    sharingServiceOf,
} from '@site/src/integrations/roll-sharing';
import { useSessionStorageState } from '@site/src/shared/hooks/useSessionStorageState';
import { useSitePath } from '@site/src/shared/hooks/useSitePath';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

import { onRollResult } from '../dice-logic/dice-roller';
import type { RollResult } from '../dice-logic/types';
import { specialDiceValues } from '../dice-logic/utils';
import { useDiceRollerStore } from '../store/diceRollerStore';
import { verdictText } from './verdictText';

type DeliveryFailure = Extract<RollShareResult, { ok: false }>;

/** User-facing message per delivery failure code; the codes stay in the roll-sharing integration. */
const DELIVERY_ERROR_MESSAGES: Record<
    Exclude<DeliveryFailure['reason'], 'rate-limited'>,
    UiMessageDescriptor
> = {
    network: uiMessages.integrations.sharing.errors.network,
    rejected: uiMessages.integrations.sharing.errors.rejected,
    'invalid-webhook': uiMessages.integrations.sharing.errors.rejected,
};

function notifyFailure(delivery: DeliveryFailure, service: SharingService, guideUrl: string) {
    const values = { service: service.name };
    if (delivery.reason === 'rate-limited') {
        toast.error(
            delivery.retryAfterMs
                ? translate(uiMessages.integrations.sharing.errors.rateLimitedRetry, {
                      ...values,
                      seconds: Math.ceil(delivery.retryAfterMs / 1_000),
                  })
                : translate(uiMessages.integrations.sharing.errors.rateLimited, values)
        );
        return;
    }
    if (delivery.reason === 'network' && service.networkHint === 'site-permission') {
        toast.error(
            <span>
                {translate(uiMessages.integrations.sharing.errors.sitePermission, values)}{' '}
                <a href={`${guideUrl}#site-permission`} className="underline">
                    {translate(uiMessages.integrations.sharing.errors.setupGuide)}
                </a>
            </span>,
            { duration: 8_000 }
        );
        return;
    }
    toast.error(translate(DELIVERY_ERROR_MESSAGES[delivery.reason], values));
}

function readingLines(result: RollResult): RollShareReadingLines | undefined {
    const values = result.diceGroups ? specialDiceValues(result) : [];
    const outcomes = result.reading?.outcomes.map((outcome) => translate(outcome.title)) ?? [];
    if (values.length === 0 && outcomes.length === 0 && !result.verdict) return undefined;
    const joined = values.join(', ');
    return {
        verdict: result.verdict ? verdictText(result.verdict) : undefined,
        specialDice:
            values.length === 0
                ? undefined
                : result.reading
                  ? translate(uiMessages.dice.history.specialDice, {
                        line: translate(result.reading.lineLabel),
                        values: joined,
                    })
                  : translate(uiMessages.dice.history.specialDiceUnnamed, { values: joined }),
        outcomes,
    };
}

export default function RollSharingSubscription() {
    const settings = useDiceRollerStore((s) => s.settings);
    const service = sharingServiceOf(settings.sharingService);
    const [address] = useSessionStorageState(service.addressKey, '');
    const guideUrl = useSitePath()('/docs/roll-sharing');

    const enabled = settings.enableDiscordWebhook;
    const includeRollContext = settings.includeRollContext;

    useEffect(() => {
        if (!enabled || !service.isValidAddress(address)) return;

        const unsub = onRollResult((result: RollResult) => {
            const reading = readingLines(result);
            const message = includeRollContext
                ? buildRollShareMessage(result, reading)
                : buildRollShareMessage({ ...result, details: '', formatted: '' }, reading);
            queueRollShare(message, { service: service.id, address }).then((delivery) => {
                if (!delivery.ok) notifyFailure(delivery, service, guideUrl);
            });
        });

        return () => unsub();
    }, [service, address, enabled, includeRollContext, guideUrl]);

    return null;
}
