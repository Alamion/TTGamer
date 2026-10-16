import { translate } from '@docusaurus/Translate';
import { rollDices } from '@site/src/dice_roller/dice-logic';
import type { RollResult } from '@site/src/dice_roller/dice-logic/types';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { Dices } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { buildRollShareMessage } from './message';

const preview = uiMessages.integrations.sharing.preview;

/** Bold spans and escaped characters of one message line, the subset the message uses. */
function inline(line: string): ReactNode[] {
    return line
        .split(/(\*\*(?:\\.|[^*])+\*\*)/g)
        .filter(Boolean)
        .map((part, index) => {
            const bold = part.startsWith('**') && part.endsWith('**');
            const text = (bold ? part.slice(2, -2) : part).replace(/\\(.)/g, '$1');
            return bold ? <strong key={index}>{text}</strong> : text;
        });
}

/** Draws a shared-roll message the way a chat shows its Markdown: bold, quotes, a code block. */
function ChatMessage({ markdown }: { markdown: string }) {
    const blocks: ReactNode[] = [];
    const lines = markdown.split('\n');
    for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        if (line === '```') {
            const code: string[] = [];
            while (++index < lines.length && lines[index] !== '```') code.push(lines[index]);
            blocks.push(
                <pre
                    key={index}
                    className="m-0 whitespace-pre-wrap rounded-sm border border-border bg-bgBase p-2 text-xs"
                >
                    {code.join('\n')}
                </pre>
            );
        } else if (line.startsWith('> ')) {
            blocks.push(
                <div key={index} className="border-l-4 border-border pl-2">
                    {inline(line.slice(2))}
                </div>
            );
        } else {
            blocks.push(<div key={index}>{inline(line)}</div>);
        }
    }
    return <div className="flex flex-col gap-1 text-sm text-textPrimary">{blocks}</div>;
}

/**
 * A sample roll as it would be posted, built by the same code as the real message; a click on
 * the button rolls the sample again. Nothing is sent.
 */
export function SharedRollPreview({
    notation,
    characterName,
    statLabels = [],
}: {
    notation: string;
    characterName?: string;
    statLabels?: readonly string[];
}) {
    const roll = (): RollResult => ({
        ...rollDices(notation),
        characterName,
        statLabels: [...statLabels],
    });
    const [result, setResult] = useState<RollResult | null>(null);
    return (
        <div className="flex flex-col gap-3 p-3">
            <button
                type="button"
                onClick={() => setResult(roll())}
                className="inline-flex items-center gap-1.5 self-start rounded-md border border-border bg-bgBase px-2 py-1 text-sm text-textPrimary hover:border-primary"
            >
                <Dices size={16} aria-hidden="true" />
                {translate(result ? preview.again : preview.roll, { notation })}
            </button>
            {result && (
                <div className="flex gap-3" aria-live="polite">
                    <div
                        aria-hidden="true"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-on"
                    >
                        <Dices size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="mb-1 text-sm font-semibold text-textPrimary">
                            {translate(preview.author)}
                        </div>
                        <ChatMessage markdown={buildRollShareMessage(result)} />
                    </div>
                </div>
            )}
        </div>
    );
}
