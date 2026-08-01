import { useEffect } from 'react';
import type { ReactNode } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { onRollResult } from '@site/src/dice_roller/dice-logic';
import DiceRollerPanel from '@site/src/dice_roller/components/DiceRollerPanel';
import DiscordWebhookSubscription from '@site/src/dice_roller/components/DiscordWebhookSubscription';
import { RollToastContent } from '@site/src/dice_roller/components/RollToastContent';

interface RootProps {
    children: ReactNode;
}

const isBrowser = typeof window !== 'undefined';

const toastStyle = {
    background: 'rgb(30 41 59)',
    color: 'rgb(248 250 252)',
    border: '1px solid rgb(51 65 85)',
    fontSize: 14,
};

export default function Root({ children }: RootProps): ReactNode {
    useEffect(
        () =>
            onRollResult((result) => {
                toast(<RollToastContent result={result} />, {
                    duration: 4000,
                    style: toastStyle,
                });
            }),
        []
    );
    return (
        <>
            {children}
            <DiscordWebhookSubscription />
            <div id="modal-root" className="tailwind-root"></div>
            {isBrowser && (
                <Toaster
                    position="top-center"
                    toastOptions={{
                        style: {
                            background: 'rgb(30 41 59)',
                            color: 'rgb(248 250 252)',
                            border: '1px solid rgb(51 65 85)',
                            fontSize: '13px',
                        },
                    }}
                />
            )}
            <div className="tailwind-root">
                <DiceRollerPanel />
            </div>
        </>
    );
}
