import { translate } from '@docusaurus/Translate';
import { type UiMessageDescriptor, uiMessages } from '@site/src/i18n/generated/uiMessages';
import {
    buildDiscordHistoryMessage,
    type DiscordDeliveryResult,
    type DiscordReadingLines,
    isValidDiscordWebhook,
    queueDiscordMessage,
    SESSION_STORAGE_KEY,
} from '@site/src/integrations/discord';
import { useSessionStorageState } from '@site/src/shared/hooks/useSessionStorageState';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

import { onRollResult } from '../dice-logic/dice-roller';
import type { RollResult } from '../dice-logic/types';
import { specialDiceValues } from '../dice-logic/utils';
import { useDiceRollerStore } from '../store/diceRollerStore';
import { verdictText } from './verdictText';

type DeliveryFailureReason = Extract<DiscordDeliveryResult, { ok: false }>['reason'];

/** User-facing message per delivery failure code; the codes stay in the Discord integration. */
const DELIVERY_ERROR_MESSAGES: Record<
    Exclude<DeliveryFailureReason, 'rate-limited'>,
    UiMessageDescriptor
> = {
    network: uiMessages.integrations.discord.errors.network,
    rejected: uiMessages.integrations.discord.errors.rejected,
    'invalid-webhook': uiMessages.integrations.discord.errors.rejected,
};

function readingLines(result: RollResult): DiscordReadingLines | undefined {
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

export default function DiscordWebhookSubscription() {
    const settings = useDiceRollerStore((s) => s.settings);
    const [webhookUrl] = useSessionStorageState(SESSION_STORAGE_KEY, '');

    const enableDiscordWebhook = settings.enableDiscordWebhook;
    const includeRollContext = settings.includeRollContext;

    useEffect(() => {
        if (!webhookUrl || !isValidDiscordWebhook(webhookUrl) || !enableDiscordWebhook) {
            return;
        }

        const unsub = onRollResult((result: RollResult) => {
            const reading = readingLines(result);
            const message = includeRollContext
                ? buildDiscordHistoryMessage(result, reading)
                : buildDiscordHistoryMessage({ ...result, details: '', formatted: '' }, reading);
            queueDiscordMessage(message, webhookUrl).then((delivery) => {
                if (delivery.ok) return;
                if (delivery.reason === 'rate-limited') {
                    toast.error(
                        delivery.retryAfterMs
                            ? translate(uiMessages.integrations.discord.errors.rateLimitedRetry, {
                                  seconds: Math.ceil(delivery.retryAfterMs / 1_000),
                              })
                            : translate(uiMessages.integrations.discord.errors.rateLimited)
                    );
                    return;
                }
                toast.error(translate(DELIVERY_ERROR_MESSAGES[delivery.reason]));
            });
        });

        return () => unsub();
    }, [webhookUrl, enableDiscordWebhook, includeRollContext]);

    return null;
}
