import React from 'react';

export const DocsComponentWrapper = ({ children }: { children: React.ReactNode }) => (
    <span className="tailwind-root" style={{ minHeight: 0 }}>
        {children}
    </span>
);
