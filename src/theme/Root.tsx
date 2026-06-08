import type { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import DiceRollerPanel from '../dice_roller/components/DiceRollerPanel';

interface RootProps {
    children: ReactNode;
}

const isBrowser = typeof window !== 'undefined';

export default function Root({ children }: RootProps): ReactNode {
    return (
        <>
            {children}
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
            <div id="right-panel" className="tailwind-root">
                <DiceRollerPanel />
            </div>
        </>
    );
}
