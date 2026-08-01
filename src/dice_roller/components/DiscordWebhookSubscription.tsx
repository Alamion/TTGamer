import { useEffect } from 'react';
import { useDiceRollerStore } from '../store/diceRollerStore';
import { useSessionStorageState } from '@site/src/shared/hooks/useSessionStorageState';
import {
    isValidDiscordWebhook,
    SESSION_STORAGE_KEY,
    sendToDiscord,
    buildDiscordHistoryMessage,
} from '@site/src/external_apis/discord/sendToDiscord';
import { onRollResult } from '../dice-logic';
import type { RollResult } from '../dice-logic';

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
            sendToDiscord(message, webhookUrl).then((ok) => {
                if (!ok) {
                    console.error('[Discord Webhook] Failed to send roll result', {
                        notation: result.notation,
                    });
                }
            });
        });

        return () => unsub();
    }, [webhookUrl, enableDiscordWebhook, includeRollContext]);

    return null;
}
