import type { RollResult } from '../../dice_roller/dice-logic';

const DISCORD_WEBHOOK_PATTERN =
    /^https:\/\/(?:discord|discordapp)\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/;

export function isValidDiscordWebhook(url: string): boolean {
    return DISCORD_WEBHOOK_PATTERN.test(url);
}

export async function sendToDiscord(text: string, webhookUrl: string): Promise<boolean> {
    if (!isValidDiscordWebhook(webhookUrl)) {
        console.error('[Discord Webhook] Invalid webhook URL');
        return false;
    }

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: text }),
        });
        if (!response.ok) {
            const body = await response.text().catch(() => '');
            console.error(
                `[Discord Webhook] HTTP ${response.status} ${response.statusText}`,
                body ? `| Response: ${body}` : ''
            );
        }
        return response.ok;
    } catch (error) {
        console.error('[Discord Webhook] Fetch failed:', error);
        return false;
    }
}

export function buildDiscordHistoryMessage(result: RollResult): string {
    const lines: string[] = [];

    if (result.characterName) {
        lines.push(`**${result.characterName}**`);
    }

    lines.push(`${result.notation} = **${result.total}**`);

    if (result.statLabels && result.statLabels.length > 0) {
        lines.push(`Stats: ${result.statLabels.join(', ')}`);
    }

    const hasDetails = !!result.details;
    const hasFormatted = !!result.formatted;

    if (hasDetails || hasFormatted) {
        lines.push('```');
    }

    if (hasDetails) {
        lines.push(`Rolls: ${result.details}`);
    }

    if (hasFormatted) {
        lines.push(`Formatted: ${result.formatted}`);
    }

    if (hasDetails || hasFormatted) {
        lines.push('```');
    }

    if (result.manuallyRerolled) {
        lines.push('> Manually Rerolled');
    }

    return lines.join('\n');
}

export const SESSION_STORAGE_KEY = 'discord_webhook_url';
