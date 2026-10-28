import type { ReactNode } from 'react';

/** `@theme/MDXContent` in tests: no theme components, the content as it is. */
export default function MDXContent({ children }: { children: ReactNode }) {
    return children;
}
