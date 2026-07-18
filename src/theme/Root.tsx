import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import { onRollResult } from '@site/src/dice_roller/dice-logic';
import DiceRollerPanel from '@site/src/dice_roller/components/DiceRollerPanel';
import { info } from '@site/src/shared/utils/logging';

interface RootProps {
    children: ReactNode;
}

const isBrowser = typeof window !== 'undefined';

export default function Root({ children }: RootProps): ReactNode {
    useEffect(
        () =>
            onRollResult((result) => {
                info(`\nRolls: ${result.details}\nFormatted: ${result.formatted}`, 'Dice Roll');
            }),
        []
    );
    return (
        <>
            {children}
            <div id="modal-root" className="tailwind-root"></div>
            {isBrowser && (
                <Toaster
                    position="top-right"
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
