import type { RollResult } from '../../dice_roller/dice-logic/types';

/** Both services take Markdown up to Discord's content limit. */
export const MESSAGE_LIMIT = 2_000;

export function truncate(value: string, limit: number) {
    if (value.length <= limit) return value;
    return `${value.slice(0, Math.max(0, limit - 1))}…`;
}

function escapeMarkdown(value: string) {
    return value.replace(/([\\`*_{}[\]()<>#+\-.!|>~])/g, '\\$1');
}

function escapeCode(value: string) {
    return value.replace(/```/g, '``\u200b`');
}

/** Already translated lines about the roll's verdict, special dice, and outcomes. */
export interface RollShareReadingLines {
    verdict?: string;
    specialDice?: string;
    outcomes?: readonly string[];
}

export function buildRollShareMessage(result: RollResult, reading?: RollShareReadingLines): string {
    const lines: string[] = [];

    if (result.characterName) {
        lines.push(`**${escapeMarkdown(truncate(result.characterName, 80))}**`);
    }

    const notation = escapeMarkdown(truncate(result.notation, 300));
    lines.push(`${notation} = **${result.total}**`);

    if (result.statLabels && result.statLabels.length > 0) {
        const labels = result.statLabels
            .slice(0, 12)
            .map((label) => escapeMarkdown(truncate(label, 80)))
            .join(', ');
        lines.push(`Stats: ${truncate(labels, 500)}`);
    }

    if (reading?.verdict) {
        lines.push(`**${escapeMarkdown(truncate(reading.verdict, 200))}**`);
    }

    // Kept even without roll context: colour alone never reaches the channel.
    if (reading?.specialDice) {
        lines.push(escapeMarkdown(truncate(reading.specialDice, 300)));
    }
    for (const outcome of (reading?.outcomes ?? []).slice(0, 6)) {
        lines.push(`> **${escapeMarkdown(truncate(outcome, 200))}**`);
    }

    const details = result.details ? truncate(escapeCode(result.details), 700) : '';
    const formatted = result.formatted ? truncate(escapeCode(result.formatted), 700) : '';
    if (details || formatted) {
        lines.push('```');
        if (details) lines.push(`Rolls: ${details}`);
        if (formatted) lines.push(`Formatted: ${formatted}`);
        lines.push('```');
    }

    if (result.manuallyRerolled) {
        lines.push('> Manually Rerolled');
    }

    return truncate(lines.join('\n'), MESSAGE_LIMIT);
}
