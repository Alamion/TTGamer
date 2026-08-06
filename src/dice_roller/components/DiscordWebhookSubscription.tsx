import {
    buildDiscordHistoryMessage,
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
                    const wait = delivery.retryAfterMs
                        ? ` Try again in about ${Math.ceil(delivery.retryAfterMs / 1_000)} seconds.`
                        : ' Try again in a moment.';
                    toast.error(`Discord is rate-limiting rolls.${wait}`);
                    return;
                }
                toast.error(
                    delivery.reason === 'network'
                        ? 'Discord could not be reached. Check your connection.'
                        : 'Discord rejected this roll. Check the webhook settings.'
                );
            });
        });

        return () => unsub();
    }, [webhookUrl, enableDiscordWebhook, includeRollContext]);

    return null;
}
