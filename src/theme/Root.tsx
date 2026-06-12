import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import DiceRollerPanel from '../dice_roller/components/DiceRollerPanel';
import { setupRollLogging } from '../shared/utils/logging';

interface RootProps {
    children: ReactNode;
}

const isBrowser = typeof window !== 'undefined';

export default function Root({ children }: RootProps): ReactNode {
    useEffect(() => setupRollLogging(), []);
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
