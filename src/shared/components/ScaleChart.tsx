import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';

const messages = uiMessages.shared.scaleChart;

const SCALES = [
    { name: messages.scales.deathStar, dotSize: 'w-20 h-20', index: 0 },
    { name: messages.scales.capital, dotSize: 'w-16 h-16', index: 1 },
    { name: messages.scales.transport, dotSize: 'w-14 h-14', index: 2 },
    { name: messages.scales.starfighter, dotSize: 'w-12 h-12', index: 3 },
    { name: messages.scales.walker, dotSize: 'w-10 h-10', index: 4 },
    { name: messages.scales.speeder, dotSize: 'w-8 h-8', index: 5 },
    { name: messages.scales.character, dotSize: 'w-6 h-6', index: 6 },
    { name: messages.scales.vermin, dotSize: 'w-4 h-4', index: 7 },
] as const;

export function ScaleChart() {
    return (
        <div className="not-prose flex justify-center">
            <div className="flex flex-col gap-3">
                {SCALES.map((scale, i) => (
                    <div key={scale.name.id} className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-24">
                            <div
                                className={clsx(
                                    'rounded-full bg-primary transition-all',
                                    scale.dotSize,
                                    i === 0
                                        ? 'opacity-90'
                                        : i === SCALES.length - 1
                                          ? 'opacity-40'
                                          : 'opacity-70'
                                )}
                            />
                        </div>
                        <span className="font-semibold text-textPrimary text-sm min-w-28">
                            {translate(scale.name)}
                        </span>
                        {i === 0 && (
                            <span className="text-xs text-textSecondary italic">
                                {translate(messages.largest)}
                            </span>
                        )}
                        {i === SCALES.length - 1 && (
                            <span className="text-xs text-textSecondary italic">
                                {translate(messages.smallest)}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
