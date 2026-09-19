import { translate } from '@docusaurus/Translate';
import { type UiMessageDescriptor, uiMessages } from '@site/src/i18n/generated/uiMessages';
import {
    buildDiscordHistoryMessage,
    type DiscordDeliveryResult,
    isValidDiscordWebhook,
    queueDiscordMessage,
    SESSION_STORAGE_KEY,
} from '@site/src/integrations/discord';
import { useSessionStorageState } from '@site/src/shared/hooks/useSessionStorageState';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

import { onRollResult } from '../dice-logic/dice-roller';
import type { RollResult } from '../dice-logic/types';
import { useDiceRollerStore } from '../store/diceRollerStore';

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
            const message = includeRollContext
                ? buildDiscordHistoryMessage(result)
                : buildDiscordHistoryMessage({ ...result, details: '', formatted: '' });
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
