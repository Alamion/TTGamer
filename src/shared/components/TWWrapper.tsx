import type { ReactNode } from 'react';

export const TWWrapper = ({ children }: { children: ReactNode }) => (
    <span className="tailwind-root">{children}</span>
);
